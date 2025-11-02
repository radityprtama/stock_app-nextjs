import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const monthlyBaseData = [
  { month: 'Jan 2024', revenue: 120_000_000, purchases: 420, sales: 390, profit: 28_000_000 },
  { month: 'Feb 2024', revenue: 128_500_000, purchases: 445, sales: 410, profit: 30_500_000 },
  { month: 'Mar 2024', revenue: 134_000_000, purchases: 460, sales: 430, profit: 32_000_000 },
  { month: 'Apr 2024', revenue: 140_500_000, purchases: 480, sales: 450, profit: 33_500_000 },
  { month: 'Mei 2024', revenue: 152_000_000, purchases: 510, sales: 485, profit: 36_500_000 },
  { month: 'Jun 2024', revenue: 158_500_000, purchases: 530, sales: 500, profit: 38_000_000 },
  { month: 'Jul 2024', revenue: 164_000_000, purchases: 545, sales: 515, profit: 39_200_000 },
  { month: 'Agu 2024', revenue: 170_500_000, purchases: 560, sales: 530, profit: 40_800_000 },
  { month: 'Sep 2024', revenue: 176_000_000, purchases: 580, sales: 550, profit: 42_500_000 },
  { month: 'Okt 2024', revenue: 184_500_000, purchases: 605, sales: 575, profit: 44_800_000 },
  { month: 'Nov 2024', revenue: 192_000_000, purchases: 630, sales: 600, profit: 47_500_000 },
  { month: 'Des 2024', revenue: 205_000_000, purchases: 660, sales: 630, profit: 51_000_000 },
]

const weeklyBaseData = [
  { week: 'Minggu 1', revenue: 34_500_000, transactions: 155 },
  { week: 'Minggu 2', revenue: 37_200_000, transactions: 168 },
  { week: 'Minggu 3', revenue: 39_100_000, transactions: 175 },
  { week: 'Minggu 4', revenue: 41_800_000, transactions: 184 },
  { week: 'Minggu 5', revenue: 43_400_000, transactions: 191 },
  { week: 'Minggu 6', revenue: 44_900_000, transactions: 198 },
  { week: 'Minggu 7', revenue: 46_300_000, transactions: 205 },
  { week: 'Minggu 8', revenue: 48_200_000, transactions: 214 },
]

const productTopPerforming = [
  { name: 'LCD TV 42" Pro Series', kode: 'BRG-001', revenue: 58_500_000, quantity: 120, growth: 18.5, category: 'Elektronik' },
  { name: 'Mesin Cuci EcoWash', kode: 'BRG-014', revenue: 46_200_000, quantity: 95, growth: 15.2, category: 'Elektronik' },
  { name: 'Kulkas Dua Pintu ChillMax', kode: 'BRG-025', revenue: 52_000_000, quantity: 88, growth: 12.4, category: 'Elektronik' },
  { name: 'Sofa L Minimalis Comfort', kode: 'BRG-058', revenue: 39_500_000, quantity: 65, growth: 10.6, category: 'Furniture' },
  { name: 'Springbed Orthopedic Deluxe', kode: 'BRG-067', revenue: 44_300_000, quantity: 70, growth: 9.8, category: 'Furniture' },
  { name: 'Air Conditioner ArcticCool', kode: 'BRG-089', revenue: 40_800_000, quantity: 75, growth: 8.7, category: 'Elektronik' },
]

const productSlowMoving = [
  { name: 'Set Meja Tamu Vintage', kode: 'BRG-102', currentStock: 120, lastSold: '2024-02-11', stockValue: 24_000_000 },
  { name: 'Lampu Gantung CrystalLux', kode: 'BRG-118', currentStock: 85, lastSold: '2024-03-05', stockValue: 18_700_000 },
  { name: 'Kompor Gas Premium', kode: 'BRG-097', currentStock: 95, lastSold: '2024-01-28', stockValue: 13_200_000 },
  { name: 'Rak Buku Industrial', kode: 'BRG-134', currentStock: 110, lastSold: '2024-03-19', stockValue: 16_500_000 },
  { name: 'Dispenser SmartFlow', kode: 'BRG-088', currentStock: 80, lastSold: '2024-02-03', stockValue: 9_600_000 },
]

