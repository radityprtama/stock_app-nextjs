import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

// Helper function to generate document number
async function generateDocumentNumber(): Promise<string> {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')

  // Get the last document number for this month
  const lastDeliveryOrder = await prisma.deliveryOrder.findFirst({
    where: {
      noDO: {
        startsWith: `DO/${year}/${month}/`
      }
    },
    orderBy: {
      noDO: 'desc'
    }
  })

  let sequence = 1
  if (lastDeliveryOrder) {
    const lastSequence = parseInt(lastDeliveryOrder.noDO.split('/')[3])
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1
    }
  }

  return `DO/${year}/${month}/${String(sequence).padStart(4, '0')}`
}

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'create' | 'update' | 'delete'): boolean {
  switch (action) {
    case 'create':
    case 'update':
      return ['admin', 'manager', 'staff_gudang'].includes(userRole)
    case 'delete':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// GET /api/transaksi/delivery-order
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
    const status = searchParams.get('status') || ''
    const gudangAsalId = searchParams.get('gudangAsalId') || ''

    const skip = (page - 1) * limit

    const where: any = {}

    if (search) {
      where.OR = [
        { noDO: { contains: search } },
        { gudangTujuan: { contains: search } },
        { namaSupir: { contains: search } },
        { nopolKendaraan: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (gudangAsalId) {
      where.gudangAsalId = gudangAsalId
    }

    const [deliveryOrders, total] = await Promise.all([
      prisma.deliveryOrder.findMany({
        where,
        include: {
          gudangAsal: true,
          detail: true,
          _count: {
            select: { detail: true }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.deliveryOrder.count({ where })
    ])

    return NextResponse.json({
      data: deliveryOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching delivery orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/transaksi/delivery-order
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !hasPermission(session.user.role, 'create')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Generate document number if not provided
    const noDO = body.noDO || await generateDocumentNumber()

    const deliveryOrder = await prisma.deliveryOrder.create({
      data: {
        noDO,
        tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
        gudangAsalId: body.gudangAsalId,
        gudangTujuan: body.gudangTujuan,
        namaSupir: body.namaSupir,
        nopolKendaraan: body.nopolKendaraan,
        keterangan: body.keterangan || null,
        status: 'draft',
        createdBy: session.user.id,
        detail: {
          create: body.items.map((item: any) => ({
            barangId: item.barangId,
            namaBarang: item.namaBarang,
            qty: item.qty,
            satuan: item.satuan,
            keterangan: item.keterangan || null,
          }))
        }
      },
      include: {
        gudangAsal: true,
        detail: true
      }
    })

    return NextResponse.json({
      success: true,
      data: deliveryOrder,
      message: 'Delivery Order created successfully'
    })
  } catch (error) {
    console.error('Error creating delivery order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}