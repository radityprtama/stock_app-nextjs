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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
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
} from '@/components/ui/dialog'
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
  Printer,
  Send,
  Package,
  TrendingUp,
  Calendar,
  Building,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  FileText,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { BarangMasukFormData, barangMasukSchema } from '@/lib/validations'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface BarangMasuk {
  id: string
  noDokumen: string
  tanggal: string
  supplierId: string
  supplier: {
    id: string
    kode: string
    nama: string
  }
  gudangId: string
  gudang: {
    id: string
    kode: string
    nama: string
  }
  totalQty: number
  totalNilai: number
  keterangan?: string
  status: 'draft' | 'posted' | 'cancelled'
  createdBy: string
  createdAt: string
  updatedAt: string
  detail: Array<{
    id: string
    barangId: string
    barang: {
      id: string
      kode: string
      nama: string
      satuan: string
    }
    qty: number
    harga: number
    subtotal: number
    currentStock?: number
  }>
}

interface Supplier {
  id: string
  kode: string
  nama: string
  alamat: string
  telepon: string
  email?: string
  npwp?: string
}

interface Gudang {
  id: string
  kode: string
  nama: string
  alamat: string
  telepon?: string
  pic?: string
}

interface Barang {
  id: string
  kode: string
  nama: string
  merk?: string
  tipe?: string
  ukuran?: string
  satuan: string
  hargaBeli: number
  hargaJual: number
  aktif: boolean
}

interface BarangMasukStatistics {
  totalTransactions: number
  draftCount: number
  postedCount: number
  cancelledCount: number
  totalValue: number
  totalQuantity: number
}

interface FormData {
  barangId: string
  qty: number
  harga: number
}

type BarangMasukFormValues = z.input<typeof barangMasukSchema>
const defaultBarangMasukFormValues: BarangMasukFormValues = {
  noDokumen: '',
  tanggal: new Date(),
  supplierId: '',
  gudangId: '',
  keterangan: '',
  items: [],
}