const categoryPerformance = [
  { category: 'Elektronik', revenue: 540_000_000, quantity: 1_150, profit: 142_000_000 },
  { category: 'Furniture', revenue: 310_500_000, quantity: 640, profit: 86_000_000 },
  { category: 'Peralatan Rumah', revenue: 180_200_000, quantity: 720, profit: 52_500_000 },
  { category: 'Aksesoris', revenue: 86_400_000, quantity: 480, profit: 24_600_000 },
]

const topCustomers = [
  { name: 'PT Sentosa Makmur', kode: 'CUST-001', revenue: 95_500_000, orders: 24, averageOrder: 3_979_000, lastOrder: '2024-03-22' },
  { name: 'UD Maju Jaya', kode: 'CUST-017', revenue: 72_800_000, orders: 18, averageOrder: 4_044_000, lastOrder: '2024-03-25' },
  { name: 'CV Harmoni Sejahtera', kode: 'CUST-009', revenue: 65_300_000, orders: 16, averageOrder: 4_081_000, lastOrder: '2024-03-21' },
  { name: 'PT Prima Retail', kode: 'CUST-025', revenue: 58_600_000, orders: 14, averageOrder: 4_186_000, lastOrder: '2024-03-26' },
  { name: 'Toko Sumber Rezeki', kode: 'CUST-032', revenue: 49_400_000, orders: 13, averageOrder: 3_800_000, lastOrder: '2024-03-19' },
]

const customerSegments = [
  { segment: 'Distributor', count: 24, revenue: 310_000_000, averageValue: 12_900_000 },
  { segment: 'Retailer', count: 56, revenue: 265_000_000, averageValue: 4_730_000 },
  { segment: 'E-commerce', count: 18, revenue: 86_500_000, averageValue: 4_806_000 },
]

const stockLevels = [
  { status: 'Sehat', count: 185, value: 420_000_000, percentage: 58 },
  { status: 'Menipis', count: 64, value: 95_000_000, percentage: 20 },
  { status: 'Kritis', count: 28, value: 42_000_000, percentage: 9 },
  { status: 'Overstock', count: 42, value: 110_000_000, percentage: 13 },
]

const turnoverRates = [
  { product: 'LCD TV 42" Pro Series', rate: 5.2, category: 'Elektronik' },
  { product: 'Mesin Cuci EcoWash', rate: 4.6, category: 'Elektronik' },
  { product: 'Sofa L Minimalis Comfort', rate: 3.8, category: 'Furniture' },
  { product: 'Rak Buku Industrial', rate: 2.1, category: 'Furniture' },
  { product: 'Kompor Gas Premium', rate: 1.9, category: 'Peralatan Rumah' },
]

const stockoutRisk = [
  { name: 'LCD TV 32" Basic', kode: 'BRG-015', currentStock: 18, dailyAverage: 4.5, daysOfStock: 4 },
  { name: 'Kipas Angin TurboCool', kode: 'BRG-077', currentStock: 22, dailyAverage: 4.0, daysOfStock: 6 },
  { name: 'Rice Cooker SmartCook', kode: 'BRG-091', currentStock: 30, dailyAverage: 5.5, daysOfStock: 5 },
  { name: 'Vacuum Cleaner SilentPro', kode: 'BRG-064', currentStock: 16, dailyAverage: 3.2, daysOfStock: 5 },
]

const demandForecast = [
  { product: 'Air Conditioner ArcticCool', currentDemand: 75, predictedDemand: 92, confidence: 0.86, recommendation: 'Tingkatkan stok 20% menjelang musim panas' },
  { product: 'Mesin Cuci EcoWash', currentDemand: 64, predictedDemand: 78, confidence: 0.81, recommendation: 'Pertahankan stok, siapkan promo bundling' },
  { product: 'Springbed Orthopedic Deluxe', currentDemand: 48, predictedDemand: 65, confidence: 0.78, recommendation: 'Siapkan stok tambahan untuk high-season Juli' },
]

