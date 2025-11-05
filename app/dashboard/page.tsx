"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  Warehouse,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  Activity,
  DollarSign,
  RefreshCw,
  PackageOpen,
  Bell,
  Download,
  User,
  MapPin,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DataTable } from "@/components/data-table";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardStats {
  totalBarang: number;
  totalGudang: number;
  totalTransaksi: number;
  lowStock: number;
  totalNilaiStok: number;
  totalCustomers: number;
  totalSuppliers: number;
  barangKeluar: number;
  barangMasuk?: number;
}

interface LowStockItem {
  id: string;
  qty: number;
  status: string;
  barang: {
    nama: string;
    minStok: number;
    maxStok?: number;
    satuan: string;
    hargaBeli?: number;
    hargaJual?: number;
  };
  gudang: {
    nama: string;
  };
}

interface WarehousePerformance {
  name: string;
  totalItems: number;
  totalValue: number;
  lowStock: number;
  utilization: number;
}

interface TopItem {
  name: string;
  movement: number;
  category: string;
  totalQty: number;
  totalTransaksi: number;
  avgHarga: number;
  golongan: string;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp?: string;
  user: string;
  location?: string;
  quantity?: number;
  unit?: string;
}

interface TableRowData {
  id: number;
  namaBarang: string;
  kode: string;
  kategori: string;
  gudang: string;
  stok: number;
  minStok: number;
  maxStok?: number | undefined;
  status: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
}

interface CategoryDistribution {
  name: string;
  value: number;
  percentage: number;
}

interface Golongan {
  nama: string;
}

interface Barang {
  id: string;
  kode: string;
  nama: string;
  minStok: number;
  maxStok?: number;
  satuan: string;
  hargaBeli?: number;
  hargaJual?: number;
  golongan?: Golongan;
}

interface Gudang {
  id: string;
  nama: string;
}

interface Supplier {
  nama: string;
}

interface Customer {
  nama: string;
}

interface StokItem {
  id: string;
  qty: number;
  status: string;
  gudangId: string;
  barang: Barang;
  gudang: Gudang;
}

interface BarangMasukDetail {
  barang?: Barang;
  qty: number;
}

interface BarangMasuk {
  id: string;
  noDokumen: string;
  tanggal: string;
  supplier?: Supplier;
  createdBy?: string;
  detail?: BarangMasukDetail[];
}

interface SuratJalanDetailItem {
  barang?: Barang;
  qty?: number | string | null;
}

