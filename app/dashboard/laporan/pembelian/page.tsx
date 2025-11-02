'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  Download,
  Filter,
  Calendar,
  TrendingUp,
  DollarSign,
  Package,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Building,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface PurchaseData {
  id: string
  supplierName: string
  supplierKode: string
  totalQty: number
  totalValue: number
  tanggal: string
  status: string
  itemCount: number
  noDokumen: string
}

interface PurchaseStatistics {
  totalPurchases: number
  totalSpend: number
  totalSuppliers: number
  averageOrderValue: number
  growthPercentage: number
  topSuppliers: Array<{
    name: string
    kode: string
    totalValue: number
    totalQty: number
  }>
  monthlyTrend: Array<{
    month: string
    spend: number
    purchases: number
  }>
  productPerformance: Array<{
    name: string
    kode: string
    totalQty: number
    totalCost: number
  }>
}

export default function LaporanPembelianPage() {
  const [purchaseData, setPurchaseData] = useState<PurchaseData[]>([])
  const [statistics, setStatistics] = useState<PurchaseStatistics>({
    totalPurchases: 0,
    totalSpend: 0,
    totalSuppliers: 0,
    averageOrderValue: 0,
    growthPercentage: 0,
    topSuppliers: [],
    monthlyTrend: [],
    productPerformance: [],
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('this-month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [suppliers, setSuppliers] = useState<Array<{ id: string; nama: string; kode: string }>>([])

  const fetchPurchaseData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ search, period: selectedPeriod })

      if (selectedSupplier) params.append('supplierId', selectedSupplier)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/laporan/pembelian?${params}`)
      const result = await response.json()

      if (result.success) {
        setPurchaseData(result.data)
        setStatistics(result.statistics)
        setSuppliers(result.suppliers || [])
      } else {
        toast.error('Gagal mengambil data laporan pembelian')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchaseData()
  }, [search, selectedSupplier, selectedPeriod, startDate, endDate])

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        search,
        period: selectedPeriod,
        export: 'excel'
      })

      if (selectedSupplier) params.append('supplierId', selectedSupplier)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/laporan/pembelian?${params}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `Laporan_Pembelian_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Laporan berhasil diekspor')
      } else {
        toast.error('Gagal mengekspor laporan')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengekspor')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateValue: string) => {
    return format(new Date(dateValue), 'dd MMM yyyy', { locale: id })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'posted':
        return <Badge variant="default">Posted</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Dibatalkan</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const clearFilters = () => {
    setSelectedSupplier('')
    setSelectedPeriod('this-month')
    setStartDate('')
    setEndDate('')
    setSearch('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Pembelian</h1>
          <p className="text-muted-foreground">
            Analisis performa pembelian dan statistik supplier
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pembelian</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalPurchases}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.growthPercentage >= 0 ? (
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{Math.abs(statistics.growthPercentage)}% dari bulan lalu
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  -{Math.abs(statistics.growthPercentage)}% dari bulan lalu
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.totalSpend)}</div>
            <p className="text-xs text-muted-foreground">
              Total nilai pembelian
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Supplier</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground">
              Supplier aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Rata-rata nilai pembelian
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Qty</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchaseData.reduce((total, purchase) => total + purchase.totalQty, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total barang dibeli
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
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="this-week">Minggu Ini</SelectItem>
                <SelectItem value="this-month">Bulan Ini</SelectItem>
                <SelectItem value="last-month">Bulan Lalu</SelectItem>
                <SelectItem value="this-year">Tahun Ini</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {selectedPeriod === 'custom' && (
              <>
                <Input
                  type="date"
                  placeholder="Tanggal Awal"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="Tanggal Akhir"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </>
            )}

            <Button variant="outline" onClick={clearFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="purchases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="purchases">Data Pembelian</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="suppliers">Top Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Detail Transaksi Pembelian</CardTitle>
              <CardDescription>
                Total {purchaseData.length} transaksi pembelian
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Memuat data...</div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. Dokumen</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Total Qty</TableHead>
                        <TableHead>Total Nilai</TableHead>
                        <TableHead>Jumlah Item</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseData.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.noDokumen}</TableCell>
                          <TableCell>{formatDate(purchase.tanggal)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{purchase.supplierName}</div>
                              <div className="text-sm text-gray-500">{purchase.supplierKode}</div>
                            </div>
                          </TableCell>
                          <TableCell>{purchase.totalQty} unit</TableCell>
                          <TableCell>{formatCurrency(purchase.totalValue)}</TableCell>
                          <TableCell>{purchase.itemCount} item</TableCell>
                          <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Produk Dibeli</CardTitle>
                <CardDescription>Produk paling banyak dibeli</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.productPerformance.slice(0, 5).map((product, index) => (
                    <div key={product.kode} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.kode}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{product.totalQty} unit</p>
                        <p className="text-sm text-gray-500">{formatCurrency(product.totalCost)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trend Bulanan</CardTitle>
                <CardDescription>Perkembangan pembelian</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.monthlyTrend.slice(-6).map((trend) => (
                    <div key={trend.month} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{trend.month}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{trend.purchases} transaksi</p>
                        <p className="text-sm text-gray-500">{formatCurrency(trend.spend)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Top Suppliers</CardTitle>
              <CardDescription>Supplier dengan nilai transaksi tertinggi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statistics.topSuppliers.map((supplier, index) => (
                  <div key={supplier.kode} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-sm text-gray-500">{supplier.kode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(supplier.totalValue)}</p>
                      <p className="text-sm text-gray-500">{supplier.totalQty} unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}