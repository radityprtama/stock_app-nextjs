import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { gudangSchema } from '@/lib/validations'

// GET /api/master/gudang/[id] - Get specific warehouse
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const gudang = await prisma.gudang.findUnique({
      where: { id },
      include: {
        stokBarang: {
          include: {
            barang: {
              include: {
                golongan: true,
              },
            },
          },
        },
        _count: {
          select: {
            barangMasuk: true,
            suratJalan: true,
            deliveryOrders: true,
          },
        },
      },
    })

    if (!gudang) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: gudang,
    })
  } catch (error) {
    console.error('Error fetching warehouse:', error)
    return NextResponse.json(
      { error: 'Failed to fetch warehouse' },
      { status: 500 }
    )
  }
}

// PUT /api/master/gudang/[id] - Update warehouse
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const body = await request.json()
    const validatedData = gudangSchema.parse(body)

    // Check if gudang exists
    const existingGudang = await prisma.gudang.findUnique({
      where: { id },
    })

    if (!existingGudang) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if kode already exists (excluding current gudang)
    const duplicateKode = await prisma.gudang.findFirst({
      where: {
        kode: validatedData.kode,
        id: { not: id },
      },
    })

    if (duplicateKode) {
      return NextResponse.json(
        { error: 'Kode gudang sudah ada' },
        { status: 400 }
      )
    }

    const gudang = await prisma.gudang.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json({
      success: true,
      data: gudang,
      message: 'Gudang berhasil diperbarui',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating warehouse:', error)
    return NextResponse.json(
      { error: 'Failed to update warehouse' },
      { status: 500 }
    )
  }
}

// DELETE /api/master/gudang/[id] - Delete warehouse (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if gudang exists
    const existingGudang = await prisma.gudang.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stokBarang: true,
            barangMasuk: true,
            suratJalan: true,
          },
        },
      },
    })

    if (!existingGudang) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if gudang has related data
    if (
      existingGudang._count.stokBarang > 0 ||
      existingGudang._count.barangMasuk > 0 ||
      existingGudang._count.suratJalan > 0
    ) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus gudang yang memiliki data terkait' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.gudang.update({
      where: { id },
      data: { aktif: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Gudang berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting warehouse:', error)
    return NextResponse.json(
      { error: 'Failed to delete warehouse' },
      { status: 500 }
    )
  }
}