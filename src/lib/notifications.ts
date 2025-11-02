import { createNotification } from '@/app/api/notifications/route'

// Notification service for centralized notification management
export class NotificationService {

  // Stock notifications
  static async notifyLowStock(item: {
    barangId: string
    barangName: string
    currentStock: number
    minStock: number
    gudangId?: string
    gudangName?: string
  }) {
    return await createNotification({
      title: 'Stok Menipis',
      message: `${item.barangName} - Stok tersisa: ${item.currentStock} unit (minimum: ${item.minStock})${item.gudangName ? ` di ${item.gudangName}` : ''}`,
      type: 'warning',
      category: 'stock',
      actionUrl: '/dashboard/master/barang',
      metadata: {
        barangId: item.barangId,
        currentStock: item.currentStock,
        minStock: item.minStok,
        gudangId: item.gudangId
      }
    })
  }

  static async notifyOutOfStock(items: Array<{
    barangId: string
    barangName: string
    needsDropship: boolean
    alternativeSuppliers?: any[]
  }>, context?: string) {
    const itemNames = items.map(item => item.barang.nama || item.barangName).join(', ')
    return await createNotification({
      title: 'Stok Habis',
      message: `${itemNames} - Stok habis${context ? ` (${context})` : ''}${items.some(item => item.needsDropship) ? ', perlu dropship dari supplier' : ''}`,
      type: 'error',
      category: 'stock',
      actionUrl: '/dashboard/master/barang',
      metadata: {
        items: items.map(item => ({
          barangId: item.barangId,
          barangName: item.barangName,
          needsDropship: item.needsDropship,
          hasAlternativeSuppliers: item.alternativeSuppliers && item.alternativeSuppliers.length > 0
        }))
      }
    })
  }

  static async notifyStockUpdate(item: {
    barangName: string
    type: 'in' | 'out'
    quantity: number
    gudangName?: string
    reference?: string
  }) {
    return await createNotification({
      title: `Stok ${item.type === 'in' ? 'Masuk' : 'Keluar'}`,
      message: `${item.barangName}: ${item.quantity} unit${item.gudangName ? ` di ${item.gudangName}` : ''}${item.reference ? ` (${item.reference})` : ''}`,
      type: 'info',
      category: 'stock',
      metadata: {
        barangName: item.barangName,
        type: item.type,
        quantity: item.quantity,
        reference: item.reference
      }
    })
  }

  static async notifyOverstock(item: {
    barangId: string
    barangName: string
    currentStock: number
    maxStock: number
    gudangName?: string
  }) {
    return await createNotification({
      title: 'Stok Berlebih',
      message: `${item.barangName} - Stok: ${item.currentStock} unit (maksimum: ${item.maxStock})${item.gudangName ? ` di ${item.gudangName}` : ''}`,
      type: 'warning',
      category: 'stock',
      actionUrl: '/dashboard/master/barang',
      metadata: {
        barangId: item.barangId,
        currentStock: item.currentStock,
        maxStock: item.maxStock,
        overstockAmount: item.currentStock - item.maxStock
      }
    })
  }

  // Transaction notifications
  static async notifyTransactionStatus(params: {
    type: string
    docNumber: string
    status: string
    previousStatus?: string
    customerName?: string
    supplierName?: string
    totalItems?: number
    actionUrl?: string
  }) {
    const statusMessages: Record<string, string> = {
      'draft': 'Dibuat',
      'posted': 'Diposting',
      'in_transit': 'Dalam pengiriman',
      'delivered': 'Selesai',
      'cancelled': 'Dibatalkan',
      'approved': 'Disetujui',
      'completed': 'Selesai',
    }

    const statusTypes: Record<string, 'info' | 'success' | 'warning' | 'error'> = {
      'draft': 'info',
      'posted': 'info',
      'in_transit': 'info',
      'delivered': 'success',
      'cancelled': 'error',
      'approved': 'success',
      'completed': 'success',
    }

    const message = `${params.docNumber} - ${statusMessages[params.status] || params.status}`

    return await createNotification({
      title: `Update ${params.type}`,
      message,
      type: statusTypes[params.status] || 'info',
      category: 'transaction',
      actionUrl: params.actionUrl || `/dashboard/transaksi/${params.type.toLowerCase().replace(' ', '-')}`,
      metadata: {
        type: params.type,
        docNumber: params.docNumber,
        status: params.status,
        previousStatus: params.previousStatus,
        customerName: params.customerName,
        supplierName: params.supplierName,
        totalItems: params.totalItems
      }
    })
  }

