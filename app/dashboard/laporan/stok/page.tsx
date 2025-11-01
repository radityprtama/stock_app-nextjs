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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  DollarSign,
  Building,
  BarChart3,
  Activity,
  RefreshCw,
  FileText,
  Printer,
  MoreHorizontal,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'

interface StockItem {
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
  totalStok: number
  totalNilai: number
  status: 'normal' | 'low' | 'critical' | 'overstock' | 'outOfStock'
  abcClass: 'A' | 'B' | 'C'
  stokPerGudang: Record<string, {
    gudang: {
      id: string
      kode: string
      nama: string
    }
    qty: number
    nilai: number
  }>
}

interface StockStatistics {
  totalItems: number
  totalStockValue: number
  totalStockQty: number
  lowStockItems: number
  outOfStockItems: number
  overstockItems: number
  normalItems: number
  activeItems: number
  dropshipItems: number
  abcAnalysis: Array<{
    class: string
    count: number
    value: number
    percentage: number
  }>
  warehouseDistribution: Array<{
    gudangId: string
    gudang: {
      id: string
      kode: string
      nama: string
    }
    _sum: {
      qty: number | null
    }
    _count: {
      barangId: number
    }
  }>
  golonganStats: Array<{
    golonganId: string
    golongan: {
      id: string
      kode: string
      nama: string
    }
    _count: {
      id: number
    }
  }>
}

