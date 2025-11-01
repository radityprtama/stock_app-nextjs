import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'complete'): boolean {
  switch (action) {
    case 'complete':
      return ['admin', 'manager', 'staff_gudang'].includes(userRole)
    default:
      return false
  }
}

// POST /api/transaksi/retur-beli/[id]/complete - Complete Retur Beli transaction
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
    if (!hasPermission(session.user.role, 'complete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if transaction exists and is in approved status
    const existingReturBeli = await prisma.returBeli.findUnique({
      where: { id: params.id },
    })

    if (!existingReturBeli) {
      return NextResponse.json(
        { error: 'Retur Beli tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingReturBeli.status !== 'approved') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status approved yang bisa dicomplete' },
        { status: 400 }
      )
    }

    // Update transaction status to completed
    const completedReturBeli = await prisma.returBeli.update({
      where: { id: params.id },
      data: {
        status: 'completed',
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

    return NextResponse.json({
      success: true,
      data: completedReturBeli,
      message: 'Retur Beli berhasil selesai',
    })
  } catch (error) {
    console.error('Error completing Retur Beli:', error)
    return NextResponse.json(
      { error: 'Failed to complete Retur Beli transaction' },
      { status: 500 }
    )
  }
}