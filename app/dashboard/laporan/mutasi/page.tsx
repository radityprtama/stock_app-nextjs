"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Package,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  BarChart3,
  Warehouse,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

interface MutasiItem {
  id: string;
  tanggal: string;
  type: "masuk" | "keluar";
  noDokumen: string;
  barang: {
    nama: string;
    satuan: string;
  };
  quantity: number;
  gudang: {
    nama: string;
  };
  supplier?: {
    nama: string;
  };
  customer?: {
    nama: string;
  };
  createdBy?: string;
}

interface BarangMasukDetail {
  barang?: {
    nama?: string;
    satuan?: string;
  };
  qty?: number;
}

interface BarangMasukRecord {
  id: string;
  tanggal: string;
  noDokumen: string;
  detail?: BarangMasukDetail[];
  supplier?: {
    nama?: string;
  };
  createdBy?: string;
}

interface SuratJalanRecord {
  id: string;
  tanggal: string;
  noSJ: string;
  customer?: {
    nama?: string;
  };
  createdBy?: string;
}

interface BarangMasukApiResponse {
  data?: BarangMasukRecord[];
}

interface SuratJalanApiResponse {
  data?: SuratJalanRecord[];
}

export default function MutasiPage() {
  const [mutasiData, setMutasiData] = useState<MutasiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "masuk" | "keluar">(
    "all"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );

  useEffect(() => {
    async function fetchMutasiData() {
      try {
        // Fetch barang masuk data
        const [barangMasukRes, suratJalanRes] = await Promise.all([
          fetch("/api/transaksi/barang-masuk"),
          fetch("/api/transaksi/surat-jalan"),
        ]);

        const barangMasuk: BarangMasukApiResponse = await barangMasukRes.json();
        const suratJalan: SuratJalanApiResponse = await suratJalanRes.json();

        // Transform barang masuk data
        const masukData = (barangMasuk.data ?? []).map((item) => {
          const firstDetail = item.detail?.[0];
          const barangInfo = {
            nama: firstDetail?.barang?.nama ?? "Unknown",
            satuan: firstDetail?.barang?.satuan ?? "pcs",
          };
          const supplierNama = item.supplier?.nama;

          return {
            id: `bm-${item.id}`,
            tanggal: item.tanggal,
            type: "masuk" as const,
            noDokumen: item.noDokumen,
            barang: barangInfo,
            quantity: firstDetail?.qty ?? 0,
            gudang: { nama: "Gudang Utama" }, // Default, bisa disesuaikan
            supplier: supplierNama ? { nama: supplierNama } : undefined,
            createdBy: item.createdBy,
          };
        });

        // Transform surat jalan data
        const keluarData = (suratJalan.data ?? []).map((item) => {
          const customerNama = item.customer?.nama;

          return {
            id: `sj-${item.id}`,
            tanggal: item.tanggal,
            type: "keluar" as const,
            noDokumen: item.noSJ,
            barang: { nama: "Barang Keluar", satuan: "pcs" }, // Simplified
            quantity: 1, // Simplified
            gudang: { nama: "Gudang Utama" }, // Default
            customer: customerNama ? { nama: customerNama } : undefined,
            createdBy: item.createdBy,
          };
        });

        const allMutasi = [...masukData, ...keluarData].sort(
          (a, b) =>
            new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
        );

        setMutasiData(allMutasi);
      } catch (error) {
        console.error("Error fetching mutasi data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMutasiData();
  }, []);

  const filteredData = mutasiData.filter((item) => {
    const matchesType = filterType === "all" || item.type === filterType;
    const matchesSearch =
      item.noDokumen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barang.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.supplier?.nama || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (item.customer?.nama || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const itemDate = new Date(item.tanggal);
    const matchesMonth =
      selectedMonth === "all" ||
      (itemDate.getMonth() + 1).toString() === selectedMonth;
    const matchesYear = itemDate.getFullYear().toString() === selectedYear;

    return matchesType && matchesSearch && matchesMonth && matchesYear;
  });

  const stats = {
    total: filteredData.length,
    masuk: filteredData.filter((item) => item.type === "masuk").length,
    keluar: filteredData.filter((item) => item.type === "keluar").length,
    totalQuantity: filteredData.reduce((sum, item) => sum + item.quantity, 0),
  };

  const exportToCSV = () => {
    const headers = [
      "Tanggal",
      "Jenis",
      "No Dokumen",
      "Barang",
      "Quantity",
      "Satuan",
      "Gudang",
      "Supplier/Customer",
      "Created By",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) =>
        [
          row.tanggal,
          row.type === "masuk" ? "Barang Masuk" : "Barang Keluar",
          row.noDokumen,
          row.barang.nama,
          row.quantity,
          row.barang.satuan,
          row.gudang.nama,
          row.type === "masuk"
            ? row.supplier?.nama || "-"
            : row.customer?.nama || "-",
          row.createdBy || "-",
        ]
          .map((field) => `"${field}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `laporan_mutasi_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="px-4 lg:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Laporan Mutasi</h1>
          <p className="text-muted-foreground">
            Laporan pergerakan barang masuk dan keluar
          </p>
        </div>
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Laporan Mutasi</h1>
        <p className="text-muted-foreground">
          Laporan pergerakan barang masuk dan keluar
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Transaksi
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Semua transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Barang Masuk
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.masuk}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.masuk / Math.max(stats.total, 1)) * 100)}% dari
              total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Barang Keluar
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.keluar}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.keluar / Math.max(stats.total, 1)) * 100)}%
              dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Quantity
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuantity}</div>
            <p className="text-xs text-muted-foreground">
              Total barang tergerak
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="type">Jenis Transaksi</Label>
              <Select
                value={filterType}
                onValueChange={(value: "all" | "masuk" | "keluar") =>
                  setFilterType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="masuk">Barang Masuk</SelectItem>
                  <SelectItem value="keluar">Barang Keluar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Bulan</Label>
              <Select
                value={selectedMonth}
                onValueChange={(value) => setSelectedMonth(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  <SelectItem value="1">Januari</SelectItem>
                  <SelectItem value="2">Februari</SelectItem>
                  <SelectItem value="3">Maret</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">Mei</SelectItem>
                  <SelectItem value="6">Juni</SelectItem>
                  <SelectItem value="7">Juli</SelectItem>
                  <SelectItem value="8">Agustus</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">Oktober</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">Desember</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Tahun</Label>
              <Select
                value={selectedYear}
                onValueChange={(value) => setSelectedYear(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Pencarian</Label>
              <Input
                id="search"
                placeholder="Cari dokumen atau barang..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mutasi Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Data Mutasi</CardTitle>
              <CardDescription>
                Menampilkan {filteredData.length} dari {mutasiData.length}{" "}
                transaksi
              </CardDescription>
            </div>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>No Dokumen</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Gudang</TableHead>
                  <TableHead>Supplier/Customer</TableHead>
                  <TableHead>Created By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {new Date(item.tanggal).toLocaleDateString("id-ID")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.type === "masuk" ? "default" : "secondary"
                          }
                          className={
                            item.type === "masuk"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }
                        >
                          {item.type === "masuk" ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {item.type === "masuk" ? "Masuk" : "Keluar"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.noDokumen}
                      </TableCell>
                      <TableCell>{item.barang.nama}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            item.type === "masuk"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {item.type === "masuk" ? "+" : "-"}
                          {item.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Warehouse className="w-3 h-3" />
                          {item.gudang.nama}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.type === "masuk"
                          ? item.supplier?.nama || "-"
                          : item.customer?.nama || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.createdBy || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Tidak ada data mutasi yang ditemukan
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