export default function StockOverviewPage() {
  const { data: session } = useSession()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [statistics, setStatistics] = useState<StockStatistics>({
    totalItems: 0,
    totalStockValue: 0,
    totalStockQty: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    overstockItems: 0,
    normalItems: 0,
    activeItems: 0,
    dropshipItems: 0,
    abcAnalysis: [],
    warehouseDistribution: [],
    golonganStats: [],
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedGolongan, setSelectedGolongan] = useState('')
  const [selectedGudang, setSelectedGudang] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('nama')
  const [sortOrder, setSortOrder] = useState('asc')
  const [activeTab, setActiveTab] = useState('overview')
  const [includeZeroStock, setIncludeZeroStock] = useState(false)
  const [golongans, setGolongans] = useState([])
  const [gudangs, setGudangs] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })

  useEffect(() => {
    if (!session) {
      redirect('/login')
    }
  }, [session])

  // Fetch master data
  const fetchMasterData = async () => {
    try {
      const [golonganRes, gudangRes] = await Promise.all([
        fetch('/api/master/golongan?limit=100'),
        fetch('/api/master/gudang?limit=100'),
      ])

      const [golonganResult, gudangResult] = await Promise.all([
        golonganRes.json(),
        gudangRes.json(),
      ])

      if (golonganResult.success) setGolongans(golonganResult.data)
      if (gudangResult.success) setGudangs(gudangResult.data)
    } catch (error) {
      console.error('Error fetching master data:', error)
    }
  }

  // Fetch stock data
  const fetchStockData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
      })

      if (search) params.append('search', search)
      if (selectedGolongan) params.append('golonganId', selectedGolongan)
      if (selectedGudang) params.append('gudangId', selectedGudang)
      if (statusFilter) params.append('statusStok', statusFilter)
      if (includeZeroStock) params.append('includeZeroStock', 'true')

      const response = await fetch(`/api/stok?${params}`)
      const result = await response.json()

      if (result.success) {
        setStockItems(result.data)
        setStatistics(result.statistics)
        setPagination(result.pagination)
      } else {
        toast.error('Gagal mengambil data stok')
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
    fetchStockData()
  }, [pagination.page, search, selectedGolongan, selectedGudang, statusFilter, sortBy, sortOrder, includeZeroStock])

  const getStockStatusInfo = (status: string) => {
    switch (status) {
      case 'outOfStock':
        return { label: 'Habis', color: 'destructive', icon: AlertTriangle }
      case 'critical':
        return { label: 'Kritis', color: 'destructive', icon: AlertTriangle }
      case 'low':
        return { label: 'Rendah', color: 'secondary', icon: TrendingDown }
      case 'overstock':
        return { label: 'Berlebih', color: 'outline', icon: TrendingUp }
      default:
        return { label: 'Normal', color: 'default', icon: Package }
    }
  }

  const getABCClassColor = (cls: string) => {
    switch (cls) {
      case 'A': return 'bg-green-100 text-green-800 border-green-200'
      case 'B': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'C': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedGolongan('')
    setSelectedGudang('')
    setStatusFilter('')
    setIncludeZeroStock(false)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        format,
        search,
        ...(selectedGolongan && { golonganId: selectedGolongan }),
        ...(selectedGudang && { gudangId: selectedGudang }),
        ...(statusFilter && { statusStok: statusFilter }),
      })

      const response = await fetch(`/api/stok/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `stok-overview.${format === 'excel' ? 'xlsx' : 'pdf'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(`Berhasil export data ke ${format.toUpperCase()}`)
      } else {
        toast.error('Gagal export data')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat export')
    }
  }

  const refreshData = () => {
    fetchStockData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Stok</h1>
          <p className="text-muted-foreground">
            Monitoring dan analisis stok barang real-time
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={refreshData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Ringkasan</TabsTrigger>
          <TabsTrigger value="details">Detail Stok</TabsTrigger>
          <TabsTrigger value="analysis">Analisis</TabsTrigger>
          <TabsTrigger value="distribution">Distribusi</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                  {statistics.totalItems} jenis barang
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{statistics.lowStockItems}</div>
                <p className="text-xs text-muted-foreground">
                  Perlu perhatian segera
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Habis Stok</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{statistics.outOfStockItems}</div>
                <p className="text-xs text-muted-foreground">
                  Barang tidak tersedia
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Qty</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{statistics.totalStockQty.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Unit semua barang
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ABC Analysis */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Analisis ABC</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statistics.abcAnalysis.map((item) => (
                    <div key={item.class} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge className={getABCClassColor(item.class)}>
                          Kelas {item.class}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {item.count} barang
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(item.value)}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Status Stok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Normal</span>
                    <Badge variant="default">{statistics.normalItems}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rendah</span>
                    <Badge variant="secondary">{statistics.lowStockItems}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Kritis</span>
                    <Badge variant="destructive">{statistics.outOfStockItems}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Berlebih</span>
                    <Badge variant="outline">{statistics.overstockItems}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Ringkasan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Barang Aktif</span>
                    <span className="font-medium">{statistics.activeItems}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Dropship</span>
                    <span className="font-medium">{statistics.dropshipItems}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Gudang Aktif</span>
                    <span className="font-medium">{statistics.warehouseDistribution.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Kategori</span>
                    <span className="font-medium">{statistics.golonganStats.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
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
                    {golongans.map((golongan: any) => (
                      <SelectItem key={golongan.id} value={golongan.id}>
                        {golongan.kode} - {golongan.nama}
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
                    {gudangs.map((gudang: any) => (
                      <SelectItem key={gudang.id} value={gudang.id}>
                        {gudang.kode} - {gudang.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter || undefined}
                  onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status Stok" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Rendah</SelectItem>
                    <SelectItem value="critical">Kritis</SelectItem>
                    <SelectItem value="outOfStock">Habis</SelectItem>
                    <SelectItem value="overstock">Berlebih</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeZeroStock"
                    checked={includeZeroStock}
                    onChange={(e) => setIncludeZeroStock(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="includeZeroStock">Stok 0</Label>
                </div>

                <Button variant="outline" onClick={clearFilters}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stock Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detail Stok Barang</CardTitle>
                  <CardDescription>
                    Total {pagination.total} barang
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nama">Nama</SelectItem>
                      <SelectItem value="kode">Kode</SelectItem>
                      <SelectItem value="totalStok">Total Stok</SelectItem>
                      <SelectItem value="totalNilai">Nilai Stok</SelectItem>
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
                          <TableHead>Kode</TableHead>
                          <TableHead>Nama Barang</TableHead>
                          <TableHead>Golongan</TableHead>
                          <TableHead>Total Stok</TableHead>
                          <TableHead>Nilai Stok</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>ABC</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockItems.map((item) => {
                          const statusInfo = getStockStatusInfo(item.status)
                          const StatusIcon = statusInfo.icon

                          return (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.kode}</TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{item.nama}</div>
                                  {item.isDropship && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      Dropship
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {item.golongan.kode}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{item.totalStok} {item.satuan}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{formatCurrency(item.totalNilai)}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusInfo.color as any} className="flex items-center w-fit">
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {statusInfo.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={getABCClassColor(item.abcClass)}>
                                  Kelas {item.abcClass}
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
                                    <DropdownMenuItem>
                                      <Eye className="mr-2 h-4 w-4" />
                                      Lihat Detail
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <BarChart3 className="mr-2 h-4 w-4" />
                                      Kartu Stok
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

                  {stockItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Tidak ada data stok
                      </h3>
                      <p className="text-gray-500">
                        Coba ubah filter atau tambah barang baru
                      </p>
                    </div>
                  )}

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Menampilkan {stockItems.length} dari {pagination.total} data
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
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Nilai per Kategori</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.golonganStats.map((stat) => (
                    <div key={stat.golonganId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{stat.golongan.nama}</span>
                        <span className="text-sm text-muted-foreground">
                          {stat._count.id} barang
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${(stat._count.id / statistics.totalItems) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribusi Stok per Gudang</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.warehouseDistribution.map((dist) => (
                    <div key={dist.gudangId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{dist.gudang.nama}</span>
                        <span className="text-sm text-muted-foreground">
                          {dist._sum.qty || 0} unit
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${((dist._sum.qty || 0) / statistics.totalStockQty) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Stok per Gudang</CardTitle>
              <CardDescription>
                Detail stok barang di setiap gudang
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {statistics.warehouseDistribution.map((warehouse) => (
                  <Card key={warehouse.gudangId}>
                    <CardHeader>
                      <CardTitle className="text-lg">{warehouse.gudang.nama}</CardTitle>
                      <CardDescription>
                        Total {warehouse._sum.qty || 0} unit • {warehouse._count.barangId} jenis barang
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {stockItems
                          .filter(item => item.stokPerGudang[warehouse.gudangId]?.qty > 0)
                          .slice(0, 6)
                          .map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <div className="font-medium text-sm">{item.nama}</div>
                                <div className="text-xs text-muted-foreground">{item.kode}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {item.stokPerGudang[warehouse.gudangId]?.qty} {item.satuan}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatCurrency(item.stokPerGudang[warehouse.gudangId]?.nilai || 0)}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
