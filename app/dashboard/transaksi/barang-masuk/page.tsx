"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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
} from "lucide-react";
import { toast } from "sonner";
import { BarangMasukFormData, barangMasukSchema } from "@/lib/validations";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tooltip,
} from "@/components/ui/tooltip";
import BarangMasukPrint, {
  BarangMasukPrintRef,
} from "@/components/print/barang-masuk-print";

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
  gudangId: string;
  gudang: {
    id: string;
    kode: string;
    nama: string;
  };
  totalQty: number;
  totalNilai: number;
  keterangan?: string;
  status: "draft" | "posted" | "cancelled";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  detail: Array<{
    id: string;
    barangId: string;
    barang: {
      id: string;
      kode: string;
      nama: string;
      satuan: string;
    };
    qty: number;
    harga: number;
    subtotal: number;
    currentStock?: number;
  }>;
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
  hargaBeli: number;
  hargaJual: number;
  aktif: boolean;
}

interface BarangMasukStatistics {
  totalTransactions: number;
  draftCount: number;
  postedCount: number;
  cancelledCount: number;
  totalValue: number;
  totalQuantity: number;
}

interface FormData {
  barangId: string;
  qty: number;
  harga: number;
}

type BarangMasukFormValues = z.input<typeof barangMasukSchema>;
const defaultBarangMasukFormValues: BarangMasukFormValues = {
  noDokumen: "",
  tanggal: new Date(),
  supplierId: "",
  gudangId: "",
  keterangan: "",
  items: [],
};