export default function BarangMasukPage() {
  const [barangMasuks, setBarangMasuks] = useState<BarangMasuk[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [gudangs, setGudangs] = useState<Gudang[]>([])
  const [barangs, setBarangs] = useState<Barang[]>([])
  const [statistics, setStatistics] = useState<BarangMasukStatistics>({
    totalTransactions: 0,
    draftCount: 0,
    postedCount: 0,
    cancelledCount: 0,
    totalValue: 0,
    totalQuantity: 0,
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [selectedGudang, setSelectedGudang] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editingBarangMasuk, setEditingBarangMasuk] = useState<BarangMasuk | null>(null)
  const [viewingBarangMasuk, setViewingBarangMasuk] = useState<BarangMasuk | null>(null)
  const [items, setItems] = useState<FormData[]>([
    { barangId: '', qty: 1, harga: 0 }
  ])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BarangMasukFormValues>({
    resolver: zodResolver(barangMasukSchema),
    defaultValues: defaultBarangMasukFormValues,
  })

  const watchedValues = watch()

  // Fetch master data
  const fetchMasterData = async () => {
    try {
      const [suppliersRes, gudangsRes, barangsRes] = await Promise.all([
        fetch('/api/master/supplier?limit=100'),
        fetch('/api/master/gudang?limit=100'),
        fetch('/api/master/barang?limit=100&aktif=true'),
      ])

      const [suppliersData, gudangsData, barangsData] = await Promise.all([
        suppliersRes.json(),
        gudangsRes.json(),
        barangsRes.json(),
      ])

      if (suppliersData.success) setSuppliers(suppliersData.data)
      if (gudangsData.success) setGudangs(gudangsData.data)
      if (barangsData.success) setBarangs(barangsData.data)
    } catch (error) {
      console.error('Error fetching master data:', error)
      toast.error('Gagal mengambil data master')
    }
  }

  // Fetch Barang Masuk transactions
  const fetchBarangMasuks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      })

      if (selectedSupplier) params.append('supplierId', selectedSupplier)
      if (selectedGudang) params.append('gudangId', selectedGudang)
      if (selectedStatus) params.append('status', selectedStatus)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/transaksi/barang-masuk?${params}`)
      const result = await response.json()

      if (result.success) {
        setBarangMasuks(result.data)
        setPagination(result.pagination)
        setStatistics(result.statistics)
      } else {
        toast.error('Gagal mengambil data Barang Masuk')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMasterData()
  }, [])

  useEffect(() => {
    fetchBarangMasuks()
  }, [pagination.page, search, selectedSupplier, selectedGudang, selectedStatus, startDate, endDate])

  const onSubmit = async (data: BarangMasukFormValues) => {
    if (items.length === 0 || items.every(item => !item.barangId)) {
      toast.error('Minimal harus ada 1 item yang valid')
      return
    }

    setSubmitting(true)
    try {
      const payload = barangMasukSchema.parse({
        ...data,
        items: items.filter(item => item.barangId),
      })

      const url = editingBarangMasuk
        ? `/api/transaksi/barang-masuk/${editingBarangMasuk.id}`
        : '/api/transaksi/barang-masuk'
      const method = editingBarangMasuk ? 'PUT' : 'POST'

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
          editingBarangMasuk
            ? 'Barang Masuk berhasil diperbarui'
            : 'Barang Masuk berhasil dibuat'
        )
        setDialogOpen(false)
        reset({
          ...defaultBarangMasukFormValues,
          tanggal: new Date(),
          items: [],
        })
        setEditingBarangMasuk(null)
        setItems([{ barangId: '', qty: 1, harga: 0 }])
        fetchBarangMasuks()
      } else {
        toast.error(result.error || 'Gagal menyimpan data')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePost = async (barangMasuk: BarangMasuk) => {
    try {
      const response = await fetch(`/api/transaksi/barang-masuk/${barangMasuk.id}/post`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Barang Masuk berhasil diposting dan stok diperbarui')
        fetchBarangMasuks()
      } else {
        toast.error(result.error || 'Gagal memposting transaksi')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat memposting transaksi')
    }
  }

  const handleEdit = (barangMasuk: BarangMasuk) => {
    if (barangMasuk.status !== 'draft') {
      toast.error('Hanya transaksi dengan status draft yang bisa diedit')
      return
    }

    setEditingBarangMasuk(barangMasuk)
    setValue('supplierId', barangMasuk.supplierId)
    setValue('gudangId', barangMasuk.gudangId)
    setValue('tanggal', new Date(barangMasuk.tanggal))
    setValue('keterangan', barangMasuk.keterangan ?? '')
    setValue('noDokumen', barangMasuk.noDokumen ?? '')

    const formItems = barangMasuk.detail.map(detail => ({
      barangId: detail.barangId,
      qty: detail.qty,
      harga: Number(detail.harga),
    }))
    setItems(formItems)

    setDialogOpen(true)
  }

  const handleView = async (barangMasuk: BarangMasuk) => {
    try {
      const response = await fetch(`/api/transaksi/barang-masuk/${barangMasuk.id}`)
      const result = await response.json()

      if (result.success) {
        setViewingBarangMasuk(result.data)
        setViewDialogOpen(true)
      } else {
        toast.error('Gagal mengambil detail transaksi')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil detail')
    }
  }

  const handleDelete = async (barangMasuk: BarangMasuk) => {
    if (barangMasuk.status !== 'draft') {
      toast.error('Hanya transaksi dengan status draft yang bisa dihapus')
      return
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus transaksi "${barangMasuk.noDokumen}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/transaksi/barang-masuk/${barangMasuk.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Barang Masuk berhasil dihapus')
        fetchBarangMasuks()
      } else {
        toast.error(result.error || 'Gagal menghapus Barang Masuk')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghapus Barang Masuk')
    }
  }

  const openAddDialog = () => {
    setEditingBarangMasuk(null)
    reset({
      ...defaultBarangMasukFormValues,
      tanggal: new Date(),
    })
    setItems([{ barangId: '', qty: 1, harga: 0 }])
    setDialogOpen(true)
  }

  const addItem = () => {
    setItems([...items, { barangId: '', qty: 1, harga: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index)
      setItems(newItems)
    }
  }

  const updateItem = (index: number, field: keyof FormData, value: any) => {
    const newItems = [...items]
    if (field === 'barangId') {
      // Set default harga from barang when selected
      const barang = barangs.find(b => b.id === value)
      newItems[index] = {
        ...newItems[index],
        [field]: value,
        harga: barang?.hargaBeli || 0,
      }
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: field === 'qty' || field === 'harga' ? Number(value) : value,
      }
    }
    setItems(newItems)
  }

  const calculateSubtotal = (item: FormData) => {
    return item.qty * item.harga
  }

  const calculateGrandTotal = () => {
    return items.reduce((total, item) => total + calculateSubtotal(item), 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>
      case 'posted':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Posted</Badge>
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const clearFilters = () => {
    setSelectedSupplier('')
    setSelectedGudang('')
    setSelectedStatus('')
    setStartDate('')
    setEndDate('')
    setSearch('')
  }

  const handlePrint = (barangMasuk: BarangMasuk) => {
    const printContent = `
      <html>
        <head>
          <title>Bukti Barang Masuk - ${barangMasuk.noDokumen}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .info { margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .table th { background-color: #f2f2f2; }
            .total { text-align: right; font-weight: bold; }
            .footer { margin-top: 50px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Bukti Barang Masuk</h1>
            <h2>${barangMasuk.noDokumen}</h2>
            <p>${formatDate(barangMasuk.tanggal)}</p>
          </div>

          <div class="info">
            <p><strong>Supplier:</strong> ${barangMasuk.supplier.kode} - ${barangMasuk.supplier.nama}</p>
            <p><strong>Gudang:</strong> ${barangMasuk.gudang.kode} - ${barangMasuk.gudang.nama}</p>
            ${barangMasuk.keterangan ? `<p><strong>Keterangan:</strong> ${barangMasuk.keterangan}</p>` : ''}
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Kode Barang</th>
                <th>Nama Barang</th>
                <th>Qty</th>
                <th>Harga</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${barangMasuk.detail.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.barang.kode}</td>
                  <td>${item.barang.nama}</td>
                  <td>${item.qty} ${item.barang.satuan}</td>
                  <td>${formatCurrency(Number(item.harga))}</td>
                  <td>${formatCurrency(Number(item.subtotal))}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5" class="total">Total:</td>
                <td class="total">${formatCurrency(Number(barangMasuk.totalNilai))}</td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <p>Document printed on ${new Date().toLocaleString('id-ID')}</p>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barang Masuk</h1>
          <p className="text-muted-foreground">
            Kelola transaksi penerimaan barang dari supplier
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Barang Masuk Baru
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Semua transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statistics.draftCount}</div>
            <p className="text-xs text-muted-foreground">
              Menunggu posting
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.postedCount}</div>
            <p className="text-xs text-muted-foreground">
              Stok sudah diperbarui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Qty</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.totalQuantity}</div>
            <p className="text-xs text-muted-foreground">
              Total barang diterima
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Nilai total transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.cancelledCount}</div>
            <p className="text-xs text-muted-foreground">
              Transaksi dibatalkan
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari transaksi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedSupplier || undefined}
              onValueChange={(value) => setSelectedSupplier(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Supplier</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.kode} - {supplier.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedGudang || undefined}
              onValueChange={(value) => setSelectedGudang(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Gudang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Gudang</SelectItem>
                {gudangs.map((gudang) => (
                  <SelectItem key={gudang.id} value={gudang.id}>
                    {gudang.kode} - {gudang.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedStatus || undefined}
              onValueChange={(value) => setSelectedStatus(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Tanggal Awal"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <div className="flex space-x-2">
              <Input
                type="date"
                placeholder="Tanggal Akhir"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Button variant="outline" onClick={clearFilters}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi Barang Masuk</CardTitle>
          <CardDescription>
            Total {pagination.total} transaksi terdaftar
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
                      <TableHead>No Dokumen</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Gudang</TableHead>
                      <TableHead>Total Qty</TableHead>
                      <TableHead>Total Nilai</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barangMasuks.map((barangMasuk) => (
                      <TableRow key={barangMasuk.id}>
                        <TableCell className="font-medium">{barangMasuk.noDokumen}</TableCell>
                        <TableCell>{formatDate(barangMasuk.tanggal)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{barangMasuk.supplier.nama}</div>
                            <div className="text-sm text-gray-500">{barangMasuk.supplier.kode}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{barangMasuk.gudang.nama}</div>
                            <div className="text-sm text-gray-500">{barangMasuk.gudang.kode}</div>
                          </div>
                        </TableCell>
                        <TableCell>{barangMasuk.totalQty}</TableCell>
                        <TableCell>{formatCurrency(Number(barangMasuk.totalNilai))}</TableCell>
                        <TableCell>{getStatusBadge(barangMasuk.status)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleView(barangMasuk)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Detail
                              </DropdownMenuItem>
                              {barangMasuk.status === 'draft' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEdit(barangMasuk)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handlePost(barangMasuk)}
                                    className="text-green-600"
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    Post
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(barangMasuk)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus
                                  </DropdownMenuItem>
                                </>
                              )}
                              {barangMasuk.status === 'posted' && (
                                <DropdownMenuItem onClick={() => handlePrint(barangMasuk)}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Cetak
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {barangMasuks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Belum ada transaksi Barang Masuk
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Mulai dengan membuat transaksi Barang Masuk pertama
                  </p>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Barang Masuk Baru
                  </Button>
                </div>
              )}

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Menampilkan {barangMasuks.length} dari {pagination.total} data
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
                      <ArrowLeft className="h-4 w-4 mr-1" />
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
                      <ArrowRight className="h-4 w-4 ml-1" />
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
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBarangMasuk ? 'Edit Barang Masuk' : 'Barang Masuk Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingBarangMasuk
                ? 'Edit informasi transaksi Barang Masuk yang sudah ada.'
                : 'Buat transaksi Barang Masuk baru untuk menerima barang dari supplier.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <Select
                    value={watchedValues.supplierId}
                    onValueChange={(value) => setValue('supplierId', value)}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.kode} - {supplier.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.supplierId && (
                    <p className="text-sm text-red-600">{errors.supplierId.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gudangId">Gudang</Label>
                  <Select
                    value={watchedValues.gudangId}
                    onValueChange={(value) => setValue('gudangId', value)}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Gudang" />
                    </SelectTrigger>
                    <SelectContent>
                      {gudangs.map((gudang) => (
                        <SelectItem key={gudang.id} value={gudang.id}>
                          {gudang.kode} - {gudang.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.gudangId && (
                    <p className="text-sm text-red-600">{errors.gudangId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tanggal">Tanggal</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    {...register('tanggal', { valueAsDate: true })}
                    disabled={submitting}
                  />
                  {errors.tanggal && (
                    <p className="text-sm text-red-600">{errors.tanggal.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="keterangan">Keterangan</Label>
                  <Input
                    id="keterangan"
                    {...register('keterangan')}
                    placeholder="Opsional"
                    disabled={submitting}
                  />
                  {errors.keterangan && (
                    <p className="text-sm text-red-600">{errors.keterangan.message}</p>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Detail Barang</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Label>Barang</Label>
                        <Select
                          value={item.barangId}
                          onValueChange={(value) => updateItem(index, 'barangId', value)}
                          disabled={submitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Barang" />
                          </SelectTrigger>
                          <SelectContent>
                            {barangs.map((barang) => (
                              <SelectItem key={barang.id} value={barang.id}>
                                {barang.kode} - {barang.nama}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(index, 'qty', e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Harga</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.harga}
                          onChange={(e) => updateItem(index, 'harga', e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Subtotal</Label>
                        <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-gray-50">
                          <span className="text-sm font-medium">
                            {formatCurrency(calculateSubtotal(item))}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1 || submitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Grand Total:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(calculateGrandTotal())}
                  </span>
                </div>
              </div>
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
                {submitting ? 'Menyimpan...' : editingBarangMasuk ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Barang Masuk</DialogTitle>
            <DialogDescription>
              Informasi lengkap transaksi Barang Masuk
            </DialogDescription>
          </DialogHeader>
          {viewingBarangMasuk && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informasi Transaksi</TabsTrigger>
                <TabsTrigger value="items">Detail Barang</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>No Dokumen</Label>
                    <p className="font-medium">{viewingBarangMasuk.noDokumen}</p>
                  </div>
                  <div>
                    <Label>Tanggal</Label>
                    <p className="font-medium">{formatDate(viewingBarangMasuk.tanggal)}</p>
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <p className="font-medium">{viewingBarangMasuk.supplier.kode} - {viewingBarangMasuk.supplier.nama}</p>
                  </div>
                  <div>
                    <Label>Gudang</Label>
                    <p className="font-medium">{viewingBarangMasuk.gudang.kode} - {viewingBarangMasuk.gudang.nama}</p>
                  </div>
                  <div>
                    <Label>Total Qty</Label>
                    <p className="font-medium">{viewingBarangMasuk.totalQty} unit</p>
                  </div>
                  <div>
                    <Label>Total Nilai</Label>
                    <p className="font-medium">{formatCurrency(Number(viewingBarangMasuk.totalNilai))}</p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(viewingBarangMasuk.status)}
                    </div>
                  </div>
                  {viewingBarangMasuk.keterangan && (
                    <div className="col-span-2">
                      <Label>Keterangan</Label>
                      <p className="font-medium">{viewingBarangMasuk.keterangan}</p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>Dibuat Tanggal</Label>
                    <p className="font-medium">{formatDate(viewingBarangMasuk.createdAt)}</p>
                  </div>
                  <div>
                    <Label>Terakhir Diubah</Label>
                    <p className="font-medium">{formatDate(viewingBarangMasuk.updatedAt)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Kode Barang</TableHead>
                        <TableHead>Nama Barang</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead>Stok Saat Ini</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingBarangMasuk.detail.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.barang.kode}</TableCell>
                          <TableCell>{item.barang.nama}</TableCell>
                          <TableCell>{item.qty} {item.barang.satuan}</TableCell>
                          <TableCell>{formatCurrency(Number(item.harga))}</TableCell>
                          <TableCell>{formatCurrency(Number(item.subtotal))}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              (item.currentStock || 0) > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {item.currentStock || 0} {item.barang.satuan}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-semibold">
                          Total:
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(Number(viewingBarangMasuk.totalNilai))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            {viewingBarangMasuk && viewingBarangMasuk.status === 'posted' && (
              <Button
                variant="outline"
                onClick={() => handlePrint(viewingBarangMasuk)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Cetak
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