const seasonalTrends = [
  { month: 'Jan', factor: 0.94, products: ['Elektronik Rumah Tangga', 'Peralatan Kebersihan'] },
  { month: 'Apr', factor: 1.08, products: ['Elektronik', 'Pendingin Ruangan'] },
  { month: 'Jul', factor: 1.15, products: ['Pendingin Ruangan', 'Kipas Angin'] },
  { month: 'Sep', factor: 1.05, products: ['Elektronik', 'Peralatan Dapur'] },
  { month: 'Nov', factor: 1.12, products: ['Elektronik', 'Furniture'] },
]

const priceOptimization = [
  { product: 'LCD TV 42" Pro Series', currentPrice: 4_850_000, suggestedPrice: 4_999_000, expectedImpact: 0.07 },
  { product: 'Mesin Cuci EcoWash', currentPrice: 3_650_000, suggestedPrice: 3_799_000, expectedImpact: 0.06 },
  { product: 'Springbed Orthopedic Deluxe', currentPrice: 5_400_000, suggestedPrice: 5_599_000, expectedImpact: 0.05 },
  { product: 'Sofa L Minimalis Comfort', currentPrice: 6_200_000, suggestedPrice: 6_349_000, expectedImpact: 0.04 },
]

const overviewByPeriod = {
  '1month': {
    totalRevenue: 68_400_000,
    totalTransactions: 680,
    totalProducts: 420,
    totalCustomers: 118,
    revenueGrowth: 6.4,
    transactionGrowth: 4.8,
    profitMargin: 21.5,
    averageOrderValue: 3_250_000,
  },
  '3months': {
    totalRevenue: 205_000_000,
    totalTransactions: 2_080,
    totalProducts: 890,
    totalCustomers: 260,
    revenueGrowth: 12.6,
    transactionGrowth: 8.9,
    profitMargin: 22.4,
    averageOrderValue: 3_480_000,
  },
  '6months': {
    totalRevenue: 398_500_000,
    totalTransactions: 3_950,
    totalProducts: 1_320,
    totalCustomers: 410,
    revenueGrowth: 18.2,
    transactionGrowth: 12.4,
    profitMargin: 23.1,
    averageOrderValue: 3_620_000,
  },
  '1year': {
    totalRevenue: 1_825_000_000,
    totalTransactions: 12_480,
    totalProducts: 1_980,
    totalCustomers: 690,
    revenueGrowth: 24.5,
    transactionGrowth: 18.3,
    profitMargin: 24.2,
    averageOrderValue: 3_760_000,
  },
} as const

const monthlyWindowByPeriod = {
  '1month': 4,
  '3months': 6,
  '6months': 9,
  '1year': 12,
} as const

const weeklyWindowByPeriod = {
  '1month': 4,
  '3months': 6,
  '6months': 8,
  '1year': 8,
} as const

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period') ?? '3months'
    const period = (periodParam in overviewByPeriod ? periodParam : '3months') as keyof typeof overviewByPeriod

    const overview = overviewByPeriod[period]
    const monthlyWindow = monthlyWindowByPeriod[period]
    const weeklyWindow = weeklyWindowByPeriod[period]

    const monthly = monthlyBaseData.slice(-monthlyWindow)
    const weekly = weeklyBaseData.slice(-weeklyWindow)

    const data = {
      overview,
      trends: {
        monthly,
        weekly,
      },
      productAnalytics: {
        topPerforming: productTopPerforming,
        slowMoving: productSlowMoving,
        categoryPerformance,
      },
      customerAnalytics: {
        topCustomers,
        retentionMetrics: {
          newCustomers: 58,
          returningCustomers: 142,
          churnRate: 6.8,
          retentionRate: 87.4,
        },
        customerSegments,
      },
      inventoryAnalytics: {
        stockLevels,
        turnoverRates,
        stockoutRisk,
      },
      predictiveAnalytics: {
        demandForecast,
        seasonalTrends,
        priceOptimization,
      },
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Failed to load analytics dashboard:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat memuat data analytics' },
      { status: 500 },
    )
  }
}
