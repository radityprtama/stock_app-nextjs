import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'create' | 'update' | 'delete' | 'post' | 'deliver'): boolean {
  switch (action) {
    case 'create':
    case 'update':
      return ['admin', 'manager', 'sales'].includes(userRole)
    case 'post':
      return ['admin', 'manager'].includes(userRole)
    case 'deliver':
      return ['admin', 'manager', 'sales'].includes(userRole)
    case 'delete':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// PUT /api/transaksi/surat-jalan/[id]/deliver - Update Surat Jalan status to delivered
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
    if (!hasPermission(session.user.role, 'deliver')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if Surat Jalan exists and is in transit
    const suratJalan = await prisma.suratJalan.findUnique({
      where: { id },
      include: {
        customer: true,
        gudang: true,
        detail: {
          include: {
            barang: true,
          },
        },
      },
    })

    if (!suratJalan) {
      return NextResponse.json(
        { error: 'Surat Jalan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (suratJalan.status !== 'in_transit') {
      return NextResponse.json(
        { error: 'Hanya Surat Jalan dengan status "Dalam Perjalanan" yang bisa ditandai selesai' },
        { status: 400 }
      )
    }

    // Update Surat Jalan status to delivered
    const updatedSuratJalan = await prisma.suratJalan.update({
      where: { id },
      data: {
        status: 'delivered',
        updatedAt: new Date(),
      },
      include: {
        customer: {
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
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedSuratJalan,
      message: 'Surat Jalan berhasil ditandai sebagai selesai',
    })
  } catch (error) {
    console.error('Error delivering Surat Jalan:', error)
    return NextResponse.json(
      {
        error: 'Failed to deliver Surat Jalan transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}