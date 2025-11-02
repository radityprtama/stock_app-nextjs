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
  Users,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface SalesData {
  id: string
  customerName: string
  customerKode: string
  totalQty: number
  totalValue: number
  tanggal: string
  status: string
  itemCount: number
}

interface SalesStatistics {
  totalSales: number
  totalRevenue: number
  totalCustomers: number
  averageOrderValue: number
  growthPercentage: number
  topCustomers: Array<{
    name: string
    kode: string
    totalValue: number
    totalQty: number
  }>
  monthlyTrend: Array<{
    month: string
    revenue: number
    sales: number
  }>
  productPerformance: Array<{
    name: string
    kode: string
    totalQty: number
    totalRevenue: number
  }>
}

export default function LaporanPenjualanPage() {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [statistics, setStatistics] = useState<SalesStatistics>({
    totalSales: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    growthPercentage: 0,
    topCustomers: [],
    monthlyTrend: [],
    productPerformance: [],
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('this-month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [customers, setCustomers] = useState<Array<{ id: string; nama: string; kode: string }>>([])

  const fetchSalesData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ search, period: selectedPeriod })

      if (selectedCustomer) params.append('customerId', selectedCustomer)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/laporan/penjualan?${params}`)
      const result = await response.json()

      if (result.success) {
        setSalesData(result.data)
        setStatistics(result.statistics)
        setCustomers(result.customers || [])
      } else {
        toast.error('Gagal mengambil data laporan penjualan')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalesData()
  }, [search, selectedCustomer, selectedPeriod, startDate, endDate])

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        search,
        period: selectedPeriod,
        export: 'excel'
      })

      if (selectedCustomer) params.append('customerId', selectedCustomer)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/laporan/penjualan?${params}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `Laporan_Penjualan_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
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
      case 'delivered':
        return <Badge variant="default">Selesai</Badge>
      case 'in_transit':
        return <Badge variant="secondary">Dalam Pengiriman</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Dibatalkan</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const clearFilters = () => {
    setSelectedCustomer('')
    setSelectedPeriod('this-month')
    setStartDate('')
    setEndDate('')
    setSearch('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Penjualan</h1>
          <p className="text-muted-foreground">
            Analisis performa penjualan dan statistik customer
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
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalSales}</div>
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
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              Total nilai penjualan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customer</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Customer aktif
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
              Rata-rata nilai transaksi
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
              {salesData.reduce((total, sale) => total + sale.totalQty, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total barang terjual
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
              value={selectedCustomer || undefined}
              onValueChange={(value) => setSelectedCustomer(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Customer</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.kode} - {customer.nama}
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
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Data Penjualan</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="customers">Top Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Detail Transaksi Penjualan</CardTitle>
              <CardDescription>
                Total {salesData.length} transaksi penjualan
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
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Total Qty</TableHead>
                        <TableHead>Total Nilai</TableHead>
                        <TableHead>Jumlah Item</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesData.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{formatDate(sale.tanggal)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sale.customerName}</div>
                              <div className="text-sm text-gray-500">{sale.customerKode}</div>
                            </div>
                          </TableCell>
                          <TableCell>{sale.totalQty} unit</TableCell>
                          <TableCell>{formatCurrency(sale.totalValue)}</TableCell>
                          <TableCell>{sale.itemCount} item</TableCell>
                          <TableCell>{getStatusBadge(sale.status)}</TableCell>
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
                <CardTitle>Top Produk</CardTitle>
                <CardDescription>Produk paling laku</CardDescription>
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
                        <p className="text-sm text-gray-500">{formatCurrency(product.totalRevenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trend Bulanan</CardTitle>
                <CardDescription>Perkembangan penjualan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.monthlyTrend.slice(-6).map((trend) => (
                    <div key={trend.month} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{trend.month}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{trend.sales} transaksi</p>
                        <p className="text-sm text-gray-500">{formatCurrency(trend.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
              <CardDescription>Customer dengan nilai transaksi tertinggi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statistics.topCustomers.map((customer, index) => (
                  <div key={customer.kode} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-gray-500">{customer.kode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(customer.totalValue)}</p>
                      <p className="text-sm text-gray-500">{customer.totalQty} unit</p>
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