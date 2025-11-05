"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Printer,
  Send,
  Package,
  TrendingUp,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Filter,
  FileText,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import {
  ReturBeliPrint,
  type ReturBeliPrintData,
  type ReturBeliPrintRef,
} from "@/components/print";
import { returBeliSchema } from "@/lib/validations";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ReturBeliDetail = ReturBeliPrintData["detail"][number] & {
  currentStock?: number;
};

interface ReturBeli extends ReturBeliPrintData {
  id: string;
  noRetur: string;
  tanggal: string;
  supplierId: string;
  supplier: ReturBeliPrintData["supplier"] & { id: string; kode: string };
  barangMasukRef?: string | null;
  totalQty: number;
  totalNilai: number;
  alasan: string;
  status: "draft" | "approved" | "completed";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  detail: Array<ReturBeliDetail & { barangId: string }>;
}

interface Supplier {
  id: string;
  kode: string;
  nama: string;
  alamat: string;
  telepon: string;
  email?: string;
  npwp?: string;
}

interface Barang {
  id: string;
  kode: string;
  nama: string;
  merk?: string;
  tipe?: string;
  ukuran?: string;
  satuan: string;
  hargaBeli: number;
  hargaJual: number;
  aktif: boolean;
}

interface BarangMasuk {
  id: string;
  noDokumen: string;
  tanggal: string;
  supplierId: string;
  supplier: {
    id: string;
    kode: string;
    nama: string;
  };
}

interface ReturBeliStatistics {
  totalTransactions: number;
  draftCount: number;
  approvedCount: number;
  completedCount: number;
  totalValue: number;
  totalQuantity: number;
}

interface FormData {
  barangId: string;
  qty: number;
  harga: number;
  alasan: string;
}

type ReturBeliFormValues = z.input<typeof returBeliSchema>;
const defaultReturBeliFormValues: ReturBeliFormValues = {
  noRetur: "",
  tanggal: new Date(),
  supplierId: "",
  barangMasukRef: "",
  alasan: "",
  items: [],
};

