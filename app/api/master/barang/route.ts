import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { barangSchema } from '@/lib/validations'
import { Prisma } from '@prisma/client'

// GET /api/master/barang - Get all items with advanced filtering and statistics
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
    const golonganId = searchParams.get('golonganId') || ''
    const isDropship = searchParams.get('isDropship')
    const aktif = searchParams.get('aktif')

    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.BarangWhereInput = {}

    const trimmedSearch = search.trim()

    if (trimmedSearch.length > 0) {
      where.OR = [
        { kode: { contains: trimmedSearch } },
        { nama: { contains: trimmedSearch } },
        { merk: { contains: trimmedSearch } },
        { tipe: { contains: trimmedSearch } },
        { ukuran: { contains: trimmedSearch } },
      ]
    }

    if (golonganId) {
      where.golonganId = golonganId
    }

    if (isDropship !== null && isDropship !== undefined) {
      where.isDropship = isDropship === 'true'
    }

    if (aktif !== null && aktif !== undefined) {
      where.aktif = aktif === 'true'
    }

    const [barangs, total] = await Promise.all([
      prisma.barang.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          golongan: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
          stokBarang: {
            include: {
              gudang: {
                select: {
                  id: true,
                  kode: true,
                  nama: true,
                },
              },
            },
          },
          supplierBarang: {
            include: {
              supplier: {
                select: {
                  id: true,
                  kode: true,
                  nama: true,
                },
              },
            },
          },
          _count: {
            select: {
              detailBarangMasuk: true,
              detailSuratJalan: true,
              detailReturBeli: true,
              detailReturJual: true,
            },
          },
        },
      }),
      prisma.barang.count({ where }),
    ])

    // Calculate additional statistics
    const statistics = await prisma.barang.groupBy({
      by: ['aktif', 'isDropship'],
      _count: {
        id: true,
      },
      where: trimmedSearch.length > 0 ? where : undefined,
    })

    const totalStockValue = barangs.reduce((total, barang) => {
      const totalQty = barang.stokBarang.reduce((sum, stok) => sum + stok.qty, 0)
      return total + (totalQty * Number(barang.hargaBeli))
    }, 0)

    const lowStockItems = barangs.filter(barang => {
      const totalQty = barang.stokBarang.reduce((sum, stok) => sum + stok.qty, 0)
      return totalQty < barang.minStok
    })

    return NextResponse.json({
      success: true,
      data: barangs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        totalStockValue,
        lowStockCount: lowStockItems.length,
        activeItems: statistics.find(s => s.aktif === true)?._count.id || 0,
        inactiveItems: statistics.find(s => s.aktif === false)?._count.id || 0,
        dropshipItems: statistics.find(s => s.isDropship === true)?._count.id || 0,
        ownStockItems: statistics.find(s => s.isDropship === false)?._count.id || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    )
  }
}

// POST /api/master/barang - Create new item
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
    const validatedData = barangSchema.parse(body)

    // Check if kode already exists
    const existingBarang = await prisma.barang.findUnique({
      where: { kode: validatedData.kode },
    })

    if (existingBarang) {
      return NextResponse.json(
        { error: 'Kode barang sudah ada' },
        { status: 400 }
      )
    }

    // Check if golongan exists
    const golongan = await prisma.golongan.findUnique({
      where: { id: validatedData.golonganId },
    })

    if (!golongan) {
      return NextResponse.json(
        { error: 'Golongan tidak ditemukan' },
        { status: 400 }
      )
    }

    const barang = await prisma.barang.create({
      data: validatedData,
      include: {
        golongan: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: barang,
      message: 'Barang berhasil ditambahkan',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating item:', error)
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    )
  }
}
