'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  Search,
  Download,
  Filter,
  Eye,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  FileText,
  Printer,
  RefreshCw,
  Building,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'

interface StockTransaction {
  id: string
  tanggal: Date
  type: 'masuk' | 'keluar'
  dokumentType: string
  dokumentId: string
  dokumentNo: string
  qty: number
  harga: number
  subtotal: number
  saldo: number
  keterangan?: string
  referensi?: string
  supplier?: string
  customer?: string
  gudang?: string
}

interface Barang {
  id: string
  kode: string
  nama: string
  ukuran?: string
  tipe?: string
  merk?: string
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
}

interface StockInfo {
  id: string
  qty: number
  gudang: {
    id: string
    kode: string
    nama: string
  }
}

interface StockStatistics {
  openingBalance: number
  currentStock: number
  totalMasuk: number
  totalKeluar: number
  totalNilaiMasuk: number
  totalNilaiKeluar: number
  transactionCount: number
  averageTransactionSize: number
}

interface StockCardData {
  barang: Barang
  transactions: StockTransaction[]
  stockInfo: StockInfo[]
  statistics: StockStatistics
  warehouses: Array<{
    id: string
    kode: string
    nama: string
  }>
}

export default function StockMutationPage() {
  const { data: session } = useSession()
  const [stockCardData, setStockCardData] = useState<StockCardData | null>(null)
  const [barangs, setBarangs] = useState<Barang[]>([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBarang, setSelectedBarang] = useState('')
  const [selectedGudang, setSelectedGudang] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [transactionType, setTransactionType] = useState<'all' | 'masuk' | 'keluar'>('all')
  const [sortBy, setSortBy] = useState('tanggal')
  const [sortOrder, setSortOrder] = useState('desc')
  const [activeTab, setActiveTab] = useState('card')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    if (!session) {
      redirect('/login')
    }
  }, [session])

  // Fetch barang data
  const fetchBarangs = async () => {
    try {
      const response = await fetch('/api/master/barang?limit=1000&aktif=true')
      const result = await response.json()
      if (result.success) {
        setBarangs(result.data)
      }
    } catch (error) {
      console.error('Error fetching barangs:', error)
    }
  }

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/master/gudang?limit=100&aktif=true')
      const result = await response.json()
      if (result.success) {
        setWarehouses(result.data)
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error)
    }
  }

  // Fetch stock card data
  const fetchStockCard = async () => {
    if (!selectedBarang) {
      toast.error('Pilih barang terlebih dahulu')
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams({
        barangId: selectedBarang,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        transactionType,
      })

      if (selectedGudang) params.append('gudangId', selectedGudang)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/stok/kartu?${params}`)
      const result = await response.json()

      if (result.success) {
        setStockCardData(result.data)
        setPagination(result.pagination)
      } else {
        toast.error(result.error || 'Gagal mengambil data kartu stok')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBarangs()
    fetchWarehouses()
  }, [])

  useEffect(() => {
    if (selectedBarang) {
      fetchStockCard()
    }
  }, [selectedBarang, selectedGudang, startDate, endDate, transactionType, sortBy, sortOrder, pagination.page])

  const getTransactionIcon = (type: string, dokumentType: string) => {
    if (type === 'masuk') {
      switch (dokumentType) {
        case 'Barang Masuk': return Plus
        case 'Retur Penjualan': return Plus
        default: return ArrowUpRight
      }
    } else {
      switch (dokumentType) {
        case 'Surat Jalan': return Minus
        case 'Retur Pembelian': return Minus
        default: return ArrowDownRight
      }
    }
  }

  const getTransactionColor = (type: string) => {
    return type === 'masuk' ? 'text-green-600' : 'text-red-600'
  }

  const getDokumentTypeColor = (dokumentType: string) => {
    switch (dokumentType) {
      case 'Barang Masuk': return 'bg-green-100 text-green-800 border-green-200'
      case 'Surat Jalan': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Retur Pembelian': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Retur Penjualan': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const clearFilters = () => {
    setSelectedGudang('')
    setStartDate('')
    setEndDate('')
    setTransactionType('all')
    setSortBy('tanggal')
    setSortOrder('desc')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedBarang) {
      toast.error('Pilih barang terlebih dahulu')
      return
    }

    try {
      const params = new URLSearchParams({
        format,
        barangId: selectedBarang,
        ...(selectedGudang && { gudangId: selectedGudang }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        transactionType,
      })

      const response = await fetch(`/api/stok/kartu/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const barang = barangs.find(b => b.id === selectedBarang)
        a.download = `kartu-stok-${barang?.kode || 'unknown'}.${format === 'excel' ? 'xlsx' : 'pdf'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`Berhasil export kartu stok ke ${format.toUpperCase()}`)
      } else {
        toast.error('Gagal export data')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat export')
    }
  }

  const refreshData = () => {
    fetchStockCard()
  }

  const today = new Date().toISOString().split('T')[0]
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kartu Stok</h1>
          <p className="text-muted-foreground">
            Histori mutasi stok per barang
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={!selectedBarang}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileText className="mr-2 h-4 w-4" />
                Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Printer className="mr-2 h-4 w-4" />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="card">Kartu Stok</TabsTrigger>
          <TabsTrigger value="analysis">Analisis Mutasi</TabsTrigger>
        </TabsList>

        <TabsContent value="card" className="space-y-6">
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
                <Select value={selectedBarang} onValueChange={setSelectedBarang}>
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

                <Select
                  value={selectedGudang || undefined}
                  onValueChange={(value) => setSelectedGudang(value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Gudang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Gudang</SelectItem>
                    {warehouses.map((gudang: any) => (
                      <SelectItem key={gudang.id} value={gudang.id}>
                        {gudang.kode} - {gudang.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div>
                  <Label htmlFor="startDate">Dari Tanggal</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    max={today}
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Sampai Tanggal</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    max={today}
                  />
                </div>

                <Select value={transactionType} onValueChange={(value: any) => setTransactionType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Jenis Transaksi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Transaksi</SelectItem>
                    <SelectItem value="masuk">Barang Masuk</SelectItem>
                    <SelectItem value="keluar">Barang Keluar</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  Reset Filter
                </Button>
              </div>
            </CardContent>
          </Card>

          {stockCardData && (
            <>
              {/* Barang Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Informasi Barang
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label>Kode Barang</Label>
                      <p className="font-medium">{stockCardData.barang.kode}</p>
                    </div>
                    <div>
                      <Label>Nama Barang</Label>
                      <p className="font-medium">{stockCardData.barang.nama}</p>
                    </div>
                    <div>
                      <Label>Golongan</Label>
                      <p className="font-medium">{stockCardData.barang.golongan.kode} - {stockCardData.barang.golongan.nama}</p>
                    </div>
                    <div>
                      <Label>Satuan</Label>
                      <p className="font-medium">{stockCardData.barang.satuan}</p>
                    </div>
                    <div>
                      <Label>Harga Beli</Label>
                      <p className="font-medium">{formatCurrency(stockCardData.barang.hargaBeli)}</p>
                    </div>
                    <div>
                      <Label>Harga Jual</Label>
                      <p className="font-medium">{formatCurrency(stockCardData.barang.hargaJual)}</p>
                    </div>
                    <div>
                      <Label>Min Stok</Label>
                      <p className="font-medium">{stockCardData.barang.minStok} {stockCardData.barang.satuan}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <div className="flex space-x-2">
                        <Badge variant={stockCardData.barang.aktif ? 'default' : 'secondary'}>
                          {stockCardData.barang.aktif ? 'Aktif' : 'Non-aktif'}
                        </Badge>
                        {stockCardData.barang.isDropship && (
                          <Badge variant="outline">Dropship</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Awal</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stockCardData.statistics.openingBalance}</div>
                    <p className="text-xs text-muted-foreground">
                      {stockCardData.barang.satuan}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Akhir</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{stockCardData.statistics.currentStock}</div>
                    <p className="text-xs text-muted-foreground">
                      {stockCardData.barang.satuan}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Masuk</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stockCardData.statistics.totalMasuk}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(stockCardData.statistics.totalNilaiMasuk)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Keluar</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stockCardData.statistics.totalKeluar}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(stockCardData.statistics.totalNilaiKeluar)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Stock Info per Warehouse */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building className="mr-2 h-4 w-4" />
                    Stok per Gudang
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stockCardData.stockInfo.map((stock) => (
                      <Card key={stock.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{stock.gudang.nama}</h4>
                              <p className="text-sm text-gray-500">{stock.gudang.kode}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">{stock.qty}</div>
                              <div className="text-sm text-gray-500">{stockCardData.barang.satuan}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Histori Transaksi</CardTitle>
                      <CardDescription>
                        Total {pagination.total} transaksi
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tanggal">Tanggal</SelectItem>
                          <SelectItem value="type">Jenis</SelectItem>
                          <SelectItem value="qty">Qty</SelectItem>
                          <SelectItem value="saldo">Saldo</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={sortOrder} onValueChange={setSortOrder}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">A-Z</SelectItem>
                          <SelectItem value="desc">Z-A</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                              <TableHead>Tanggal</TableHead>
                              <TableHead>Dokumen</TableHead>
                              <TableHead>Keterangan</TableHead>
                              <TableHead className="text-right">Masuk</TableHead>
                              <TableHead className="text-right">Keluar</TableHead>
                              <TableHead className="text-right">Saldo</TableHead>
                              <TableHead className="text-right">Nilai</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {stockCardData.transactions.map((transaction) => {
                              const TransactionIcon = getTransactionIcon(transaction.type, transaction.dokumentType)

                              return (
                                <TableRow key={transaction.id}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{formatDate(transaction.tanggal)}</div>
                                      <div className="text-xs text-gray-500">
                                        {formatDateTime(transaction.tanggal)}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <Badge className={getDokumentTypeColor(transaction.dokumentType)}>
                                          {transaction.dokumentType}
                                        </Badge>
                                        <Badge variant={transaction.type === 'masuk' ? 'default' : 'secondary'}>
                                          <TransactionIcon className={`mr-1 h-3 w-3 ${getTransactionColor(transaction.type)}`} />
                                          {transaction.type === 'masuk' ? 'Masuk' : 'Keluar'}
                                        </Badge>
                                      </div>
                                      <div className="font-medium">{transaction.dokumentNo}</div>
                                      {transaction.supplier && (
                                        <div className="text-xs text-gray-500">Supplier: {transaction.supplier}</div>
                                      )}
                                      {transaction.customer && (
                                        <div className="text-xs text-gray-500">Customer: {transaction.customer}</div>
                                      )}
                                      {transaction.gudang && (
                                        <div className="text-xs text-gray-500">Gudang: {transaction.gudang}</div>
                                      )}
                                      {transaction.referensi && (
                                        <div className="text-xs text-gray-500">Ref: {transaction.referensi}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="max-w-xs">
                                      <p className="text-sm">{transaction.keterangan || '-'}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {transaction.type === 'masuk' ? (
                                      <div className="font-medium text-green-600">
                                        +{transaction.qty}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400">-</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {transaction.type === 'keluar' ? (
                                      <div className="font-medium text-red-600">
                                        -{transaction.qty}
                                      </div>
                                    ) : (
                                      <div className="text-gray-400">-</div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="font-medium">{transaction.saldo}</div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="font-medium">
                                      {formatCurrency(transaction.subtotal)}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {stockCardData.transactions.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8">
                          <FileText className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Tidak ada transaksi
                          </h3>
                          <p className="text-gray-500">
                            Tidak ada transaksi untuk periode yang dipilih
                          </p>
                        </div>
                      )}

                      {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <div className="text-sm text-gray-500">
                            Menampilkan {stockCardData.transactions.length} dari {pagination.total} data
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
            </>
          )}

          {!selectedBarang && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Pilih Barang
                  </h3>
                  <p className="text-gray-500">
                    Pilih barang untuk melihat kartu stok
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {stockCardData && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Statistik Mutasi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Jumlah Transaksi</span>
                        <span className="font-medium">{stockCardData.statistics.transactionCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Rata-rata Transaksi</span>
                        <span className="font-medium">
                          {stockCardData.statistics.averageTransactionSize.toFixed(2)} {stockCardData.barang.satuan}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Nilai Masuk</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(stockCardData.statistics.totalNilaiMasuk)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Total Nilai Keluar</span>
                        <span className="font-medium text-red-600">
                          {formatCurrency(stockCardData.statistics.totalNilaiKeluar)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Net Movement</span>
                        <span className={`font-medium ${stockCardData.statistics.totalMasuk >= stockCardData.statistics.totalKeluar ? 'text-green-600' : 'text-red-600'}`}>
                          {stockCardData.statistics.totalMasuk - stockCardData.statistics.totalKeluar >= 0 ? '+' : ''}
                          {stockCardData.statistics.totalMasuk - stockCardData.statistics.totalKeluar} {stockCardData.barang.satuan}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribusi Transaksi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {(() => {
                        const masukCount = stockCardData.transactions.filter(t => t.type === 'masuk').length
                        const keluarCount = stockCardData.transactions.filter(t => t.type === 'keluar').length
                        const total = stockCardData.transactions.length

                        return (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Barang Masuk</span>
                                <span className="text-sm text-muted-foreground">
                                  {masukCount} transaksi
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${total > 0 ? (masukCount / total) * 100 : 0}%` }}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Barang Keluar</span>
                                <span className="text-sm text-muted-foreground">
                                  {keluarCount} transaksi
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-red-600 h-2 rounded-full"
                                  style={{ width: `${total > 0 ? (keluarCount / total) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {!selectedBarang && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Pilih Barang
                  </h3>
                  <p className="text-gray-500">
                    Pilih barang untuk melihat analisis mutasi
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
