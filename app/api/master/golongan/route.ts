import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { golonganSchema } from '@/lib/validations'

// GET /api/master/golongan - Get all categories
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

    const skip = (page - 1) * limit

    const where = {
      aktif: true,
      OR: [
        { kode: { contains: search, mode: 'insensitive' as const } },
        { nama: { contains: search, mode: 'insensitive' as const } },
        { deskripsi: { contains: search, mode: 'insensitive' as const } },
      ],
    }

    const [golongans, total] = await Promise.all([
      prisma.golongan.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              barang: true,
            },
          },
        },
      }),
      prisma.golongan.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: golongans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/master/golongan - Create new category
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = golonganSchema.parse(body)

    // Check if kode already exists
    const existingGolongan = await prisma.golongan.findUnique({
      where: { kode: validatedData.kode },
    })

    if (existingGolongan) {
      return NextResponse.json(
        { error: 'Kode golongan sudah ada' },
        { status: 400 }
      )
    }

    const golongan = await prisma.golongan.create({
      data: validatedData,
    })

    return NextResponse.json({
      success: true,
      data: golongan,
      message: 'Golongan berhasil ditambahkan',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}