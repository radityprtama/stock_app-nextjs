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
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

interface ReturData {
  id: string
  noRetur: string
  tanggal: string
  type: 'beli' | 'jual'
  partnerName: string
  partnerKode: string
  totalQty: number
  totalValue: number
  status: string
  itemCount: number
  alasan: string
}

interface ReturStatistics {
  totalRetur: number
  totalValue: number
  returBeliCount: number
  returJualCount: number
  averageReturValue: number
  growthPercentage: number
  topReasons: Array<{
    reason: string
    count: number
    totalValue: number
  }>
  monthlyTrend: Array<{
    month: string
    count: number
    value: number
  }>
  partnerPerformance: Array<{
    name: string
    kode: string
    returCount: number
    totalValue: number
    type: string
  }>
}

export default function LaporanReturPage() {
  const [returData, setReturData] = useState<ReturData[]>([])
  const [statistics, setStatistics] = useState<ReturStatistics>({
    totalRetur: 0,
    totalValue: 0,
    returBeliCount: 0,
    returJualCount: 0,
    averageReturValue: 0,
    growthPercentage: 0,
    topReasons: [],
    monthlyTrend: [],
    partnerPerformance: [],
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('this-month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchReturData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ search, period: selectedPeriod })

      if (selectedType) params.append('type', selectedType)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/laporan/retur?${params}`)
      const result = await response.json()

      if (result.success) {
        setReturData(result.data)
        setStatistics(result.statistics)
      } else {
        toast.error('Gagal mengambil data laporan retur')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReturData()
  }, [search, selectedType, selectedPeriod, startDate, endDate])

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams({
        search,
        period: selectedPeriod,
        export: 'excel'
      })

      if (selectedType) params.append('type', selectedType)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/laporan/retur?${params}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `Laporan_Retur_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
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
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Selesai</Badge>
      case 'approved':
        return <Badge variant="default">Disetujui</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Dibatalkan</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    if (type === 'beli') {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Retur Beli</Badge>
    } else {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Retur Jual</Badge>
    }
  }

  const clearFilters = () => {
    setSelectedType('')
    setSelectedPeriod('this-month')
    setStartDate('')
    setEndDate('')
    setSearch('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan Retur</h1>
          <p className="text-muted-foreground">
            Analisis retur barang ke supplier dan dari customer
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Retur</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalRetur}</div>
            <p className="text-xs text-muted-foreground">
              {statistics.growthPercentage >= 0 ? (
                <span className="text-red-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{Math.abs(statistics.growthPercentage)}% dari bulan lalu
                </span>
              ) : (
                <span className="text-green-600 flex items-center">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  -{Math.abs(statistics.growthPercentage)}% dari bulan lalu
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Retur</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Total nilai retur
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retur Beli</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statistics.returBeliCount}</div>
            <p className="text-xs text-muted-foreground">
              Retur ke supplier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retur Jual</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.returJualCount}</div>
            <p className="text-xs text-muted-foreground">
              Retur dari customer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(statistics.averageReturValue)}</div>
            <p className="text-xs text-muted-foreground">
              Rata-rata nilai retur
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
              {returData.reduce((total, retur) => total + retur.totalQty, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total barang diretur
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
              value={selectedType || undefined}
              onValueChange={(value) => setSelectedType(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="beli">Retur Beli</SelectItem>
                <SelectItem value="jual">Retur Jual</SelectItem>
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
      <Tabs defaultValue="retur" className="space-y-4">
        <TabsList>
          <TabsTrigger value="retur">Data Retur</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reasons">Alasan Retur</TabsTrigger>
        </TabsList>

        <TabsContent value="retur">
          <Card>
            <CardHeader>
              <CardTitle>Detail Transaksi Retur</CardTitle>
              <CardDescription>
                Total {returData.length} transaksi retur
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
                        <TableHead>No. Retur</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Partner</TableHead>
                        <TableHead>Total Qty</TableHead>
                        <TableHead>Total Nilai</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Alasan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returData.map((retur) => (
                        <TableRow key={retur.id}>
                          <TableCell className="font-medium">{retur.noRetur}</TableCell>
                          <TableCell>{formatDate(retur.tanggal)}</TableCell>
                          <TableCell>{getTypeBadge(retur.type)}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{retur.partnerName}</div>
                              <div className="text-sm text-gray-500">{retur.partnerKode}</div>
                            </div>
                          </TableCell>
                          <TableCell>{retur.totalQty} unit</TableCell>
                          <TableCell>{formatCurrency(retur.totalValue)}</TableCell>
                          <TableCell>{getStatusBadge(retur.status)}</TableCell>
                          <TableCell className="max-w-xs truncate" title={retur.alasan}>
                            {retur.alasan}
                          </TableCell>
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
                <CardTitle>Trend Bulanan</CardTitle>
                <CardDescription>Perkembangan retur</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.monthlyTrend.slice(-6).map((trend) => (
                    <div key={trend.month} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{trend.month}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{trend.count} retur</p>
                        <p className="text-sm text-gray-500">{formatCurrency(trend.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Partner Performance</CardTitle>
                <CardDescription>Partner dengan retur tertinggi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {statistics.partnerPerformance.slice(0, 5).map((partner, index) => (
                    <div key={partner.kode} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                          partner.type === 'beli'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{partner.name}</p>
                          <p className="text-sm text-gray-500">{partner.kode}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{partner.returCount}x</p>
                        <p className="text-sm text-gray-500">{formatCurrency(partner.totalValue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reasons">
          <Card>
            <CardHeader>
              <CardTitle>Alasan Retur Teratas</CardTitle>
              <CardDescription>Analisis penyebab retur barang</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statistics.topReasons.map((reason, index) => (
                  <div key={reason.reason} className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-red-100 text-red-600 rounded-full font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <p className="font-medium">{reason.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{reason.count} kali</p>
                      <p className="text-sm text-gray-500">{formatCurrency(reason.totalValue)}</p>
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