export default function ReturBeliPage() {
  const printRef = useRef<ReturBeliPrintRef>(null);
  const [returBelis, setReturBelis] = useState<ReturBeli[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [barangs, setBarangs] = useState<Barang[]>([]);
  const [barangMasukList, setBarangMasukList] = useState<BarangMasuk[]>([]);
  const [statistics, setStatistics] = useState<ReturBeliStatistics>({
    totalTransactions: 0,
    draftCount: 0,
    approvedCount: 0,
    completedCount: 0,
    totalValue: 0,
    totalQuantity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingReturBeli, setEditingReturBeli] = useState<ReturBeli | null>(
    null
  );
  const [viewingReturBeli, setViewingReturBeli] = useState<ReturBeli | null>(
    null
  );
  const [items, setItems] = useState<FormData[]>([
    { barangId: "", qty: 1, harga: 0, alasan: "" },
  ]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReturBeliFormValues>({
    resolver: zodResolver(returBeliSchema),
    defaultValues: defaultReturBeliFormValues,
  });

  const watchedValues = watch();

  // Fetch master data
  const fetchMasterData = async () => {
    try {
      const [suppliersRes, barangsRes, barangMasukRes] = await Promise.all([
        fetch("/api/master/supplier?limit=100"),
        fetch("/api/master/barang?limit=100&aktif=true"),
        fetch("/api/transaksi/barang-masuk?limit=100&status=posted"),
      ]);

      const [suppliersData, barangsData, barangMasukData] = await Promise.all([
        suppliersRes.json(),
        barangsRes.json(),
        barangMasukRes.json(),
      ]);

      if (suppliersData.success) setSuppliers(suppliersData.data);
      if (barangsData.success) setBarangs(barangsData.data);
      if (barangMasukData.success) setBarangMasukList(barangMasukData.data);
    } catch (error) {
      console.error("Error fetching master data:", error);
      toast.error("Gagal mengambil data master");
    }
  };

  // Fetch Retur Beli transactions
  const fetchReturBelis = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      });

      if (selectedSupplier) params.append("supplierId", selectedSupplier);
      if (selectedStatus) params.append("status", selectedStatus);
      if (startDate)
        params.append("startDate", format(startDate, "yyyy-MM-dd"));
      if (endDate) params.append("endDate", format(endDate, "yyyy-MM-dd"));

      const response = await fetch(`/api/transaksi/retur-beli?${params}`);
      const result = await response.json();

      if (result.success) {
        setReturBelis(result.data);
        setPagination(result.pagination);
        setStatistics(result.statistics);
      } else {
        toast.error("Gagal mengambil data Retur Beli");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    search,
    selectedSupplier,
    selectedStatus,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchReturBelis();
  }, [fetchReturBelis]);

  // Update form items when items state changes
  useEffect(() => {
    setValue(
      "items",
      items
        .filter((item) => item.barangId)
        .map((item) => ({
          barangId: item.barangId,
          qty: Number(item.qty) || 0,
          harga: Number(item.harga) || 0,
          alasan: item.alasan || "",
        }))
    );
  }, [items, setValue]);

  const onSubmit = async (data: ReturBeliFormValues) => {
    // Use items from form data (already synchronized)
    if (!data.items || data.items.length === 0) {
      toast.error("Minimal harus ada 1 item yang valid");
      return;
    }

    setSubmitting(true);
    try {
      const payload = returBeliSchema.parse({
        ...data,
        items: data.items.filter((item) => item.alasan), // Filter items yang punya alasan
      });

      const url = editingReturBeli
        ? `/api/transaksi/retur-beli/${editingReturBeli.id}`
        : "/api/transaksi/retur-beli";
      const method = editingReturBeli ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          editingReturBeli
            ? "Retur Beli berhasil diperbarui"
            : "Retur Beli berhasil dibuat"
        );
        setDialogOpen(false);
        reset({
          ...defaultReturBeliFormValues,
          tanggal: new Date(),
          items: [],
        });
        setEditingReturBeli(null);
        setItems([{ barangId: "", qty: 1, harga: 0, alasan: "" }]);
        fetchReturBelis();
      } else {
        toast.error(result.error || "Gagal menyimpan data");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (returBeli: ReturBeli) => {
    try {
      const response = await fetch(
        `/api/transaksi/retur-beli/${returBeli.id}/approve`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Retur Beli berhasil diapprove dan stok dikurangi");
        fetchReturBelis();
      } else {
        toast.error(result.error || "Gagal mengapprove transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengapprove transaksi");
    }
  };

  const handleComplete = async (returBeli: ReturBeli) => {
    try {
      const response = await fetch(
        `/api/transaksi/retur-beli/${returBeli.id}/complete`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Retur Beli berhasil selesai");
        fetchReturBelis();
      } else {
        toast.error(result.error || "Gagal menyelesaikan transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menyelesaikan transaksi");
    }
  };

  const handleEdit = (returBeli: ReturBeli) => {
    if (returBeli.status !== "draft") {
      toast.error("Hanya transaksi dengan status draft yang bisa diedit");
      return;
    }

    setEditingReturBeli(returBeli);
    setValue("supplierId", returBeli.supplierId);
    setValue("tanggal", new Date(returBeli.tanggal));
    setValue("noRetur", returBeli.noRetur ?? "");
    setValue("alasan", returBeli.alasan);
    setValue("barangMasukRef", returBeli.barangMasukRef ?? "");

    const formItems = returBeli.detail.map((detail) => ({
      barangId: detail.barangId,
      qty: detail.qty,
      harga: Number(detail.harga),
      alasan: detail.alasan,
    }));
    setItems(formItems);

    setDialogOpen(true);
  };

  const handleView = async (returBeli: ReturBeli) => {
    try {
      const response = await fetch(`/api/transaksi/retur-beli/${returBeli.id}`);
      const result = await response.json();

      if (result.success) {
        const data = result.data as any;
        // Coerce barangMasukRef object to printable string for UI/print
        const bmRef = data?.barangMasukRef;
        const barangMasukRefString = bmRef
          ? typeof bmRef === "string"
            ? bmRef
            : `${bmRef.noDokumen}${bmRef.tanggal ? ` (${formatDate(String(bmRef.tanggal))})` : ""}`
          : "";

        setViewingReturBeli({
          ...data,
          barangMasukRef: barangMasukRefString,
        });
        setViewDialogOpen(true);
      } else {
        toast.error("Gagal mengambil detail transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengambil detail");
    }
  };

  const handleDelete = async (returBeli: ReturBeli) => {
    if (returBeli.status !== "draft") {
      toast.error("Hanya transaksi dengan status draft yang bisa dihapus");
      return;
    }

    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus transaksi "${returBeli.noRetur}"?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/transaksi/retur-beli/${returBeli.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Retur Beli berhasil dihapus");
        fetchReturBelis();
      } else {
        toast.error(result.error || "Gagal menghapus Retur Beli");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menghapus Retur Beli");
    }
  };

  const openAddDialog = () => {
    setEditingReturBeli(null);
    reset({
      ...defaultReturBeliFormValues,
      tanggal: new Date(),
      items: [],
    });
    setItems([{ barangId: "", qty: 1, harga: 0, alasan: "" }]);
    setDialogOpen(true);
  };

  const addItem = () => {
    setItems([...items, { barangId: "", qty: 1, harga: 0, alasan: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof FormData, value: unknown) => {
    const newItems = [...items];
    if (field === "barangId") {
      // Set default harga from barang when selected
      const stringValue = String(value);
      const barang = barangs.find((b) => b.id === stringValue);
      newItems[index] = {
        ...newItems[index],
        [field]: stringValue,
        harga: barang?.hargaBeli || 0,
      };
    } else if (field === "qty" || field === "harga") {
      const numericValue = Number(value);
      newItems[index] = {
        ...newItems[index],
        [field]: Number.isNaN(numericValue) ? 0 : numericValue,
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: String(value ?? ""),
      };
    }
    setItems(newItems);
  };

  const calculateSubtotal = (item: FormData) => {
    return item.qty * item.harga;
  };

  const calculateGrandTotal = () => {
    return items.reduce((total, item) => total + calculateSubtotal(item), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const clearFilters = () => {
    setSelectedSupplier("");
    setSelectedStatus("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSearch("");
  };

  const handlePrint = (returBeli: ReturBeli) => {
    setViewingReturBeli(returBeli);
    setTimeout(() => {
      printRef.current?.print();
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Retur Beli</h1>
        <p className="text-muted-foreground">
          Kelola transaksi pengembalian barang ke supplier
        </p>
      </div>

      {/* Header with Action Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Daftar Retur Beli</h2>
          <p className="text-muted-foreground">
            Kelola semua transaksi pengembalian barang ke supplier
          </p>
        </div>
        <Button onClick={openAddDialog} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Input Retur Beli Baru
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="space-y-4">
          {/* Statistics Cards */}
          <div className="w-full overflow-hidden">
            <div
              className="
      grid gap-4
      grid-cols-1
      sm:grid-cols-2
      md:grid-cols-3
      lg:grid-cols-4
      xl:grid-cols-6
      2xl:grid-cols-6
      min-w-0
    "
            >
              {/* Total Transaksi */}
              <Card className="min-w-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Transaksi
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics.totalTransactions}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Semua transaksi
                  </p>
                </CardContent>
              </Card>

              {/* Draft */}
              <Card className="min-w-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {statistics.draftCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Menunggu approve
                  </p>
                </CardContent>
              </Card>

              {/* Approved */}
              <Card className="min-w-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Approved
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {statistics.approvedCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stok sudah dikurangi
                  </p>
                </CardContent>
              </Card>

              {/* Completed */}
              <Card className="min-w-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completed
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.completedCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Transaksi selesai
                  </p>
                </CardContent>
              </Card>

              {/* Total Qty */}
              <Card className="min-w-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Qty
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {statistics.totalQuantity}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total barang diretur
                  </p>
                </CardContent>
              </Card>

              {/* Total Nilai */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="w-[180px] shrink-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-default">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          Total Nilai
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold truncate">
                          {formatCurrency(statistics.totalValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Nilai total retur
                        </p>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>

                  <TooltipContent side="top" className="text-sm">
                    {formatCurrency(statistics.totalValue)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
                  onValueChange={(value) =>
                    setSelectedSupplier(value === "all" ? "" : value)
                  }
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
                  value={selectedStatus || undefined}
                  onValueChange={(value) =>
                    setSelectedStatus(value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Start Date Calendar */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate
                        ? format(startDate, "dd MMM yyyy", { locale: idLocale })
                        : "Tanggal Awal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => (endDate ? date > endDate : false)}
                      locale={idLocale}
                    />
                  </PopoverContent>
                </Popover>

                {/* End Date Calendar */}
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate
                          ? format(endDate, "dd MMM yyyy", { locale: idLocale })
                          : "Tanggal Akhir"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) =>
                          startDate ? date < startDate : false
                        }
                        locale={idLocale}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" onClick={clearFilters}>
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Transaksi Retur Beli</CardTitle>
              <CardDescription>
                Total {pagination.total} transaksi terdaftar
              </CardDescription>
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
                          <TableHead>No Retur</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Total Qty</TableHead>
                          <TableHead>Total Nilai</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returBelis.map((returBeli) => (
                          <TableRow key={returBeli.id}>
                            <TableCell className="font-medium">
                              {returBeli.noRetur}
                            </TableCell>
                            <TableCell>
                              {formatDate(returBeli.tanggal)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {returBeli.supplier.nama}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {returBeli.supplier.kode}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{returBeli.totalQty}</TableCell>
                            <TableCell>
                              {formatCurrency(Number(returBeli.totalNilai))}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(returBeli.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleView(returBeli)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Detail
                                  </DropdownMenuItem>
                                  {returBeli.status === "draft" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleEdit(returBeli)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleApprove(returBeli)}
                                        className="text-blue-600"
                                      >
                                        <Send className="mr-2 h-4 w-4" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(returBeli)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {returBeli.status === "approved" && (
                                    <DropdownMenuItem
                                      onClick={() => handleComplete(returBeli)}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Complete
                                    </DropdownMenuItem>
                                  )}
                                  {(returBeli.status === "approved" ||
                                    returBeli.status === "completed") && (
                                    <DropdownMenuItem
                                      onClick={() => handlePrint(returBeli)}
                                    >
                                      <Printer className="mr-2 h-4 w-4" />
                                      Cetak
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {returBelis.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <ShoppingCart className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Belum ada transaksi Retur Beli
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Mulai dengan membuat transaksi Retur Beli pertama
                      </p>
                      <Button onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Retur Beli Baru
                      </Button>
                    </div>
                  )}

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Menampilkan {returBelis.length} dari {pagination.total}{" "}
                        data
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
                          <ArrowLeft className="h-4 w-4 mr-1" />
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
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReturBeli ? "Edit Retur Beli" : "Retur Beli Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingReturBeli
                ? "Edit informasi transaksi Retur Beli yang sudah ada."
                : "Buat transaksi Retur Beli baru untuk mengembalikan barang ke supplier."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <Select
                    value={watchedValues.supplierId}
                    onValueChange={(value) => setValue("supplierId", value)}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.kode} - {supplier.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.supplierId && (
                    <p className="text-sm text-red-600">
                      {errors.supplierId.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label>Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="justify-start text-left font-normal"
                        disabled={submitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {watchedValues.tanggal
                          ? format(
                              watchedValues.tanggal instanceof Date
                                ? watchedValues.tanggal
                                : new Date(watchedValues.tanggal as any),
                              "dd MMM yyyy",
                              { locale: idLocale }
                            )
                          : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={watchedValues.tanggal as Date}
                        onSelect={(date) =>
                          setValue("tanggal", date || new Date())
                        }
                        locale={idLocale}
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.tanggal && (
                    <p className="text-sm text-red-600">
                      {errors.tanggal.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="barangMasukRef">
                    Ref. Barang Masuk (Opsional)
                  </Label>
                  <Select
                    value={watchedValues.barangMasukRef || "none"}
                    onValueChange={(value) =>
                      setValue(
                        "barangMasukRef",
                        value === "none" ? undefined : value
                      )
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Barang Masuk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa Referensi</SelectItem>
                      {barangMasukList.map((barangMasuk) => (
                        <SelectItem key={barangMasuk.id} value={barangMasuk.id}>
                          {barangMasuk.noDokumen} - {barangMasuk.supplier.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.barangMasukRef && (
                    <p className="text-sm text-red-600">
                      {errors.barangMasukRef.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="alasan">Alasan Retur</Label>
                  <Input
                    id="alasan"
                    {...register("alasan")}
                    placeholder="Alasan pengembalian"
                    disabled={submitting}
                  />
                  {errors.alasan && (
                    <p className="text-sm text-red-600">
                      {errors.alasan.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Detail Barang
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Tambah Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 items-end"
                    >
                      <div className="col-span-3">
                        <Label>Barang</Label>
                        <Select
                          value={item.barangId}
                          onValueChange={(value) =>
                            updateItem(index, "barangId", value)
                          }
                          disabled={submitting}
                        >
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
                      </div>
                      <div className="col-span-2">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(index, "qty", e.target.value)
                          }
                          disabled={submitting}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Harga</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.harga}
                          onChange={(e) =>
                            updateItem(index, "harga", e.target.value)
                          }
                          disabled={submitting}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Alasan Item</Label>
                        <Input
                          value={item.alasan}
                          onChange={(e) =>
                            updateItem(index, "alasan", e.target.value)
                          }
                          placeholder="Rusak, Tidak sesuai, dll"
                          disabled={submitting}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Subtotal</Label>
                        <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-gray-50">
                          <span className="text-sm font-medium">
                            {formatCurrency(calculateSubtotal(item))}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1 || submitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Grand Total:</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatCurrency(calculateGrandTotal())}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Menyimpan..."
                  : editingReturBeli
                    ? "Perbarui"
                    : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Retur Beli</DialogTitle>
            <DialogDescription>
              Informasi lengkap transaksi Retur Beli
            </DialogDescription>
          </DialogHeader>
          {viewingReturBeli && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informasi Transaksi</TabsTrigger>
                <TabsTrigger value="items">Detail Barang</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>No Retur</Label>
                    <p className="font-medium">{viewingReturBeli.noRetur}</p>
                  </div>
                  <div>
                    <Label>Tanggal</Label>
                    <p className="font-medium">
                      {formatDate(viewingReturBeli.tanggal)}
                    </p>
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <p className="font-medium">
                      {viewingReturBeli.supplier.kode} -{" "}
                      {viewingReturBeli.supplier.nama}
                    </p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(viewingReturBeli.status)}
                    </div>
                  </div>
                  <div>
                    <Label>Total Qty</Label>
                    <p className="font-medium">
                      {viewingReturBeli.totalQty} unit
                    </p>
                  </div>
                  <div>
                    <Label>Total Nilai</Label>
                    <p className="font-medium">
                      {formatCurrency(Number(viewingReturBeli.totalNilai))}
                    </p>
                  </div>
                  {viewingReturBeli.barangMasukRef && (
                    <div>
                      <Label>Ref. Barang Masuk</Label>
                      <p className="font-medium">
                        {viewingReturBeli.barangMasukRef}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label>Alasan Retur</Label>
                    <p className="font-medium">{viewingReturBeli.alasan}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>Dibuat Tanggal</Label>
                    <p className="font-medium">
                      {formatDate(viewingReturBeli.createdAt)}
                    </p>
                  </div>
                  <div>
                    <Label>Terakhir Diubah</Label>
                    <p className="font-medium">
                      {formatDate(viewingReturBeli.updatedAt)}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="items" className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Kode Barang</TableHead>
                        <TableHead>Nama Barang</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Harga</TableHead>
                        <TableHead>Subtotal</TableHead>
                        <TableHead>Alasan</TableHead>
                        <TableHead>Stok Saat Ini</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingReturBeli.detail.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.barang.kode}</TableCell>
                          <TableCell>{item.barang.nama}</TableCell>
                          <TableCell>
                            {item.qty} {item.barang.satuan}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(Number(item.harga))}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(Number(item.subtotal))}
                          </TableCell>
                          <TableCell>{item.alasan}</TableCell>
                          <TableCell>
                            <span
                              className={`font-medium ${
                                (item.currentStock || 0) > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {item.currentStock || 0} {item.barang.satuan}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-right font-semibold"
                        >
                          Total:
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(Number(viewingReturBeli.totalNilai))}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Component */}
      {viewingReturBeli && (
        <ReturBeliPrint
          ref={printRef}
          data={viewingReturBeli}
          onPrintComplete={() => {
            toast.success("Dokumen berhasil dicetak");
          }}
        />
      )}
    </div>
  );
}
