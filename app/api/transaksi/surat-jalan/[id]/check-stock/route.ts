import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { createNotification } from '@/app/api/notifications/route'

// POST /api/transaksi/surat-jalan/[id]/check-stock - Check stock and detect dropship needs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

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
                minStok: true,
                isDropship: true,
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
      },
    })

    if (!suratJalan) {
      return NextResponse.json(
        { error: 'Surat Jalan tidak ditemukan' },
        { status: 404 }
      )
    }

    // Check current stock for each item and detect dropship needs
    const stockCheckResults = await Promise.all(
      suratJalan.detail.map(async (detail) => {
        // Handle custom items (no stock check needed)
        if ((detail as any).isCustom) {
          return {
            detailId: detail.id,
            barangId: null,
            barang: null,
            requestedQty: detail.qty,
            currentStock: null,
            stockStatus: 'custom_item',
            stockShortage: 0,
            isCurrentlyDropship: false,
            dropshipStatus: null,
            needsDropship: false,
            canFulfill: true,
            alternativeSuppliers: [],
            customItem: {
              kode: (detail as any).customKode,
              nama: (detail as any).customNama,
              satuan: (detail as any).customSatuan,
              harga: Number((detail as any).customHarga),
              alias: detail.namaAlias
            },
            recommendations: [{
              type: 'success',
              message: `Custom item ${(detail as any).customNama} - tidak memerlukan validasi stok.`,
              action: 'none'
            }]
          }
        }

        // For warehouse items - check stock
        if (!detail.barangId) {
          return {
            detailId: detail.id,
            barangId: null,
            barang: null,
            requestedQty: detail.qty,
            currentStock: null,
            stockStatus: 'error',
            stockShortage: detail.qty,
            isCurrentlyDropship: false,
            dropshipStatus: null,
            needsDropship: false,
            canFulfill: false,
            alternativeSuppliers: [],
            recommendations: [{
              type: 'error',
              message: 'Item tidak memiliki barang ID',
              action: 'fix_data'
            }]
          }
        }

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
        const stockStatus = currentStock >= detail.qty ? 'sufficient' : 'insufficient'
        const stockShortage = Math.max(0, detail.qty - currentStock)

        // Find alternative suppliers if stock is insufficient
        let alternativeSuppliers: Array<{
          id: string;
          kode: string;
          nama: string;
          alamat: string;
          telepon: string;
          leadTime: number;
          hargaBeli: number;
          isPrimary: boolean;
        }> = []
        if (stockStatus === 'insufficient') {
          const supplierBarangs = await prisma.supplierBarang.findMany({
            where: {
              barangId: detail.barangId,
              supplier: {
                aktif: true
              }
            },
            include: {
              supplier: {
                select: {
                  id: true,
                  kode: true,
                  nama: true,
                  alamat: true,
                  telepon: true,
                }
              }
            },
            orderBy: [
              { isPrimary: 'desc' },
              { leadTime: 'asc' },
              { hargaBeli: 'asc' }
            ],
          })

          alternativeSuppliers = supplierBarangs.map(supplierBarang => ({
            ...supplierBarang.supplier,
            leadTime: supplierBarang.leadTime,
            hargaBeli: Number(supplierBarang.hargaBeli),
            isPrimary: supplierBarang.isPrimary,
          }))
        }

        // Check if item is already marked as dropship
        const isCurrentlyDropship = detail.isDropship
        const dropshipStatus = detail.statusDropship

        // Determine if dropship is needed
        const needsDropship = stockStatus === 'insufficient' && alternativeSuppliers.length > 0
        const canFulfill = stockStatus === 'sufficient' || needsDropship

        return {
          detailId: detail.id,
          barangId: detail.barangId,
          barang: detail.barang,
          requestedQty: detail.qty,
          currentStock,
          stockStatus,
          stockShortage,
          isCurrentlyDropship,
          dropshipStatus,
          needsDropship,
          canFulfill,
          alternativeSuppliers,
          recommendations: generateRecommendations({
            stockStatus,
            isCurrentlyDropship,
            dropshipStatus,
            alternativeSuppliers: alternativeSuppliers.length,
            stockShortage,
            currentStock,
          })
        }
      })
    )

    // Generate overall summary
    const summary = {
      totalItems: stockCheckResults.length,
      customItems: stockCheckResults.filter(item => item.stockStatus === 'custom_item').length,
      sufficientStockItems: stockCheckResults.filter(item => item.stockStatus === 'sufficient').length,
      insufficientStockItems: stockCheckResults.filter(item => item.stockStatus === 'insufficient').length,
      errorItems: stockCheckResults.filter(item => item.stockStatus === 'error').length,
      dropshipItems: stockCheckResults.filter(item => item.isCurrentlyDropship).length,
      needsDropshipItems: stockCheckResults.filter(item => item.needsDropship).length,
      readyToShipItems: stockCheckResults.filter(item =>
        (item.stockStatus === 'sufficient' || item.stockStatus === 'custom_item') && !item.isCurrentlyDropship
      ).length,
      pendingDropshipItems: stockCheckResults.filter(item => item.isCurrentlyDropship && item.dropshipStatus !== 'received').length,
      receivedDropshipItems: stockCheckResults.filter(item => item.isCurrentlyDropship && item.dropshipStatus === 'received').length,
      cannotFulfillItems: stockCheckResults.filter(item => !item.canFulfill).length,
    }

    // Determine overall status
    let overallStatus = 'ready'
    let canPost = true
    let postMessage = 'Surat Jalan siap untuk diposting'

    if (summary.cannotFulfillItems > 0) {
      overallStatus = 'cannot_fulfill'
      canPost = false
      postMessage = `${summary.cannotFulfillItems} item tidak dapat dipenuhi (tidak ada stok dan tidak ada supplier dropship)`
    } else if (summary.pendingDropshipItems > 0) {
      overallStatus = 'waiting_dropship'
      canPost = false
      postMessage = `Menunggu ${summary.pendingDropshipItems} item dropship sampai ke gudang`
    } else if (summary.needsDropshipItems > 0) {
      overallStatus = 'needs_dropship'
      canPost = false
      postMessage = `${summary.needsDropshipItems} item perlu di-order ke supplier dropship`
    }

    // Check for low stock warnings (only for warehouse items)
    const lowStockWarnings = stockCheckResults.filter(item =>
      item.barang && item.currentStock !== null &&
      item.currentStock <= item.barang.minStok && item.currentStock > 0
    )

    // Create notifications for critical stock levels
    if (lowStockWarnings.length > 0) {
      for (const warning of lowStockWarnings) {
        await createNotification({
          title: 'Stok Menipis',
          message: `${warning.barang?.nama || 'Unknown'} - Stok tersisa: ${warning.currentStock} unit (minimum: ${warning.barang?.minStok || 0})`,
          type: 'warning',
          category: 'stock',
          actionUrl: '/dashboard/master/barang',
          metadata: {
            barangId: warning.barangId,
            currentStock: warning.currentStock,
            minStock: warning.barang?.minStok || 0,
            suratJalanId: id
          }
        })
      }
    }

    // Create notification for out of stock items (only for warehouse items)
    const outOfStockItems = stockCheckResults.filter(item =>
      item.barang && item.currentStock === 0
    )
    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(item => item.barang?.nama || 'Unknown').join(', ')
      await createNotification({
        title: 'Stok Habis',
        message: `${itemNames} - Stok habis, perlu dropship dari supplier`,
        type: 'error',
        category: 'stock',
        actionUrl: '/dashboard/transaksi/surat-jalan',
        metadata: {
          items: outOfStockItems.map(item => ({
            barangId: item.barangId,
            barangName: item.barang?.nama || 'Unknown',
            needsDropship: item.needsDropship
          })),
          suratJalanId: id
        }
      })
    }

    // Create notification for dropship needs
    if (summary.needsDropshipItems > 0) {
      await createNotification({
        title: 'Perlu Dropship',
        message: `${summary.needsDropshipItems} item perlu di-order ke supplier dropship`,
        type: 'info',
        category: 'dropship',
        actionUrl: '/dashboard/transaksi/surat-jalan',
        metadata: {
          suratJalanId: id,
          needsDropshipItems: summary.needsDropshipItems,
          alternativeSuppliers: stockCheckResults
            .filter(item => item.needsDropship)
            .flatMap(item => item.alternativeSuppliers)
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        suratJalanId: id,
        checkedAt: new Date().toISOString(),
        summary,
        overallStatus,
        canPost,
        postMessage,
        items: stockCheckResults,
        warnings: {
          lowStockItems: lowStockWarnings.map(item => ({
            barangId: item.barangId,
            barangName: item.barang?.nama || 'Unknown',
            currentStock: item.currentStock,
            minStock: item.barang?.minStok || 0,
          })),
          outOfStockItems: stockCheckResults.filter(item => item.barang && item.currentStock === 0).map(item => ({
            barangId: item.barangId,
            barangName: item.barang?.nama || 'Unknown',
          })),
          customItems: stockCheckResults.filter(item => item.stockStatus === 'custom_item').map(item => ({
            detailId: item.detailId,
            itemName: item.customItem?.nama || 'Unknown',
            itemKode: item.customItem?.kode || 'Unknown',
            itemAlias: item.customItem?.alias || '',
          })),
        },
        actions: generateActions({
          summary,
          overallStatus,
          canPost,
          items: stockCheckResults,
        })
      },
    })
  } catch (error) {
    console.error('Error checking stock:', error)
    return NextResponse.json(
      { error: 'Failed to check stock' },
      { status: 500 }
    )
  }
}