export default function BarangMasukPage() {
  const [barangMasuks, setBarangMasuks] = useState<BarangMasuk[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [gudangs, setGudangs] = useState<Gudang[]>([]);
  const [barangs, setBarangs] = useState<Barang[]>([]);
  const [statistics, setStatistics] = useState<BarangMasukStatistics>({
    totalTransactions: 0,
    draftCount: 0,
    postedCount: 0,
    cancelledCount: 0,
    totalValue: 0,
    totalQuantity: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedGudang, setSelectedGudang] = useState("");
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
  const [editingBarangMasuk, setEditingBarangMasuk] =
    useState<BarangMasuk | null>(null);
  const [viewingBarangMasuk, setViewingBarangMasuk] =
    useState<BarangMasuk | null>(null);
  const [items, setItems] = useState<FormData[]>([
    { barangId: "", qty: 1, harga: 0 },
  ]);
  const printRef = useRef<BarangMasukPrintRef>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<BarangMasukFormValues>({
    resolver: zodResolver(barangMasukSchema),
    defaultValues: defaultBarangMasukFormValues,
  });

  const watchedValues = watch();

  // Fetch master data
  const fetchMasterData = async () => {
    try {
      const [suppliersRes, gudangsRes, barangsRes] = await Promise.all([
        fetch("/api/master/supplier?limit=100"),
        fetch("/api/master/gudang?limit=100"),
        fetch("/api/master/barang?limit=100&aktif=true"),
      ]);

      const [suppliersData, gudangsData, barangsData] = await Promise.all([
        suppliersRes.json(),
        gudangsRes.json(),
        barangsRes.json(),
      ]);

      if (suppliersData.success) setSuppliers(suppliersData.data);
      if (gudangsData.success) setGudangs(gudangsData.data);
      if (barangsData.success) setBarangs(barangsData.data);
    } catch (error) {
      console.error("Error fetching master data:", error);
      toast.error("Gagal mengambil data master");
    }
  };

  // Fetch Barang Masuk transactions
  const fetchBarangMasuks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      });

      if (selectedSupplier) params.append("supplierId", selectedSupplier);
      if (selectedGudang) params.append("gudangId", selectedGudang);
      if (selectedStatus) params.append("status", selectedStatus);
      if (startDate)
        params.append("startDate", format(startDate, "yyyy-MM-dd"));
      if (endDate) params.append("endDate", format(endDate, "yyyy-MM-dd"));

      const response = await fetch(`/api/transaksi/barang-masuk?${params}`);
      const result = await response.json();

      if (result.success) {
        setBarangMasuks(result.data);
        setPagination(result.pagination);
        setStatistics(result.statistics);
      } else {
        toast.error("Gagal mengambil data Barang Masuk");
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
    fetchBarangMasuks();
  }, [
    pagination.page,
    search,
    selectedSupplier,
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
          harga: Number(item.harga) || 0,
        }))
    );
  }, [items, setValue]);

  const onSubmit = async (data: BarangMasukFormValues) => {
    // Update items in form data before submission
    const validItems = items
      .filter((item) => item.barangId)
      .map((item) => ({
        barangId: item.barangId,
        qty: Number(item.qty) || 0,
        harga: Number(item.harga) || 0,
      }));

    if (validItems.length === 0) {
      toast.error("Minimal harus ada 1 item yang valid");
      return;
    }

    // Validate required fields
    if (!data.supplierId) {
      toast.error("Supplier wajib dipilih");
      return;
    }
    if (!data.gudangId) {
      toast.error("Gudang wajib dipilih");
      return;
    }

    setSubmitting(true);
    try {
      // Prepare payload - convert Date to ISO string for API
      const tanggalValue =
        data.tanggal instanceof Date
          ? data.tanggal.toISOString()
          : data.tanggal || new Date().toISOString();

      const payload = {
        ...data,
        tanggal: tanggalValue,
        items: validItems,
      };

      // Schema will use z.coerce.date() to convert string to Date on backend
      const validatedPayload = barangMasukSchema.parse(payload);

      // Ensure tanggal is sent as ISO string (not Date object)
      const jsonPayload = {
        ...validatedPayload,
        tanggal:
          validatedPayload.tanggal instanceof Date
            ? validatedPayload.tanggal.toISOString()
            : tanggalValue,
      };

      console.log("Payload being sent:", JSON.stringify(jsonPayload, null, 2));

      const url = editingBarangMasuk
        ? `/api/transaksi/barang-masuk/${editingBarangMasuk.id}`
        : "/api/transaksi/barang-masuk";
      const method = editingBarangMasuk ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonPayload),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error("Failed to parse response:", parseError);
        toast.error(`Error: ${response.status} ${response.statusText}`);
        setSubmitting(false);
        return;
      }

      // Handle non-OK status codes
      if (!response.ok) {
        console.error("Response not OK:", response.status, result);
        let errorMessage =
          result.error || result.message || "Gagal menyimpan data";
        if (result.details && Array.isArray(result.details)) {
          const detailMessages = result.details
            .map((d: any) => `${d.path ? d.path + ": " : ""}${d.message}`)
            .join(", ");
          errorMessage = `Validasi gagal: ${detailMessages}`;
        }
        toast.error(errorMessage);
        setSubmitting(false);
        return;
      }

      if (result.success) {
        toast.success(
          editingBarangMasuk
            ? "Barang Masuk berhasil diperbarui"
            : "Barang Masuk berhasil dibuat"
        );
        if (editingBarangMasuk) {
          setDialogOpen(false);
          setEditingBarangMasuk(null);
        }
        reset({
          ...defaultBarangMasukFormValues,
          tanggal: new Date(),
        });
        setItems([{ barangId: "", qty: 1, harga: 0 }]);
        fetchBarangMasuks();
      } else {
        // Handle detailed error messages
        let errorMessage =
          result.error || result.message || "Gagal menyimpan data";
        if (result.details && Array.isArray(result.details)) {
          const detailMessages = result.details
            .map((d: any) => `${d.path ? d.path + ": " : ""}${d.message}`)
            .join(", ");
          errorMessage = `Validasi gagal: ${detailMessages}`;
        }
        toast.error(errorMessage);
        console.error("Error response:", result);
      }
    } catch (error: any) {
      console.error("Error submitting form:", error);
      if (error?.errors) {
        const errorMessages = error.errors
          .map((e: any) => e.message)
          .join(", ");
        toast.error(`Validasi gagal: ${errorMessages}`);
      } else if (error?.issues) {
        const errorMessages = error.issues
          .map((e: any) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        toast.error(`Validasi gagal: ${errorMessages}`);
      } else {
        toast.error(error.message || "Terjadi kesalahan saat menyimpan data");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async (barangMasuk: BarangMasuk) => {
    try {
      const response = await fetch(
        `/api/transaksi/barang-masuk/${barangMasuk.id}/post`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Barang Masuk berhasil diposting dan stok diperbarui");
        fetchBarangMasuks();
      } else {
        toast.error(result.error || "Gagal memposting transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat memposting transaksi");
    }
  };

  const handleEdit = (barangMasuk: BarangMasuk) => {
    if (barangMasuk.status !== "draft") {
      toast.error("Hanya transaksi dengan status draft yang bisa diedit");
      return;
    }

    setEditingBarangMasuk(barangMasuk);
    setValue("supplierId", barangMasuk.supplierId);
    setValue("gudangId", barangMasuk.gudangId);
    setValue("tanggal", new Date(barangMasuk.tanggal));
    setValue("keterangan", barangMasuk.keterangan ?? "");
    setValue("noDokumen", barangMasuk.noDokumen ?? "");

    const formItems = barangMasuk.detail.map((detail) => ({
      barangId: detail.barangId,
      qty: detail.qty,
      harga: Number(detail.harga),
    }));
    setItems(formItems);

    setDialogOpen(true);
  };

  const handleView = async (barangMasuk: BarangMasuk) => {
    try {
      const response = await fetch(
        `/api/transaksi/barang-masuk/${barangMasuk.id}`
      );
      const result = await response.json();

      if (result.success) {
        setViewingBarangMasuk(result.data);
        setViewDialogOpen(true);
      } else {
        toast.error("Gagal mengambil detail transaksi");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat mengambil detail");
    }
  };

  const handleDelete = async (barangMasuk: BarangMasuk) => {
    if (barangMasuk.status !== "draft") {
      toast.error("Hanya transaksi dengan status draft yang bisa dihapus");
      return;
    }

    if (
      !confirm(
        `Apakah Anda yakin ingin menghapus transaksi "${barangMasuk.noDokumen}"?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/transaksi/barang-masuk/${barangMasuk.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Barang Masuk berhasil dihapus");
        fetchBarangMasuks();
      } else {
        toast.error(result.error || "Gagal menghapus Barang Masuk");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan saat menghapus Barang Masuk");
    }
  };

  const openAddDialog = () => {
    setEditingBarangMasuk(null);
    reset({
      ...defaultBarangMasukFormValues,
      tanggal: new Date(),
    });
    setItems([{ barangId: "", qty: 1, harga: 0 }]);
    setDialogOpen(true);
  };

  const addItem = () => {
    setItems([...items, { barangId: "", qty: 1, harga: 0 }]);
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
        harga: barang?.hargaBeli || 0,
      };
    } else {
      newItems[index] = {
        ...newItems[index],
        [field]: field === "qty" || field === "harga" ? Number(value) : value,
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
      case "posted":
        return (
          <Badge variant="default">
            <CheckCircle className="w-3 h-3 mr-1" />
            Posted
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const clearFilters = () => {
    setSelectedSupplier("");
    setSelectedGudang("");
    setSelectedStatus("");
    setStartDate(undefined);
    setEndDate(undefined);
    setSearch("");
  };

  const handlePrint = (barangMasuk: BarangMasuk) => {
    if (barangMasuk.status !== "posted") {
      toast.error("Hanya transaksi yang sudah diposting yang bisa dicetak");
      return;
    }

    // Update viewing data if needed and trigger print
    if (!viewingBarangMasuk || viewingBarangMasuk.id !== barangMasuk.id) {
      setViewingBarangMasuk(barangMasuk);
    }

    // Trigger print via ref after a small delay to ensure component is updated
    setTimeout(() => {
      printRef.current?.print();
    }, 100);
  };

  return (
    <div className="space-y-6">
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
          <Card className="flex-1 min-w-0">
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
              <p className="text-xs text-muted-foreground">Semua transaksi</p>
            </CardContent>
          </Card>

          {/* Draft */}
          <Card className="flex-1 min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.draftCount}
              </div>
              <p className="text-xs text-muted-foreground">Menunggu posting</p>
            </CardContent>
          </Card>

          {/* Posted */}
          <Card className="flex-1 min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statistics.postedCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Stok sudah diperbarui
              </p>
            </CardContent>
          </Card>

          {/* Total Qty */}
          <Card className="flex-1 min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Qty</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.totalQuantity}
              </div>
              <p className="text-xs text-muted-foreground">
                Total barang diterima
              </p>
            </CardContent>
          </Card>

          {/* Total Nilai */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="flex-1 min-w-0">
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
              </TooltipTrigger>

              <TooltipContent side="top" className="text-sm">
                {formatCurrency(statistics.totalValue)}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Cancelled */}
          <Card className="flex-1 min-w-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
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
                    disabled={(date) => (startDate ? date < startDate : false)}
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
          <CardTitle>Daftar Transaksi Barang Masuk</CardTitle>
          <div className="flex justify-between items-center">
            <CardDescription>
              Total {pagination.total} transaksi terdaftar
            </CardDescription>

            <Button
              onClick={openAddDialog}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Input Barang Masuk Baru
            </Button>
          </div>
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
                      <TableHead>No Dokumen</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Gudang</TableHead>
                      <TableHead>Total Qty</TableHead>
                      <TableHead>Total Nilai</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {barangMasuks.map((barangMasuk) => (
                      <TableRow key={barangMasuk.id}>
                        <TableCell className="font-medium">
                          {barangMasuk.noDokumen}
                        </TableCell>
                        <TableCell>{formatDate(barangMasuk.tanggal)}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {barangMasuk.supplier.nama}
                            </div>
                            <div className="text-sm text-gray-500">
                              {barangMasuk.supplier.kode}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {barangMasuk.gudang.nama}
                            </div>
                            <div className="text-sm text-gray-500">
                              {barangMasuk.gudang.kode}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{barangMasuk.totalQty}</TableCell>
                        <TableCell>
                          {formatCurrency(Number(barangMasuk.totalNilai))}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(barangMasuk.status)}
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
                                onClick={() => handleView(barangMasuk)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Detail
                              </DropdownMenuItem>
                              {barangMasuk.status === "draft" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleEdit(barangMasuk)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handlePost(barangMasuk)}
                                    className="text-green-600"
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    Post
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(barangMasuk)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus
                                  </DropdownMenuItem>
                                </>
                              )}
                              {barangMasuk.status === "posted" && (
                                <DropdownMenuItem
                                  onClick={() => handlePrint(barangMasuk)}
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

              {barangMasuks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Belum ada transaksi Barang Masuk
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Mulai dengan membuat transaksi Barang Masuk pertama
                  </p>
                  <Button
                    onClick={openAddDialog}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Input Barang Masuk Baru
                  </Button>
                </div>
              )}

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Menampilkan {barangMasuks.length} dari {pagination.total}{" "}
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
        <DialogContent className="!w-[90vw] !h-[90vh] !max-w-none !max-h-none overflow-y-auto rounded-xl p-0">
          {/* Header sticky biar tetap kelihatan */}
          <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {editingBarangMasuk
                  ? "Edit Barang Masuk"
                  : "Input Barang Masuk Baru"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {editingBarangMasuk
                  ? "Edit informasi transaksi Barang Masuk yang sudah ada."
                  : "Buat transaksi Barang Masuk baru untuk menerima barang dari supplier."}
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Body */}
          <div className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Grid utama */}
              <div className="grid grid-cols-2 gap-6">
                {/* Supplier */}
                <div className="grid gap-2">
                  <Label>Supplier</Label>
                  <Select
                    value={watchedValues.supplierId}
                    onValueChange={(v) => setValue("supplierId", v)}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.kode} – {s.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gudang */}
                <div className="grid gap-2">
                  <Label>Gudang</Label>
                  <Select
                    value={watchedValues.gudangId}
                    onValueChange={(v) => setValue("gudangId", v)}
                    disabled={submitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Gudang" />
                    </SelectTrigger>
                    <SelectContent>
                      {gudangs.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.kode} – {g.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Grid kedua */}
              <div className="grid grid-cols-2 gap-6">
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
                </div>

                <div className="grid gap-2">
                  <Label>Keterangan</Label>
                  <Input
                    {...register("keterangan")}
                    placeholder="Opsional"
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Detail Barang */}
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
                    <Plus className="mr-1 h-4 w-4" />
                    Tambah Item
                  </Button>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-3 items-end"
                    >
                      <div className="col-span-5">
                        <Label>Barang</Label>
                        <Select
                          value={item.barangId}
                          onValueChange={(v) =>
                            updateItem(index, "barangId", v)
                          }
                          disabled={submitting}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Barang" />
                          </SelectTrigger>
                          <SelectContent>
                            {barangs.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.kode} – {b.nama}
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
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Subtotal</Label>
                        <div className="flex h-10 items-center rounded-md border px-3 bg-muted/30">
                          <span className="text-sm font-medium">
                            {formatCurrency(calculateSubtotal(item))}
                          </span>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grand Total */}
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold">Grand Total:</span>
                <span className="text-xl font-bold text-green-600">
                  {formatCurrency(calculateGrandTotal())}
                </span>
              </div>
            </form>
          </div>

          {/* Footer sticky */}
          <div className="sticky bottom-0 border-t bg-background/80 backdrop-blur p-4 flex justify-end gap-3">
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
                : editingBarangMasuk
                  ? "Perbarui"
                  : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Barang Masuk</DialogTitle>
            <DialogDescription>
              Informasi lengkap transaksi Barang Masuk
            </DialogDescription>
          </DialogHeader>
          {viewingBarangMasuk && (
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informasi Transaksi</TabsTrigger>
                <TabsTrigger value="items">Detail Barang</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>No Dokumen</Label>
                    <p className="font-medium">
                      {viewingBarangMasuk.noDokumen}
                    </p>
                  </div>
                  <div>
                    <Label>Tanggal</Label>
                    <p className="font-medium">
                      {formatDate(viewingBarangMasuk.tanggal)}
                    </p>
                  </div>
                  <div>
                    <Label>Supplier</Label>
                    <p className="font-medium">
                      {viewingBarangMasuk.supplier.kode} -{" "}
                      {viewingBarangMasuk.supplier.nama}
                    </p>
                  </div>
                  <div>
                    <Label>Gudang</Label>
                    <p className="font-medium">
                      {viewingBarangMasuk.gudang.kode} -{" "}
                      {viewingBarangMasuk.gudang.nama}
                    </p>
                  </div>
                  <div>
                    <Label>Total Qty</Label>
                    <p className="font-medium">
                      {viewingBarangMasuk.totalQty} unit
                    </p>
                  </div>
                  <div>
                    <Label>Total Nilai</Label>
                    <p className="font-medium">
                      {formatCurrency(Number(viewingBarangMasuk.totalNilai))}
                    </p>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(viewingBarangMasuk.status)}
                    </div>
                  </div>
                  {viewingBarangMasuk.keterangan && (
                    <div className="col-span-2">
                      <Label>Keterangan</Label>
                      <p className="font-medium">
                        {viewingBarangMasuk.keterangan}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label>Dibuat Tanggal</Label>
                    <p className="font-medium">
                      {formatDate(viewingBarangMasuk.createdAt)}
                    </p>
                  </div>
                  <div>
                    <Label>Terakhir Diubah</Label>
                    <p className="font-medium">
                      {formatDate(viewingBarangMasuk.updatedAt)}
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingBarangMasuk.detail.map((item, index) => (
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
                          colSpan={5}
                          className="text-right font-semibold"
                        >
                          Total:
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(
                            Number(viewingBarangMasuk.totalNilai)
                          )}
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
            {viewingBarangMasuk && viewingBarangMasuk.status === "posted" && (
              <Button
                variant="outline"
                onClick={() => handlePrint(viewingBarangMasuk)}
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

      {/* Print Component */}
      {viewingBarangMasuk && (
        <BarangMasukPrint
          ref={printRef}
          data={viewingBarangMasuk}
          onPrintComplete={() => {
            toast.success("Dokumen berhasil dicetak");
          }}
        />
      )}
    </div>
  );
}
