import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { customerSchema } from '@/lib/validations'

// GET /api/master/customer - Get all customers
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
    const tipePelanggan = searchParams.get('tipePelanggan')

    const skip = (page - 1) * limit

    const where: any = {
      aktif: true,
      OR: [
        { kode: { contains: search, mode: 'insensitive' as const } },
        { nama: { contains: search, mode: 'insensitive' as const } },
        { alamat: { contains: search, mode: 'insensitive' as const } },
        { telepon: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }

    if (tipePelanggan && tipePelanggan !== 'all') {
      where.tipePelanggan = tipePelanggan
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              suratJalan: true,
              returJual: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// POST /api/master/customer - Create new customer
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin', 'manager', 'sales'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = customerSchema.parse(body)

    // Check if kode already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { kode: validatedData.kode },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Kode customer sudah ada' },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: validatedData,
    })

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer berhasil ditambahkan',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}