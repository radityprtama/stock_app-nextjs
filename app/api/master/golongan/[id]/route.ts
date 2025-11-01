import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { golonganSchema } from '@/lib/validations'

// GET /api/master/golongan/[id] - Get specific category
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

    const golongan = await prisma.golongan.findUnique({
      where: { id },
      include: {
        barang: {
          include: {
            stokBarang: true,
          },
        },
        _count: {
          select: {
            barang: true,
          },
        },
      },
    })

    if (!golongan) {
      return NextResponse.json(
        { error: 'Golongan tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: golongan,
    })
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

// PUT /api/master/golongan/[id] - Update category
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
    const validatedData = golonganSchema.parse(body)

    // Check if golongan exists
    const existingGolongan = await prisma.golongan.findUnique({
      where: { id },
    })

    if (!existingGolongan) {
      return NextResponse.json(
        { error: 'Golongan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if kode already exists (excluding current golongan)
    const duplicateKode = await prisma.golongan.findFirst({
      where: {
        kode: validatedData.kode,
        id: { not: id },
      },
    })

    if (duplicateKode) {
      return NextResponse.json(
        { error: 'Kode golongan sudah ada' },
        { status: 400 }
      )
    }

    const golongan = await prisma.golongan.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json({
      success: true,
      data: golongan,
      message: 'Golongan berhasil diperbarui',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE /api/master/golongan/[id] - Delete category (soft delete)
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

    // Check if golongan exists
    const existingGolongan = await prisma.golongan.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            barang: true,
          },
        },
      },
    })

    if (!existingGolongan) {
      return NextResponse.json(
        { error: 'Golongan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if golongan has related data
    if (existingGolongan._count.barang > 0) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus golongan yang memiliki data barang terkait' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.golongan.update({
      where: { id },
      data: { aktif: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Golongan berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}