  static async notifyTransactionCreated(params: {
    type: string
    docNumber: string
    customerName?: string
    supplierName?: string
    totalItems?: number
    totalValue?: number
    actionUrl?: string
  }) {
    const typeLabels: Record<string, string> = {
      'Barang Masuk': 'Barang Masuk',
      'Surat Jalan': 'Surat Jalan',
      'Delivery Order': 'Delivery Order',
      'Retur Beli': 'Retur Pembelian',
      'Retur Jual': 'Retur Penjualan',
    }

    return await createNotification({
      title: `${typeLabels[params.type] || params.type} Dibuat`,
      message: `${params.docNumber}${params.customerName ? ` - Customer: ${params.customerName}` : ''}${params.supplierName ? ` - Supplier: ${params.supplierName}` : ''}${params.totalItems ? ` (${params.totalItems} item)` : ''}`,
      type: 'info',
      category: 'transaction',
      actionUrl: params.actionUrl || `/dashboard/transaksi/${params.type.toLowerCase().replace(' ', '-')}`,
      metadata: {
        type: params.type,
        docNumber: params.docNumber,
        customerName: params.customerName,
        supplierName: params.supplierName,
        totalItems: params.totalItems,
        totalValue: params.totalValue
      }
    })
  }

  // Dropship notifications
  static async notifyDropshipNeeded(params: {
    suratJalanId: string
    suratJalanNumber: string
    itemsCount: number
    itemNames: string[]
    alternativeSuppliers?: any[]
  }) {
    return await createNotification({
      title: 'Perlu Dropship',
      message: `${params.itemsCount} item perlu di-order ke supplier dropship (${params.suratJalanNumber})`,
      type: 'info',
      category: 'dropship',
      actionUrl: '/dashboard/transaksi/surat-jalan',
      metadata: {
        suratJalanId: params.suratJalanId,
        suratJalanNumber: params.suratJalanNumber,
        itemsCount: params.itemsCount,
        itemNames: params.itemNames,
        hasAlternativeSuppliers: params.alternativeSuppliers && params.alternativeSuppliers.length > 0
      }
    })
  }

  static async notifyDropshipUpdate(params: {
    productName: string
    status: 'pending' | 'ordered' | 'received'
    suratJalanNumber?: string
    supplierName?: string
  }) {
    const statusMessages: Record<string, string> = {
      'pending': 'Menunggu proses',
      'ordered': 'Sudah dipesan ke supplier',
      'received': 'Sudah diterima',
    }

    return await createNotification({
      title: 'Update Dropship',
      message: `${params.productName}: ${statusMessages[params.status]}${params.suratJalanNumber ? ` (${params.suratJalanNumber})` : ''}${params.supplierName ? ` - ${params.supplierName}` : ''}`,
      type: params.status === 'received' ? 'success' : 'info',
      category: 'dropship',
      actionUrl: '/dashboard/transaksi/surat-jalan',
      metadata: {
        productName: params.productName,
        status: params.status,
        suratJalanNumber: params.suratJalanNumber,
        supplierName: params.supplierName
      }
    })
  }

  static async notifyDropshipReady(params: {
    suratJalanId: string
    suratJalanNumber: string
    customerName: string
    itemsCount: number
  }) {
    return await createNotification({
      title: 'Dropship Siap Dikirim',
      message: `Semua barang dropship untuk ${params.suratJalanNumber} sudah diterima, siap dikirim ke ${params.customerName}`,
      type: 'success',
      category: 'dropship',
      actionUrl: '/dashboard/transaksi/surat-jalan',
      metadata: {
        suratJalanId: params.suratJalanId,
        suratJalanNumber: params.suratJalanNumber,
        customerName: params.customerName,
        itemsCount: params.itemsCount
      }
    })
  }

  // Customer notifications
  static async notifyCustomerActivity(params: {
    activity: string
    customerName: string
    details?: string
    actionUrl?: string
  }) {
    return await createNotification({
      title: 'Aktivitas Customer',
      message: `${params.customerName} - ${params.activity}${params.details ? `: ${params.details}` : ''}`,
      type: 'info',
      category: 'customer',
      actionUrl: params.actionUrl || '/dashboard/master/customer',
      metadata: {
        activity: params.activity,
        customerName: params.customerName,
        details: params.details
      }
    })
  }

