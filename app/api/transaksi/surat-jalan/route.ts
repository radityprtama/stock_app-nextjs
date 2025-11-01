import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { suratJalanSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

// Helper function to generate document number
async function generateNomorSJ(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  // Find the last SJ for this month
  const lastSJ = await prisma.suratJalan.findFirst({
    where: {
      noSJ: {
        startsWith: `SJ/${year}/${month}/`
      }
    },
    orderBy: {
      noSJ: 'desc'
    }
  })

  let sequence = 1
  if (lastSJ) {
    const lastSequence = parseInt(lastSJ.noSJ.split('/')[3]) || 0
    sequence = lastSequence + 1
  }

  return `SJ/${year}/${month}/${String(sequence).padStart(4, '0')}`
}

// Helper function to check stock and handle dropship logic
async function checkStockAndDropship(items: any[], gudangId: string) {
  const processedItems = []

  for (const item of items) {
    // Get current stock for this item in the specified warehouse
    const stokBarang = await prisma.stokBarang.findUnique({
      where: {
        barangId_gudangId: {
          barangId: item.barangId,
          gudangId: gudangId
        }
      }
    })

    const currentStock = stokBarang?.qty || 0

    if (currentStock >= item.qty) {
      // Sufficient stock available
      processedItems.push({
        ...item,
        isDropship: false,
        supplierId: null,
        statusDropship: null,
        currentStock
      })
    } else {
      // Insufficient stock, check for dropship alternatives
      const supplierBarangs = await prisma.supplierBarang.findMany({
        where: {
          barangId: item.barangId,
          supplier: {
            aktif: true
          }
        },
        include: {
          supplier: {
            select: {
              id: true,
              kode: true,
              nama: true
            }
          }
        },
        orderBy: [
          { isPrimary: 'desc' },
          { leadTime: 'asc' }
        ]
      })

      if (supplierBarangs.length > 0) {
        // Found dropship supplier
        const primarySupplier = supplierBarangs[0]
        processedItems.push({
          ...item,
          isDropship: true,
          supplierId: primarySupplier.supplierId,
          statusDropship: 'pending',
          currentStock,
          dropshipSupplier: primarySupplier.supplier
        })
      } else {
        // No dropship supplier available
        throw new Error(`Stok tidak cukup dan tidak ada supplier dropship untuk barang ini`)
      }
    }
  }

  return processedItems
}

// GET /api/transaksi/surat-jalan - Get all Surat Jalan with advanced filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const customerId = searchParams.get('customerId') || ''
    const gudangId = searchParams.get('gudangId') || ''
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.SuratJalanWhereInput = {}

    const trimmedSearch = search.trim()

    if (trimmedSearch.length > 0) {
      where.OR = [
        { noSJ: { contains: trimmedSearch } },
        { customer: { nama: { contains: trimmedSearch } } },
        { customer: { kode: { contains: trimmedSearch } } },
        { namaSupir: { contains: trimmedSearch } },
        { nopolKendaraan: { contains: trimmedSearch } },
      ]
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (gudangId) {
      where.gudangId = gudangId
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.tanggal = {}
      if (startDate) {
        where.tanggal.gte = new Date(startDate)
      }
      if (endDate) {
        where.tanggal.lte = new Date(endDate + 'T23:59:59.999Z')
      }
    }

    const [suratJalans, total] = await Promise.all([
      prisma.suratJalan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              kode: true,
              nama: true,
              alamat: true,
              telepon: true,
            },
          },
          gudang: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
          detail: {
            include: {
              barang: {
                select: {
                  id: true,
                  kode: true,
                  nama: true,
                  satuan: true,
                },
              },
            },
          },
          _count: {
            select: {
              detail: true,
              returJual: true,
            },
          },
        },
      }),
      prisma.suratJalan.count({ where }),
    ])

    // Calculate statistics
    const statistics = await prisma.suratJalan.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      _sum: {
        totalQty: true,
        totalNilai: true,
      },
      where: trimmedSearch.length > 0 ? where : undefined,
    })

    const dropshipStats = await prisma.detailSuratJalan.groupBy({
      by: ['isDropship'],
      _count: {
        id: true,
      },
      where: {
        suratJalan: trimmedSearch.length > 0 ? where : undefined,
      },
    })

    const totalValue = suratJalans.reduce((sum, sj) => sum + Number(sj.totalNilai), 0)
    const totalQuantity = suratJalans.reduce((sum, sj) => sum + sj.totalQty, 0)
    const dropshipCount = dropshipStats.find(s => s.isDropship === true)?._count.id || 0

    return NextResponse.json({
      success: true,
      data: suratJalans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        totalTransactions: total,
        totalValue,
        totalQuantity,
        draftCount: statistics.find(s => s.status === 'draft')?._count.id || 0,
        inTransitCount: statistics.find(s => s.status === 'in_transit')?._count.id || 0,
        deliveredCount: statistics.find(s => s.status === 'delivered')?._count.id || 0,
        cancelledCount: statistics.find(s => s.status === 'cancelled')?._count.id || 0,
        dropshipCount,
      },
    })
  } catch (error) {
    console.error('Error fetching Surat Jalan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Surat Jalan' },
      { status: 500 }
    )
  }
}

