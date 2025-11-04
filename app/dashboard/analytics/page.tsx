'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  BellRing,
} from 'lucide-react'
import { useNotifications } from '@/components/notifications/notification-system'
import { toast } from 'sonner'
import { format, subDays, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'

interface AnalyticsData {
  overview: {
    totalRevenue: number
    totalTransactions: number
    totalProducts: number
    totalCustomers: number
    revenueGrowth: number
    transactionGrowth: number
    profitMargin: number
    averageOrderValue: number
  }
  trends: {
    monthly: Array<{
      month: string
      revenue: number
      purchases: number
      sales: number
      profit: number
    }>
    weekly: Array<{
      week: string
      revenue: number
      transactions: number
    }>
  }
  productAnalytics: {
    topPerforming: Array<{
      name: string
      kode: string
      revenue: number
      quantity: number
      growth: number
      category: string
    }>
    slowMoving: Array<{
      name: string
      kode: string
      currentStock: number
      lastSold: string
      stockValue: number
    }>
    categoryPerformance: Array<{
      category: string
      revenue: number
      quantity: number
      profit: number
    }>
  }
  customerAnalytics: {
    topCustomers: Array<{
      name: string
      kode: string
      revenue: number
      orders: number
      averageOrder: number
      lastOrder: string
    }>
    retentionMetrics: {
      newCustomers: number
      returningCustomers: number
      churnRate: number
      retentionRate: number
    }
    customerSegments: Array<{
      segment: string
      count: number
      revenue: number
      averageValue: number
    }>
  }
  inventoryAnalytics: {
    stockLevels: Array<{
      status: string
      count: number
      value: number
      percentage: number
    }>
  turnoverRates: Array<{
    product: string
    rate: number
      category: string
    }>
  stockoutRisk: Array<{
    name: string
    kode: string
    currentStock: number
    dailyAverage: number
      daysOfStock: number
    }>
  }
  predictiveAnalytics: {
    demandForecast: Array<{
      product: string
      currentDemand: number
      predictedDemand: number
      confidence: number
      recommendation: string
    }>
    seasonalTrends: Array<{
      month: string
      factor: number
      products: string[]
    }>
    priceOptimization: Array<{
      product: string
      currentPrice: number
      suggestedPrice: number
      expectedImpact: number
    }>
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D']

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('3months')
  const [selectedMetric, setSelectedMetric] = useState('revenue')
  const { addNotification } = useNotifications()

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/dashboard?period=${selectedPeriod}`)
      const result = await response.json()

      if (result.success) {
        setAnalytics(result.data)
      } else {
        toast.error(result.message || 'Gagal mengambil data analytics')
      }
    } catch (error) {
      console.error('Analytics fetch error:', error)
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [selectedPeriod])

  const handleTestNotification = () => {
    addNotification({
      type: 'success',
      title: 'Tes Notifikasi Analytics',
      message: `Data periode ${selectedPeriod} berhasil dimuat.`,
      category: 'system',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" />
  }

  const getGrowthColor = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-500">Memuat data analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Brain className="mr-3 h-8 w-8 text-blue-600" />
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground">
            Analisis mendalam performa bisnis dan prediksi trends
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleTestNotification}>
            <BellRing className="mr-2 h-4 w-4" />
            Tes Notifikasi
          </Button>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Bulan</SelectItem>
              <SelectItem value="3months">3 Bulan</SelectItem>
              <SelectItem value="6months">6 Bulan</SelectItem>
              <SelectItem value="1year">1 Tahun</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAnalytics} disabled={loading}>
            <Activity className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.totalRevenue)}</div>
            <p className={`text-xs flex items-center ${getGrowthColor(analytics.overview.revenueGrowth)}`}>
              {getGrowthIcon(analytics.overview.revenueGrowth)}
              {formatPercentage(analytics.overview.revenueGrowth)} dari periode lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalTransactions.toLocaleString()}</div>
            <p className={`text-xs flex items-center ${getGrowthColor(analytics.overview.transactionGrowth)}`}>
              {getGrowthIcon(analytics.overview.transactionGrowth)}
              {formatPercentage(analytics.overview.transactionGrowth)} dari periode lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.profitMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              AOV: {formatCurrency(analytics.overview.averageOrderValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalProducts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.totalCustomers} customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue & Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Revenue & Transaction Trends
          </CardTitle>
          <CardDescription>
            Perkembangan revenue dan transaksi dalam {selectedPeriod === '1month' ? '1 bulan' : selectedPeriod === '3months' ? '3 bulan' : selectedPeriod === '6months' ? '6 bulan' : '1 tahun'} terakhir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.trends.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip formatter={(value, name) => [
                typeof name === 'string' && (name.includes('Revenue') || name.includes('Profit')) ? formatCurrency(Number(value)) : Number(value).toLocaleString(),
                name
              ]} />
              <Legend />
              <Bar yAxisId="right" dataKey="sales" fill="#8884d8" name="Sales" />
              <Bar yAxisId="right" dataKey="purchases" fill="#82ca9d" name="Purchases" />
              <Area yAxisId="left" type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" name="Revenue" />
              <Area yAxisId="left" type="monotone" dataKey="profit" stackId="2" stroke="#00C49F" fill="#00C49F" name="Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Product Performance Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-yellow-600" />
              Top Performing Products
            </CardTitle>
            <CardDescription>Produk dengan performa tertinggi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.productAnalytics.topPerforming.slice(0, 5).map((product, index) => (
                <div key={product.kode} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.kode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(product.revenue)}</p>
                    <p className={`text-sm flex items-center justify-end ${getGrowthColor(product.growth)}`}>
                      {getGrowthIcon(product.growth)}
                      {formatPercentage(product.growth)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-orange-600" />
              Slow Moving Inventory
            </CardTitle>
            <CardDescription>Produk yang perlu perhatian khusus</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.productAnalytics.slowMoving.slice(0, 5).map((product) => (
                <div key={product.kode} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-orange-100 text-orange-600 rounded-full text-xs font-semibold">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.kode}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{product.currentStock} unit</p>
                    <p className="text-sm text-gray-500">{formatCurrency(product.stockValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChartIcon className="mr-2 h-5 w-5" />
            Category Performance
          </CardTitle>
          <CardDescription>Distribusi revenue per kategori produk</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.productAnalytics.categoryPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${(percentage * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {analytics.productAnalytics.categoryPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {analytics.productAnalytics.categoryPerformance.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <p className="font-medium">{category.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(category.revenue)}</p>
                    <p className="text-sm text-gray-500">{category.quantity} unit</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-600" />
              Top Customers
            </CardTitle>
            <CardDescription>Customer dengan nilai transaksi tertinggi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.customerAnalytics.topCustomers.slice(0, 5).map((customer, index) => (
                <div key={customer.kode} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.kode} • {customer.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(customer.revenue)}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(customer.averageOrder)} avg</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="mr-2 h-5 w-5 text-purple-600" />
              Customer Retention
            </CardTitle>
            <CardDescription>Metrik retensi customer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">New Customers</span>
                <Badge variant="secondary">{analytics.customerAnalytics.retentionMetrics.newCustomers}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Returning Customers</span>
                <Badge variant="default">{analytics.customerAnalytics.retentionMetrics.returningCustomers}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Retention Rate</span>
                  <span className="font-medium">{analytics.customerAnalytics.retentionMetrics.retentionRate.toFixed(1)}%</span>
                </div>
                <Progress value={analytics.customerAnalytics.retentionMetrics.retentionRate} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Churn Rate</span>
                  <span className="font-medium text-red-600">{analytics.customerAnalytics.retentionMetrics.churnRate.toFixed(1)}%</span>
                </div>
                <Progress value={analytics.customerAnalytics.retentionMetrics.churnRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5 text-orange-600" />
            Inventory Analytics
          </CardTitle>
          <CardDescription>Analisis stok dan prediksi kebutuhan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Stock Levels */}
            <div>
              <h4 className="font-medium mb-4">Distribusi Stok</h4>
              <div className="space-y-3">
                {analytics.inventoryAnalytics.stockLevels.map((level) => (
                  <div key={level.status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        level.status === 'Sehat' ? 'bg-green-500' :
                        level.status === 'Menipis' ? 'bg-yellow-500' :
                        level.status === 'Kritis' ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                      <span className="text-sm font-medium">{level.status}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{level.count} produk</p>
                      <p className="text-xs text-gray-500">{formatCurrency(level.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Demand Forecast */}
            <div>
              <h4 className="font-medium mb-4">Prediksi Permintaan</h4>
              <div className="space-y-3">
                {analytics.predictiveAnalytics.demandForecast.slice(0, 3).map((forecast) => (
                  <div key={forecast.product} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-sm">{forecast.product}</h5>
                      <Badge variant={forecast.confidence > 80 ? 'default' : 'secondary'} className="text-xs">
                        {forecast.confidence}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Current: </span>
                        <span className="font-medium">{forecast.currentDemand}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Predicted: </span>
                        <span className="font-medium text-blue-600">{forecast.predictedDemand}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{forecast.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
