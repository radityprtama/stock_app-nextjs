import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { barangMasukSchema } from '@/lib/validations'

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'create' | 'update' | 'delete' | 'post'): boolean {
  switch (action) {
    case 'create':
    case 'update':
      return ['admin', 'manager', 'staff_gudang'].includes(userRole)
    case 'post':
      return ['admin', 'manager'].includes(userRole)
    case 'delete':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// GET /api/transaksi/barang-masuk/[id] - Get single Barang Masuk transaction
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

    const barangMasuk = await prisma.barangMasuk.findUnique({
      where: { id },
      include: {
        supplier: {
          select: {
            id: true,
            kode: true,
            nama: true,
            alamat: true,
            telepon: true,
            email: true,
            npwp: true,
          },
        },
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
            alamat: true,
            telepon: true,
            pic: true,
          },
        },
        detail: {
          include: {
            barang: {
              select: {
                id: true,
                kode: true,
                nama: true,
                merk: true,
                tipe: true,
                ukuran: true,
                satuan: true,
              },
            },
          },
        },
      },
    })

    if (!barangMasuk) {
      return NextResponse.json(
        { error: 'Barang Masuk tidak ditemukan' },
        { status: 404 }
      )
    }

    // Get current stock for each item
    const currentStocks = await Promise.all(
      barangMasuk.detail.map(async (detail) => {
        const stokBarang = await prisma.stokBarang.findUnique({
          where: {
            barangId_gudangId: {
              barangId: detail.barangId,
              gudangId: barangMasuk.gudangId,
            },
          },
        })
        return {
          barangId: detail.barangId,
          currentStock: stokBarang?.qty || 0,
        }
      })
    )

    const dataWithStock = {
      ...barangMasuk,
      detail: barangMasuk.detail.map((detail) => ({
        ...detail,
        currentStock: currentStocks.find(s => s.barangId === detail.barangId)?.currentStock || 0,
      })),
    }

    return NextResponse.json({
      success: true,
      data: dataWithStock,
    })
  } catch (error) {
    console.error('Error fetching Barang Masuk:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Barang Masuk transaction' },
      { status: 500 }
    )
  }
}

// PUT /api/transaksi/barang-masuk/[id] - Update Barang Masuk transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user.role, 'update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if transaction exists and is in draft status
    const existingTransaction = await prisma.barangMasuk.findUnique({
      where: { id },
      include: { detail: true },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Barang Masuk tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingTransaction.status === 'posted') {
      return NextResponse.json(
        { error: 'Tidak dapat mengubah transaksi yang sudah diposting' },
        { status: 400 }
      )
    }

    if (existingTransaction.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Tidak dapat mengubah transaksi yang dibatalkan' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = barangMasukSchema.parse(body)

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

    // Validate gudang exists
    const gudang = await prisma.gudang.findUnique({
      where: { id: validatedData.gudangId },
    })

    if (!gudang) {
      return NextResponse.json(
        { error: 'Gudang tidak ditemukan' },
        { status: 400 }
      )
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

    // Update transaction using Prisma transaction for atomicity
    const updatedBarangMasuk = await prisma.$transaction(async (tx) => {
      // Delete existing detail items
      await tx.detailBarangMasuk.deleteMany({
        where: { barangMasukId: id },
      })

      // Update main transaction
      const updated = await tx.barangMasuk.update({
        where: { id },
        data: {
          tanggal: validatedData.tanggal,
          supplierId: validatedData.supplierId,
          gudangId: validatedData.gudangId,
          totalQty,
          totalNilai,
          keterangan: validatedData.keterangan,
          detail: {
            create: validatedData.items.map(item => ({
              barangId: item.barangId,
              qty: item.qty,
              harga: item.harga,
              subtotal: item.qty * item.harga,
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
          gudang: {
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

      return updated
    })

    return NextResponse.json({
      success: true,
      data: updatedBarangMasuk,
      message: 'Barang Masuk berhasil diperbarui',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating Barang Masuk:', error)
    return NextResponse.json(
      { error: 'Failed to update Barang Masuk transaction' },
      { status: 500 }
    )
  }
}

// DELETE /api/transaksi/barang-masuk/[id] - Delete Barang Masuk transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user.role, 'delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if transaction exists and can be deleted
    const existingTransaction = await prisma.barangMasuk.findUnique({
      where: { id },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Barang Masuk tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingTransaction.status === 'posted') {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus transaksi yang sudah diposting' },
        { status: 400 }
      )
    }

    if (existingTransaction.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus transaksi yang sudah dibatalkan' },
        { status: 400 }
      )
    }

    // Delete transaction (cascade will delete details)
    await prisma.barangMasuk.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Barang Masuk berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting Barang Masuk:', error)
    return NextResponse.json(
      { error: 'Failed to delete Barang Masuk transaction' },
      { status: 500 }
    )
  }
}

// POST /api/transaksi/barang-masuk/[id]/post - Post Barang Masuk transaction (update stock)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user.role, 'post')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if transaction exists and is in draft status
    const existingTransaction = await prisma.barangMasuk.findUnique({
      where: { id },
      include: {
        detail: true,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json(
        { error: 'Barang Masuk tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingTransaction.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status draft yang bisa diposting' },
        { status: 400 }
      )
    }

    // Perform transaction with stock updates
    const postedTransaction = await prisma.$transaction(async (tx) => {
      // Update stock for each item
      for (const detail of existingTransaction.detail) {
        const existingStock = await tx.stokBarang.findUnique({
          where: {
            barangId_gudangId: {
              barangId: detail.barangId,
              gudangId: existingTransaction.gudangId,
            },
          },
        })

        if (existingStock) {
          // Update existing stock
          await tx.stokBarang.update({
            where: {
              barangId_gudangId: {
                barangId: detail.barangId,
                gudangId: existingTransaction.gudangId,
              },
            },
            data: {
              qty: existingStock.qty + detail.qty,
            },
          })
        } else {
          // Create new stock record
          await tx.stokBarang.create({
            data: {
              barangId: detail.barangId,
              gudangId: existingTransaction.gudangId,
              qty: detail.qty,
            },
          })
        }
      }

      // Update transaction status
      const updated = await tx.barangMasuk.update({
        where: { id },
        data: {
          status: 'posted',
        },
        include: {
          supplier: {
            select: {
              id: true,
              kode: true,
              nama: true,
            },
          },
          gudang: {
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

      return updated
    })

    return NextResponse.json({
      success: true,
      data: postedTransaction,
      message: 'Barang Masuk berhasil diposting dan stok diperbarui',
    })
  } catch (error) {
    console.error('Error posting Barang Masuk:', error)
    return NextResponse.json(
      { error: 'Failed to post Barang Masuk transaction' },
      { status: 500 }
    )
  }
}