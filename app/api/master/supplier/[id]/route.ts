import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { supplierSchema } from '@/lib/validations'

// GET /api/master/supplier/[id] - Get specific supplier
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

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        barangMasuk: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { detail: true },
            },
          },
        },
        returBeli: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        supplierBarang: {
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
            returBeli: true,
            supplierBarang: true,
          },
        },
      },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: supplier,
    })
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    )
  }
}

// PUT /api/master/supplier/[id] - Update supplier
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
    if (!['admin', 'manager', 'staff_gudang'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const body = await request.json()
    const validatedData = supplierSchema.parse(body)

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
    })

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if kode already exists (excluding current supplier)
    const duplicateKode = await prisma.supplier.findFirst({
      where: {
        kode: validatedData.kode,
        id: { not: id },
      },
    })

    if (duplicateKode) {
      return NextResponse.json(
        { error: 'Kode supplier sudah ada' },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json({
      success: true,
      data: supplier,
      message: 'Supplier berhasil diperbarui',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating supplier:', error)
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    )
  }
}

// DELETE /api/master/supplier/[id] - Delete supplier (soft delete)
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

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            barangMasuk: true,
            returBeli: true,
            supplierBarang: true,
          },
        },
      },
    })

    if (!existingSupplier) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if supplier has related data
    if (
      existingSupplier._count.barangMasuk > 0 ||
      existingSupplier._count.returBeli > 0 ||
      existingSupplier._count.supplierBarang > 0
    ) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus supplier yang memiliki transaksi atau barang terkait' },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.supplier.update({
      where: { id },
      data: { aktif: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Supplier berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    )
  }
}