  static async notifyReturNeeded(params: {
    type: 'beli' | 'jual'
    docNumber: string
    items: Array<{
      barangName: string
      quantity: number
      reason: string
    }>
    partnerName?: string
  }) {
    const partnerType = params.type === 'beli' ? 'Supplier' : 'Customer'
    const itemDetails = params.items.map(item => `${item.barangName} (${item.quantity} unit)`).join(', ')

    return await createNotification({
      title: `Perlu Proses Retur ${params.type === 'beli' ? 'Pembelian' : 'Penjualan'}`,
      message: `${params.docNumber} - ${params.items.length} item${params.partnerName ? ` dari ${partnerType}: ${params.partnerName}` : ''}: ${itemDetails}`,
      type: 'warning',
      category: params.type === 'beli' ? 'transaction' : 'customer',
      actionUrl: `/dashboard/transaksi/retur-${params.type}`,
      metadata: {
        type: params.type,
        docNumber: params.docNumber,
        items: params.items,
        partnerName: params.partnerName
      }
    })
  }

  // System notifications
  static async notifySystemMaintenance(params: {
    message: string
    scheduledTime?: Date
    duration?: string
    severity?: 'low' | 'medium' | 'high'
  }) {
    return await createNotification({
      title: 'Pemeliharaan Sistem',
      message: params.message,
      type: params.severity === 'high' ? 'error' : params.severity === 'medium' ? 'warning' : 'info',
      category: 'system',
      metadata: {
        scheduledTime: params.scheduledTime,
        duration: params.duration,
        severity: params.severity || 'low'
      }
    })
  }

  static async notifySystemAlert(params: {
    title: string
    message: string
    severity?: 'low' | 'medium' | 'high'
    actionUrl?: string
  }) {
    return await createNotification({
      title: params.title,
      message: params.message,
      type: params.severity === 'high' ? 'error' : params.severity === 'medium' ? 'warning' : 'info',
      category: 'system',
      actionUrl: params.actionUrl,
      metadata: {
        severity: params.severity || 'low'
      }
    })
  }

  // Batch notifications
  static async notifyBatchStockUpdates(items: Array<{
    barangName: string
    previousStock: number
    newStock: number
    difference: number
    gudangName?: string
  }>) {
    const totalChanges = items.length
    const significantChanges = items.filter(item => Math.abs(item.difference) >= 10)

    if (significantChanges.length === 0) return

    return await createNotification({
      title: 'Update Stok Batch',
      message: `${significantChanges.length} item mengalami perubahan stok signifikan`,
      type: 'info',
      category: 'stock',
      actionUrl: '/dashboard/laporan/stok',
      metadata: {
        totalChanges,
        significantChanges: significantChanges.length,
        items: significantChanges.map(item => ({
          barangName: item.barangName,
          previousStock: item.previousStock,
          newStock: item.newStock,
          difference: item.difference,
          gudangName: item.gudangName
        }))
      }
    })
  }

  // Analytics notifications
  static async notifyAnalyticsInsight(params: {
    title: string
    message: string
    insight: string
    actionUrl?: string
    metrics?: Record<string, any>
  }) {
    return await createNotification({
      title: params.title,
      message: params.message,
      type: 'info',
      category: 'system',
      actionUrl: params.actionUrl || '/dashboard/analytics',
      metadata: {
        insight: params.insight,
        metrics: params.metrics
      }
    })
  }
}

// Helper function to check and create stock level notifications
export async function checkAndNotifyStockLevels(barang: any, currentStock: number, gudangId?: string, gudangName?: string) {
  const notifications = []

  // Check for out of stock
  if (currentStock === 0) {
    notifications.push(
      await NotificationService.notifyOutOfStock([{
        barangId: barang.id,
        barangName: barang.nama,
        needsDropship: barang.isDropship
      }])
    )
  }
  // Check for low stock
  else if (currentStock <= barang.minStok) {
    notifications.push(
      await NotificationService.notifyLowStock({
        barangId: barang.id,
        barangName: barang.nama,
        currentStock,
        minStock: barang.minStok,
        gudangId,
        gudangName
      })
    )
  }
  // Check for overstock
  else if (barang.maxStok && currentStock >= barang.maxStok) {
    notifications.push(
      await NotificationService.notifyOverstock({
        barangId: barang.id,
        barangName: barang.nama,
        currentStock,
        maxStock: barang.maxStok,
        gudangName
      })
    )
  }

  return notifications
}

export default NotificationService