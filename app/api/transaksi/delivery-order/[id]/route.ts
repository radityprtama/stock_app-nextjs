import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Helper function to check if user has permission
function hasPermission(userRole: string, action: 'update' | 'delete'): boolean {
  switch (action) {
    case 'update':
      return ['admin', 'manager', 'staff_gudang'].includes(userRole)
    case 'delete':
      return ['admin', 'manager'].includes(userRole)
    default:
      return false
  }
}

// GET /api/transaksi/delivery-order/[id]
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

    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id: id },
      include: {
        gudangAsal: true,
        detail: true
      }
    })

    if (!deliveryOrder) {
      return NextResponse.json(
        { error: 'Delivery Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(deliveryOrder)
  } catch (error) {
    console.error('Error fetching delivery order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/transaksi/delivery-order/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !hasPermission(session.user.role, 'update')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const body = await request.json()
    const { items, ...deliveryOrderData } = body

    // Check if delivery order exists and is not in transit
    const existingDeliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id: id },
      include: { detail: true }
    })

    if (!existingDeliveryOrder) {
      return NextResponse.json(
        { error: 'Delivery Order not found' },
        { status: 404 }
      )
    }

    if (existingDeliveryOrder.status === 'in_transit' || existingDeliveryOrder.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot update delivery order that is in transit or delivered' },
        { status: 400 }
      )
    }

    // Update delivery order and details in a transaction
    const updatedDeliveryOrder = await prisma.$transaction(async (tx) => {
      // Update main delivery order
      const deliveryOrder = await tx.deliveryOrder.update({
        where: { id: id },
        data: {
          ...deliveryOrderData,
          tanggal: deliveryOrderData.tanggal ? new Date(deliveryOrderData.tanggal) : undefined,
          updatedAt: new Date()
        },
        include: {
          gudangAsal: true,
          detail: true
        }
      })

      // If items are provided, update details
      if (items && Array.isArray(items)) {
        // Delete existing details
        await tx.detailDeliveryOrder.deleteMany({
          where: { deliveryOrderId: id }
        })

        // Create new details
        if (items.length > 0) {
          await tx.detailDeliveryOrder.createMany({
            data: items.map((item: any) => ({
              deliveryOrderId: id,
              barangId: item.barangId,
              namaBarang: item.namaBarang,
              qty: item.qty,
              satuan: item.satuan,
              keterangan: item.keterangan || null,
            }))
          })
        }
      }

      return deliveryOrder
    })

    return NextResponse.json({
      success: true,
      data: updatedDeliveryOrder,
      message: 'Delivery Order updated successfully'
    })
  } catch (error) {
    console.error('Error updating delivery order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/transaksi/delivery-order/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !hasPermission(session.user.role, 'delete')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if delivery order exists and can be deleted
    const existingDeliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id: id }
    })

    if (!existingDeliveryOrder) {
      return NextResponse.json(
        { error: 'Delivery Order not found' },
        { status: 404 }
      )
    }

    if (existingDeliveryOrder.status === 'in_transit' || existingDeliveryOrder.status === 'delivered') {
      return NextResponse.json(
        { error: 'Cannot delete delivery order that is in transit or delivered' },
        { status: 400 }
      )
    }

    // Delete delivery order (cascade delete will handle details)
    await prisma.deliveryOrder.delete({
      where: { id: id }
    })

    return NextResponse.json({
      success: true,
      message: 'Delivery Order deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting delivery order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}