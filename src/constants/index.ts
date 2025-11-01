export const ROLES = {
  ADMIN: 'admin',
  STAFF_GUDANG: 'staff_gudang',
  SALES: 'sales',
  MANAGER: 'manager',
} as const

export const PERMISSIONS = {
  admin: ['*'],

  manager: [
    'view_all_reports',
    'approve_retur',
    'view_dashboard',
    'manage_users',
    'view_master_data',
    'manage_master_data',
  ],

  staff_gudang: [
    'manage_barang_masuk',
    'manage_delivery_order',
    'manage_surat_jalan',
    'view_stok',
    'view_master_data',
  ],

  sales: [
    'manage_customer',
    'create_surat_jalan',
    'view_stok',
    'manage_retur_jual',
    'view_master_data',
  ],
} as const

export const TRANSACTION_STATUS = {
  DRAFT: 'draft',
  POSTED: 'posted',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  APPROVED: 'approved',
  COMPLETED: 'completed',
} as const

export const DROPSHIP_STATUS = {
  PENDING: 'pending',
  ORDERED: 'ordered',
  RECEIVED: 'received',
} as const

export const CUSTOMER_TYPE = {
  RETAIL: 'retail',
  WHOLESALE: 'wholesale',
  DISTRIBUTOR: 'distributor',
} as const

export const KONDISI_RETUR_JUAL = {
  BISA_DIJUAL_LAGI: 'bisa_dijual_lagi',
  RUSAK_TOTAL: 'rusak_total',
} as const

export const ALASAN_RETUR = {
  RUSAK: 'Rusak',
  TIDAK_SESUAI: 'Tidak Sesuai',
  KADALUARSA: 'Kadaluarsa',
  CACAT: 'Cacat',
  TIDAK_SESUAI_PESANAN: 'Tidak Sesuai Pesanan',
} as const

export const SATUAN = {
  PCS: 'pcs',
  UNIT: 'unit',
  BOX: 'box',
  PACK: 'pack',
  LUSIN: 'lusin',
  KARTON: 'karton',
} as const

export const DOCUMENT_PREFIX = {
  BARANG_MASUK: 'BM',
  SURAT_JALAN: 'SJ',
  DELIVERY_ORDER: 'DO',
  RETUR_BELI: 'RB',
  RETUR_JUAL: 'RJ',
} as const

export const API_ENDPOINTS = {
  // Master Data
  GUDANG: '/api/master/gudang',
  CUSTOMER: '/api/master/customer',
  SUPPLIER: '/api/master/supplier',
  BARANG: '/api/master/barang',
  GOLONGAN: '/api/master/golongan',

  // Stok
  STOK: '/api/stok',
  STOK_KARTU: '/api/stok/kartu',

  // Transaksi
  BARANG_MASUK: '/api/transaksi/barang-masuk',
  DELIVERY_ORDER: '/api/transaksi/delivery-order',
  SURAT_JALAN: '/api/transaksi/surat-jalan',
  RETUR_BELI: '/api/transaksi/retur-beli',
  RETUR_JUAL: '/api/transaksi/retur-jual',

  // Laporan
  LAPORAN_STOK: '/api/laporan/stok',
  LAPORAN_MUTASI: '/api/laporan/mutasi',
  LAPORAN_PENJUALAN: '/api/laporan/penjualan',
  LAPORAN_PEMBELIAN: '/api/laporan/pembelian',
} as const

export const TABLE_CONFIG = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZES: [10, 20, 50, 100],
  DEFAULT_SORT: { field: 'createdAt', direction: 'desc' },
} as const

export const DATE_FORMATS = {
  DISPLAY: 'dd MMMM yyyy',
  DISPLAY_WITH_TIME: 'dd MMMM yyyy HH:mm',
  INPUT: 'yyyy-MM-dd',
  INPUT_WITH_TIME: "yyyy-MM-dd'T'HH:mm",
} as const

export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const