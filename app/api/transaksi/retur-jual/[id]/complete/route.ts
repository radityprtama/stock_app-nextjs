import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'complete'): boolean {
  switch (action) {
    case 'complete':
      return ['admin', 'manager', 'sales'].includes(userRole)
    default:
      return false
  }
}

// POST /api/transaksi/retur-jual/[id]/complete - Complete Retur Jual transaction
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
    const existingReturJual = await prisma.returJual.findUnique({
      where: { id: params.id },
    })

    if (!existingReturJual) {
      return NextResponse.json(
        { error: 'Retur Jual tidak ditemukan' },
        { status: 404 }
      )
    }

    if (existingReturJual.status !== 'approved') {
      return NextResponse.json(
        { error: 'Hanya transaksi dengan status approved yang bisa dicomplete' },
        { status: 400 }
      )
    }

    // Update transaction status to completed
    const completedReturJual = await prisma.returJual.update({
      where: { id: params.id },
      data: {
        status: 'completed',
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

    return NextResponse.json({
      success: true,
      data: completedReturJual,
      message: 'Retur Jual berhasil selesai',
    })
  } catch (error) {
    console.error('Error completing Retur Jual:', error)
    return NextResponse.json(
      { error: 'Failed to complete Retur Jual transaction' },
      { status: 500 }
    )
  }
}