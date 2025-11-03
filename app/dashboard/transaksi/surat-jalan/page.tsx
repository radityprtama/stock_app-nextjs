"use client";

import { useState, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Calendar,
  Building,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  FileText,
  ArrowLeft,
  ArrowRight,
  Truck,
  ShoppingCart,
  Timer,
  RefreshCw,
  CheckSquare,
  Square,
  Info,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { SuratJalanFormData, suratJalanSchema } from "@/lib/validations";
import SuratJalanPrint, {
  type SuratJalanPrintRef,
  type SuratJalanPrintData,
} from "@/components/print/surat-jalan-print";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type SuratJalanDetail = SuratJalanPrintData["detail"][number] & {
  id: string;
  barangId: string;
  supplierId?: string;
  statusDropship?: string;
  currentStock?: number;
  stockStatus?: string;
  dropshipSupplier?: {
    id: string;
    kode: string;
    nama: string;
  };
  barang: SuratJalanPrintData["detail"][number]["barang"] & {
    kode?: string;
  };
};

interface SuratJalan extends SuratJalanPrintData {
  id: string;
  noSJ: string;
  customerId: string;
  customer: SuratJalanPrintData["customer"] & { id: string; kode: string };
  gudangId: string;
  gudang: SuratJalanPrintData["gudang"] & { id: string; kode: string };
  totalQty: number;
  totalNilai: number;
  status: "draft" | "in_transit" | "delivered" | "cancelled";
  deliveryOption?: "partial" | "complete";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  detail: SuratJalanDetail[];
  dropshipSummary?: {
    totalItems: number;
    normalItems: number;
    dropshipItems: number;
    readyItems: number;
    pendingDropship: number;
    receivedDropship: number;
  };
}

interface Customer {
  id: string;
  kode: string;
  nama: string;
  alamat: string;
  telepon: string;
  email?: string;
  tipePelanggan: string;
}

interface Gudang {
  id: string;
  kode: string;
  nama: string;
  alamat: string;
  telepon?: string;
  pic?: string;
}

interface Barang {
  id: string;
  kode: string;
  nama: string;
  merk?: string;
  tipe?: string;
  ukuran?: string;
  satuan: string;
  hargaJual: number;
  aktif: boolean;
}

interface Supplier {
  id: string;
  kode: string;
  nama: string;
  alamat: string;
  telepon: string;
}

interface SuratJalanStatistics {
  totalTransactions: number;
  draftCount: number;
  inTransitCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalValue: number;
  totalQuantity: number;
  dropshipCount: number;
}

interface FormData {
  barangId: string;
  qty: number;
  hargaJual: number;
  keterangan?: string;
  namaAlias?: string; // Nama custom per customer
  isDropship?: boolean;
  supplierId?: string;
  statusDropship?: "pending" | "ordered" | "received";
}

type SuratJalanFormValues = z.input<typeof suratJalanSchema>;
const defaultSuratJalanFormValues: SuratJalanFormValues = {
  noSJ: "",
  tanggal: new Date(),
  customerId: "",
  gudangId: "",
  alamatKirim: "",
  namaSupir: "",
  nopolKendaraan: "",
  keterangan: "",
  deliveryOption: "complete",
  items: [],
};

export default function SuratJalanPage() {
  const printRef = useRef<SuratJalanPrintRef>(null);
  const [suratJalans, setSuratJalans] = useState<SuratJalan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [gudangs, setGudangs] = useState<Gudang[]>([]);
  const [barangs, setBarangs] = useState<Barang[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [statistics, setStatistics] = useState<SuratJalanStatistics>({
    totalTransactions: 0,
    draftCount: 0,
    inTransitCount: 0,
    deliveredCount: 0,
    cancelledCount: 0,
    totalValue: 0,
    totalQuantity: 0,
    dropshipCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [search, setSearch] = useState("");

  // Print component ref
  const suratJalanPrintRef = useRef<SuratJalanPrintRef>(null);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedGudang, setSelectedGudang] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [stockCheckDialogOpen, setStockCheckDialogOpen] = useState(false);
  const [editingSuratJalan, setEditingSuratJalan] = useState<SuratJalan | null>(
    null
  );
  const [viewingSuratJalan, setViewingSuratJalan] = useState<SuratJalan | null>(
    null
  );
  const [stockCheckResult, setStockCheckResult] = useState<any>(null);
  const [items, setItems] = useState<FormData[]>([
    { barangId: "", qty: 1, hargaJual: 0, namaAlias: "" },
  ]);
  const [deliveryOption, setDeliveryOption] = useState<"partial" | "complete">(
    "complete"
  );
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<SuratJalanFormValues>({
    resolver: zodResolver(suratJalanSchema),
    defaultValues: defaultSuratJalanFormValues,
  });

  const watchedValues = watch();

  // Fetch master data
  const fetchMasterData = async () => {
    try {
      const [customersRes, gudangsRes, barangsRes, suppliersRes] =
        await Promise.all([
          fetch("/api/master/customer?limit=100"),
          fetch("/api/master/gudang?limit=100"),
          fetch("/api/master/barang?limit=100&aktif=true"),
          fetch("/api/master/supplier?limit=100"),
        ]);

      const [customersData, gudangsData, barangsData, suppliersData] =
        await Promise.all([
          customersRes.json(),
          gudangsRes.json(),
          barangsRes.json(),
          suppliersRes.json(),
        ]);

      if (customersData.success) setCustomers(customersData.data);
      if (gudangsData.success) setGudangs(gudangsData.data);
      if (barangsData.success) setBarangs(barangsData.data);
      if (suppliersData.success) setSuppliers(suppliersData.data);
    } catch (error) {
      console.error("Error fetching master data:", error);
      toast.error("Gagal mengambil data master");
    }
  };

  // Fetch Surat Jalan transactions
  const fetchSuratJalans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      });

      if (selectedCustomer) params.append("customerId", selectedCustomer);
      if (selectedGudang) params.append("gudangId", selectedGudang);
      if (selectedStatus) params.append("status", selectedStatus);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/transaksi/surat-jalan?${params}`);
      const result = await response.json();

      if (result.success) {
        setSuratJalans(result.data);
        setPagination(result.pagination);
        setStatistics(result.statistics);
      } else {
        toast.error("Gagal mengambil data Surat Jalan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengambil data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchSuratJalans();
  }, [
    pagination.page,
    search,
    selectedCustomer,
    selectedGudang,
    selectedStatus,
    startDate,
    endDate,
  ]);

  // Update form items when items state changes
  useEffect(() => {
    setValue(
      "items",
      items
        .filter((item) => item.barangId)
        .map((item) => ({
          barangId: item.barangId,
          qty: Number(item.qty) || 0,
          hargaJual: Number(item.hargaJual) || 0,
          keterangan: item.keterangan || "",
          isDropship: item.isDropship || false,
          supplierId: item.supplierId,
          statusDropship: item.statusDropship as
            | "pending"
            | "ordered"
            | "received"
            | undefined,
        }))
    );
  }, [items, setValue]);

  const onSubmit = async (data: SuratJalanFormValues) => {
    // Use items from form data (already synchronized)
    if (!data.items || data.items.length === 0) {
      toast.error("Minimal harus ada 1 item yang valid");
      return;
    }

    setSubmitting(true);
    try {
      const payload = suratJalanSchema.parse({
        ...data,
        deliveryOption,
        items: data.items,
      });

      const url = editingSuratJalan
        ? `/api/transaksi/surat-jalan/${editingSuratJalan.id}`
        : "/api/transaksi/surat-jalan";
      const method = editingSuratJalan ? "PUT" : "POST";

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
          editingSuratJalan
            ? "Surat Jalan berhasil diperbarui"
            : result.message || "Surat Jalan berhasil dibuat"
        );
        setDialogOpen(false);
        reset({
          ...defaultSuratJalanFormValues,
          tanggal: new Date(),
          items: [],
          deliveryOption: "complete",
        });
        setEditingSuratJalan(null);
        setItems([{ barangId: "", qty: 1, hargaJual: 0, namaAlias: "" }]);
        setDeliveryOption("complete");
        setValue("deliveryOption", "complete");
        fetchSuratJalans();

        // Show dropship summary if applicable
        if (
          result.dropshipSummary &&
          result.dropshipSummary.dropshipItems > 0
        ) {
          toast.info(
            `${result.dropshipSummary.dropshipItems} item dropship terdeteksi`
          );
        }
      } else {
        toast.error(result.error || "Gagal menyimpan data");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menyimpan data");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStock = async (suratJalan: SuratJalan) => {
    try {
      setCheckingStock(true);
      const response = await fetch(
        `/api/transaksi/surat-jalan/${suratJalan.id}/check-stock`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (result.success) {
        setStockCheckResult(result.data);
        setStockCheckDialogOpen(true);
      } else {
        toast.error(result.error || "Gagal mengecek stok");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengecek stok");
    } finally {
      setCheckingStock(false);
    }
  };

  const handlePost = async (suratJalan: SuratJalan) => {
    try {
      setSubmitting(true);
      const response = await fetch(
        `/api/transaksi/surat-jalan/${suratJalan.id}/post`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            deliveryOption: suratJalan.deliveryOption || "complete",
            confirmDropship: true,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Surat Jalan berhasil diposting");
        fetchSuratJalans();
      } else {
        if (result.details && result.details.length > 0) {
          toast.error(result.details.join(", "));
        } else {
          toast.error(result.error || "Gagal memposting transaksi");
        }
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat memposting transaksi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (suratJalan: SuratJalan) => {
    if (suratJalan.status !== "draft") {
      toast.error("Hanya transaksi dengan status draft yang bisa diedit");
      return;
    }

    setEditingSuratJalan(suratJalan);
    setValue("customerId", suratJalan.customerId);
    setValue("gudangId", suratJalan.gudangId);
    setValue("tanggal", new Date(suratJalan.tanggal));
    setValue("noSJ", suratJalan.noSJ ?? "");
    setValue("alamatKirim", suratJalan.alamatKirim);
    setValue("namaSupir", suratJalan.namaSupir);
    setValue("nopolKendaraan", suratJalan.nopolKendaraan);
    setValue("keterangan", suratJalan.keterangan ?? "");

    const formItems = suratJalan.detail.map((detail) => ({
      barangId: detail.barangId,
      qty: detail.qty,
      hargaJual: Number(detail.hargaJual),
      keterangan: detail.keterangan || "",
      isDropship: detail.isDropship,
      supplierId: detail.supplierId || "",
      statusDropship: (detail.statusDropship || "") as
        | "pending"
        | "ordered"
        | "received",
    }));
    setItems(formItems);

    const option = suratJalan.deliveryOption || "complete";
    setDeliveryOption(option);
    setValue("deliveryOption", option);
    setDialogOpen(true);
  };

  const handleView = async (suratJalan: SuratJalan) => {
    try {
      const response = await fetch(
        `/api/transaksi/surat-jalan/${suratJalan.id}`
      );
      const result = await response.json();

      if (result.success) {
        setViewingSuratJalan(result.data);
        setViewDialogOpen(true);
      } else {
        toast.error("Gagal mengambil detail transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengambil detail");
    }
  };

  const handleDelete = async (suratJalan: SuratJalan) => {
    if (suratJalan.status !== "draft") {
      toast.error("Hanya transaksi dengan status draft yang bisa dihapus");
      return;
    }

    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus transaksi "${suratJalan.noSJ}"?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/transaksi/surat-jalan/${suratJalan.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Surat Jalan berhasil dihapus");
        fetchSuratJalans();
      } else {
        toast.error(result.error || "Gagal menghapus Surat Jalan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menghapus Surat Jalan");
    }
  };

  const openAddDialog = () => {
    setEditingSuratJalan(null);
    reset({
      ...defaultSuratJalanFormValues,
      tanggal: new Date(),
      items: [],
      deliveryOption: "complete",
    });
    setItems([{ barangId: "", qty: 1, hargaJual: 0, namaAlias: "" }]);
    setDeliveryOption("complete");
    setValue("deliveryOption", "complete");
    setDialogOpen(true);
  };

  const addItem = () => {
    setItems([...items, { barangId: "", qty: 1, hargaJual: 0, namaAlias: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof FormData, value: any) => {
    const newItems = [...items];
    if (field === "barangId") {
      // Set default harga from barang when selected
      const barang = barangs.find((b) => b.id === value);
      newItems[index] = {
        ...newItems[index],
        [field]: value,
        hargaJual: barang?.hargaJual || 0,
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]:
          field === "qty" || field === "hargaJual" ? Number(value) : value,
      };
    }
    setItems(newItems);
  };

  const handleCustomerChange = (customerId: string) => {
    setValue("customerId", customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setValue("alamatKirim", customer.alamat);
    }
  };

  const calculateSubtotal = (item: FormData) => {
    return item.qty * item.hargaJual;
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

  const formatDate = (dateValue: string | Date) => {
    const date =
      typeof dateValue === "string" ? new Date(dateValue) : dateValue;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return "-";
    }
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
      case "in_transit":
        return (
          <Badge variant="default">
            <Truck className="w-3 h-3 mr-1" />
            Dalam Pengiriman
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="default">
            <CheckCircle className="w-3 h-3 mr-1" />
            Terkirim
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Dibatalkan
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDropshipBadge = (isDropship?: boolean, statusDropship?: string) => {
    if (!isDropship) return null;

    let variant: "default" | "secondary" | "destructive" | "outline" =
      "outline";
    let icon = <ShoppingCart className="w-3 h-3 mr-1" />;
    let text = "Dropship";

    switch (statusDropship) {
      case "pending":
        variant = "secondary";
        icon = <Timer className="w-3 h-3 mr-1" />;
        text = "Dropship Pending";
        break;
      case "ordered":
        variant = "outline";
        icon = <RefreshCw className="w-3 h-3 mr-1" />;
        text = "Dropship Dipesan";
        break;
      case "received":
        variant = "default";
        icon = <CheckSquare className="w-3 h-3 mr-1" />;
        text = "Dropship Diterima";
        break;
    }

    return (
      <Badge variant={variant}>
        {icon} {text}
      </Badge>
    );
  };

  const clearFilters = () => {
    setSelectedCustomer("");
    setSelectedGudang("");
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
    setSearch("");
  };

  const handleDeliver = async (suratJalan: SuratJalan) => {
    if (suratJalan.status !== "in_transit") {
      toast.error(
        'Hanya transaksi dengan status "Dalam Perjalanan" yang bisa ditandai selesai'
      );
      return;
    }
    if (
      !confirm(
        `Apakah Anda yakin ingin menandai Surat Jalan "${suratJalan.noSJ}" sebagai selesai/delivered?`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(
        `/api/transaksi/surat-jalan/${suratJalan.id}/deliver`,
        {
          method: "PUT",
        }
      );
      const result = await response.json();
      if (result.success) {
        toast.success("Surat Jalan berhasil ditandai sebagai selesai");
        fetchSuratJalans();
      } else {
        toast.error(result.error || "Gagal menandai sebagai selesai");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat memperbarui status");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Surat Jalan</h1>
        <p className="text-muted-foreground">
          Kelola transaksi pengiriman barang ke customer dengan sistem dropship
        </p>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">
            <Package className="mr-2 h-4 w-4" />
            Browse Data
          </TabsTrigger>
          <TabsTrigger value="input">
            <Plus className="mr-2 h-4 w-4" />
            Input Transaksi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Statistics Cards */}
          <ScrollArea className="grid gap-4">
            <div className="flex gap-4 p-1 min-w-max">
              {/* Total Transaksi */}
              <Card className="w-[180px] shrink-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
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
              <Card className="w-[180px] shrink-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {statistics.draftCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Menunggu posting
                  </p>
                </CardContent>
              </Card>

              {/* Dalam Pengiriman */}
              <Card className="w-[180px] shrink-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Dalam Pengiriman
                  </CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {statistics.inTransitCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sedang dikirim
                  </p>
                </CardContent>
              </Card>

              {/* Terkirim */}
              <Card className="w-[180px] shrink-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Terkirim
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.deliveredCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Selesai dikirim
                  </p>
                </CardContent>
              </Card>

              {/* Total Qty */}
              <Card className="w-[180px] shrink-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
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
                    Total barang dikirim
                  </p>
                </CardContent>
              </Card>

              {/* Total Nilai */}
              <Card className="w-[180px] shrink-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
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
                    Nilai total transaksi
                  </p>
                </CardContent>
              </Card>

              {/* Dropship */}
              <Card className="w-[180px] shrink-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Dropship
                  </CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {statistics.dropshipCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Transaksi dropship
                  </p>
                </CardContent>
              </Card>

              {/* Dibatalkan */}
              <Card className="w-[180px] shrink-0 transition-all duration-200 hover:scale-[1.02] hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Dibatalkan
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {statistics.cancelledCount}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Transaksi dibatalkan
                  </p>
                </CardContent>
              </Card>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="mr-2 h-4 w-4" />
                Filter & Pencarian
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
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
                  value={selectedGudang || undefined}
                  onValueChange={(value) =>
                    setSelectedGudang(value === "all" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Gudang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Gudang</SelectItem>
                    {gudangs.map((gudang) => (
                      <SelectItem key={gudang.id} value={gudang.id}>
                        {gudang.kode} - {gudang.nama}
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
                    <SelectItem value="in_transit">Dalam Pengiriman</SelectItem>
                    <SelectItem value="delivered">Terkirim</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>

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

                <Button variant="outline" onClick={clearFilters}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Transaksi Surat Jalan</CardTitle>
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
                          <TableHead>No SJ</TableHead>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Gudang</TableHead>
                          <TableHead>Total Qty</TableHead>
                          <TableHead>Total Nilai</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Dropship</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {suratJalans.map((suratJalan) => (
                          <TableRow key={suratJalan.id}>
                            <TableCell className="font-medium">
                              {suratJalan.noSJ}
                            </TableCell>
                            <TableCell>
                              {formatDate(suratJalan.tanggal)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {suratJalan.customer.nama}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {suratJalan.customer.kode}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {suratJalan.gudang.nama}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {suratJalan.gudang.kode}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{suratJalan.totalQty}</TableCell>
                            <TableCell>
                              {formatCurrency(Number(suratJalan.totalNilai))}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(suratJalan.status)}
                            </TableCell>
                            <TableCell>
                              {suratJalan.detail.some((d) => d.isDropship) ? (
                                <Badge variant="outline">
                                  <ShoppingCart className="w-3 h-3 mr-1" />
                                  {
                                    suratJalan.detail.filter(
                                      (d) => d.isDropship
                                    ).length
                                  }{" "}
                                  Item
                                </Badge>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
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
                                    onClick={() => handleView(suratJalan)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Detail
                                  </DropdownMenuItem>
                                  {suratJalan.status === "draft" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleEdit(suratJalan)}
                                      >
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleCheckStock(suratJalan)
                                        }
                                      >
                                        <Search className="mr-2 h-4 w-4" />
                                        Cek Stok
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handlePost(suratJalan)}
                                        className="text-green-600"
                                        disabled={submitting}
                                      >
                                        <Send className="mr-2 h-4 w-4" />
                                        {submitting ? "Posting..." : "Post"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleDelete(suratJalan)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Hapus
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {suratJalan.status === "in_transit" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleDeliver(suratJalan)
                                        }
                                      >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Tandai Selesai
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setViewingSuratJalan(suratJalan);
                                          setTimeout(() => {
                                            if (printRef.current) {
                                              printRef.current.print();
                                            }
                                          }, 100);
                                        }}
                                      >
                                        <Printer className="mr-2 h-4 w-4" />
                                        Cetak
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  {suratJalan.status === "delivered" && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setViewingSuratJalan(suratJalan);
                                        setTimeout(() => {
                                          if (printRef.current) {
                                            printRef.current.print();
                                          }
                                        }, 100);
                                      }}
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

                  {suratJalans.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Package className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Belum ada transaksi Surat Jalan
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Mulai dengan membuat transaksi Surat Jalan pertama
                      </p>
                      <Button onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Surat Jalan Baru
                      </Button>
                    </div>
                  )}

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Menampilkan {suratJalans.length} dari {pagination.total}{" "}
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
        </TabsContent>

        <TabsContent value="input" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Transaksi Surat Jalan Baru</CardTitle>
              <CardDescription>
                Buat transaksi pengiriman barang ke customer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6">
                  {/* Customer and Warehouse Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="customerId-input">Customer</Label>
                      <Select
                        value={watchedValues.customerId}
                        onValueChange={(value) => handleCustomerChange(value)}
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
                      <Label htmlFor="gudangId-input">Gudang</Label>
                      <Select
                        value={watchedValues.gudangId}
                        onValueChange={(value) => setValue("gudangId", value)}
                        disabled={submitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Gudang" />
                        </SelectTrigger>
                        <SelectContent>
                          {gudangs.map((gudang) => (
                            <SelectItem key={gudang.id} value={gudang.id}>
                              {gudang.kode} - {gudang.nama}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.gudangId && (
                        <p className="text-sm text-red-600">
                          {errors.gudangId.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shipping Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="tanggal-input">Tanggal</Label>
                      <Input
                        id="tanggal-input"
                        type="date"
                        {...register("tanggal", { valueAsDate: true })}
                        disabled={submitting}
                      />
                      {errors.tanggal && (
                        <p className="text-sm text-red-600">
                          {errors.tanggal.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="alamatKirim-input">Alamat Kirim</Label>
                      <Input
                        id="alamatKirim-input"
                        {...register("alamatKirim")}
                        placeholder="Alamat tujuan pengiriman"
                        disabled={submitting}
                      />
                      {errors.alamatKirim && (
                        <p className="text-sm text-red-600">
                          {errors.alamatKirim.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="namaSupir-input">Nama Supir</Label>
                      <Input
                        id="namaSupir-input"
                        {...register("namaSupir")}
                        placeholder="Nama supir pengirim"
                        disabled={submitting}
                      />
                      {errors.namaSupir && (
                        <p className="text-sm text-red-600">
                          {errors.namaSupir.message}
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nopolKendaraan-input">
                        No Pol Kendaraan
                      </Label>
                      <Input
                        id="nopolKendaraan-input"
                        {...register("nopolKendaraan")}
                        placeholder="Nomor polisi kendaraan"
                        disabled={submitting}
                      />
                      {errors.nopolKendaraan && (
                        <p className="text-sm text-red-600">
                          {errors.nopolKendaraan.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="keterangan-input">Keterangan</Label>
                    <Textarea
                      id="keterangan-input"
                      {...register("keterangan")}
                      placeholder="Opsional"
                      disabled={submitting}
                    />
                    {errors.keterangan && (
                      <p className="text-sm text-red-600">
                        {errors.keterangan.message}
                      </p>
                    )}
                  </div>

                  {/* Delivery Option */}
                  <div className="grid gap-2">
                    <Label>Opsi Pengiriman</Label>
                    <Select
                      value={deliveryOption}
                      onValueChange={(value: "partial" | "complete") =>
                        setDeliveryOption(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="complete">
                          Kirim Lengkap (tunggu semua barang ready)
                        </SelectItem>
                        <SelectItem value="partial">
                          Kirim Partial (kirim barang ready terlebih dahulu)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      {deliveryOption === "complete"
                        ? "Semua barang harus ready (termasuk dropship) sebelum dikirim"
                        : "Barang yang ready akan dikirim terlebih dahulu, sisanya menyusul"}
                    </p>
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
                          className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3"
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
                              value={item.hargaJual}
                              onChange={(e) =>
                                updateItem(index, "hargaJual", e.target.value)
                              }
                              disabled={submitting}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Nama Alias (Optional)</Label>
                            <Input
                              placeholder="Nama custom untuk customer"
                              value={item.namaAlias || ""}
                              onChange={(e) =>
                                updateItem(index, "namaAlias", e.target.value)
                              }
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
                          <div className="col-span-2">
                            <Label>Keterangan</Label>
                            <Input
                              value={item.keterangan || ""}
                              onChange={(e) =>
                                updateItem(index, "keterangan", e.target.value)
                              }
                              placeholder="Opsional"
                              disabled={submitting}
                            />
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
                      <span className="text-lg font-semibold">
                        Grand Total:
                      </span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(calculateGrandTotal())}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset({
                        ...defaultSuratJalanFormValues,
                        tanggal: new Date(),
                      });
                      setItems([
                        { barangId: "", qty: 1, hargaJual: 0, keterangan: "" },
                      ]);
                      setDeliveryOption("complete");
                    }}
                    disabled={submitting}
                  >
                    Reset
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Menyimpan..." : "Simpan Transaksi"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSuratJalan ? "Edit Surat Jalan" : "Surat Jalan Baru"}
            </DialogTitle>
            <DialogDescription>
              {editingSuratJalan
                ? "Edit informasi transaksi Surat Jalan yang sudah ada."
                : "Buat transaksi Surat Jalan baru untuk mengirim barang ke customer."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-6 py-4">
              {/* Customer and Warehouse Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerId">Customer</Label>
                  <Select
                    value={watchedValues.customerId}
                    onValueChange={(value) => handleCustomerChange(value)}
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
                  <Label htmlFor="gudangId">Gudang</Label>
                  <Select
                    value={watchedValues.gudangId}
                    onValueChange={(value) => setValue("gudangId", value)}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Gudang" />
                    </SelectTrigger>
                    <SelectContent>
                      {gudangs.map((gudang) => (
                        <SelectItem key={gudang.id} value={gudang.id}>
                          {gudang.kode} - {gudang.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.gudangId && (
                    <p className="text-sm text-red-600">
                      {errors.gudangId.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Shipping Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="tanggal">Tanggal</Label>
                  <Input
                    id="tanggal"
                    type="date"
                    {...register("tanggal", { valueAsDate: true })}
                    disabled={submitting}
                  />
                  {errors.tanggal && (
                    <p className="text-sm text-red-600">
                      {errors.tanggal.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="alamatKirim">Alamat Kirim</Label>
                  <Input
                    id="alamatKirim"
                    {...register("alamatKirim")}
                    placeholder="Alamat tujuan pengiriman"
                    disabled={submitting}
                  />
                  {errors.alamatKirim && (
                    <p className="text-sm text-red-600">
                      {errors.alamatKirim.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="namaSupir">Nama Supir</Label>
                  <Input
                    id="namaSupir"
                    {...register("namaSupir")}
                    placeholder="Nama supir pengirim"
                    disabled={submitting}
                  />
                  {errors.namaSupir && (
                    <p className="text-sm text-red-600">
                      {errors.namaSupir.message}
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nopolKendaraan">No Pol Kendaraan</Label>
                  <Input
                    id="nopolKendaraan"
                    {...register("nopolKendaraan")}
                    placeholder="Nomor polisi kendaraan"
                    disabled={submitting}
                  />
                  {errors.nopolKendaraan && (
                    <p className="text-sm text-red-600">
                      {errors.nopolKendaraan.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="keterangan">Keterangan</Label>
                <Textarea
                  id="keterangan"
                  {...register("keterangan")}
                  placeholder="Opsional"
                  disabled={submitting}
                />
                {errors.keterangan && (
                  <p className="text-sm text-red-600">
                    {errors.keterangan.message}
                  </p>
                )}
              </div>

              {/* Delivery Option */}
              <div className="grid gap-2">
                <Label>Opsi Pengiriman</Label>
                <Select
                  value={deliveryOption}
                  onValueChange={(value: "partial" | "complete") =>
                    setDeliveryOption(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complete">
                      Kirim Lengkap (tunggu semua barang ready)
                    </SelectItem>
                    <SelectItem value="partial">
                      Kirim Partial (kirim barang ready terlebih dahulu)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {deliveryOption === "complete"
                    ? "Semua barang harus ready (termasuk dropship) sebelum dikirim"
                    : "Barang yang ready akan dikirim terlebih dahulu, sisanya menyusul"}
                </p>
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
                      className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3"
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
                          value={item.hargaJual}
                          onChange={(e) =>
                            updateItem(index, "hargaJual", e.target.value)
                          }
                          disabled={submitting}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Nama Alias (Optional)</Label>
                        <Input
                          placeholder="Nama custom untuk customer"
                          value={item.namaAlias || ""}
                          onChange={(e) =>
                            updateItem(index, "namaAlias", e.target.value)
                          }
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
                      <div className="col-span-2">
                        <Label>Keterangan</Label>
                        <Input
                          value={item.keterangan || ""}
                          onChange={(e) =>
                            updateItem(index, "keterangan", e.target.value)
                          }
                          placeholder="Opsional"
                          disabled={submitting}
                        />
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
                  <span className="text-xl font-bold text-green-600">
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
                  : editingSuratJalan
                    ? "Perbarui"
                    : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Surat Jalan</DialogTitle>
            <DialogDescription>
              Informasi lengkap transaksi Surat Jalan
            </DialogDescription>
          </DialogHeader>
          {viewingSuratJalan && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informasi Transaksi</TabsTrigger>
                <TabsTrigger value="items">Detail Barang</TabsTrigger>
                <TabsTrigger value="dropship">Dropship Info</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>No SJ</Label>
                    <p className="font-medium">{viewingSuratJalan.noSJ}</p>
                  </div>
                  <div>
                    <Label>Tanggal</Label>
                    <p className="font-medium">
                      {formatDate(viewingSuratJalan.tanggal)}
                    </p>
                  </div>
                  <div>
                    <Label>Customer</Label>
                    <p className="font-medium">
                      {viewingSuratJalan.customer.kode} -{" "}
                      {viewingSuratJalan.customer.nama}
                    </p>
                  </div>
                  <div>
                    <Label>Gudang</Label>
                    <p className="font-medium">
                      {viewingSuratJalan.gudang.kode} -{" "}
                      {viewingSuratJalan.gudang.nama}
                    </p>
                  </div>
                  <div>
                    <Label>Total Qty</Label>
                    <p className="font-medium">
                      {viewingSuratJalan.totalQty} unit
                    </p>
                  </div>
                  <div>
                    <Label>Total Nilai</Label>
                    <p className="font-medium">
                      {formatCurrency(Number(viewingSuratJalan.totalNilai))}
                    </p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(viewingSuratJalan.status)}
                    </div>
                  </div>
                  <div>
                    <Label>Alamat Kirim</Label>
                    <p className="font-medium text-sm">
                      {viewingSuratJalan.alamatKirim}
                    </p>
                  </div>
                  <div>
                    <Label>Nama Supir</Label>
                    <p className="font-medium">{viewingSuratJalan.namaSupir}</p>
                  </div>
                  <div>
                    <Label>No Pol Kendaraan</Label>
                    <p className="font-medium">
                      {viewingSuratJalan.nopolKendaraan}
                    </p>
                  </div>
                  {viewingSuratJalan.keterangan && (
                    <div className="col-span-2">
                      <Label>Keterangan</Label>
                      <p className="font-medium">
                        {viewingSuratJalan.keterangan}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>Dibuat Tanggal</Label>
                    <p className="font-medium">
                      {formatDate(viewingSuratJalan.createdAt)}
                    </p>
                  </div>
                  <div>
                    <Label>Terakhir Diubah</Label>
                    <p className="font-medium">
                      {formatDate(viewingSuratJalan.updatedAt)}
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
                        <TableHead>Stok Saat Ini</TableHead>
                        <TableHead>Dropship</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingSuratJalan.detail.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.barang.kode}</TableCell>
                          <TableCell>{item.barang.nama}</TableCell>
                          <TableCell>
                            {item.qty} {item.barang.satuan}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(Number(item.hargaJual))}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(Number(item.subtotal))}
                          </TableCell>
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
                          <TableCell>
                            {getDropshipBadge(
                              item.isDropship,
                              item.statusDropship
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <tfoot>
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-right font-semibold"
                        >
                          Total:
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(Number(viewingSuratJalan.totalNilai))}
                        </TableCell>
                        <TableCell colSpan={2}></TableCell>
                      </TableRow>
                    </tfoot>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="dropship" className="space-y-4">
                {viewingSuratJalan.dropshipSummary && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Total Item</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {viewingSuratJalan.dropshipSummary.totalItems}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Normal Item</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {viewingSuratJalan.dropshipSummary.normalItems}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Dropship Item</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                          {viewingSuratJalan.dropshipSummary.dropshipItems}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Ready to Ship</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {viewingSuratJalan.dropshipSummary.readyItems}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <div className="space-y-2">
                  {viewingSuratJalan.detail
                    .filter((item) => item.isDropship)
                    .map((item) => (
                      <Alert key={item.id}>
                        <ShoppingCart className="h-4 w-4" />
                        <AlertTitle>
                          Dropship Item: {item.barang.nama}
                        </AlertTitle>
                        <AlertDescription>
                          <div className="space-y-1">
                            <p>
                              Supplier:{" "}
                              {item.dropshipSupplier?.nama ||
                                "Tidak ada supplier"}
                            </p>
                            <p>Status: {item.statusDropship || "Pending"}</p>
                            <p>
                              Qty: {item.qty} {item.barang.satuan}
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}

                  {viewingSuratJalan.detail.filter((item) => item.isDropship)
                    .length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2" />
                      <p>Tidak ada item dropship dalam transaksi ini</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter>
            {viewingSuratJalan && viewingSuratJalan.status === "in_transit" && (
              <Button onClick={() => handleDeliver(viewingSuratJalan)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Tandai Selesai
              </Button>
            )}
            {viewingSuratJalan && viewingSuratJalan.status !== "draft" && (
              <Button
                variant="outline"
                onClick={() => {
                  if (printRef.current) {
                    printRef.current.print();
                  }
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Cetak
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Check Dialog */}
      <Dialog
        open={stockCheckDialogOpen}
        onOpenChange={setStockCheckDialogOpen}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hasil Cek Stok</DialogTitle>
            <DialogDescription>
              Analisis ketersediaan stok dan kebutuhan dropship
            </DialogDescription>
          </DialogHeader>
          {stockCheckResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Item</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stockCheckResult.summary.totalItems}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Stok Cukup</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {stockCheckResult.summary.sufficientStockItems}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Perlu Dropship</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {stockCheckResult.summary.needsDropshipItems}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">
                      Tidak Dapat Dipenuhi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {stockCheckResult.summary.cannotFulfillItems}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Overall Status */}
              <Alert>
                {stockCheckResult.canPost ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {stockCheckResult.canPost
                    ? "Bisa Diposting"
                    : "Tidak Bisa Diposting"}
                </AlertTitle>
                <AlertDescription>
                  {stockCheckResult.postMessage}
                </AlertDescription>
              </Alert>

              {/* Items Detail */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barang</TableHead>
                      <TableHead>Dibutuhkan</TableHead>
                      <TableHead>Stok Saat Ini</TableHead>
                      <TableHead>Status Stok</TableHead>
                      <TableHead>Dropship</TableHead>
                      <TableHead>Rekomendasi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockCheckResult.items.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {item.barang.nama}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.barang.kode}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.requestedQty} {item.barang.satuan}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-medium ${
                              item.currentStock > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {item.currentStock} {item.barang.satuan}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.stockStatus === "sufficient"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {item.stockStatus === "sufficient"
                              ? "Cukup"
                              : "Tidak Cukup"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.isCurrentlyDropship ? (
                            <Badge variant="outline">
                              <ShoppingCart className="w-3 h-3 mr-1" />
                              {item.dropshipStatus}
                            </Badge>
                          ) : item.needsDropship ? (
                            <Badge variant="secondary">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Perlu Dropship
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.recommendations.map(
                            (rec: any, recIndex: number) => (
                              <div key={recIndex} className="text-sm">
                                <Badge
                                  variant={
                                    rec.type === "error"
                                      ? "destructive"
                                      : rec.type === "warning"
                                        ? "secondary"
                                        : "default"
                                  }
                                >
                                  {rec.message}
                                </Badge>
                              </div>
                            )
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Warnings */}
              {stockCheckResult.warnings.lowStockItems.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Peringatan Stok Rendah</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-1">
                      {stockCheckResult.warnings.lowStockItems.map(
                        (item: any, index: number) => (
                          <p key={index}>
                            {item.barangName}: {item.currentStock} unit
                            (minimum: {item.minStock} unit)
                          </p>
                        )
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Rekomendasi Aksi:
                </Label>
                {stockCheckResult.actions.map((action: any, index: number) => (
                  <Alert key={index}>
                    {action.type === "primary" && <Send className="h-4 w-4" />}
                    {action.type === "secondary" && (
                      <Info className="h-4 w-4" />
                    )}
                    {action.type === "warning" && (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertTitle>{action.label}</AlertTitle>
                    <AlertDescription>
                      {action.description}
                      {action.note && (
                        <p className="text-sm mt-1">Catatan: {action.note}</p>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStockCheckDialogOpen(false)}
            >
              Tutup
            </Button>
            {stockCheckResult && stockCheckResult.canPost && (
              <Button
                onClick={() => {
                  handlePost(viewingSuratJalan!);
                  setStockCheckDialogOpen(false);
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                Posting Surat Jalan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Component - Only rendered when there's selected data */}
      {viewingSuratJalan && (
        <div style={{ display: "none" }}>
          <SuratJalanPrint
            ref={printRef}
            data={viewingSuratJalan}
            onPrintComplete={() => {
              toast.success("Surat Jalan berhasil dicetak");
            }}
          />
        </div>
      )}
    </div>
  );
}
