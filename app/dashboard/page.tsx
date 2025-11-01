'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Package,
  Users,
  Warehouse,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Plus,
  Eye
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalGudang: 0,
    totalBarang: 0,
    totalStokValue: 0,
    lowStockItems: 0,
    pendingTransactions: 0,
    todayTransactions: { barangMasuk: 0, barangKeluar: 0 }
  })

  const [lowStockItems, setLowStockItems] = useState([])
  const [recentTransactions, setRecentTransactions] = useState([])

  useEffect(() => {
    // Mock data for now - will be replaced with API calls
    setStats({
      totalGudang: 2,
      totalBarang: 3,
      totalStokValue: 125000000,
      lowStockItems: 2,
      pendingTransactions: 3,
      todayTransactions: { barangMasuk: 5, barangKeluar: 8 }
    })

    setLowStockItems([
      { id: 1, nama: 'Spring Bed Queen', currentStock: 2, minStock: 3, gudang: 'Gudang Utama' },
      { id: 2, nama: 'Laptop Gaming', currentStock: 0, minStock: 2, gudang: 'Gudang Utama' }
    ])

    setRecentTransactions([
      { id: 1, type: 'barang-masuk', no: 'BM/2025/11/1234', date: '2025-11-01', customer: 'PT. Tech Supplier', total: 15000000 },
      { id: 2, type: 'surat-jalan', no: 'SJ/2025/11/5678', date: '2025-11-01', customer: 'PT. Mega Store', total: 8997000 },
      { id: 3, type: 'delivery-order', no: 'DO/2025/11/9012', date: '2025-10-31', customer: 'Gudang Secondary', total: 0 }
    ])
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Selamat datang di Sistem Inventory Management
          </p>
        </div>
        <div className="flex space-x-2">
          <Button asChild>
            <Link href="/dashboard/transaksi/barang-masuk">
              <Plus className="mr-2 h-4 w-4" />
              Barang Masuk
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/transaksi/surat-jalan">
              <Plus className="mr-2 h-4 w-4" />
              Surat Jalan
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gudang</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGudang}</div>
            <p className="text-xs text-muted-foreground">
              +0 dari bulan lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Barang</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBarang}</div>
            <p className="text-xs text-muted-foreground">
              +0 dari bulan lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nilai Stok</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalStokValue)}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% dari bulan lalu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Minimum</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Barang perlu restock
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Today's Transactions */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Transaksi Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Barang Masuk: {stats.todayTransactions.barangMasuk}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm">Barang Keluar: {stats.todayTransactions.barangKeluar}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Transactions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Transaksi Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Menunggu proses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions and Low Stock */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Terakhir</CardTitle>
            <CardDescription>
              5 transaksi terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {transaction.type === 'barang-masuk' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    {transaction.type === 'surat-jalan' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                    {transaction.type === 'delivery-order' && (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {transaction.no}
                    </p>
                    <p className="text-sm text-gray-500">
                      {transaction.customer}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(transaction.total)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {transaction.date}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/transaksi">
                Lihat Semua Transaksi
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Peringatan Stok Minimum</CardTitle>
            <CardDescription>
              Barang yang perlu di-restock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.nama}
                    </p>
                    <p className="text-sm text-gray-500">
                      {item.gudang}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive">
                      {item.currentStock} / {item.minStock}
                    </Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/transaksi/barang-masuk`}>
                        <Plus className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" asChild>
              <Link href="/dashboard/laporan/stok">
                Lihat Laporan Stok
                <Eye className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