interface SuratJalan {
  id: string;
  noSJ: string;
  tanggal: string;
  customer?: Customer;
  createdBy?: string;
  detail?: SuratJalanDetailItem[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBarang: 0,
    totalGudang: 0,
    totalTransaksi: 0,
    lowStock: 0,
    totalNilaiStok: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    barangKeluar: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<
    {
      month: string;
      transaksi: number;
      barangMasuk: number;
      suratJalan: number;
    }[]
  >([]);
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [warehousePerformance, setWarehousePerformance] = useState<
    WarehousePerformance[]
  >([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    []
  );
  const [allActivities, setAllActivities] = useState<RecentActivity[]>([]);
  const [activitiesDialogOpen, setActivitiesDialogOpen] = useState(false);

  const [categoryDistribution, setCategoryDistribution] = useState<
    CategoryDistribution[]
  >([]);

  const activityIconMap = useMemo(
    () => ({
      barang_masuk: (
        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
          <PackageOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
      ),
      barang_keluar: (
        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
          <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
      ),
      stok_update: (
        <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
          <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
      ),
      default: (
        <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-900">
          <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </div>
      ),
    }),
    []
  );

  const activityBadgeMap = useMemo(
    () => ({
      barang_masuk: (
        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
          Barang Masuk
        </Badge>
      ),
      barang_keluar: (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
          Barang Keluar
        </Badge>
      ),
      stok_update: (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 text-xs">
          Stok Rendah
        </Badge>
      ),
      default: (
        <Badge variant="outline" className="text-xs">
          Lainnya
        </Badge>
      ),
    }),
    []
  );

  const getActivityIcon = (type: string) =>
    activityIconMap[type as keyof typeof activityIconMap] ??
    activityIconMap.default;

  const getActivityBadge = (type: string) =>
    activityBadgeMap[type as keyof typeof activityBadgeMap] ??
    activityBadgeMap.default;

  const formatActivityTimestamp = (timestamp?: string) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderActivityList = (activities: RecentActivity[]) =>
    activities.map((activity) => (
      <div
        key={activity.id}
        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
      >
        <div className="shrink-0">{getActivityIcon(activity.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{activity.description}</p>
              {getActivityBadge(activity.type)}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatActivityTimestamp(activity.timestamp)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {activity.user}
            </span>
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {activity.location}
              </span>
            )}
            {typeof activity.quantity !== "undefined" &&
              activity.quantity !== null && (
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {activity.quantity}
                  {activity.unit ? ` ${activity.unit}` : ""}
                </span>
              )}
          </div>
        </div>
      </div>
    ));

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch all necessary data
        const [
          barangRes,
          gudangRes,
          stokRes,
          barangMasukRes,
          suratJalanRes,
          customerRes,
          supplierRes,
        ] = await Promise.all([
          fetch("/api/master/barang"),
          fetch("/api/master/gudang"),
          fetch("/api/stok"),
          fetch("/api/transaksi/barang-masuk"),
          fetch("/api/transaksi/surat-jalan"),
          fetch("/api/master/customer"),
          fetch("/api/master/supplier"),
        ]);

        const barang = await barangRes.json();
        const gudang = await gudangRes.json();
        const stok = await stokRes.json();
        const barangMasuk = await barangMasukRes.json();
        const suratJalan = await suratJalanRes.json();
        const customers = await customerRes.json();
        const suppliers = await supplierRes.json();

        // Calculate enhanced stats
        const lowStockCount =
          stok.data?.filter((s: LowStockItem) => s.status === "low").length ||
          0;
        const lowStockList =
          stok.data
            ?.filter((s: LowStockItem) => s.status === "low")
            .slice(0, 8) || [];

        // Calculate total stock value
        const totalNilaiStok =
          stok.data?.reduce((total: number, item: StokItem) => {
            return total + item.qty * (item.barang?.hargaBeli || 0);
          }, 0) || 0;

        setStats({
          totalBarang: barang.data?.length || 0,
          totalGudang: gudang.data?.length || 0,
          totalTransaksi:
            (barangMasuk.data?.length || 0) + (suratJalan.data?.length || 0),
          lowStock: lowStockCount,
          totalNilaiStok,
          totalCustomers: customers.data?.length || 0,
          totalSuppliers: suppliers.data?.length || 0,
          barangKeluar: suratJalan.data?.length || 0,
        });

        setLowStockItems(lowStockList);

        // Build warehouse performance data
        const warehouseData =
          gudang.data?.map((g: Gudang) => {
            const warehouseStok =
              stok.data?.filter((s: StokItem) => s.gudangId === g.id) || [];
            const totalBarang = warehouseStok.length;
            const totalQty = warehouseStok.reduce(
              (sum: number, s: StokItem) => sum + s.qty,
              0
            );
            const totalNilai = warehouseStok.reduce(
              (sum: number, s: StokItem) =>
                sum + s.qty * (s.barang.hargaBeli || 0),
              0
            );
            const lowStockCount = warehouseStok.filter(
              (s: StokItem) => s.status === "low"
            ).length;
            const maxCapacity = 10000; // Assumed max capacity
            const utilization = Math.min((totalQty / maxCapacity) * 100, 100);

            return {
              name: g.nama,
              totalItems: totalBarang,
              totalValue: totalNilai,
              lowStock: lowStockCount,
              utilization,
            };
          }) || [];
        setWarehousePerformance(warehouseData);

        // Build top items data
        const itemStats: Record<string, TopItem> = {};

        const ensureItemStat = (barang?: Barang | null) => {
          if (!barang?.nama) {
            return null;
          }

          if (!itemStats[barang.nama]) {
            itemStats[barang.nama] = {
              name: barang.nama,
              movement: 0,
              category: barang.golongan?.nama || "Tidak ada kategori",
              totalQty: 0,
              totalTransaksi: 0,
              avgHarga: barang.hargaBeli || barang.hargaJual || 0,
              golongan: barang.golongan?.nama || "Tidak ada kategori",
            };
          }

          const item = itemStats[barang.nama];

          if (barang.golongan?.nama) {
            item.category = barang.golongan.nama;
            item.golongan = barang.golongan.nama;
          }

          if (barang.hargaBeli || barang.hargaJual) {
            item.avgHarga =
              barang.hargaBeli || barang.hargaJual || item.avgHarga;
          }

          return item;
        };

        stok.data?.forEach((s: StokItem) => {
          const item = ensureItemStat(s.barang);
          if (item) {
            item.totalQty += s.qty;
          }
        });

        // Count transactions per item from barang masuk
        barangMasuk.data?.forEach((bm: BarangMasuk) => {
          bm.detail?.forEach((d: BarangMasukDetail) => {
            const item = ensureItemStat(d.barang);
            if (item) {
              item.totalTransaksi += 1;
            }
          });
        });

        // Add movement metrics from surat jalan (barang keluar)
        suratJalan.data?.forEach((sj: SuratJalan) => {
          sj.detail?.forEach((detail: SuratJalanDetailItem) => {
            const item = ensureItemStat(detail.barang);
            if (!item) {
              return;
            }

            const qtyKeluar = Number(detail.qty ?? 0);
            item.movement += Number.isFinite(qtyKeluar) ? qtyKeluar : 0;
            item.totalTransaksi += 1;
          });
        });

        const topItemsData = Object.values(itemStats)
          .sort((a, b) => {
            if (b.movement !== a.movement) {
              return b.movement - a.movement;
            }
            if (b.totalTransaksi !== a.totalTransaksi) {
              return b.totalTransaksi - a.totalTransaksi;
            }
            return b.totalQty - a.totalQty;
          })
          .slice(0, 8);
        setTopItems(topItemsData);

        // Build recent activities
        const activities: RecentActivity[] = [];

        // Add recent barang masuk
        barangMasuk.data?.slice(0, 5).forEach((bm: BarangMasuk) => {
          activities.push({
            id: `bm-${bm.id}`,
            type: "barang_masuk",
            description: `Barang masuk ${bm.noDokumen}`,
            timestamp: bm.tanggal || "",
            user: bm.createdBy || "Admin",
            location: bm.supplier?.nama || "Supplier",
          });
        });

        // Add recent surat jalan
        suratJalan.data?.slice(0, 5).forEach((sj: SuratJalan) => {
          activities.push({
            id: `sj-${sj.id}`,
            type: "barang_keluar",
            description: `Barang keluar ${sj.noSJ}`,
            timestamp: sj.tanggal || "",
            user: sj.createdBy || "Admin",
            location: sj.customer?.nama || "Customer",
          });
        });

        // Add stock updates
        stok.data?.slice(0, 3).forEach((s: StokItem) => {
          if (s.status === "low") {
            activities.push({
              id: `stok-${s.id}`,
              type: "stok_update",
              description: `Stok rendah: ${s.barang.nama}`,
              timestamp: new Date().toISOString(),
              user: "System",
              location: s.gudang.nama,
              quantity: s.qty,
              unit: s.barang.satuan,
            });
          }
        });

        const sortedActivities = [...activities].sort(
          (a, b) =>
            new Date(b.timestamp || "").getTime() -
            new Date(a.timestamp || "").getTime()
        );

        setAllActivities(sortedActivities);
        setRecentActivities(sortedActivities.slice(0, 8));

        // Build data-table rows from real stok data with proper schema
        const rows = (stok.data || [])
          .slice(0, 25)
          .map((s: StokItem, idx: number) => ({
            id: idx + 1,
            namaBarang: s.barang?.nama || "Unknown",
            kode: s.barang?.kode || "N/A",
            kategori: s.barang?.golongan?.nama || "Uncategorized",
            gudang: s.gudang?.nama || "Unknown",
            stok: s.qty,
            minStok: s.barang?.minStok || 0,
            maxStok: s.barang?.maxStok || "",
            status: s.status === "low" ? "rendah" : s.status === "high" ? "aman" : "aman",
            satuan: s.barang?.satuan || "pcs",
            hargaBeli: s.barang?.hargaBeli || 0,
            hargaJual: s.barang?.hargaJual || 0,
          }));
        setTableData(rows);

        // Build enhanced monthly transaction data with trends
        const counts: Record<
          string,
          { barangMasuk: number; suratJalan: number; total: number }
        > = {};
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          counts[key] = { barangMasuk: 0, suratJalan: 0, total: 0 };
        }

        (barangMasuk.data || []).forEach((bm: BarangMasuk) => {
          const d = new Date(bm.tanggal);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (key in counts) {
            counts[key].barangMasuk += 1;
            counts[key].total += 1;
          }
        });

        (suratJalan.data || []).forEach((sj: SuratJalan) => {
          const d = new Date(sj.tanggal);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (key in counts) {
            counts[key].suratJalan += 1;
            counts[key].total += 1;
          }
        });

        const monthly = Object.entries(counts).map(([key, value]) => ({
          month: key,
          transaksi: value.total,
          barangMasuk: value.barangMasuk,
          suratJalan: value.suratJalan,
        }));
        setMonthlyData(monthly);

        // Build category distribution
        const categoryCount: Record<string, number> = {};
        barang.data?.forEach((b: Barang) => {
          const category = b.golongan?.nama || "Uncategorized";
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        const categoryData = Object.entries(categoryCount).map(
          ([name, value]) => ({
            name,
            value,
            percentage: Math.round((value / (barang.data?.length || 1)) * 100),
          })
        );
        setCategoryDistribution(categoryData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Sistem Manajemen Stok Barang</p>
        </div>
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Sistem Manajemen Stok Barang</p>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {/* Total Barang */}
          <Card className="card-hover border border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Barang
                </CardTitle>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {stats.totalCustomers} Pelanggan • {stats.totalSuppliers}{" "}
                  Supplier
                </p>
              </div>
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {stats.totalBarang}
              </div>
              <p className="text-xs flex items-center gap-1 text-green-600 mt-2">
                <TrendingUp className="h-3 w-3" /> +12% dari bulan lalu
              </p>
            </CardContent>
          </Card>

          {/* Nilai Stok */}
          <Card className="card-hover border border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <div>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Nilai Stok Total
                </CardTitle>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Estimasi nilai inventaris
                </p>
              </div>
              <div className="p-2 rounded-md bg-yellow-100 text-yellow-800">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                Rp {stats.totalNilaiStok.toLocaleString("id-ID")}
              </div>
              <p className="text-xs flex items-center gap-1 text-green-600 mt-2">
                <TrendingUp className="h-3 w-3" /> +8% dari bulan lalu
              </p>
            </CardContent>
          </Card>

          {/* Total Gudang */}
          <Card className="card-hover border border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Gudang
              </CardTitle>
              <div className="p-2 rounded-md bg-blue-100 text-blue-700">
                <Warehouse className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalGudang}
              </div>
              <p className="text-xs text-muted-foreground">Lokasi aktif</p>
            </CardContent>
          </Card>

          {/* Stok Rendah */}
          <Card className="card-hover bg-red-100 border border-red-300">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <div>
                <CardTitle className="text-sm font-medium text-red-800">
                  Stok Rendah
                </CardTitle>
                <p className="text-xs text-red-700 mt-1">
                  Perlu restock segera
                </p>
              </div>
              <div className="p-2 rounded-md bg-red-200 text-red-700">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700">
                {stats.lowStock}
              </div>
              <div className="w-full bg-red-200 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className="bg-red-500 h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (stats.lowStock / Math.max(stats.totalBarang, 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Charts Row */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          {/* Monthly Transactions Area Chart */}
          <Card className="col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tren Transaksi</CardTitle>
                  <CardDescription>Grafik 12 bulan terakhir</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {monthlyData.reduce((sum, m) => sum + m.transaksi, 0)} total
                  transaksi
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  transaksi: { label: "Total", color: "var(--primary)" },
                  barangMasuk: {
                    label: "Barang Masuk",
                    color: "var(--chart-1)",
                  },
                  suratJalan: {
                    label: "Barang Keluar",
                    color: "var(--chart-2)",
                  },
                }}
                className="aspect-auto h-[300px] w-full"
              >
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient
                      id="fillTransaksi"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="var(--color-transaksi)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-transaksi)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => {
                      const [y, m] = String(value).split("-");
                      const date = new Date(Number(y), Number(m) - 1, 1);
                      return date.toLocaleString("id-ID", { month: "short" });
                    }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Area
                    dataKey="transaksi"
                    type="natural"
                    fill="url(#fillTransaksi)"
                    stroke="var(--color-transaksi)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
              <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                <div className="text-center">
                  <div className="font-semibold text-green-600">
                    {monthlyData.reduce((sum, m) => sum + m.barangMasuk, 0)}
                  </div>
                  <div className="text-muted-foreground">Barang Masuk</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-blue-600">
                    {monthlyData.reduce((sum, m) => sum + m.suratJalan, 0)}
                  </div>
                  <div className="text-muted-foreground">Barang Keluar</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">
                    {Math.round(
                      monthlyData.reduce((sum, m) => sum + m.transaksi, 0) / 12
                    )}
                  </div>
                  <div className="text-muted-foreground">Rata-rata/Bulan</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribusi Kategori</CardTitle>
              <CardDescription>Barang per kategori</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  value: { label: "Jumlah", color: "var(--chart-1)" },
                }}
                className="aspect-square h-[250px] w-full"
              >
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${index * 60}, 70%, 50%)`}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                </PieChart>
              </ChartContainer>
              <div className="mt-4 space-y-2">
                {categoryDistribution.slice(0, 3).map((cat, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: `hsl(${index * 60}, 70%, 50%)`,
                        }}
                      />
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-medium">{cat.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warehouse Performance & Top Items */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Warehouse Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Kinerja Gudang</CardTitle>
              <CardDescription>
                Utilisasi dan performa per gudang
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {warehousePerformance.slice(0, 4).map((warehouse, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{warehouse.name}</span>
                      <span className="text-muted-foreground">
                        {warehouse.utilization}%
                      </span>
                    </div>
                    <Progress value={warehouse.utilization} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>{warehouse.totalItems} item</span>
                      <span>
                        {warehouse.totalValue.toLocaleString("id-ID")}
                      </span>
                      <span
                        className={
                          warehouse.lowStock > 0
                            ? "text-red-500"
                            : "text-green-500"
                        }
                      >
                        {warehouse.lowStock} rendah
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Moving Items */}
          <Card>
            <CardHeader>
              <CardTitle>Barang Terlaris</CardTitle>
              <CardDescription>
                Item dengan pergerakan tertinggi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topItems.slice(0, 5).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.category}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        {item.movement}
                      </div>
                      <div className="text-xs text-muted-foreground">qty</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="relative border border-destructive/30 bg-linear-to-b from-background/80 to-background/60 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 rounded-xl">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <CardTitle className="text-destructive font-semibold">
                      Peringatan Stok Kritis
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {lowStockItems.length} barang memerlukan restock segera
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="border-destructive text-destructive bg-destructive/10 font-semibold tracking-wide"
                >
                  KRITIS
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-2">
              {/* Summary Grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  {
                    label: "Habis",
                    color: "text-red-500",
                    icon: <PackageOpen className="h-4 w-4" />,
                    count: lowStockItems.filter((i) => i.qty === 0).length,
                  },
                  {
                    label: "Sangat Rendah",
                    color: "text-orange-500",
                    icon: <TrendingDown className="h-4 w-4" />,
                    count: lowStockItems.filter(
                      (i) => i.qty > 0 && i.qty < i.barang.minStok * 0.5
                    ).length,
                  },
                  {
                    label: "Rendah",
                    color: "text-yellow-500",
                    icon: <AlertTriangle className="h-4 w-4" />,
                    count: lowStockItems.filter(
                      (i) =>
                        i.qty >= i.barang.minStok * 0.5 &&
                        i.qty < i.barang.minStok
                    ).length,
                  },
                ].map((u) => (
                  <div
                    key={u.label}
                    className="rounded-lg border border-border bg-card/80 p-3 shadow-inner flex flex-col items-center justify-center"
                  >
                    <div className={`text-xl font-bold ${u.color}`}>
                      {u.count}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      {u.icon}
                      <span>{u.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Item List */}
              <div className="space-y-3">
                {lowStockItems.slice(0, 5).map((item) => {
                  const urgencyLevel =
                    item.qty === 0
                      ? "critical"
                      : item.barang && item.barang && item.qty < item.barang.minStok * 0.5
                        ? "high"
                        : "medium";
                  const urgencyColor =
                    urgencyLevel === "critical"
                      ? "bg-red-100 text-red-700 border-red-200"
                      : urgencyLevel === "high"
                        ? "bg-orange-100 text-orange-700 border-orange-200"
                        : "bg-yellow-100 text-yellow-700 border-yellow-200";
                  const urgencyText =
                    urgencyLevel === "critical"
                      ? "HABIS"
                      : urgencyLevel === "high"
                        ? "KRITIS"
                        : "RENDAH";
                  const percentage = item.barang ? Math.min(
                    (item.qty / item.barang.minStok) * 100,
                    100
                  ) : 0;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 p-4 bg-card border border-border rounded-xl hover:bg-accent/30 transition-all duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.barang?.nama || 'Unknown'}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs ${urgencyColor}`}
                          >
                            {urgencyText}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground items-center">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{item.gudang.nama}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            <span>Min: {item.barang?.minStok || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>
                              Rp{" "}
                              {(item.barang?.hargaBeli || 0).toLocaleString(
                                "id-ID"
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-700 ${
                              percentage < 25
                                ? "bg-red-500"
                                : percentage < 50
                                  ? "bg-orange-500"
                                  : "bg-yellow-400"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-2xl font-semibold ${
                            item.qty === 0
                              ? "text-red-600"
                              : item.barang && item.qty < item.barang.minStok * 0.5
                                ? "text-orange-600"
                                : "text-yellow-600"
                          }`}
                        >
                          {item.qty}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Sisa stok
                        </div>
                        {item.qty > 0 && (
                          <div className="text-xs text-blue-600">
                            Butuh {item.barang ? (item.barang.minStok - item.qty) : 0} lagi
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-3">
                <Button
                  size="sm"
                  className="bg-destructive hover:bg-destructive/90"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Buat Purchase Order
                </Button>
                <Button variant="outline" size="sm">
                  <Bell className="w-4 h-4 mr-2" />
                  Kirim Notifikasi
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Laporan
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Data Table - Real Stok Data */}
        <Card className="mb-6 mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Manajemen Stok Barang</CardTitle>
                <CardDescription>
                  Monitoring real-time stok per barang dan gudang • Total{" "}
                  {tableData.length} item terdaftar
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary" className="text-xs">
                  {
                    tableData.filter((row) =>
                      row.status === "rendah"
                    ).length
                  }{" "}
                  stok rendah
                </Badge>
                <Badge variant="destructive" className="text-xs">
                  {
                    tableData.filter((row) =>
                      row.status === "habis"
                    ).length
                  }{" "}
                  stok habis
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Update:{" "}
                  {new Date().toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable data={tableData} />
          </CardContent>
        </Card>

        {/* Recent Activities Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Aktivitas Terkini</CardTitle>
                <CardDescription>
                  Log perubahan stok dan transaksi terbaru
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.length > 0 ? (
                renderActivityList(recentActivities)
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <Activity className="w-8 h-8" />
                  </div>
                  <p className="font-medium mb-1">
                    Belum ada aktivitas terbaru
                  </p>
                  <p className="text-sm">
                    Aktivitas akan ditampilkan di sini saat ada perubahan stok
                  </p>
                </div>
              )}
            </div>
            {recentActivities.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setActivitiesDialogOpen(true)}
                >
                  Lihat Semua Aktivitas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={activitiesDialogOpen}
        onOpenChange={setActivitiesDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Semua Aktivitas</DialogTitle>
            <DialogDescription>
              Riwayat lengkap perubahan stok, barang masuk, dan barang keluar.
            </DialogDescription>
          </DialogHeader>

          {allActivities.length > 0 ? (
            <ScrollArea className="mt-4 h-[420px] pr-2">
              <div className="space-y-3">
                {renderActivityList(allActivities)}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Activity className="mx-auto mb-4 h-10 w-10" />
              <p className="font-medium mb-1">Belum ada aktivitas</p>
              <p className="text-sm">
                Aktivitas akan muncul di sini setelah ada transaksi atau
                perubahan stok.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActivitiesDialogOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
