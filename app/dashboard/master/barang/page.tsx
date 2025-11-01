'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Package,
  BarChart3,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Filter,
  DollarSign,
  Archive,
  Truck,
  Building,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'
import { BarangFormData, barangSchema } from '@/lib/validations'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface Barang {
  id: string
  kode: string
  nama: string
  ukuran?: string
  tipe?: string
  merk?: string
  golonganId: string
  golongan: {
    id: string
    kode: string
    nama: string
  }
  hargaBeli: number
  hargaJual: number
  satuan: string
  minStok: number
  maxStok?: number
  isDropship: boolean
  aktif: boolean
  createdAt: string
  updatedAt: string
  stokBarang: Array<{
    id: string
    qty: number
    gudang: {
      id: string
      kode: string
      nama: string
    }
  }>
  supplierBarang: Array<{
    id: string
    supplier: {
      id: string
      kode: string
      nama: string
    }
    isPrimary: boolean
  }>
  _count: {
    detailBarangMasuk: number
    detailSuratJalan: number
    detailReturBeli: number
    detailReturJual: number
  }
}

interface Golongan {
  id: string
  kode: string
  nama: string
}

interface BarangStatistics {
  totalStockValue: number
  lowStockCount: number
  activeItems: number
  inactiveItems: number
  dropshipItems: number
  ownStockItems: number
}

type BarangFormValues = z.input<typeof barangSchema>
const defaultBarangFormValues: BarangFormValues = {
  kode: '',
  nama: '',
  ukuran: '',
  tipe: '',
  merk: '',
  golonganId: '',
  hargaBeli: 0,
  hargaJual: 0,
  satuan: '',
  minStok: 0,
  maxStok: undefined,
  isDropship: false,
  aktif: true,
}

