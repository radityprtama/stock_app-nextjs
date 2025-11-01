import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { returJualSchema } from '@/lib/validations'

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'update' | 'delete' | 'approve'): boolean {
  switch (action) {
    case 'update':
      return ['admin', 'manager', 'sales'].includes(userRole)
    case 'approve':
      return ['admin', 'manager'].includes(userRole)
    case 'delete':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// GET /api/transaksi/retur-jual/[id] - Get specific Retur Jual transaction
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

    const returJual = await prisma.returJual.findUnique({
      where: { id: id },
      include: {
        customer: {
          select: {
            id: true,
            kode: true,
            nama: true,
            alamat: true,
            telepon: true,
            email: true,
          },
        },
        suratJalan: {
          select: {
            id: true,
            noSJ: true,
            tanggal: true,
            customer: {
              select: {
                id: true,
                kode: true,
                nama: true,
              },
            },
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

    if (!returJual) {
      return NextResponse.json(
        { error: 'Retur Jual tidak ditemukan' },
        { status: 404 }
      )
    }

    // Get current stock for each item
    const returJualWithStock = {
      ...returJual,
      detail: await Promise.all(
        returJual.detail.map(async (detail) => {
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
      data: returJualWithStock,
    })
  } catch (error) {
    console.error('Error fetching Retur Jual:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Retur Jual transaction' },
      { status: 500 }
    )
  }
}

// PUT /api/transaksi/retur-jual/[id] - Update Retur Jual transaction
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
    const existingReturJual = await prisma.returJual.findUnique({
      where: { id: id },
    })

    if (!existingReturJual) {
      return NextResponse.json(
        { error: 'Retur Jual tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingReturJual.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status draft yang bisa diedit' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = returJualSchema.parse(body)

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer tidak ditemukan' },
        { status: 400 }
      )
    }

    // Validate Surat Jalan reference if provided
    if (validatedData.suratJalanId) {
      const suratJalan = await prisma.suratJalan.findUnique({
        where: { id: validatedData.suratJalanId },
      })

      if (!suratJalan) {
        return NextResponse.json(
          { error: 'Referensi Surat Jalan tidak ditemukan' },
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
    const updatedReturJual = await prisma.$transaction(async (tx) => {
      // Delete existing detail items
      await tx.detailReturJual.deleteMany({
        where: { returJualId: id },
      })

      // Update main transaction
      return await tx.returJual.update({
        where: { id: id },
        data: {
          tanggal: validatedData.tanggal,
          customerId: validatedData.customerId,
          suratJalanId: validatedData.suratJalanId,
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
              kondisi: item.kondisi,
            })),
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
          suratJalan: {
            select: {
              id: true,
              noSJ: true,
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
    })

    return NextResponse.json({
      success: true,
      data: updatedReturJual,
      message: 'Retur Jual berhasil diperbarui',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating Retur Jual:', error)
    return NextResponse.json(
      { error: 'Failed to update Retur Jual transaction' },
      { status: 500 }
    )
  }
}

// DELETE /api/transaksi/retur-jual/[id] - Delete Retur Jual transaction
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
    const existingReturJual = await prisma.returJual.findUnique({
      where: { id: id },
    })

    if (!existingReturJual) {
      return NextResponse.json(
        { error: 'Retur Jual tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingReturJual.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status draft yang bisa dihapus' },
        { status: 400 }
      )
    }

    // Delete transaction (cascade will delete detail items)
    await prisma.returJual.delete({
      where: { id: id },
    })

    return NextResponse.json({
      success: true,
      message: 'Retur Jual berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting Retur Jual:', error)
    return NextResponse.json(
      { error: 'Failed to delete Retur Jual transaction' },
      { status: 500 }
    )
  }
}