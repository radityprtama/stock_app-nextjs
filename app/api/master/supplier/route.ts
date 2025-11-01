import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { supplierSchema } from '@/lib/validations'

// GET /api/master/supplier - Get all suppliers
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

    const where: Prisma.SupplierWhereInput = {
      aktif: true,
    }

    const trimmedSearch = search.trim()

    if (trimmedSearch.length > 0) {
      where.OR = [
        { kode: { contains: trimmedSearch } },
        { nama: { contains: trimmedSearch } },
        { alamat: { contains: trimmedSearch } },
        { telepon: { contains: trimmedSearch } },
        { email: { contains: trimmedSearch } },
      ]
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          _count: {
            select: {
              barangMasuk: true,
              returBeli: true,
              supplierBarang: true,
            },
          },
        },
      }),
      prisma.supplier.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

// POST /api/master/supplier - Create new supplier
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin', 'manager', 'staff_gudang'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = supplierSchema.parse(body)

    // Check if kode already exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { kode: validatedData.kode },
    })

    if (existingSupplier) {
      return NextResponse.json(
        { error: 'Kode supplier sudah ada' },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.create({
      data: validatedData,
    })

    return NextResponse.json({
      success: true,
      data: supplier,
      message: 'Supplier berhasil ditambahkan',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating supplier:', error)
    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    )
  }
}