export default function BarangPage() {
  const [barangs, setBarangs] = useState<Barang[]>([])
  const [golongans, setGolongans] = useState<Golongan[]>([])
  const [statistics, setStatistics] = useState<BarangStatistics>({
    totalStockValue: 0,
    lowStockCount: 0,
    activeItems: 0,
    inactiveItems: 0,
    dropshipItems: 0,
    ownStockItems: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGolongan, setSelectedGolongan] = useState('')
  const [dropshipFilter, setDropshipFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editingBarang, setEditingBarang] = useState<Barang | null>(null)
  const [viewingBarang, setViewingBarang] = useState<Barang | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBarang, setSelectedBarang] = useState<Barang | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BarangFormValues>({
    resolver: zodResolver(barangSchema),
    defaultValues: defaultBarangFormValues,
  })

  const watchedValues = watch()

  // Fetch golongans for select dropdown
  const fetchGolongans = async () => {
    try {
      const response = await fetch('/api/master/golongan?limit=100')
      const result = await response.json()
      if (result.success) {
        setGolongans(result.data)
      }
    } catch (error) {
      console.error('Error fetching golongans:', error)
    }
  }

  // Fetch barangs with filters
  const fetchBarangs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      })

      if (selectedGolongan) params.append('golonganId', selectedGolongan)
      if (dropshipFilter) params.append('isDropship', dropshipFilter)
      if (statusFilter) params.append('aktif', statusFilter)

      const response = await fetch(`/api/master/barang?${params}`)
      const result = await response.json()

      if (result.success) {
        setBarangs(result.data)
        setPagination(result.pagination)
        setStatistics(result.statistics)
      } else {
        toast.error('Gagal mengambil data barang')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGolongans()
  }, [])

  useEffect(() => {
    fetchBarangs()
  }, [pagination.page, search, selectedGolongan, dropshipFilter, statusFilter])

  const onSubmit = async (data: BarangFormValues) => {
    setSubmitting(true)
    try {
      const payload: BarangFormData = barangSchema.parse(data)
      const url = editingBarang
        ? `/api/master/barang/${editingBarang.id}`
        : '/api/master/barang'
      const method = editingBarang ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(
          editingBarang
            ? 'Barang berhasil diperbarui'
            : 'Barang berhasil ditambahkan'
        )
        setDialogOpen(false)
        reset()
        setEditingBarang(null)
        fetchBarangs()
      } else {
        toast.error(result.error || 'Gagal menyimpan data')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (barang: Barang) => {
    setEditingBarang(barang)
    setValue('kode', barang.kode)
    setValue('nama', barang.nama)
    setValue('ukuran', barang.ukuran || '')
    setValue('tipe', barang.tipe || '')
    setValue('merk', barang.merk || '')
    setValue('golonganId', barang.golonganId)
    setValue('hargaBeli', barang.hargaBeli)
    setValue('hargaJual', barang.hargaJual)
    setValue('satuan', barang.satuan)
    setValue('minStok', barang.minStok)
    setValue('maxStok', barang.maxStok ?? undefined)
    setValue('isDropship', barang.isDropship)
    setValue('aktif', barang.aktif)
    setDialogOpen(true)
  }

  const handleView = (barang: Barang) => {
    setViewingBarang(barang)
    setDetailDialogOpen(true)
  }

  const openDeleteDialog = (barang: Barang) => {
    setSelectedBarang(barang)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedBarang) return

    try {
      const response = await fetch(`/api/master/barang/${selectedBarang.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Barang berhasil dihapus')
        setDeleteDialogOpen(false)
        setSelectedBarang(null)
        fetchBarangs()
      } else {
        toast.error(result.error || 'Gagal menghapus barang')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghapus barang')
    }
  }

  const openAddDialog = () => {
    setEditingBarang(null)
    reset(defaultBarangFormValues)
    setDialogOpen(true)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getTotalStock = (barang: Barang) => {
    return barang.stokBarang.reduce((sum, stok) => sum + stok.qty, 0)
  }

  const getStockStatus = (barang: Barang) => {
    const totalStock = getTotalStock(barang)
    if (totalStock === 0) return { status: 'empty', label: 'Habis', color: 'destructive' }
    if (totalStock < barang.minStok) return { status: 'low', label: 'Rendah', color: 'secondary' }
    if (barang.maxStok && totalStock > barang.maxStok) return { status: 'over', label: 'Berlebih', color: 'outline' }
    return { status: 'normal', label: 'Normal', color: 'default' }
  }

  const clearFilters = () => {
    setSelectedGolongan('')
    setDropshipFilter('')
    setStatusFilter('')
    setSearch('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Barang</h1>
          <p className="text-muted-foreground">
            Kelola data barang atau item inventaris
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Barang
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Stok</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.totalStockValue)}</div>
            <p className="text-xs text-muted-foreground">
              Nilai total semua stok barang
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statistics.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Barang perlu diisi ulang
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Barang Aktif</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.activeItems}</div>
            <p className="text-xs text-muted-foreground">
              Dari {statistics.activeItems + statistics.inactiveItems} total barang
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dropship</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.dropshipItems}</div>
            <p className="text-xs text-muted-foreground">
              Barang dari supplier
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-4 w-4" />
            Filter & Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedGolongan || undefined}
              onValueChange={(value) => setSelectedGolongan(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Golongan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Golongan</SelectItem>
                {golongans.map((golongan) => (
                  <SelectItem key={golongan.id} value={golongan.id}>
                    {golongan.kode} - {golongan.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={dropshipFilter || undefined}
              onValueChange={(value) => setDropshipFilter(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipe Barang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="true">Dropship</SelectItem>
                <SelectItem value="false">Stok Sendiri</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter || undefined}
              onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Non-aktif</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Barang</CardTitle>
          <CardDescription>
            Total {pagination.total} barang terdaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Memuat data...</div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Golongan</TableHead>
                      <TableHead>Spesifikasi</TableHead>
                      <TableHead>Stok</TableHead>
                      <TableHead>Harga</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barangs.map((barang) => {
                      const totalStock = getTotalStock(barang)
                      const stockStatus = getStockStatus(barang)

                      return (
                        <TableRow key={barang.id}>
                          <TableCell className="font-medium">{barang.kode}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{barang.nama}</div>
                              {barang.isDropship && (
                                <Badge variant="outline" className="mt-1">
                                  <Truck className="mr-1 h-3 w-3" />
                                  Dropship
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {barang.golongan.kode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-gray-500">
                              {barang.merk && <div>Merk: {barang.merk}</div>}
                              {barang.tipe && <div>Tipe: {barang.tipe}</div>}
                              {barang.ukuran && <div>Ukuran: {barang.ukuran}</div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{totalStock} {barang.satuan}</div>
                              <Badge variant={stockStatus.color as any}>
                                {stockStatus.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                Beli: {formatCurrency(barang.hargaBeli)}
                              </div>
                              <div className="text-sm font-medium">
                                Jual: {formatCurrency(barang.hargaJual)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={barang.aktif ? 'default' : 'secondary'}>
                              {barang.aktif ? 'Aktif' : 'Non-aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(barang)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Detail
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEdit(barang)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(barang)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {barangs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Belum ada data barang
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Mulai dengan menambahkan barang pertama
                  </p>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Barang
                  </Button>
                </div>
              )}

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Menampilkan {barangs.length} dari {pagination.total} data
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.max(1, prev.page - 1),
                        }))
                      }
                      disabled={pagination.page === 1}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.min(prev.totalPages, prev.page + 1),
                        }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBarang ? 'Edit Barang' : 'Tambah Barang Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingBarang
                ? 'Edit informasi barang yang sudah ada.'
                : 'Tambahkan barang baru ke sistem.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="kode">Kode Barang</Label>
                  <Input
                    id="kode"
                    {...register('kode')}
                    placeholder="Contoh: BRG001"
                    disabled={submitting}
                  />
                  {errors.kode && (
                    <p className="text-sm text-red-600">{errors.kode.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="satuan">Satuan</Label>
                  <Input
                    id="satuan"
                    {...register('satuan')}
                    placeholder="Contoh: pcs, unit, box"
                    disabled={submitting}
                  />
                  {errors.satuan && (
                    <p className="text-sm text-red-600">{errors.satuan.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="nama">Nama Barang</Label>
                <Input
                  id="nama"
                  {...register('nama')}
                  placeholder="Contoh: Laptop ASUS ROG"
                  disabled={submitting}
                />
                {errors.nama && (
                  <p className="text-sm text-red-600">{errors.nama.message}</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="merk">Merk</Label>
                  <Input
                    id="merk"
                    {...register('merk')}
                    placeholder="Contoh: ASUS"
                    disabled={submitting}
                  />
                  {errors.merk && (
                    <p className="text-sm text-red-600">{errors.merk.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tipe">Tipe</Label>
                  <Input
                    id="tipe"
                    {...register('tipe')}
                    placeholder="Contoh: Gaming"
                    disabled={submitting}
                  />
                  {errors.tipe && (
                    <p className="text-sm text-red-600">{errors.tipe.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ukuran">Ukuran</Label>
                  <Input
                    id="ukuran"
                    {...register('ukuran')}
                    placeholder="Contoh: 15 inch"
                    disabled={submitting}
                  />
                  {errors.ukuran && (
                    <p className="text-sm text-red-600">{errors.ukuran.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="golonganId">Golongan</Label>
                <Select
                  value={watchedValues.golonganId}
                  onValueChange={(value) => setValue('golonganId', value)}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Golongan" />
                  </SelectTrigger>
                  <SelectContent>
                    {golongans.map((golongan) => (
                      <SelectItem key={golongan.id} value={golongan.id}>
                        {golongan.kode} - {golongan.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.golonganId && (
                  <p className="text-sm text-red-600">{errors.golonganId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="hargaBeli">Harga Beli</Label>
                  <Input
                    id="hargaBeli"
                    type="number"
                    step="0.01"
                    {...register('hargaBeli', { valueAsNumber: true })}
                    placeholder="0"
                    disabled={submitting}
                  />
                  {errors.hargaBeli && (
                    <p className="text-sm text-red-600">{errors.hargaBeli.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hargaJual">Harga Jual</Label>
                  <Input
                    id="hargaJual"
                    type="number"
                    step="0.01"
                    {...register('hargaJual', { valueAsNumber: true })}
                    placeholder="0"
                    disabled={submitting}
                  />
                  {errors.hargaJual && (
                    <p className="text-sm text-red-600">{errors.hargaJual.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="minStok">Min Stok</Label>
                  <Input
                    id="minStok"
                    type="number"
                    {...register('minStok', { valueAsNumber: true })}
                    placeholder="0"
                    disabled={submitting}
                  />
                  {errors.minStok && (
                    <p className="text-sm text-red-600">{errors.minStok.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="maxStok">Max Stok (Opsional)</Label>
                  <Input
                    id="maxStok"
                    type="number"
                    {...register('maxStok', { valueAsNumber: true })}
                    placeholder="0"
                    disabled={submitting}
                  />
                  {errors.maxStok && (
                    <p className="text-sm text-red-600">{errors.maxStok.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isDropship"
                    checked={watchedValues.isDropship || false}
                    onCheckedChange={(checked) => setValue('isDropship', checked)}
                    disabled={submitting}
                  />
                  <Label htmlFor="isDropship">Barang Dropship</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="aktif"
                    checked={watchedValues.aktif !== false}
                    onCheckedChange={(checked) => setValue('aktif', checked)}
                    disabled={submitting}
                  />
                  <Label htmlFor="aktif">Aktif</Label>
                </div>
              </div>

              {watchedValues.isDropship && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Info:</strong> Barang dropship adalah barang yang tidak disimpan di gudang
                    tapi langsung dikirim dari supplier ketika ada pesanan.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : editingBarang ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail View Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Barang</DialogTitle>
            <DialogDescription>
              Informasi lengkap dan transaksi terkait barang
            </DialogDescription>
          </DialogHeader>
          {viewingBarang && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Informasi</TabsTrigger>
                <TabsTrigger value="stock">Stok</TabsTrigger>
                <TabsTrigger value="suppliers">Supplier</TabsTrigger>
                <TabsTrigger value="transactions">Transaksi</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kode Barang</Label>
                    <p className="font-medium">{viewingBarang.kode}</p>
                  </div>
                  <div>
                    <Label>Nama Barang</Label>
                    <p className="font-medium">{viewingBarang.nama}</p>
                  </div>
                  <div>
                    <Label>Golongan</Label>
                    <p className="font-medium">{viewingBarang.golongan.kode} - {viewingBarang.golongan.nama}</p>
                  </div>
                  <div>
                    <Label>Satuan</Label>
                    <p className="font-medium">{viewingBarang.satuan}</p>
                  </div>
                  {viewingBarang.merk && (
                    <div>
                      <Label>Merk</Label>
                      <p className="font-medium">{viewingBarang.merk}</p>
                    </div>
                  )}
                  {viewingBarang.tipe && (
                    <div>
                      <Label>Tipe</Label>
                      <p className="font-medium">{viewingBarang.tipe}</p>
                    </div>
                  )}
                  {viewingBarang.ukuran && (
                    <div>
                      <Label>Ukuran</Label>
                      <p className="font-medium">{viewingBarang.ukuran}</p>
                    </div>
                  )}
                  <div>
                    <Label>Harga Beli</Label>
                    <p className="font-medium">{formatCurrency(viewingBarang.hargaBeli)}</p>
                  </div>
                  <div>
                    <Label>Harga Jual</Label>
                    <p className="font-medium">{formatCurrency(viewingBarang.hargaJual)}</p>
                  </div>
                  <div>
                    <Label>Min Stok</Label>
                    <p className="font-medium">{viewingBarang.minStok} {viewingBarang.satuan}</p>
                  </div>
                  {viewingBarang.maxStok && (
                    <div>
                      <Label>Max Stok</Label>
                      <p className="font-medium">{viewingBarang.maxStok} {viewingBarang.satuan}</p>
                    </div>
                  )}
                  <div>
                    <Label>Status</Label>
                    <div className="flex space-x-2">
                      <Badge variant={viewingBarang.aktif ? 'default' : 'secondary'}>
                        {viewingBarang.aktif ? 'Aktif' : 'Non-aktif'}
                      </Badge>
                      {viewingBarang.isDropship && (
                        <Badge variant="outline">
                          <Truck className="mr-1 h-3 w-3" />
                          Dropship
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="stock" className="space-y-4">
                <div className="grid gap-4">
                  {viewingBarang.stokBarang.map((stok) => (
                    <Card key={stok.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{stok.gudang.nama}</h4>
                            <p className="text-sm text-gray-500">{stok.gudang.kode}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{stok.qty}</div>
                            <div className="text-sm text-gray-500">{viewingBarang.satuan}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {viewingBarang.stokBarang.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Belum ada data stok untuk barang ini
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="suppliers" className="space-y-4">
                <div className="grid gap-4">
                  {viewingBarang.supplierBarang.map((supplierBarang) => (
                    <Card key={supplierBarang.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{supplierBarang.supplier.nama}</h4>
                            <p className="text-sm text-gray-500">{supplierBarang.supplier.kode}</p>
                          </div>
                          {supplierBarang.isPrimary && (
                            <Badge variant="default">Utama</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {viewingBarang.supplierBarang.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      {viewingBarang.isDropship
                        ? 'Barang dropship ini belum memiliki supplier terkait'
                        : 'Barang ini bukan barang dropship'
                      }
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">
                        {viewingBarang._count.detailBarangMasuk}
                      </div>
                      <div className="text-sm text-gray-500">Barang Masuk</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-blue-600">
                        {viewingBarang._count.detailSuratJalan}
                      </div>
                      <div className="text-sm text-gray-500">Barang Keluar</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-orange-600">
                        {viewingBarang._count.detailReturBeli}
                      </div>
                      <div className="text-sm text-gray-500">Retur Beli</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">
                        {viewingBarang._count.detailReturJual}
                      </div>
                      <div className="text-sm text-gray-500">Retur Jual</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus barang "{selectedBarang?.nama}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
