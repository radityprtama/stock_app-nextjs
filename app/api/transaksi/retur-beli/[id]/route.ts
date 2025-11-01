import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { returBeliSchema } from '@/lib/validations'

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'update' | 'delete' | 'approve'): boolean {
  switch (action) {
    case 'update':
      return ['admin', 'manager', 'staff_gudang'].includes(userRole)
    case 'approve':
      return ['admin', 'manager'].includes(userRole)
    case 'delete':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// GET /api/transaksi/retur-beli/[id] - Get specific Retur Beli transaction
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

    const returBeli = await prisma.returBeli.findUnique({
      where: { id: id },
      include: {
        supplier: {
          select: {
            id: true,
            kode: true,
            nama: true,
            alamat: true,
            telepon: true,
            email: true,
          },
        },
        barangMasukRef: {
          select: {
            id: true,
            noDokumen: true,
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

    if (!returBeli) {
      return NextResponse.json(
        { error: 'Retur Beli tidak ditemukan' },
        { status: 404 }
      )
    }

    // Get current stock for each item
    const returBeliWithStock = {
      ...returBeli,
      detail: await Promise.all(
        returBeli.detail.map(async (detail) => {
          // Get stock from the main warehouse or first available warehouse
          const stock = await prisma.stokBarang.findFirst({
            where: {
              barangId: detail.barangId,
            },
            orderBy: {
              gudangId: 'asc',
            },
          })

          return {
            ...detail,
            currentStock: stock ? stock.qty : 0,
          }
        })
      ),
    }

    return NextResponse.json({
      success: true,
      data: returBeliWithStock,
    })
  } catch (error) {
    console.error('Error fetching Retur Beli:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Retur Beli transaction' },
      { status: 500 }
    )
  }
}

// PUT /api/transaksi/retur-beli/[id] - Update Retur Beli transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check permissions
    if (!hasPermission(session.user.role, 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if transaction exists and is in draft status
    const existingReturBeli = await prisma.returBeli.findUnique({
      where: { id: id },
    })

    if (!existingReturBeli) {
      return NextResponse.json(
        { error: 'Retur Beli tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingReturBeli.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status draft yang bisa diedit' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = returBeliSchema.parse(body)

    // Validate supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: { id: validatedData.supplierId },
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier tidak ditemukan' },
        { status: 400 }
      )
    }

    // Validate Barang Masuk reference if provided
    if (validatedData.barangMasukRef) {
      const barangMasuk = await prisma.barangMasuk.findUnique({
        where: { id: validatedData.barangMasukRef },
      })

      if (!barangMasuk) {
        return NextResponse.json(
          { error: 'Referensi Barang Masuk tidak ditemukan' },
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

    // Update transaction using a transaction to ensure data consistency
    const updatedReturBeli = await prisma.$transaction(async (tx) => {
      // Delete existing detail items
      await tx.detailReturBeli.deleteMany({
        where: { returBeliId: id },
      })

      // Update main transaction
      return await tx.returBeli.update({
        where: { id: id },
        data: {
          tanggal: validatedData.tanggal,
          supplierId: validatedData.supplierId,
          barangMasukRef: validatedData.barangMasukRef,
          totalQty,
          totalNilai,
          alasan: validatedData.alasan,
          detail: {
            create: validatedData.items.map(item => ({
              barangId: item.barangId,
              qty: item.qty,
              harga: item.harga,
              subtotal: item.qty * item.harga,
              alasan: item.alasan,
            })),
          },
        },
        include: {
          supplier: {
            select: {
              id: true,
              kode: true,
              nama: true,
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
    })

    return NextResponse.json({
      success: true,
      data: updatedReturBeli,
      message: 'Retur Beli berhasil diperbarui',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating Retur Beli:', error)
    return NextResponse.json(
      { error: 'Failed to update Retur Beli transaction' },
      { status: 500 }
    )
  }
}

// DELETE /api/transaksi/retur-beli/[id] - Delete Retur Beli transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check permissions
    if (!hasPermission(session.user.role, 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if transaction exists and is in draft status
    const existingReturBeli = await prisma.returBeli.findUnique({
      where: { id: id },
    })

    if (!existingReturBeli) {
      return NextResponse.json(
        { error: 'Retur Beli tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingReturBeli.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status draft yang bisa dihapus' },
        { status: 400 }
      )
    }

    // Delete transaction (cascade will delete detail items)
    await prisma.returBeli.delete({
      where: { id: id },
    })

    return NextResponse.json({
      success: true,
      message: 'Retur Beli berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting Retur Beli:', error)
    return NextResponse.json(
      { error: 'Failed to delete Retur Beli transaction' },
      { status: 500 }
    )
  }
}