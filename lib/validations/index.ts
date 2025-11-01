import { z } from 'zod'

// Common validation schemas
const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Master Data Validations
export const gudangSchema = z.object({
  kode: z.string().min(1, 'Kode wajib diisi').max(10, 'Kode maksimal 10 karakter'),
  nama: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  alamat: z.string().min(1, 'Alamat wajib diisi'),
  telepon: z.string().regex(phoneRegex, 'Format telepon tidak valid').optional().or(z.literal('')),
  pic: z.string().max(50, 'PIC maksimal 50 karakter').optional().or(z.literal('')),
  aktif: z.boolean().default(true),
})

export const customerSchema = z.object({
  kode: z.string().min(1, 'Kode wajib diisi').max(10, 'Kode maksimal 10 karakter'),
  nama: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  alamat: z.string().min(1, 'Alamat wajib diisi'),
  telepon: z.string().regex(phoneRegex, 'Format telepon tidak valid'),
  email: z.string().regex(emailRegex, 'Format email tidak valid').optional().or(z.literal('')),
  npwp: z.string().max(20, 'NPWP maksimal 20 karakter').optional().or(z.literal('')),
  tipePelanggan: z.enum(['retail', 'wholesale', 'distributor']),
  limitKredit: z.number().min(0, 'Limit kredit tidak boleh negatif').optional(),
  aktif: z.boolean().default(true),
})

export const supplierSchema = z.object({
  kode: z.string().min(1, 'Kode wajib diisi').max(10, 'Kode maksimal 10 karakter'),
  nama: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  alamat: z.string().min(1, 'Alamat wajib diisi'),
  telepon: z.string().regex(phoneRegex, 'Format telepon tidak valid'),
  email: z.string().regex(emailRegex, 'Format email tidak valid').optional().or(z.literal('')),
  npwp: z.string().max(20, 'NPWP maksimal 20 karakter').optional().or(z.literal('')),
  termPembayaran: z.number().min(0, 'Term pembayaran tidak boleh negatif').default(30),
  aktif: z.boolean().default(true),
})

export const golonganSchema = z.object({
  kode: z.string().min(1, 'Kode wajib diisi').max(10, 'Kode maksimal 10 karakter'),
  nama: z.string().min(1, 'Nama wajib diisi').max(50, 'Nama maksimal 50 karakter'),
  deskripsi: z.string().optional().or(z.literal('')),
  aktif: z.boolean().default(true),
})

export const barangSchema = z.object({
  kode: z.string().min(1, 'Kode wajib diisi').max(20, 'Kode maksimal 20 karakter'),
  nama: z.string().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  ukuran: z.string().max(50, 'Ukuran maksimal 50 karakter').optional().or(z.literal('')),
  tipe: z.string().max(50, 'Tipe maksimal 50 karakter').optional().or(z.literal('')),
  merk: z.string().max(50, 'Merk maksimal 50 karakter').optional().or(z.literal('')),
  golonganId: z.string().min(1, 'Golongan wajib dipilih'),
  hargaBeli: z.number().min(0, 'Harga beli tidak boleh negatif'),
  hargaJual: z.number().min(0, 'Harga jual tidak boleh negatif'),
  satuan: z.string().min(1, 'Satuan wajib diisi'),
  minStok: z.number().min(0, 'Min stok tidak boleh negatif').default(0),
  maxStok: z.number().min(0, 'Max stok tidak boleh negatif').optional(),
  isDropship: z.boolean().default(false),
  aktif: z.boolean().default(true),
}).refine((data) => !data.maxStok || data.minStok <= data.maxStok, {
  message: 'Min stok tidak boleh lebih besar dari max stok',
  path: ['minStok'],
}).refine((data) => data.hargaJual >= data.hargaBeli, {
  message: 'Harga jual tidak boleh lebih kecil dari harga beli',
  path: ['hargaJual'],
})

// Transaction Validations
const detailItemSchema = z.object({
  barangId: z.string().min(1, 'Barang wajib dipilih'),
  qty: z.number().min(1, 'Qty minimal 1'),
  harga: z.number().min(0, 'Harga tidak boleh negatif'),
})

export const barangMasukSchema = z.object({
  noDokumen: z.string().optional(),
  tanggal: z.date().default(new Date()),
  supplierId: z.string().min(1, 'Supplier wajib dipilih'),
  gudangId: z.string().min(1, 'Gudang wajib dipilih'),
  keterangan: z.string().optional().or(z.literal('')),
  items: z.array(detailItemSchema).min(1, 'Minimal 1 item harus ditambahkan'),
})

const detailDeliveryItemSchema = z.object({
  barangId: z.string().min(1, 'Barang wajib dipilih'),
  namaBarang: z.string().min(1, 'Nama barang wajib diisi'),
  qty: z.number().min(1, 'Qty minimal 1'),
  satuan: z.string().min(1, 'Satuan wajib diisi'),
  keterangan: z.string().optional().or(z.literal('')),
})

