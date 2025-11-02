/**
 * Server-side notification utilities
 * For sending notifications from API routes
 */

import { NextRequest } from 'next/server'

export interface NotificationPayload {
  userId?: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  category: 'stock' | 'transaction' | 'system' | 'dropship' | 'customer'
  actionUrl?: string
  metadata?: Record<string, any>
}

// WebSocket/SSE implementation would go here
// For now, we'll use server-sent events or simple polling

export async function sendNotification(payload: NotificationPayload) {
  // This would integrate with your notification system
  // Could be WebSocket, SSE, Push notification, etc.

  console.log('Notification:', payload)

  // Store in database if needed
  // await db.notification.create({
  //   data: {
  //     userId: payload.userId,
  //     type: payload.type,
  //     title: payload.title,
  //     message: payload.message,
  //     category: payload.category,
  //     read: false,
  //     metadata: payload.metadata,
  //   }
  // })

  // Send real-time notification via WebSocket/SSE
  // if (websocketServer) {
  //   websocketServer.send(payload.userId || 'all', payload)
  // }
}

// Stock notifications
export async function notifyLowStock(productName: string, currentStock: number, minStock: number) {
  await sendNotification({
    type: 'warning',
    title: 'Stok Menipis',
    message: `${productName} - Stok tersisa: ${currentStock} unit (minimum: ${minStock})`,
    category: 'stock',
    metadata: { productName, currentStock, minStock },
    actionUrl: '/dashboard/master/barang',
  })
}

export async function notifyStockUpdate(barangId: string, type: 'in' | 'out', quantity: number, gudangId: string) {
  await sendNotification({
    type: 'info',
    title: `Update Stok ${type === 'in' ? 'Masuk' : 'Keluar'}`,
    message: `${quantity} unit ${type === 'in' ? 'ditambahkan ke' : 'dikurangi dari'} stok`,
    category: 'stock',
    metadata: { barangId, type, quantity, gudangId },
  })
}

export async function notifyStockoutRisk(productName: string, currentStock: number, predictedDays: number) {
  await sendNotification({
    type: 'warning',
    title: 'Resiko Kekurangan Stok',
    message: `${productName} diperkirakan habis dalam ${predictedDays} hari (stok: ${currentStock})`,
    category: 'stock',
    metadata: { productName, currentStock, predictedDays },
  })
}

// Transaction notifications
export async function notifyTransactionStatus(
  transactionType: string,
  docNumber: string,
  status: 'draft' | 'posted' | 'in_transit' | 'delivered' | 'cancelled',
  userId?: string
) {
  const statusMessages = {
    draft: 'Dibuat',
    posted: 'Diposting',
    in_transit: 'Dalam pengiriman',
    delivered: 'Selesai',
    cancelled: 'Dibatalkan',
  }

  await sendNotification({
    userId,
    type: status === 'cancelled' ? 'error' : status === 'delivered' ? 'success' : 'info',
    title: `Update ${transactionType}`,
    message: `${docNumber} - ${statusMessages[status]}`,
    category: 'transaction',
    metadata: { transactionType, docNumber, status },
    actionUrl: `/dashboard/transaksi/${transactionType === 'barang masuk' ? 'barang-masuk' : transactionType}`,
  })
}

// Dropship notifications
export async function notifyDropshipStatus(
  suratJalanId: string,
  productName: string,
  status: 'pending' | 'ordered' | 'received',
  supplierName?: string
) {
  const statusMessages = {
    pending: 'Menunggu proses dropship',
    ordered: `Sudah dipesan ke ${supplierName || 'supplier'}`,
    received: 'Sudah diterima dari supplier',
  }

  await sendNotification({
    type: status === 'received' ? 'success' : 'info',
    title: 'Status Dropship',
    message: `${productName}: ${statusMessages[status]}`,
    category: 'dropship',
    metadata: { suratJalanId, productName, status, supplierName },
    actionUrl: `/dashboard/transaksi/surat-jalan`,
  })
}

// Customer notifications
export async function notifyNewCustomer(customerName: string, customerKode: string) {
  await sendNotification({
    type: 'success',
    title: 'Customer Baru',
    message: `${customerName} (${customerKode}) berhasil ditambahkan`,
    category: 'customer',
    metadata: { customerName, customerKode },
    actionUrl: '/dashboard/master/customer',
  })
}

