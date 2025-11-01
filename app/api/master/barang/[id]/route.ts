import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'
import { barangSchema } from '@/lib/validations'

// GET /api/master/barang/[id] - Get specific item with detailed information
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
    const barang = await prisma.barang.findUnique({
      where: { id },
      include: {
        golongan: {
          select: {
            id: true,
            kode: true,
            nama: true,
            deskripsi: true,
          },
        },
        stokBarang: {
          include: {
            gudang: {
              select: {
                id: true,
                kode: true,
                nama: true,
                alamat: true,
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
                telepon: true,
                email: true,
              },
            },
          },
          orderBy: {
            isPrimary: 'desc',
          },
        },
        detailBarangMasuk: {
          include: {
            barangMasuk: {
              select: {
                id: true,
                noDokumen: true,
                tanggal: true,
                supplier: {
                  select: {
                    id: true,
                    kode: true,
                    nama: true,
                  },
                },
              },
            },
          },
          orderBy: {
            barangMasuk: {
              tanggal: 'desc',
            },
          },
          take: 10,
        },
        detailSuratJalan: {
          include: {
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
          },
          orderBy: {
            suratJalan: {
              tanggal: 'desc',
            },
          },
          take: 10,
        },
        _count: {
          select: {
            stokBarang: true,
            detailBarangMasuk: true,
            detailSuratJalan: true,
            detailReturBeli: true,
            detailReturJual: true,
            supplierBarang: true,
          },
        },
      },
    })

    if (!barang) {
      return NextResponse.json(
        { error: 'Barang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Calculate current stock and value
    const totalStock = barang.stokBarang.reduce((sum, stok) => sum + stok.qty, 0)
    const totalStockValue = totalStock * Number(barang.hargaBeli)
    const isLowStock = totalStock < barang.minStok
    const isOverStock = barang.maxStok ? totalStock > barang.maxStok : false

    // Get recent transactions summary
    const recentTransactions = {
      barangMasuk: barang.detailBarangMasuk.length,
      suratJalan: barang.detailSuratJalan.length,
    }

    return NextResponse.json({
      success: true,
      data: {
        ...barang,
        calculated: {
          totalStock,
          totalStockValue,
          isLowStock,
          isOverStock,
          recentTransactions,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    )
  }
}

// PUT /api/master/barang/[id] - Update item
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

    // Check if user has permission
    if (!['admin', 'manager', 'staff_gudang'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = barangSchema.parse(body)

    // Check if barang exists
    const existingBarang = await prisma.barang.findUnique({
      where: { id: id },
    })

    if (!existingBarang) {
      return NextResponse.json(
        { error: 'Barang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if kode already exists (excluding current barang)
    const duplicateKode = await prisma.barang.findFirst({
      where: {
        kode: validatedData.kode,
        id: { not: id },
      },
    })

    if (duplicateKode) {
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

    const barang = await prisma.barang.update({
      where: { id: id },
      data: validatedData,
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
      },
    })

    return NextResponse.json({
      success: true,
      data: barang,
      message: 'Barang berhasil diperbarui',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error updating item:', error)
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    )
  }
}

// DELETE /api/master/barang/[id] - Delete item (soft delete)
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

    // Check if user has permission
    if (!['admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if barang exists and get related data counts
    const existingBarang = await prisma.barang.findUnique({
      where: { id: id },
      include: {
        _count: {
          select: {
            stokBarang: true,
            detailBarangMasuk: true,
            detailSuratJalan: true,
            detailReturBeli: true,
            detailReturJual: true,
            supplierBarang: true,
          },
        },
        stokBarang: {
          select: {
            id: true,
            qty: true,
          },
        },
      },
    })

    if (!existingBarang) {
      return NextResponse.json(
        { error: 'Barang tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check if barang has stock or transactions
    const totalStock = existingBarang.stokBarang.reduce((sum, stok) => sum + stok.qty, 0)
    const hasTransactions =
      existingBarang._count.detailBarangMasuk > 0 ||
      existingBarang._count.detailSuratJalan > 0 ||
      existingBarang._count.detailReturBeli > 0 ||
      existingBarang._count.detailReturJual > 0

    if (totalStock > 0 || hasTransactions) {
      return NextResponse.json(
        {
          error: 'Tidak dapat menghapus barang yang memiliki stok atau transaksi terkait. Gunakan fitur non-aktifkan untuk menyembunyikan barang.'
        },
        { status: 400 }
      )
    }

    // Soft delete
    await prisma.barang.update({
      where: { id: id },
      data: { aktif: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Barang berhasil dihapus',
    })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    )
  }
}