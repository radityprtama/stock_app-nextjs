import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'approve'): boolean {
  switch (action) {
    case 'approve':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// POST /api/transaksi/retur-jual/[id]/approve - Approve Retur Jual transaction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    if (!hasPermission(session.user.role, 'approve')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if transaction exists and is in draft status
    const existingReturJual = await prisma.returJual.findUnique({
      where: { id: params.id },
      include: {
        detail: {
          include: {
            barang: true,
          },
        },
      },
    })

    if (!existingReturJual) {
      return NextResponse.json(
        { error: 'Retur Jual tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingReturJual.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status draft yang bisa diapprove' },
        { status: 400 }
      )
    }

    // Update transaction and add stock back for "bisa_dijual_lagi" items using a transaction to ensure data consistency
    const approvedReturJual = await prisma.$transaction(async (tx) => {
      // Update transaction status
      const updatedReturJual = await tx.returJual.update({
        where: { id: params.id },
        data: {
          status: 'approved',
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

      // Add stock back for items with condition "bisa_dijual_lagi"
      const resellableItems = existingReturJual.detail.filter(item => item.kondisi === 'bisa_dijual_lagi')

      for (const item of resellableItems) {
        // Find or create stock record for this barang (we'll use the first available gudang)
        const stockRecord = await tx.stokBarang.findFirst({
          where: {
            barangId: item.barangId,
          },
          orderBy: {
            gudangId: 'asc',
          },
        })

        if (stockRecord) {
          // Update existing stock
          await tx.stokBarang.update({
            where: {
              id: stockRecord.id,
            },
            data: {
              qty: stockRecord.qty + item.qty,
            },
          })
        } else {
          // Create new stock record
          // Get a default gudang ID
          const defaultGudang = await tx.gudang.findFirst({
            orderBy: {
              kode: 'asc',
            },
          })

          if (defaultGudang) {
            await tx.stokBarang.create({
              data: {
                barangId: item.barangId,
                gudangId: defaultGudang.id,
                qty: item.qty,
              },
            })
          }
        }
      }

      return updatedReturJual
    })

    const resellableCount = existingReturJual.detail.filter(item => item.kondisi === 'bisa_dijual_lagi').length
    const damagedCount = existingReturJual.detail.filter(item => item.kondisi === 'rusak_total').length

    return NextResponse.json({
      success: true,
      data: approvedReturJual,
      message: `Retur Jual berhasil diapprove. ${resellableCount} item dikembalikan ke stok, ${damagedCount} item rusak total.`,
    })
  } catch (error) {
    console.error('Error approving Retur Jual:', error)
    return NextResponse.json(
      { error: 'Failed to approve Retur Jual transaction' },
      { status: 500 }
    )
  }
}