export async function notifyReturStatus(
  returType: 'beli' | 'jual',
  noRetur: string,
  status: 'draft' | 'approved' | 'completed'
) {
  const typeText = returType === 'beli' ? 'Retur ke Supplier' : 'Retur dari Customer'

  await sendNotification({
    type: status === 'completed' ? 'success' : status === 'approved' ? 'info' : 'warning',
    title: `Update ${typeText}`,
    message: `${noRetur} - ${status === 'completed' ? 'Selesai' : status === 'approved' ? 'Disetujui' : 'Draft'}`,
    category: 'customer',
    metadata: { returType, noRetur, status },
    actionUrl: `/dashboard/transaksi/retur-${returType}`,
  })
}

// System notifications
export async function notifySystemMaintenance(scheduledTime: Date, duration: string) {
  await sendNotification({
    type: 'warning',
    title: 'Jadwal Maintenance Sistem',
    message: `Sistem akan maintenance pada ${scheduledTime.toLocaleString('id-ID')} selama ${duration}`,
    category: 'system',
    metadata: { scheduledTime, duration },
  })
}

export async function notifyDataSyncStatus(module: string, status: 'success' | 'error', message?: string) {
  await sendNotification({
    type: status,
    title: `Sinkronisasi ${module}`,
    message: message || `Data ${module} berhasil ${status === 'success' ? 'disinkronkan' : 'gagal disinkronkan'}`,
    category: 'system',
    metadata: { module, status, message },
  })
}

// Business intelligence notifications
export async function notifyDailyStats(stats: {
  totalSales: number
  totalRevenue: number
  totalPurchases: number
  topProduct?: string
}) {
  await sendNotification({
    type: 'info',
    title: 'Laporan Harian',
    message: `Sales: ${stats.totalSales} | Revenue: ${new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(stats.totalRevenue)}${stats.topProduct ? ` | Top: ${stats.topProduct}` : ''}`,
    category: 'system',
    metadata: stats,
    actionUrl: '/dashboard/analytics',
  })
}

export async function notifyAnomalyDetection(anomaly: {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high'
  recommendation?: string
}) {
  await sendNotification({
    type: anomaly.severity === 'high' ? 'error' : anomaly.severity === 'medium' ? 'warning' : 'info',
    title: 'Deteksi Anomali',
    message: `${anomaly.description}${anomaly.recommendation ? `. Rekomendasi: ${anomaly.recommendation}` : ''}`,
    category: 'system',
    metadata: anomaly,
  })
}

// Performance notifications
export async function notifySlowQuery(query: string, duration: number) {
  await sendNotification({
    type: 'warning',
    title: 'Query Performance Warning',
    message: `Query memakan waktu ${duration}ms. Optimalkan query berikut: ${query.substring(0, 100)}...`,
    category: 'system',
    metadata: { query, duration },
  })
}

// API Helper function
export function addNotificationToResponse(request: NextRequest, notification: NotificationPayload) {
  // Add custom header for client-side notifications
  // This is a simple approach for real-time notifications without WebSocket
  request.headers.set('X-Notification', JSON.stringify(notification))
}

// Notification templates
export const NotificationTemplates = {
  WELCOME: {
    type: 'info' as const,
    title: 'Selamat Datang di Sistem Inventory',
    message: 'Sistem manajemen stok dan transaksi siap digunakan',
    category: 'system' as const,
  },

  FIRST_LOGIN: {
    type: 'success' as const,
    title: 'Login Berhasil',
    message: 'Selamat datang kembali! Semoga hari Anda produktif',
    category: 'system' as const,
  },

  BACKUP_COMPLETE: {
    type: 'success' as const,
    title: 'Backup Data Selesai',
    message: 'Data sistem berhasil di-backup',
    category: 'system' as const,
  },

  SECURITY_ALERT: {
    type: 'error' as const,
    title: 'Alert Keamanan',
    message: 'Aktivitas mencurigakan terdeteksi pada akun Anda',
    category: 'system' as const,
  },
}