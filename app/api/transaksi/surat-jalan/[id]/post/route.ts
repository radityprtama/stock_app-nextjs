import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const postSchema = z.object({
  deliveryOption: z.enum(['partial', 'complete']).default('complete'),
  confirmDropship: z.boolean().default(false),
  notes: z.string().optional(),
})

// POST /api/transaksi/surat-jalan/[id]/post - Post Surat Jalan with dropship validation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission
    if (!['admin', 'manager', 'staff_gudang'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { deliveryOption, confirmDropship, notes } = postSchema.parse(body)

    // Get Surat Jalan with details and current stock
    const suratJalan = await prisma.suratJalan.findUnique({
      where: { id },
      include: {
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
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
        customer: {
          select: {
            id: true,
            kode: true,
            nama: true,
            alamat: true,
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

    if (suratJalan.status !== 'draft') {
      return NextResponse.json(
        { error: 'Surat Jalan sudah diposting sebelumnya' },
        { status: 400 }
      )
    }

    // Check current stock and validate dropship status
    const stockValidation = await validateStockForPosting(suratJalan, deliveryOption)

    if (!stockValidation.canPost) {
      return NextResponse.json({
        error: 'Tidak bisa posting Surat Jalan',
        details: stockValidation.errors,
        warnings: stockValidation.warnings,
        recommendations: stockValidation.recommendations,
      }, { status: 400 })
    }

    // Perform posting transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update stock for non-dropship items
      const stockUpdates = []
      for (const item of stockValidation.itemsToShip) {
        if (!item.isDropship) {
          // Get current stock
          const currentStok = await tx.stokBarang.findUnique({
            where: {
              barangId_gudangId: {
                barangId: item.barangId,
                gudangId: suratJalan.gudangId
              }
            }
          })

          if (!currentStok || currentStok.qty < item.qty) {
            throw new Error(`Stok ${item.barang.nama} tidak mencukupi`)
          }

          // Update stock
          const updatedStok = await tx.stokBarang.update({
            where: {
              barangId_gudangId: {
                barangId: item.barangId,
                gudangId: suratJalan.gudangId
              }
            },
            data: {
              qty: {
                decrement: item.qty
              }
            }
          })

          stockUpdates.push({
            barangId: item.barangId,
            barangName: item.barang.nama,
            previousStock: currentStok.qty,
            newStock: updatedStok.qty,
            qtyShipped: item.qty,
          })
        }
      }

      // Update Surat Jalan status
      const updatedSJ = await tx.suratJalan.update({
        where: { id },
        data: {
          status: 'in_transit',
          tanggalKirim: new Date(),
          updatedAt: new Date(),
        },
        include: {
          customer: {
            select: {
              id: true,
              kode: true,
              nama: true,
              alamat: true,
              telepon: true,
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

      return {
        suratJalan: updatedSJ,
        stockUpdates,
        shippingSummary: {
          totalItems: stockValidation.itemsToShip.length,
          normalItems: stockValidation.itemsToShip.filter(item => !item.isDropship).length,
          dropshipItems: stockValidation.itemsToShip.filter(item => item.isDropship).length,
          deliveryOption,
        }
      }
    })

    // Generate appropriate success message
    let successMessage = 'Surat Jalan berhasil diposting'
    if (result.shippingSummary.dropshipItems > 0) {
      successMessage += ` dengan ${result.shippingSummary.dropshipItems} item dropship`
    }
    if (deliveryOption === 'partial') {
      successMessage += ' (pengiriman partial)'
    }

    return NextResponse.json({
      success: true,
      data: {
        suratJalan: result.suratJalan,
        stockUpdates: result.stockUpdates,
        shippingSummary: result.shippingSummary,
      },
      message: successMessage,
      nextActions: generateNextActions({
        suratJalan: result.suratJalan,
        shippingSummary: result.shippingSummary,
        stockValidation,
      })
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error posting Surat Jalan:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post Surat Jalan' },
      { status: 500 }
    )
  }
}

// Helper function to validate stock before posting
async function validateStockForPosting(suratJalan: any, deliveryOption: string) {
  const errors = []
  const warnings = []
  const recommendations = []
  const itemsToShip = []
  const itemsPending = []

  for (const detail of suratJalan.detail) {
    // Get current stock
    const stokBarang = await prisma.stokBarang.findUnique({
      where: {
        barangId_gudangId: {
          barangId: detail.barangId,
          gudangId: suratJalan.gudangId
        }
      }
    })

    const currentStock = stokBarang?.qty || 0
    const hasStock = currentStock >= detail.qty
    const isDropship = detail.isDropship
    const dropshipReceived = detail.statusDropship === 'received'

    if (isDropship) {
      if (dropshipReceived) {
        // Dropship item received, can ship
        itemsToShip.push({
          ...detail,
          isDropship: true,
          currentStock,
          status: 'ready'
        })
      } else {
        // Dropship item not received yet
        itemsPending.push({
          ...detail,
          isDropship: true,
          currentStock,
          status: 'pending',
          dropshipStatus: detail.statusDropship
        })

        if (deliveryOption === 'complete') {
          errors.push(`Item ${detail.barang.nama} (dropship) belum diterima dari supplier`)
        } else {
          warnings.push(`Item ${detail.barang.nama} (dropship) akan dikirim menyusul`)
        }
      }
    } else {
      if (hasStock) {
        // Normal item with sufficient stock
        itemsToShip.push({
          ...detail,
          isDropship: false,
          currentStock,
          status: 'ready'
        })
      } else {
        // Normal item without sufficient stock
        errors.push(`Stok ${detail.barang.nama} tidak mencukupi (tersedia: ${currentStock}, dibutuhkan: ${detail.qty})`)

        // Suggest finding dropship supplier
        const alternativeSuppliers = await prisma.supplierBarang.findMany({
          where: {
            barangId: detail.barangId,
            supplier: { aktif: true }
          },
          include: {
            supplier: {
              select: {
                id: true,
                kode: true,
                nama: true,
              }
            }
          },
          take: 3
        })

        if (alternativeSuppliers.length > 0) {
          recommendations.push({
            item: detail.barang.nama,
            action: 'set_dropship',
            message: `Set ${detail.barang.nama} sebagai dropship dari supplier`,
            suppliers: alternativeSuppliers.map(s => s.supplier)
          })
        }
      }
    }
  }

  // Determine if posting is possible
  let canPost = false
  if (deliveryOption === 'complete') {
    canPost = itemsToShip.length === suratJalan.detail.length && errors.length === 0
  } else {
    // Partial delivery - can post if at least one item is ready
    canPost = itemsToShip.length > 0 && errors.length === 0
  }

  // Add general recommendations
  if (itemsPending.length > 0 && deliveryOption === 'complete') {
    recommendations.push({
      action: 'change_delivery_option',
      message: 'Pertimbangkan untuk menggunakan pengiriman partial agar item yang ready bisa dikirim terlebih dahulu'
    })
  }

  return {
    canPost,
    errors,
    warnings,
    recommendations,
    itemsToShip,
    itemsPending,
    summary: {
      totalItems: suratJalan.detail.length,
      itemsToShip: itemsToShip.length,
      itemsPending: itemsPending.length,
      normalItems: itemsToShip.filter(item => !item.isDropship).length,
      dropshipItems: itemsToShip.filter(item => item.isDropship).length,
    }
  }
}

type StockValidationPendingItem = {
  isDropship: boolean
  dropshipStatus?: string | null
  [key: string]: unknown
}

// Helper function to generate next actions after posting
function generateNextActions(params: {
  suratJalan: any
  shippingSummary: any
  stockValidation: any
}) {
  const { suratJalan, shippingSummary, stockValidation } = params
  const pendingItems = (stockValidation.itemsPending ?? []) as StockValidationPendingItem[]

  const actions = []

  // Print Surat Jalan
  actions.push({
    type: 'primary',
    label: 'Cetak Surat Jalan',
    description: 'Cetak dokumen Surat Jalan untuk pengiriman',
    endpoint: `/api/transaksi/surat-jalan/${suratJalan.id}/print`,
    method: 'GET'
  })

  // Update status to delivered (manual process)
  actions.push({
    type: 'secondary',
    label: 'Update Status Terkirim',
    description: 'Tandai Surat Jalan sebagai terkirim',
    endpoint: `/api/transaksi/surat-jalan/${suratJalan.id}/update-status`,
    method: 'POST',
    body: { status: 'delivered' }
  })

  // Handle pending dropship items
  if (pendingItems.length > 0) {
    const pendingDropshipItems = pendingItems.filter(item => item.isDropship)

    if (pendingDropshipItems.length > 0) {
      actions.push({
        type: 'warning',
        label: 'Monitor Dropship Items',
        description: `${pendingDropshipItems.length} item dropship masih pending`,
        endpoint: `/api/transaksi/surat-jalan/${suratJalan.id}/check-stock`,
        method: 'POST',
        note: 'Periksa status dropship secara berkala'
      })

      // Create PO for pending dropship items
      const pendingToOrder = pendingDropshipItems.filter(item => item.dropshipStatus === 'pending')
      if (pendingToOrder.length > 0) {
        actions.push({
          type: 'secondary',
          label: 'Buat Purchase Order',
          description: `Buat PO untuk ${pendingToOrder.length} item dropship`,
          endpoint: '/api/transaksi/barang-masuk',
          method: 'POST',
          note: 'Manual process - navigate to Barang Masuk'
        })
      }
    }
  }

  // Schedule second shipment for partial delivery
  if (shippingSummary.deliveryOption === 'partial' && pendingItems.length > 0) {
    actions.push({
      type: 'info',
      label: 'Jadwalkan Pengiriman Kedua',
      description: 'Atur jadwal pengiriman untuk item yang pending',
      endpoint: `/api/transaksi/surat-jalan/${suratJalan.id}/schedule-reshipment`,
      method: 'POST',
      note: 'Buat Surat Jalan baru untuk sisa item'
    })
  }

  return actions
}
