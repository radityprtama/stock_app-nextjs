import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { returBeliSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

// Helper function to generate document number
async function generateDocumentNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  // Get the last document number for this month
  const lastReturBeli = await prisma.returBeli.findFirst({
    where: {
      noRetur: {
        startsWith: `RB/${year}/${month}/`
      }
    },
    orderBy: {
      noRetur: 'desc'
    }
  })

  let sequence = 1
  if (lastReturBeli) {
    const lastSequence = parseInt(lastReturBeli.noRetur.split('/')[3])
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `RB/${year}/${month}/${String(sequence).padStart(4, '0')}`
}

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'create' | 'update' | 'delete' | 'approve'): boolean {
  switch (action) {
    case 'create':
    case 'update':
      return ['admin', 'manager', 'staff_gudang'].includes(userRole)
    case 'approve':
      return ['admin', 'manager'].includes(userRole)
    case 'delete':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// GET /api/transaksi/retur-beli - Get all Retur Beli transactions with filtering
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
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.ReturBeliWhereInput = {}

    const trimmedSearch = search.trim()

    if (trimmedSearch.length > 0) {
      where.OR = [
        { noRetur: { contains: trimmedSearch } },
        { alasan: { contains: trimmedSearch } },
        { supplier: { nama: { contains: trimmedSearch } } },
      ]
    }

    if (supplierId) {
      where.supplierId = supplierId
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

    const [returBelis, total] = await Promise.all([
      prisma.returBeli.findMany({
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
      prisma.returBeli.count({ where }),
    ])

    // Calculate statistics
    const statistics = await prisma.returBeli.groupBy({
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
      data: returBelis,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        totalTransactions: total,
        draftCount: statistics.find(s => s.status === 'draft')?._count.id || 0,
        approvedCount: statistics.find(s => s.status === 'approved')?._count.id || 0,
        completedCount: statistics.find(s => s.status === 'completed')?._count.id || 0,
        totalValue: statistics.reduce((sum, s) => sum + Number(s._sum.totalNilai || 0), 0),
        totalQuantity: statistics.reduce((sum, s) => sum + (s._sum.totalQty || 0), 0),
      },
    })
  } catch (error) {
    console.error('Error fetching Retur Beli:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Retur Beli transactions' },
      { status: 500 }
    )
  }
}

// POST /api/transaksi/retur-beli - Create new Retur Beli transaction
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
    const validatedData = returBeliSchema.parse(body)

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

    // Validate Barang Masuk reference if provided
    if (validatedData.barangMasukRef) {
      const barangMasuk = await prisma.barangMasuk.findUnique({
        where: { id: validatedData.barangMasukRef },
      })

      if (!barangMasuk) {
        return NextResponse.json(
          { error: 'Referensi Barang Masuk tidak ditemukan' },
          { status: 400 }
        )
      }
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
    const noRetur = await generateDocumentNumber()

    // Create transaction with items
    const returBeli = await prisma.returBeli.create({
      data: {
        noRetur,
        tanggal: validatedData.tanggal,
        supplierId: validatedData.supplierId,
        barangMasukRef: validatedData.barangMasukRef,
        totalQty,
        totalNilai,
        alasan: validatedData.alasan,
        status: 'draft',
        createdBy: session.user.id,
        detail: {
          create: validatedData.items.map(item => ({
            barangId: item.barangId,
            qty: item.qty,
            harga: item.harga,
            subtotal: item.qty * item.harga,
            alasan: item.alasan,
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
      data: returBeli,
      message: 'Retur Beli berhasil dibuat',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating Retur Beli:', error)
    return NextResponse.json(
      { error: 'Failed to create Retur Beli transaction' },
      { status: 500 }
    )
  }
}
