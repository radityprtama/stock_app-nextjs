import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { TRANSACTION_STATUS } from '@/src/constants'
import { createNotification } from '@/app/api/notifications/route'

// Helper function to check if user has permission
function hasPermission(userRole: string): boolean {
  return ['admin', 'manager', 'staff_gudang'].includes(userRole)
}

// POST /api/transaksi/delivery-order/[id]/update-status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !hasPermission(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !Object.values(TRANSACTION_STATUS).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Check if delivery order exists
    const existingDeliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id }
    })

    if (!existingDeliveryOrder) {
      return NextResponse.json(
        { error: 'Delivery Order not found' },
        { status: 404 }
      )
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      [TRANSACTION_STATUS.DRAFT]: [TRANSACTION_STATUS.IN_TRANSIT, TRANSACTION_STATUS.CANCELLED],
      [TRANSACTION_STATUS.IN_TRANSIT]: [TRANSACTION_STATUS.DELIVERED, TRANSACTION_STATUS.CANCELLED],
      [TRANSACTION_STATUS.DELIVERED]: [],
      [TRANSACTION_STATUS.CANCELLED]: [TRANSACTION_STATUS.DRAFT],
    }

    if (validTransitions[existingDeliveryOrder.status] &&
        !validTransitions[existingDeliveryOrder.status].includes(status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${existingDeliveryOrder.status} to ${status}` },
        { status: 400 }
      )
    }

    // Update status and timestamps
    const updateData: any = { status }

    if (status === TRANSACTION_STATUS.IN_TRANSIT) {
      updateData.tanggalBerangkat = new Date()
    } else if (status === TRANSACTION_STATUS.DELIVERED) {
      updateData.tanggalSampai = new Date()
    }

    const updatedDeliveryOrder = await prisma.deliveryOrder.update({
      where: { id },
      data: updateData,
      include: {
        gudangAsal: true,
        detail: true
      }
    })

    // Create notification for status update
    const statusMessages = {
      [TRANSACTION_STATUS.IN_TRANSIT]: 'Dalam perjalanan',
      [TRANSACTION_STATUS.DELIVERED]: 'Sampai tujuan',
      [TRANSACTION_STATUS.CANCELLED]: 'Dibatalkan',
    }

    const statusTypes = {
      [TRANSACTION_STATUS.IN_TRANSIT]: 'info' as const,
      [TRANSACTION_STATUS.DELIVERED]: 'success' as const,
      [TRANSACTION_STATUS.CANCELLED]: 'error' as const,
    }

    if (status !== existingDeliveryOrder.status && statusMessages[status as keyof typeof statusMessages]) {
      await createNotification({
        title: 'Update Delivery Order',
        message: `${updatedDeliveryOrder.noDO} - ${statusMessages[status as keyof typeof statusMessages]}`,
        type: statusTypes[status as keyof typeof statusTypes] || 'info',
        category: 'transaction',
        actionUrl: '/dashboard/transaksi/delivery-order',
        metadata: {
          deliveryOrderId: id,
          noDO: updatedDeliveryOrder.noDO,
          gudangAsalId: updatedDeliveryOrder.gudangAsalId,
          gudangAsal: updatedDeliveryOrder.gudangAsal.nama,
          totalItems: updatedDeliveryOrder.detail.length,
          status: status,
          previousStatus: existingDeliveryOrder.status
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedDeliveryOrder,
      message: `Delivery Order status updated to ${status} successfully`
    })
  } catch (error) {
    console.error('Error updating delivery order status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}