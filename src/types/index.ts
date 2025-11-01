import { User, Gudang, Customer, Supplier, Golongan, Barang, SupplierBarang, StokBarang, BarangMasuk, DetailBarangMasuk, DeliveryOrder, DetailDeliveryOrder, SuratJalan, DetailSuratJalan, ReturBeli, DetailReturBeli, ReturJual, DetailReturJual } from '@prisma/client'

// Auth Types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  namaLengkap: string
  role: string
}

// Extended User Types
export type UserWithRole = User & {
  // Add any additional fields if needed
}

// Master Data Types
export type GudangWithRelations = Gudang
export type CustomerWithRelations = Customer
export type SupplierWithRelations = Supplier
export type GolonganWithRelations = Golongan
export type BarangWithGolongan = Barang & {
  golongan: Golongan
  supplierBarang?: SupplierBarang[]
}
export type SupplierBarangWithDetails = SupplierBarang & {
  barang: Barang
  supplier: Supplier
}
export type StokBarangWithDetails = StokBarang & {
  barang: Barang
  gudang: Gudang
}

// Transaction Types
export type BarangMasukWithDetails = BarangMasuk & {
  supplier: Supplier
  gudang: Gudang
  detail: DetailBarangMasuk[]
}
export type DetailBarangMasukWithBarang = DetailBarangMasuk & {
  barang: Barang
}

export type DeliveryOrderWithDetails = DeliveryOrder & {
  gudangAsal: Gudang
  detail: DetailDeliveryOrder[]
}

export type SuratJalanWithDetails = SuratJalan & {
  customer: Customer
  gudang: Gudang
  detail: DetailSuratJalan[]
  returJual?: ReturJual[]
}
export type DetailSuratJalanWithBarang = DetailSuratJalan & {
  barang: Barang
}

export type ReturBeliWithDetails = ReturBeli & {
  supplier: Supplier
  barangMasukRef?: BarangMasuk
  detail: DetailReturBeli[]
}
export type DetailReturBeliWithBarang = DetailReturBeli & {
  barang: Barang
}

export type ReturJualWithDetails = ReturJual & {
  customer: Customer
  suratJalan?: SuratJalan
  detail: DetailReturJual[]
}
export type DetailReturJualWithBarang = DetailReturJual & {
  barang: Barang
}

// Form Types
export interface GudangForm {
  kode: string
  nama: string
  alamat: string
  telepon?: string
  pic?: string
  aktif?: boolean
}

export interface CustomerForm {
  kode: string
  nama: string
  alamat: string
  telepon: string
  email?: string
  npwp?: string
  tipePelanggan: string
  limitKredit?: number
  aktif?: boolean
}

export interface SupplierForm {
  kode: string
  nama: string
  alamat: string
  telepon: string
  email?: string
  npwp?: string
  termPembayaran?: number
  aktif?: boolean
}

export interface GolonganForm {
  kode: string
  nama: string
  deskripsi?: string
  aktif?: boolean
}

export interface BarangForm {
  kode: string
  nama: string
  ukuran?: string
  tipe?: string
  merk?: string
  golonganId: string
  hargaBeli: number
  hargaJual: number
  satuan: string
  minStok?: number
  maxStok?: number
  isDropship?: boolean
  aktif?: boolean
}

export interface BarangMasukForm {
  noDokumen?: string
  tanggal?: Date
  supplierId: string
  gudangId: string
  keterangan?: string
  items: {
    barangId: string
    qty: number
    harga: number
  }[]
}

export interface DeliveryOrderForm {
  noDO?: string
  tanggal?: Date
  gudangAsalId: string
  gudangTujuan: string
  namaSupir: string
  nopolKendaraan: string
  keterangan?: string
  items: {
    barangId: string
    namaBarang: string
    qty: number
    satuan: string
    keterangan?: string
  }[]
}

export interface SuratJalanForm {
  noSJ?: string
  tanggal?: Date
  customerId: string
  gudangId: string
  alamatKirim: string
  namaSupir: string
  nopolKendaraan: string
  keterangan?: string
  items: {
    barangId: string
    qty: number
    hargaJual: number
    keterangan?: string
  }[]
}

export interface ReturBeliForm {
  noRetur?: string
  tanggal?: Date
  supplierId: string
  barangMasukRef?: string
  alasan: string
  items: {
    barangId: string
    qty: number
    harga: number
    alasan: string
  }[]
}

export interface ReturJualForm {
  noRetur?: string
  tanggal?: Date
  customerId: string
  suratJalanId?: string
  alasan: string
  items: {
    barangId: string
    qty: number
    harga: number
    alasan: string
    kondisi: string
  }[]
}

// Stock Check Types
export interface StockCheckResult {
  available: boolean
  currentStock: number
  neededQty: number
  shortQty: number
  dropshipSuppliers?: SupplierBarang[]
}

export interface DropshipItem {
  barangId: string
  supplierId: string
  status: string
  leadTime: number
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Table Types
export interface ColumnDef<T = any> {
  id: string
  header: string
  accessorKey?: keyof T
  cell?: (props: { row: { original: T } }) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
}

export interface TableState {
  pagination: {
    page: number
    limit: number
  }
  sorting: {
    field: string
    direction: 'asc' | 'desc'
  }
  filters: Record<string, any>
}

// Dashboard Types
export interface DashboardStats {
  totalGudang: number
  totalBarang: number
  totalStokValue: number
  lowStockItems: number
  pendingTransactions: number
  todayTransactions: {
    barangMasuk: number
    barangKeluar: number
  }
}

export interface StockAlert {
  id: string
  barangId: string
  barangNama: string
  gudangId: string
  gudangNama: string
  currentStock: number
  minStock: number
  shortQty: number
}

export interface TransactionChart {
  date: string
  barangMasuk: number
  barangKeluar: number
}

// Report Types
export interface StockReport {
  barang: BarangWithGolongan
  totalStok: number
  totalNilai: number
  detail: {
    gudang: Gudang
    qty: number
    nilai: number
  }[]
}

export interface MutationReport {
  tanggal: Date
  jenis: 'MASUK' | 'KELUAR'
  noDokumen: string
  barang: Barang
  qty: number
  saldo: number
  keterangan?: string
}

export interface SalesReport {
  periode: string
  totalPenjualan: number
  totalNilai: number
  detail: {
    customer: Customer
    totalNilai: number
    totalQty: number
  }[]
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}