// Helper function to generate recommendations for each item
function generateRecommendations(params: {
  stockStatus: string
  isCurrentlyDropship: boolean
  dropshipStatus: string | null
  alternativeSuppliers: number
  stockShortage: number
  currentStock: number
}) {
  const { stockStatus, isCurrentlyDropship, dropshipStatus, alternativeSuppliers, stockShortage, currentStock } = params

  const recommendations = []

  if (stockStatus === 'sufficient') {
    if (isCurrentlyDropship) {
      if (dropshipStatus === 'pending') {
        recommendations.push({
          type: 'info',
          message: 'Item ditandai sebagai dropship tapi stok sudah tersedia. Pertimbangkan untuk unset dropship.',
          action: 'unset_dropship'
        })
      } else if (dropshipStatus === 'received') {
        recommendations.push({
          type: 'success',
          message: 'Item dropship sudah diterima dan stok tersedia untuk dikirim.',
          action: 'none'
        })
      }
    } else {
      recommendations.push({
        type: 'success',
        message: `Stok mencukupi (${currentStock} unit tersedia).`,
        action: 'none'
      })
    }
  } else {
    if (alternativeSuppliers > 0) {
      recommendations.push({
        type: 'warning',
        message: `Stok tidak mencukupi (kurang ${stockShortage} unit). Ditemukan ${alternativeSuppliers} supplier dropship.`,
        action: 'set_dropship'
      })
    } else {
      recommendations.push({
        type: 'error',
        message: `Stok tidak mencukupi (kurang ${stockShortage} unit) dan tidak ada supplier dropship yang tersedia.`,
        action: 'contact_supplier'
      })
    }
  }

  return recommendations
}

