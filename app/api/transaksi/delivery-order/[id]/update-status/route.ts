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

    // Get delivery order with details for stock processing
    const deliveryOrderWithDetails = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        gudangAsal: true,
        gudangTujuanRel: true,
        detail: {
          include: {
            barang: true
          }
        }
      }
    })

    if (!deliveryOrderWithDetails) {
      return NextResponse.json(
        { error: 'Delivery Order not found' },
        { status: 404 }
      )
    }

    // Process stock movement when status changes to DELIVERED
    if (status === TRANSACTION_STATUS.DELIVERED && existingDeliveryOrder.status !== TRANSACTION_STATUS.DELIVERED) {
      if (!deliveryOrderWithDetails.gudangTujuanId) {
        return NextResponse.json(
          { error: 'Gudang tujuan tidak valid' },
          { status: 400 }
        )
      }

      await prisma.$transaction(async (tx) => {
        for (const detailItem of deliveryOrderWithDetails.detail) {
          // Reduce stock from source warehouse
          const stokAsal = await tx.stokBarang.findFirst({
            where: {
              barangId: detailItem.barangId,
              gudangId: deliveryOrderWithDetails.gudangAsalId
            }
          })

          if (!stokAsal || stokAsal.qty < detailItem.qty) {
            throw new Error(`Stok tidak mencukupi untuk ${detailItem.barang.nama} di gudang ${deliveryOrderWithDetails.gudangAsal.nama}`)
          }

          await tx.stokBarang.update({
            where: { id: stokAsal.id },
            data: {
              qty: stokAsal.qty - detailItem.qty
            }
          })

          // Add stock to destination warehouse
          const stokTujuan = await tx.stokBarang.findFirst({
            where: {
              barangId: detailItem.barangId,
              gudangId: deliveryOrderWithDetails.gudangTujuanId
            }
          })

          if (stokTujuan) {
            await tx.stokBarang.update({
              where: { id: stokTujuan.id },
              data: {
                qty: stokTujuan.qty + detailItem.qty
              }
            })
          } else {
            await tx.stokBarang.create({
              data: {
                barangId: detailItem.barangId,
                gudangId: deliveryOrderWithDetails.gudangTujuanId,
                qty: detailItem.qty
              }
            })
          }

          // Update currentStock in Barang table
          await tx.barang.update({
            where: { id: detailItem.barangId },
            data: {
              currentStock: {
                decrement: detailItem.qty
              }
            }
          })

          // Add back the stock (since we're just moving between warehouses)
          await tx.barang.update({
            where: { id: detailItem.barangId },
            data: {
              currentStock: {
                increment: detailItem.qty
              }
            }
          })
        }
      })
    }

    const updatedDeliveryOrder = await prisma.deliveryOrder.update({
      where: { id },
      data: updateData,
      include: {
        gudangAsal: true,
        gudangTujuanRel: true,
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
          gudangTujuanId: updatedDeliveryOrder.gudangTujuanRel?.id,
          gudangTujuan: updatedDeliveryOrder.gudangTujuanRel?.nama || updatedDeliveryOrder.gudangTujuan,
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