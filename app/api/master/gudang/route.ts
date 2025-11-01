import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { gudangSchema } from '@/lib/validations'

// GET /api/master/gudang - Get all warehouses
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

    const where: Prisma.GudangWhereInput = {
      aktif: true,
    }

    const trimmedSearch = search.trim()

    if (trimmedSearch.length > 0) {
      where.OR = [
        { kode: { contains: trimmedSearch } },
        { nama: { contains: trimmedSearch } },
        { alamat: { contains: trimmedSearch } },
      ]
    }

    const [gudangs, total] = await Promise.all([
      prisma.gudang.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          _count: {
            select: {
              stokBarang: true,
              barangMasuk: true,
              suratJalan: true,
            },
          },
        },
      }),
      prisma.gudang.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: gudangs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching warehouses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch warehouses' },
      { status: 500 }
    )
  }
}

// POST /api/master/gudang - Create new warehouse
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
    const validatedData = gudangSchema.parse(body)

    // Check if kode already exists
    const existingGudang = await prisma.gudang.findUnique({
      where: { kode: validatedData.kode },
    })

    if (existingGudang) {
      return NextResponse.json(
        { error: 'Kode gudang sudah ada' },
        { status: 400 }
      )
    }

    const gudang = await prisma.gudang.create({
      data: validatedData,
    })

    return NextResponse.json({
      success: true,
      data: gudang,
      message: 'Gudang berhasil ditambahkan',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating warehouse:', error)
    return NextResponse.json(
      { error: 'Failed to create warehouse' },
      { status: 500 }
    )
  }
}