// Helper function to generate recommended actions
function generateActions(params: {
  summary: any
  overallStatus: string
  canPost: boolean
  items: any[]
}) {
  const { summary, overallStatus, canPost, items } = params

  const actions = []

  if (canPost) {
    actions.push({
      type: 'primary',
      label: 'Posting Surat Jalan',
      description: 'Finalisasi Surat Jalan dan kurangi stok',
      endpoint: `/api/transaksi/surat-jalan/${items[0]?.suratJalanId}/post`,
      method: 'POST'
    })
  }

  if (summary.needsDropshipItems > 0) {
    const needsDropshipItemIds = items
      .filter(item => item.needsDropship && !item.isCurrentlyDropship)
      .map(item => item.detailId)

    actions.push({
      type: 'secondary',
      label: `Set ${summary.needsDropshipItems} Item sebagai Dropship`,
      description: 'Tandai item-item ini sebagai dropship dan pilih supplier',
      endpoint: `/api/transaksi/surat-jalan/${items[0]?.suratJalanId}/set-dropship`,
      method: 'POST',
      body: {
        itemIds: needsDropshipItemIds,
        autoSelectSupplier: true
      }
    })
  }

  if (summary.pendingDropshipItems > 0) {
    actions.push({
      type: 'info',
      label: 'Buat Purchase Order',
      description: `Buat PO untuk ${summary.pendingDropshipItems} item dropship yang pending`,
      endpoint: '/api/transaksi/barang-masuk',
      method: 'POST',
      note: 'Manual process - navigate to Barang Masuk to create PO'
    })
  }

  if (summary.cannotFulfillItems > 0) {
    const cannotFulfillItems = items.filter(item => !item.canFulfill)

    actions.push({
      type: 'warning',
      label: 'Hubungi Supplier',
      description: 'Cari supplier baru untuk barang yang tidak dapat dipenuhi',
      action: 'external',
      note: `Item yang bermasalah: ${cannotFulfillItems.map(item => item.barang.nama).join(', ')}`
    })
  }

  if (summary.insufficientStockItems > 0 && summary.sufficientStockItems > 0) {
    actions.push({
      type: 'secondary',
      label: 'Kirim Partial',
      description: `Kirim ${summary.sufficientStockItems} item yang ready stock dulu`,
      endpoint: `/api/transaksi/surat-jalan/${items[0]?.suratJalanId}/ship-partial`,
      method: 'POST',
      note: 'Sisanya akan dikirim setelah dropship diterima'
    })
  }

  return actions
}