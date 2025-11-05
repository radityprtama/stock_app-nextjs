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
  RefreshCw,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  ReturJualPrint,
  type ReturJualPrintRef,
  type ReturJualPrintData,
} from "@/components/print";
import { returJualSchema } from "@/lib/validations";
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

type ReturJualDetail = ReturJualPrintData["detail"][number] & {
  barangId: string;
  barang: ReturJualPrintData["detail"][number]["barang"] & {
    id: string;
    kode: string;
  };
  currentStock?: number;
};

interface ReturJual extends ReturJualPrintData {
  id: string;
  noRetur: string;
  customerId: string;
  customer: ReturJualPrintData["customer"] & { id: string; kode: string };
  suratJalanId?: string;
  suratJalan?: {
    id: string;
    noSJ: string;
    tanggal: string;
  };
  totalQty: number;
  totalNilai: number;
  status: "draft" | "approved" | "completed";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  detail: ReturJualDetail[];
}

interface Customer {
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

interface SuratJalan {
  id: string;
  noSJ: string;
  tanggal: string;
  customerId: string;
  customer: {
    id: string;
    kode: string;
    nama: string;
  };
}

interface ReturJualStatistics {
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
  kondisi: "bisa_dijual_lagi" | "rusak_total";
}

type ReturJualFormValues = z.input<typeof returJualSchema>;
const defaultReturJualFormValues: ReturJualFormValues = {
  noRetur: "",
  tanggal: new Date(),
  customerId: "",
  suratJalanId: "",
  alasan: "",
  items: [],
};

export default function ReturJualPage() {
  const printRef = useRef<ReturJualPrintRef>(null);
  const [returJuals, setReturJuals] = useState<ReturJual[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [barangs, setBarangs] = useState<Barang[]>([]);
  const [suratJalanList, setSuratJalanList] = useState<SuratJalan[]>([]);
  const [statistics, setStatistics] = useState<ReturJualStatistics>({
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
  const [selectedCustomer, setSelectedCustomer] = useState("");
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
  const [editingReturJual, setEditingReturJual] = useState<ReturJual | null>(
    null
  );
  const [viewingReturJual, setViewingReturJual] = useState<ReturJual | null>(
    null
  );
  const [items, setItems] = useState<FormData[]>([
    { barangId: "", qty: 1, harga: 0, alasan: "", kondisi: "bisa_dijual_lagi" },
  ]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReturJualFormValues>({
    resolver: zodResolver(returJualSchema),
    defaultValues: defaultReturJualFormValues,
  });

  const watchedValues = watch();

  // Fetch master data
  const fetchMasterData = async () => {
    try {
      const [customersRes, barangsRes, suratJalanRes] = await Promise.all([
        fetch("/api/master/customer?limit=100"),
        fetch("/api/master/barang?limit=100&aktif=true"),
        fetch("/api/transaksi/surat-jalan?limit=100&status=delivered"),
      ]);

      const [customersData, barangsData, suratJalanData] = await Promise.all([
        customersRes.json(),
        barangsRes.json(),
        suratJalanRes.json(),
      ]);

      if (customersData.success) setCustomers(customersData.data);
      if (barangsData.success) setBarangs(barangsData.data);
      if (suratJalanData.success) setSuratJalanList(suratJalanData.data);
    } catch (error) {
      console.error("Error fetching master data:", error);
      toast.error("Gagal mengambil data master");
    }
  };

  // Fetch Retur Jual transactions
  const fetchReturJuals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      });

      if (selectedCustomer) params.append("customerId", selectedCustomer);
      if (selectedStatus) params.append("status", selectedStatus);
      if (startDate)
        params.append("startDate", format(startDate, "yyyy-MM-dd"));
      if (endDate) params.append("endDate", format(endDate, "yyyy-MM-dd"));

      const response = await fetch(`/api/transaksi/retur-jual?${params}`);
      const result = await response.json();

      if (result.success) {
        setReturJuals(result.data);
        setPagination(result.pagination);
        setStatistics(result.statistics);
      } else {
        toast.error("Gagal mengambil data Retur Jual");
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
    selectedCustomer,
    selectedStatus,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchReturJuals();
  }, [fetchReturJuals]);

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
          kondisi: item.kondisi || "bisa_dijual_lagi",
        }))
    );
  }, [items, setValue]);

  const onSubmit = async (data: ReturJualFormValues) => {
    // Use items from form data (already synchronized)
    if (!data.items || data.items.length === 0) {
      toast.error("Minimal harus ada 1 item yang valid");
      return;
    }

    setSubmitting(true);
    try {
      const payload = returJualSchema.parse({
        ...data,
        items: data.items.filter((item) => item.alasan), // Filter items yang punya alasan
      });

      const url = editingReturJual
        ? `/api/transaksi/retur-jual/${editingReturJual.id}`
        : "/api/transaksi/retur-jual";
      const method = editingReturJual ? "PUT" : "POST";

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
          editingReturJual
            ? "Retur Jual berhasil diperbarui"
            : "Retur Jual berhasil dibuat"
        );
        setDialogOpen(false);
        reset({
          ...defaultReturJualFormValues,
          tanggal: new Date(),
          items: [],
        });
        setEditingReturJual(null);
        setItems([
          {
            barangId: "",
            qty: 1,
            harga: 0,
            alasan: "",
            kondisi: "bisa_dijual_lagi",
          },
        ]);
        fetchReturJuals();
      } else {
        toast.error(result.error || "Gagal menyimpan data");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (returJual: ReturJual) => {
    try {
      const response = await fetch(
        `/api/transaksi/retur-jual/${returJual.id}/approve`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Retur Jual berhasil diapprove");
        fetchReturJuals();
      } else {
        toast.error(result.error || "Gagal mengapprove transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengapprove transaksi");
    }
  };

  const handleComplete = async (returJual: ReturJual) => {
    try {
      const response = await fetch(
        `/api/transaksi/retur-jual/${returJual.id}/complete`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Retur Jual berhasil selesai");
        fetchReturJuals();
      } else {
        toast.error(result.error || "Gagal menyelesaikan transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menyelesaikan transaksi");
    }
  };

  const handleEdit = (returJual: ReturJual) => {
    if (returJual.status !== "draft") {
      toast.error("Hanya transaksi dengan status draft yang bisa diedit");
      return;
    }

    setEditingReturJual(returJual);
    setValue("customerId", returJual.customerId);
    setValue("tanggal", new Date(returJual.tanggal));
    setValue("noRetur", returJual.noRetur ?? "");
    setValue("alasan", returJual.alasan);
    setValue("suratJalanId", returJual.suratJalanId ?? "");

    const formItems = returJual.detail.map((detail) => ({
      barangId: detail.barangId,
      qty: detail.qty,
      harga: Number(detail.harga),
      alasan: detail.alasan,
      kondisi: detail.kondisi,
    }));
    setItems(formItems);

    setDialogOpen(true);
  };

  const handleView = async (returJual: ReturJual) => {
    try {
      const response = await fetch(`/api/transaksi/retur-jual/${returJual.id}`);
      const result = await response.json();

      if (result.success) {
        setViewingReturJual(result.data);
        setViewDialogOpen(true);
      } else {
        toast.error("Gagal mengambil detail transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengambil detail");
    }
  };

  const handleDelete = async (returJual: ReturJual) => {
    if (returJual.status !== "draft") {
      toast.error("Hanya transaksi dengan status draft yang bisa dihapus");
      return;
    }

    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus transaksi "${returJual.noRetur}"?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/transaksi/retur-jual/${returJual.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Retur Jual berhasil dihapus");
        fetchReturJuals();
      } else {
        toast.error(result.error || "Gagal menghapus Retur Jual");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menghapus Retur Jual");
    }
  };

  const openAddDialog = () => {
    setEditingReturJual(null);
    reset({
      ...defaultReturJualFormValues,
      tanggal: new Date(),
      items: [],
    });
    setItems([
      {
        barangId: "",
        qty: 1,
        harga: 0,
        alasan: "",
        kondisi: "bisa_dijual_lagi",
      },
    ]);
    setDialogOpen(true);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        barangId: "",
        qty: 1,
        harga: 0,
        alasan: "",
        kondisi: "bisa_dijual_lagi",
      },
    ]);
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
        harga: barang?.hargaJual || 0,
      };
    } else if (field === "qty" || field === "harga") {
      const numericValue = Number(value);
      newItems[index] = {
        ...newItems[index],
        [field]: Number.isNaN(numericValue) ? 0 : numericValue,
      };
    } else if (field === "kondisi") {
      const kondisiValue = value as FormData["kondisi"];
      newItems[index] = {
        ...newItems[index],
        [field]: kondisiValue,
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

  const formatDate = (dateInput: string | Date) => {
    const date =
      typeof dateInput === "string" ? new Date(dateInput) : dateInput;

    return date.toLocaleDateString("id-ID", {
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

  const getKondisiBadge = (kondisi: string) => {
    switch (kondisi) {
      case "bisa_dijual_lagi":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <RefreshCw className="w-3 h-3 mr-1" />
            Bisa Dijual Lagi
          </Badge>
        );
      case "rusak_total":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Rusak Total
          </Badge>
        );
      default:
        return <Badge variant="outline">{kondisi}</Badge>;
    }
  };

  const clearFilters = () => {
    setSelectedCustomer("");
    setSelectedStatus("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSearch("");
  };

  const handlePrint = (returJual: ReturJual) => {
    setViewingReturJual(returJual);
    setTimeout(() => {
      printRef.current?.print();
    }, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retur Jual</h1>
          <p className="text-muted-foreground">
            Kelola transaksi pengembalian barang dari customer
          </p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Input Retur Jual Baru
        </Button>
      </div>
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
    "
            >
              {/* Total Transaksi */}
              <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
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
              <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
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
              <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
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
                    Stok sudah diproses
                  </p>
                </CardContent>
              </Card>

              {/* Completed */}
              <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
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
              <Card className="transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
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
                  value={selectedCustomer || undefined}
                  onValueChange={(value) =>
                    setSelectedCustomer(value === "all" ? "" : value)
                  }
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
              <CardTitle>Daftar Transaksi Retur Jual</CardTitle>
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
                          <TableHead>Customer</TableHead>
                          <TableHead>Total Qty</TableHead>
                          <TableHead>Total Nilai</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returJuals.map((returJual) => (
                          <TableRow key={returJual.id}>
                            <TableCell className="font-medium">
                              {returJual.noRetur}
                            </TableCell>
                            <TableCell>
                              {formatDate(returJual.tanggal)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {returJual.customer.nama}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {returJual.customer.kode}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{returJual.totalQty}</TableCell>
                            <TableCell>
                              {formatCurrency(Number(returJual.totalNilai))}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(returJual.status)}
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
                                    onClick={() => handleView(returJual)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Detail
                                  </DropdownMenuItem>
                                  {returJual.status === "draft" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleEdit(returJual)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleApprove(returJual)}
                                        className="text-blue-600"
                                      >
                                        <Send className="mr-2 h-4 w-4" />
                                        Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(returJual)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {returJual.status === "approved" && (
                                    <DropdownMenuItem
                                      onClick={() => handleComplete(returJual)}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Complete
                                    </DropdownMenuItem>
                                  )}
                                  {(returJual.status === "approved" ||
                                    returJual.status === "completed") && (
                                    <DropdownMenuItem
                                      onClick={() => handlePrint(returJual)}
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

                  {returJuals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <RotateCcw className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Belum ada transaksi Retur Jual
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Mulai dengan membuat transaksi Retur Jual pertama
                      </p>
                      <Button onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Retur Jual Baru
                      </Button>
                    </div>
                  )}

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Menampilkan {returJuals.length} dari {pagination.total}{" "}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReturJual ? "Edit Retur Jual" : "Retur Jual Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingReturJual
                ? "Edit informasi transaksi Retur Jual yang sudah ada."
                : "Buat transaksi Retur Jual baru untuk menerima pengembalian barang dari customer."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerId">Customer</Label>
                  <Select
                    value={watchedValues.customerId}
                    onValueChange={(value) => setValue("customerId", value)}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.kode} - {customer.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.customerId && (
                    <p className="text-sm text-red-600">
                      {errors.customerId.message}
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
                  <Label htmlFor="suratJalanId">
                    Ref. Surat Jalan (Opsional)
                  </Label>
                  <Select
                    value={watchedValues.suratJalanId || "none"}
                    onValueChange={(value) =>
                      setValue(
                        "suratJalanId",
                        value === "none" ? undefined : value
                      )
                    }
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Surat Jalan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa Referensi</SelectItem>
                      {suratJalanList.map((suratJalan) => (
                        <SelectItem key={suratJalan.id} value={suratJalan.id}>
                          {suratJalan.noSJ} - {suratJalan.customer.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.suratJalanId && (
                    <p className="text-sm text-red-600">
                      {errors.suratJalanId.message}
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
                      className="grid grid-cols-13 gap-2 items-end"
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
                      <div className="col-span-1">
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
                      <div className="col-span-2">
                        <Label>Kondisi</Label>
                        <Select
                          value={item.kondisi}
                          onValueChange={(
                            value: "bisa_dijual_lagi" | "rusak_total"
                          ) => updateItem(index, "kondisi", value)}
                          disabled={submitting}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bisa_dijual_lagi">
                              Bisa Dijual Lagi
                            </SelectItem>
                            <SelectItem value="rusak_total">
                              Rusak Total
                            </SelectItem>
                          </SelectContent>
                        </Select>
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
                  : editingReturJual
                    ? "Perbarui"
                    : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Retur Jual</DialogTitle>
            <DialogDescription>
              Informasi lengkap transaksi Retur Jual
            </DialogDescription>
          </DialogHeader>
          {viewingReturJual && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informasi Transaksi</TabsTrigger>
                <TabsTrigger value="items">Detail Barang</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>No Retur</Label>
                    <p className="font-medium">{viewingReturJual.noRetur}</p>
                  </div>
                  <div>
                    <Label>Tanggal</Label>
                    <p className="font-medium">
                      {formatDate(viewingReturJual.tanggal)}
                    </p>
                  </div>
                  <div>
                    <Label>Customer</Label>
                    <p className="font-medium">
                      {viewingReturJual.customer.kode} -{" "}
                      {viewingReturJual.customer.nama}
                    </p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(viewingReturJual.status)}
                    </div>
                  </div>
                  <div>
                    <Label>Total Qty</Label>
                    <p className="font-medium">
                      {viewingReturJual.totalQty} unit
                    </p>
                  </div>
                  <div>
                    <Label>Total Nilai</Label>
                    <p className="font-medium">
                      {formatCurrency(Number(viewingReturJual.totalNilai))}
                    </p>
                  </div>
                  {viewingReturJual.suratJalan && (
                    <div>
                      <Label>Ref. Surat Jalan</Label>
                      <p className="font-medium">
                        {viewingReturJual.suratJalan.noSJ}
                      </p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Label>Alasan Retur</Label>
                    <p className="font-medium">{viewingReturJual.alasan}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>Dibuat Tanggal</Label>
                    <p className="font-medium">
                      {formatDate(viewingReturJual.createdAt)}
                    </p>
                  </div>
                  <div>
                    <Label>Terakhir Diubah</Label>
                    <p className="font-medium">
                      {formatDate(viewingReturJual.updatedAt)}
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
                        <TableHead>Kondisi</TableHead>
                        <TableHead>Stok Saat Ini</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingReturJual.detail.map((item, index) => (
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
                          <TableCell>{getKondisiBadge(item.kondisi)}</TableCell>
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
                          colSpan={7}
                          className="text-right font-semibold"
                        >
                          Total:
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(Number(viewingReturJual.totalNilai))}
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
      {viewingReturJual && (
        <ReturJualPrint
          ref={printRef}
          data={viewingReturJual}
          onPrintComplete={() => {
            toast.success("Dokumen berhasil dicetak");
          }}
        />
      )}
    </div>
  );
}
