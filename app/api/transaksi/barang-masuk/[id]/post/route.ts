import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Prisma } from '@prisma/client'

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

// POST /api/transaksi/barang-masuk/[id]/post - Post Barang Masuk transaction
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

    // Check if Barang Masuk exists and is in draft status
    const barangMasuk = await prisma.barangMasuk.findUnique({
      where: { id },
      include: {
        detail: {
          include: {
            barang: true,
          },
        },
        supplier: true,
        gudang: true,
      },
    })

    if (!barangMasuk) {
      return NextResponse.json(
        { error: 'Barang Masuk tidak ditemukan' },
        { status: 404 }
      )
    }

    if (barangMasuk.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status draft yang bisa diposting' },
        { status: 400 }
      )
    }

    // Update transaction status to posted
    const updatedBarangMasuk = await prisma.barangMasuk.update({
      where: { id },
      data: {
        status: 'posted',
        updatedAt: new Date(),
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

    // Update stock for each item
    for (const item of barangMasuk.detail) {
      try {
        // Update or create stock record for this barang and gudang
        await prisma.stokBarang.upsert({
          where: {
            barangId_gudangId: {
              barangId: item.barangId,
              gudangId: barangMasuk.gudangId,
            },
          },
          update: {
            qty: {
              increment: item.qty,
            },
            updatedAt: new Date(),
          },
          create: {
            barangId: item.barangId,
            gudangId: barangMasuk.gudangId,
            qty: item.qty,
          },
        })

        // Update current stock in barang table
        await prisma.barang.update({
          where: { id: item.barangId },
          data: {
            currentStock: {
              increment: item.qty,
            },
          },
        })

        
      } catch (stockError) {
        console.error(`Error updating stock for barang ${item.barangId}:`, stockError)
        // Continue with other items even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedBarangMasuk,
      message: 'Barang Masuk berhasil diposting dan stok diperbarui',
    })
  } catch (error) {
    console.error('Error posting Barang Masuk:', error)

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Prisma error code:', error.code)
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Data yang dimasukkan sudah ada atau duplikat' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Failed to post Barang Masuk transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}