export const deliveryOrderSchema = z.object({
  noDO: z.string().optional(),
  tanggal: z.date().default(new Date()),
  gudangAsalId: z.string().min(1, 'Gudang asal wajib dipilih'),
  gudangTujuan: z.string().min(1, 'Gudang tujuan wajib diisi'),
  namaSupir: z.string().min(1, 'Nama supir wajib diisi'),
  nopolKendaraan: z.string().min(1, 'No pol kendaraan wajib diisi'),
  keterangan: z.string().optional().or(z.literal('')),
  items: z.array(detailDeliveryItemSchema).min(1, 'Minimal 1 item harus ditambahkan'),
})

const detailSuratJalanItemSchema = z.object({
  barangId: z.string().min(1, 'Barang wajib dipilih'),
  qty: z.number().min(1, 'Qty minimal 1'),
  hargaJual: z.number().min(0, 'Harga jual tidak boleh negatif'),
  keterangan: z.string().optional().or(z.literal('')),
  // Dropship fields
  isDropship: z.boolean().default(false),
  supplierId: z.string().optional(),
  statusDropship: z.enum(['pending', 'ordered', 'received']).optional(),
})

export const suratJalanSchema = z.object({
  noSJ: z.string().optional(),
  tanggal: z.date().default(new Date()),
  customerId: z.string().min(1, 'Customer wajib dipilih'),
  gudangId: z.string().min(1, 'Gudang wajib dipilih'),
  alamatKirim: z.string().min(1, 'Alamat kirim wajib diisi'),
  namaSupir: z.string().min(1, 'Nama supir wajib diisi'),
  nopolKendaraan: z.string().min(1, 'No pol kendaraan wajib diisi'),
  keterangan: z.string().optional().or(z.literal('')),
  // Delivery options
  deliveryOption: z.enum(['partial', 'complete']).default('complete'),
  items: z.array(detailSuratJalanItemSchema).min(1, 'Minimal 1 item harus ditambahkan'),
})

const detailReturBeliItemSchema = z.object({
  barangId: z.string().min(1, 'Barang wajib dipilih'),
  qty: z.number().min(1, 'Qty minimal 1'),
  harga: z.number().min(0, 'Harga tidak boleh negatif'),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
})

export const returBeliSchema = z.object({
  noRetur: z.string().optional(),
  tanggal: z.date().default(new Date()),
  supplierId: z.string().min(1, 'Supplier wajib dipilih'),
  barangMasukRef: z.string().optional(),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
  items: z.array(detailReturBeliItemSchema).min(1, 'Minimal 1 item harus ditambahkan'),
})

const detailReturJualItemSchema = z.object({
  barangId: z.string().min(1, 'Barang wajib dipilih'),
  qty: z.number().min(1, 'Qty minimal 1'),
  harga: z.number().min(0, 'Harga tidak boleh negatif'),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
  kondisi: z.enum(['bisa_dijual_lagi', 'rusak_total']),
})

export const returJualSchema = z.object({
  noRetur: z.string().optional(),
  tanggal: z.date().default(new Date()),
  customerId: z.string().min(1, 'Customer wajib dipilih'),
  suratJalanId: z.string().optional(),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
  items: z.array(detailReturJualItemSchema).min(1, 'Minimal 1 item harus ditambahkan'),
})

// User Validations
export const loginSchema = z.object({
  email: z.string().regex(emailRegex, 'Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
})

export const registerSchema = z.object({
  email: z.string().regex(emailRegex, 'Format email tidak valid'),
  username: z.string().min(3, 'Username minimal 3 karakter').max(50, 'Username maksimal 50 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  namaLengkap: z.string().min(1, 'Nama lengkap wajib diisi').max(100, 'Nama lengkap maksimal 100 karakter'),
  role: z.enum(['admin', 'staff_gudang', 'sales', 'manager']),
})

export const updateProfileSchema = z.object({
  namaLengkap: z.string().min(1, 'Nama lengkap wajib diisi').max(100, 'Nama lengkap maksimal 100 karakter'),
  email: z.string().regex(emailRegex, 'Format email tidak valid'),
  username: z.string().min(3, 'Username minimal 3 karakter').max(50, 'Username maksimal 50 karakter'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

// Filter/Query Validations
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// Export types for use in components
export type GudangFormData = z.infer<typeof gudangSchema>
export type CustomerFormData = z.infer<typeof customerSchema>
export type SupplierFormData = z.infer<typeof supplierSchema>
export type GolonganFormData = z.infer<typeof golonganSchema>
export type BarangFormData = z.infer<typeof barangSchema>
export type BarangMasukFormData = z.infer<typeof barangMasukSchema>
export type DeliveryOrderFormData = z.infer<typeof deliveryOrderSchema>
export type SuratJalanFormData = z.infer<typeof suratJalanSchema>
export type ReturBeliFormData = z.infer<typeof returBeliSchema>
export type ReturJualFormData = z.infer<typeof returJualSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
export type PaginationFormData = z.infer<typeof paginationSchema>
export type DateRangeFormData = z.infer<typeof dateRangeSchema>