// POST /api/transaksi/surat-jalan - Create new Surat Jalan with dropship detection
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin', 'manager', 'staff_gudang', 'sales'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = suratJalanSchema.parse(body)

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 400 }
      )
    }

    // Check if warehouse exists
    const gudang = await prisma.gudang.findUnique({
      where: { id: validatedData.gudangId },
    })

    if (!gudang) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 400 }
      )
    }

    // Validate items and check stock/dropship
    const processedItems = await checkStockAndDropship(validatedData.items, validatedData.gudangId)

    // Calculate totals
    const totalQty = processedItems.reduce((sum, item) => sum + item.qty, 0)
    const totalNilai = processedItems.reduce((sum, item) => sum + (item.qty * item.hargaJual), 0)

    // Generate document number
    const noSJ = await generateNomorSJ()

    const suratJalan = await prisma.$transaction(async (tx) => {
      // Create Surat Jalan header
      const newSJ = await tx.suratJalan.create({
        data: {
          noSJ,
          tanggal: validatedData.tanggal,
          customerId: validatedData.customerId,
          gudangId: validatedData.gudangId,
          alamatKirim: validatedData.alamatKirim,
          namaSupir: validatedData.namaSupir,
          nopolKendaraan: validatedData.nopolKendaraan,
          keterangan: validatedData.keterangan,
          totalQty,
          totalNilai,
          status: 'draft',
          createdBy: session.user.id,
        },
        include: {
          customer: {
            select: {
              id: true,
              kode: true,
              nama: true,
              alamat: true,
              telepon: true,
            },
          },
          gudang: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
        },
      })

      // Create Surat Jalan details with dropship information
      const detailPromises = processedItems.map((item) =>
        tx.detailSuratJalan.create({
          data: {
            suratJalanId: newSJ.id,
            barangId: item.barangId,
            qty: item.qty,
            hargaJual: item.hargaJual,
            subtotal: item.qty * item.hargaJual,
            isDropship: item.isDropship,
            supplierId: item.supplierId,
            statusDropship: item.statusDropship,
            keterangan: item.keterangan,
          },
          include: {
            barang: {
              select: {
                id: true,
                kode: true,
                nama: true,
                satuan: true,
              },
            },
          },
        })
      )

      const details = await Promise.all(detailPromises)

      return {
        ...newSJ,
        detail: details.map((detail, index) => ({
          ...detail,
          currentStock: processedItems[index].currentStock,
          dropshipSupplier: processedItems[index].dropshipSupplier,
        }))
      }
    })

    // Check if there are dropship items and include notification
    const dropshipItems = processedItems.filter(item => item.isDropship)
    let message = 'Surat Jalan berhasil dibuat'

    if (dropshipItems.length > 0) {
      message += ` dengan ${dropshipItems.length} item dropship`
    }

    return NextResponse.json({
      success: true,
      data: suratJalan,
      message,
      dropshipSummary: {
        totalItems: processedItems.length,
        normalItems: processedItems.filter(item => !item.isDropship).length,
        dropshipItems: dropshipItems.length,
        readyToShip: processedItems.filter(item => !item.isDropship).length > 0,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating Surat Jalan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Surat Jalan' },
      { status: 500 }
    )
  }
}
