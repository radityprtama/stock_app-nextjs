import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { returJualSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

// Helper function to generate document number
async function generateDocumentNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  // Get the last document number for this month
  const lastReturJual = await prisma.returJual.findFirst({
    where: {
      noRetur: {
        startsWith: `RJ/${year}/${month}/`
      }
    },
    orderBy: {
      noRetur: 'desc'
    }
  })

  let sequence = 1
  if (lastReturJual) {
    const lastSequence = parseInt(lastReturJual.noRetur.split('/')[3])
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `RJ/${year}/${month}/${String(sequence).padStart(4, '0')}`
}

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'create' | 'update' | 'delete' | 'approve'): boolean {
  switch (action) {
    case 'create':
    case 'update':
      return ['admin', 'manager', 'sales'].includes(userRole)
    case 'approve':
      return ['admin', 'manager'].includes(userRole)
    case 'delete':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// GET /api/transaksi/retur-jual - Get all Retur Jual transactions with filtering
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
    const status = searchParams.get('status') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.ReturJualWhereInput = {}

    const trimmedSearch = search.trim()

    if (trimmedSearch.length > 0) {
      where.OR = [
        { noRetur: { contains: trimmedSearch } },
        { alasan: { contains: trimmedSearch } },
        { customer: { nama: { contains: trimmedSearch } } },
      ]
    }

    if (customerId) {
      where.customerId = customerId
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

    const [returJuals, total] = await Promise.all([
      prisma.returJual.findMany({
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
            },
          },
          suratJalan: {
            select: {
              id: true,
              noSJ: true,
              tanggal: true,
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
      prisma.returJual.count({ where }),
    ])

    // Calculate statistics
    const statistics = await prisma.returJual.groupBy({
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
      data: returJuals,
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
    console.error('Error fetching Retur Jual:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Retur Jual transactions' },
      { status: 500 }
    )
  }
}

// POST /api/transaksi/retur-jual - Create new Retur Jual transaction
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
    const validatedData = returJualSchema.parse(body)

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 400 }
      )
    }

    // Validate Surat Jalan reference if provided
    if (validatedData.suratJalanId) {
      const suratJalan = await prisma.suratJalan.findUnique({
        where: { id: validatedData.suratJalanId },
      })

      if (!suratJalan) {
        return NextResponse.json(
          { error: 'Referensi Surat Jalan tidak ditemukan' },
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
    const returJual = await prisma.returJual.create({
      data: {
        noRetur,
        tanggal: validatedData.tanggal,
        customerId: validatedData.customerId,
        suratJalanId: validatedData.suratJalanId,
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
            kondisi: item.kondisi,
          })),
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
        suratJalan: {
          select: {
            id: true,
            noSJ: true,
            tanggal: true,
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
      data: returJual,
      message: 'Retur Jual berhasil dibuat',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating Retur Jual:', error)
    return NextResponse.json(
      { error: 'Failed to create Retur Jual transaction' },
      { status: 500 }
    )
  }
}
