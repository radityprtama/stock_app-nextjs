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

// POST /api/transaksi/retur-beli/[id]/approve - Approve Retur Beli transaction
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
    const existingReturBeli = await prisma.returBeli.findUnique({
      where: { id: params.id },
      include: {
        detail: {
          include: {
            barang: true,
          },
        },
      },
    })

    if (!existingReturBeli) {
      return NextResponse.json(
        { error: 'Retur Beli tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingReturBeli.status !== 'draft') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status draft yang bisa diapprove' },
        { status: 400 }
      )
    }

    // Update transaction and reduce stock using a transaction to ensure data consistency
    const approvedReturBeli = await prisma.$transaction(async (tx) => {
      // Update transaction status
      const updatedReturBeli = await tx.returBeli.update({
        where: { id: params.id },
        data: {
          status: 'approved',
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

      // Reduce stock for each item
      for (const item of existingReturBeli.detail) {
        // Find stock record for this barang (we'll use the first available gudang)
        const stockRecord = await tx.stokBarang.findFirst({
          where: {
            barangId: item.barangId,
          },
          orderBy: {
            gudangId: 'asc',
          },
        })

        if (stockRecord) {
          // Check if we have enough stock
          if (stockRecord.qty < item.qty) {
            throw new Error(
              `Stok tidak mencukupi untuk barang ${item.barang.nama}. Tersedia: ${stockRecord.qty}, Dibutuhkan: ${item.qty}`
            )
          }

          // Update stock
          await tx.stokBarang.update({
            where: {
              id: stockRecord.id,
            },
            data: {
              qty: stockRecord.qty - item.qty,
            },
          })
        } else {
          // If no stock record found, get a default gudang and create stock record
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
                qty: -item.qty,
              },
            })
          }
        }
      }

      return updatedReturBeli
    })

    return NextResponse.json({
      success: true,
      data: approvedReturBeli,
      message: 'Retur Beli berhasil diapprove dan stok dikurangi',
    })
  } catch (error: any) {
    console.error('Error approving Retur Beli:', error)

    // Handle specific stock shortage error
    if (error.message.includes('Stok tidak mencukupi')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to approve Retur Beli transaction' },
      { status: 500 }
    )
  }
}