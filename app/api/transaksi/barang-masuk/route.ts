import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { barangMasukSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

// Helper function to generate document number
async function generateDocumentNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  // Get the last document number for this month
  const lastBarangMasuk = await prisma.barangMasuk.findFirst({
    where: {
      noDokumen: {
        startsWith: `BM/${year}/${month}/`
      }
    },
    orderBy: {
      noDokumen: 'desc'
    }
  })

  let sequence = 1
  if (lastBarangMasuk) {
    const lastSequence = parseInt(lastBarangMasuk.noDokumen.split('/')[3])
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `BM/${year}/${month}/${String(sequence).padStart(4, '0')}`
}

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'create' | 'update' | 'delete' | 'post'): boolean {
  switch (action) {
    case 'create':
    case 'update':
      return ['admin', 'manager', 'staff_gudang'].includes(userRole)
    case 'post':
      return ['admin', 'manager'].includes(userRole)
    case 'delete':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// GET /api/transaksi/barang-masuk - Get all Barang Masuk transactions with filtering
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
    const supplierId = searchParams.get('supplierId') || ''
    const gudangId = searchParams.get('gudangId') || ''
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.BarangMasukWhereInput = {}

    const trimmedSearch = search.trim()

    if (trimmedSearch.length > 0) {
      where.OR = [
        { noDokumen: { contains: trimmedSearch } },
        { keterangan: { contains: trimmedSearch } },
        { supplier: { nama: { contains: trimmedSearch } } },
        { gudang: { nama: { contains: trimmedSearch } } },
      ]
    }

    if (supplierId) {
      where.supplierId = supplierId
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

    const [barangMasuks, total] = await Promise.all([
      prisma.barangMasuk.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          supplier: {
            select: {
              id: true,
              kode: true,
              nama: true,
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
            },
          },
        },
      }),
      prisma.barangMasuk.count({ where }),
    ])

    // Calculate statistics
    const statistics = await prisma.barangMasuk.groupBy({
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

    return NextResponse.json({
      success: true,
      data: barangMasuks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        totalTransactions: total,
        draftCount: statistics.find(s => s.status === 'draft')?._count.id || 0,
        postedCount: statistics.find(s => s.status === 'posted')?._count.id || 0,
        cancelledCount: statistics.find(s => s.status === 'cancelled')?._count.id || 0,
        totalValue: statistics.reduce(
          (sum, stat) => sum + Number(stat._sum.totalNilai ?? 0),
          0
        ),
        totalQuantity: statistics.reduce(
          (sum, stat) => sum + Number(stat._sum.totalQty ?? 0),
          0
        ),
      },
    })
  } catch (error) {
    console.error('Error fetching Barang Masuk:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Barang Masuk transactions' },
      { status: 500 }
    )
  }
}

// POST /api/transaksi/barang-masuk - Create new Barang Masuk transaction
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user.role, 'create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = barangMasukSchema.parse(body)

    // Validate supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: validatedData.supplierId },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 400 }
      )
    }

    // Validate gudang exists
    const gudang = await prisma.gudang.findUnique({
      where: { id: validatedData.gudangId },
    })

    if (!gudang) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 400 }
      )
    }

    // Validate all items exist
    const barangIds = validatedData.items.map(item => item.barangId)
    const barangs = await prisma.barang.findMany({
      where: { id: { in: barangIds } },
    })

    if (barangs.length !== barangIds.length) {
      return NextResponse.json(
        { error: 'Salah satu atau beberapa barang tidak ditemukan' },
        { status: 400 }
      )
    }

    // Calculate totals
    const totalQty = validatedData.items.reduce((sum, item) => sum + item.qty, 0)
    const totalNilai = validatedData.items.reduce((sum, item) => sum + (item.qty * item.harga), 0)

    // Generate document number
    const noDokumen = await generateDocumentNumber()

    // Create transaction with items
    const barangMasuk = await prisma.barangMasuk.create({
      data: {
        noDokumen,
        tanggal: validatedData.tanggal,
        supplierId: validatedData.supplierId,
        gudangId: validatedData.gudangId,
        totalQty,
        totalNilai,
        keterangan: validatedData.keterangan,
        status: 'draft',
        createdBy: session.user.id,
        detail: {
          create: validatedData.items.map(item => ({
            barangId: item.barangId,
            qty: item.qty,
            harga: item.harga,
            subtotal: item.qty * item.harga,
          })),
        },
      },
      include: {
        supplier: {
          select: {
            id: true,
            kode: true,
            nama: true,
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
      },
    })

    return NextResponse.json({
      success: true,
      data: barangMasuk,
      message: 'Barang Masuk berhasil dibuat',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating Barang Masuk:', error)
    return NextResponse.json(
      { error: 'Failed to create Barang Masuk transaction' },
      { status: 500 }
    )
  }
}
