"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreHorizontal,
  Eye,
  Trash2,
  Edit,
  Plus,
  Search,
  Package,
  Printer,
  Truck,
} from "lucide-react";
import { useDeliveryOrderList } from "@/hooks/use-query-hooks";
import {
  useCreateDeliveryOrder,
  useUpdateDeliveryOrderStatus,
  useDeleteDeliveryOrder,
} from "@/hooks/use-mutation-hooks";
import { useGudangList } from "@/hooks/use-query-hooks";
import { TRANSACTION_STATUS } from "@/src/constants";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import DeliveryOrderPrint, {
  type DeliveryOrderPrintRef,
} from "@/components/print/delivery-order-print";

type DeliveryOrderForm = {
  noDO?: string;
  tanggal?: Date;
  gudangAsalId: string;
  gudangTujuanId: string;
  namaSupir: string;
  nopolKendaraan: string;
  keterangan?: string;
  items: {
    isCustom?: boolean;
    barangId?: string;
    namaBarang: string;
    qty: number;
    satuan: string;
    keterangan?: string;
    // Custom item fields
    customKode?: string;
    customNama?: string;
    customSatuan?: string;
    customHarga?: number;
  }[];
};

export default function DeliveryOrderPage() {
  const printRef = useRef<DeliveryOrderPrintRef>(null);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gudangFilter, setGudangFilter] = useState("");
  const [page, setPage] = useState(1);

  const [form, setForm] = useState<DeliveryOrderForm>({
    gudangAsalId: "",
    gudangTujuanId: "",
    namaSupir: "",
    nopolKendaraan: "",
    keterangan: "",
    items: [],
  });

  // Query hooks
  const {
    data: deliveryOrdersData,
    isLoading,
    refetch,
  } = useDeliveryOrderList({
    search,
    status: statusFilter,
    gudangAsalId: gudangFilter,
    page,
    limit: 10,
  });

  const { data: gudangList } = useGudangList();
  const [availableBarang, setAvailableBarang] = useState<any[]>([]);
  const [selectedBarang, setSelectedBarang] = useState<any | null>(null);

  // Custom item states
  const [itemType, setItemType] = useState<'warehouse' | 'custom'>('warehouse');
  const [customItem, setCustomItem] = useState({
    kode: '',
    nama: '',
    satuan: '',
    harga: ''
  });

  // Mutation hooks
  const createDeliveryOrder = useCreateDeliveryOrder();
  const updateStatus = useUpdateDeliveryOrderStatus();
  const deleteDeliveryOrder = useDeleteDeliveryOrder();

  // Fetch available barang when gudang asal changes
  const fetchAvailableBarang = async (gudangId: string) => {
    if (!gudangId) {
      setAvailableBarang([]);
      return;
    }

    try {
      const response = await fetch(`/api/transaksi/delivery-order/stock-info?gudangId=${gudangId}`);
      const data = await response.json();
      if (data.success) {
        setAvailableBarang(data.data);
      }
    } catch (error) {
      console.error('Error fetching available barang:', error);
    }
  };

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
      };
      const result = await createDeliveryOrder.mutateAsync(payload);
      if (result.success) {
        toast.success("Delivery Order berhasil dibuat");
        setIsCreateModalOpen(false);
        setForm({
          gudangAsalId: "",
          gudangTujuanId: "",
          namaSupir: "",
          nopolKendaraan: "",
          keterangan: "",
          items: [],
        });
        setAvailableBarang([]);
        setItemType('warehouse');
        setCustomItem({ kode: '', nama: '', satuan: '', harga: '' });
        refetch();
      }
    } catch (error) {
      toast.error("Gagal membuat Delivery Order");
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const result = await updateStatus.mutateAsync({ id, status });
      if (result.success) {
        toast.success(`Status berhasil diubah ke ${status}`);
        refetch();
      }
    } catch (error) {
      toast.error("Gagal mengubah status");
    }
  };

  const handleDelete = async () => {
    if (!selectedDeliveryOrder) return;

    try {
      const result = await deleteDeliveryOrder.mutateAsync(
        selectedDeliveryOrder.id
      );
      if (result.success) {
        toast.success("Delivery Order berhasil dihapus");
        setDeleteDialogOpen(false);
        setSelectedDeliveryOrder(null);
        refetch();
      }
    } catch (error) {
      toast.error("Gagal menghapus Delivery Order");
    }
  };

  const addBarangToForm = () => {
    if (itemType === 'warehouse' && !selectedBarang) return;
    if (itemType === 'custom' && (!customItem.kode || !customItem.nama || !customItem.satuan)) {
      alert('Silakan lengkapi data custom barang (kode, nama, satuan)');
      return;
    }

    let newItem: any;

    if (itemType === 'warehouse') {
      const existingItemIndex = form.items.findIndex(
        item => !item.isCustom && item.barangId === selectedBarang.barangId
      );

      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const updatedItems = [...form.items];
        updatedItems[existingItemIndex].qty += 1;
        setForm({ ...form, items: updatedItems });
        setSelectedBarang(null);
        return;
      }

      newItem = {
        isCustom: false,
        barangId: selectedBarang.barangId,
        namaBarang: selectedBarang.barangNama,
        qty: 1,
        satuan: selectedBarang.satuan,
        keterangan: ''
      };
    } else {
      // Custom item
      newItem = {
        isCustom: true,
        barangId: undefined,
        namaBarang: customItem.nama,
        qty: 1,
        satuan: customItem.satuan,
        keterangan: '',
        customKode: customItem.kode,
        customNama: customItem.nama,
        customSatuan: customItem.satuan,
        customHarga: parseFloat(customItem.harga) || 0
      };
    }

    setForm({
      ...form,
      items: [...form.items, newItem]
    });

    // Reset form
    setSelectedBarang(null);
    setCustomItem({ kode: '', nama: '', satuan: '', harga: '' });
    setItemType('warehouse');
  };

  const removeBarangFromForm = (index: number) => {
    const updatedItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: updatedItems });
  };

  const updateItemQuantity = (index: number, qty: number) => {
    if (qty < 1) return;

    const updatedItems = [...form.items];
    updatedItems[index].qty = qty;
    setForm({ ...form, items: updatedItems });
  };

  const openAddDialog = () => {
    setForm({
      gudangAsalId: "",
      gudangTujuanId: "",
      namaSupir: "",
      nopolKendaraan: "",
      keterangan: "",
      items: [],
    });
    setAvailableBarang([]);
    setSelectedBarang(null);
    setItemType('warehouse');
    setCustomItem({ kode: '', nama: '', satuan: '', harga: '' });
    setIsCreateModalOpen(true);
  };

  const openDetailModal = (deliveryOrder: any) => {
    setSelectedDeliveryOrder(deliveryOrder);
    setIsDetailModalOpen(true);
  };

  const openDeleteDialog = (deliveryOrder: any) => {
    setSelectedDeliveryOrder(deliveryOrder);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      in_transit: "bg-blue-100 text-blue-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const labels = {
      draft: "Draft",
      in_transit: "Dalam Perjalanan",
      delivered: "Terkirim",
      cancelled: "Dibatalkan",
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/auth/login");
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Delivery Order</h1>
        <p className="text-gray-600">Kelola pengiriman barang antar gudang</p>
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
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Pencarian</Label>
                  <Input
                    id="search"
                    placeholder="No DO, supir, atau nopol..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={statusFilter || "all"}
                    onValueChange={(value) =>
                      setStatusFilter(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value={TRANSACTION_STATUS.DRAFT}>
                        Draft
                      </SelectItem>
                      <SelectItem value={TRANSACTION_STATUS.IN_TRANSIT}>
                        Dalam Perjalanan
                      </SelectItem>
                      <SelectItem value={TRANSACTION_STATUS.DELIVERED}>
                        Terkirim
                      </SelectItem>
                      <SelectItem value={TRANSACTION_STATUS.CANCELLED}>
                        Dibatalkan
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="gudang">Gudang Asal</Label>
                  <Select
                    value={gudangFilter || "all"}
                    onValueChange={(value) =>
                      setGudangFilter(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Gudang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Gudang</SelectItem>
                      {gudangList?.data.map((gudang) => (
                        <SelectItem key={gudang.id} value={gudang.id}>
                          {gudang.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("");
                      setGudangFilter("");
                      setPage(1);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daftar Delivery Order</CardTitle>
              <CardDescription>
                Total {deliveryOrdersData?.pagination.total || 0} delivery order
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div>Loading...</div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No. DO</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Gudang Asal</TableHead>
                        <TableHead>Tujuan</TableHead>
                        <TableHead>Supir</TableHead>
                        <TableHead>Kendaraan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryOrdersData?.data.map((deliveryOrder: any) => (
                        <TableRow key={deliveryOrder.id}>
                          <TableCell className="font-medium">
                            {deliveryOrder.noDO}
                          </TableCell>
                          <TableCell>
                            {format(
                              new Date(deliveryOrder.tanggal),
                              "dd MMM yyyy",
                              { locale: id }
                            )}
                          </TableCell>
                          <TableCell>{deliveryOrder.gudangAsal.nama}</TableCell>
                          <TableCell>
                            {deliveryOrder.gudangTujuanRel?.nama || deliveryOrder.gudangTujuan}
                          </TableCell>
                          <TableCell>{deliveryOrder.namaSupir}</TableCell>
                          <TableCell>{deliveryOrder.nopolKendaraan}</TableCell>
                          <TableCell>
                            {getStatusBadge(deliveryOrder.status)}
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
                                  onClick={() => openDetailModal(deliveryOrder)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Detail
                                </DropdownMenuItem>
                                {deliveryOrder.status ===
                                  TRANSACTION_STATUS.DRAFT && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusUpdate(
                                        deliveryOrder.id,
                                        TRANSACTION_STATUS.IN_TRANSIT
                                      )
                                    }
                                  >
                                    Kirim
                                  </DropdownMenuItem>
                                )}
                                {deliveryOrder.status ===
                                  TRANSACTION_STATUS.IN_TRANSIT && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleStatusUpdate(
                                        deliveryOrder.id,
                                        TRANSACTION_STATUS.DELIVERED
                                      )
                                    }
                                  >
                                    Terima
                                  </DropdownMenuItem>
                                )}
                                {deliveryOrder.status ===
                                  TRANSACTION_STATUS.DELIVERED && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedDeliveryOrder(deliveryOrder);
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
                                {(deliveryOrder.status ===
                                  TRANSACTION_STATUS.DRAFT ||
                                  deliveryOrder.status ===
                                    TRANSACTION_STATUS.CANCELLED) && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openDeleteDialog(deliveryOrder)
                                    }
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {deliveryOrdersData?.data.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Truck className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Belum ada transaksi Delivery Order
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Mulai dengan membuat transaksi Delivery Order pertama
                      </p>
                      <Button onClick={openAddDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Delivery Order Baru
                      </Button>
                    </div>
                  )}

                  {/* Pagination */}
                  {deliveryOrdersData?.pagination && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-600">
                        Menampilkan {(page - 1) * 10 + 1} -{" "}
                        {Math.min(
                          page * 10,
                          deliveryOrdersData.pagination.total
                        )}{" "}
                        dari {deliveryOrdersData.pagination.total}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={
                            page >= deliveryOrdersData.pagination.totalPages
                          }
                        >
                          Next
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
              <CardTitle>Input Delivery Order Baru</CardTitle>
              <CardDescription>
                Buat transaksi pengiriman barang antar gudang
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gudangAsal-input">Gudang Asal</Label>
                    <Select
                      value={form.gudangAsalId}
                      onValueChange={(value) => {
                        setForm({ ...form, gudangAsalId: value, items: [] });
                        fetchAvailableBarang(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Gudang" />
                      </SelectTrigger>
                      <SelectContent>
                        {gudangList?.data.map((gudang) => (
                          <SelectItem key={gudang.id} value={gudang.id}>
                            {gudang.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="gudangTujuan-input">Gudang Tujuan</Label>
                    <Select
                      value={form.gudangTujuan}
                      onValueChange={(value) =>
                        setForm({ ...form, gudangTujuan: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Gudang Tujuan" />
                      </SelectTrigger>
                      <SelectContent>
                        {gudangList?.data
                          ?.filter((g) => g.id !== form.gudangAsalId)
                          .map((gudang) => (
                            <SelectItem key={gudang.id} value={gudang.id}>
                              {gudang.nama}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="namaSupir-input">Nama Supir</Label>
                    <Input
                      id="namaSupir-input"
                      placeholder="Masukkan nama supir"
                      value={form.namaSupir}
                      onChange={(e) =>
                        setForm({ ...form, namaSupir: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="nopolKendaraan-input">Nomor Polisi</Label>
                    <Input
                      id="nopolKendaraan-input"
                      placeholder="Masukkan nomor polisi"
                      value={form.nopolKendaraan}
                      onChange={(e) =>
                        setForm({ ...form, nopolKendaraan: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="keterangan-input">Keterangan</Label>
                  <Textarea
                    id="keterangan-input"
                    placeholder="Masukkan keterangan (opsional)"
                    value={form.keterangan}
                    onChange={(e) =>
                      setForm({ ...form, keterangan: e.target.value })
                    }
                  />
                </div>

                {/* Barang Selection */}
                {form.gudangAsalId && (
                  <div>
                    <Label>Tipe Barang</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={itemType === 'warehouse' ? 'default' : 'outline'}
                        onClick={() => setItemType('warehouse')}
                        type="button"
                        className="flex-1"
                      >
                        Dari Gudang
                      </Button>
                      <Button
                        variant={itemType === 'custom' ? 'default' : 'outline'}
                        onClick={() => setItemType('custom')}
                        type="button"
                        className="flex-1"
                      >
                        Custom/Manual
                      </Button>
                    </div>

                    {itemType === 'warehouse' ? (
                      <div className="mt-4">
                        <Label>Pilih Barang dari Gudang</Label>
                        <div className="flex gap-2 mt-2">
                          <Select
                            value={selectedBarang?.barangId || ""}
                            onValueChange={(value) => {
                              const barang = availableBarang.find(b => b.barangId === value);
                              setSelectedBarang(barang || null);
                            }}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Pilih barang yang akan dipindahkan" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableBarang.map((barang) => (
                                <SelectItem key={barang.barangId} value={barang.barangId}>
                                  {barang.barangNama} (Stok: {barang.stok} {barang.satuan})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={addBarangToForm}
                            disabled={!selectedBarang}
                            type="button"
                          >
                            Tambah
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <Label>Input Barang Custom</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="custom-kode">Kode Barang</Label>
                            <Input
                              id="custom-kode"
                              placeholder="Masukkan kode barang"
                              value={customItem.kode}
                              onChange={(e) => setCustomItem({...customItem, kode: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="custom-nama">Nama Barang</Label>
                            <Input
                              id="custom-nama"
                              placeholder="Masukkan nama barang"
                              value={customItem.nama}
                              onChange={(e) => setCustomItem({...customItem, nama: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="custom-satuan">Satuan</Label>
                            <Input
                              id="custom-satuan"
                              placeholder="pcs, box, dll"
                              value={customItem.satuan}
                              onChange={(e) => setCustomItem({...customItem, satuan: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="custom-harga">Harga (Optional)</Label>
                            <Input
                              id="custom-harga"
                              type="number"
                              placeholder="0"
                              value={customItem.harga}
                              onChange={(e) => setCustomItem({...customItem, harga: e.target.value})}
                            />
                          </div>
                        </div>
                        <Button
                          onClick={addBarangToForm}
                          disabled={!customItem.kode || !customItem.nama || !customItem.satuan}
                          type="button"
                          className="w-full"
                        >
                          Tambah Barang Custom
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Items Table */}
                {form.items.length > 0 && (
                  <div>
                    <Label>Barang yang Akan Dipindahkan</Label>
                    <Table className="mt-2">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipe</TableHead>
                          <TableHead>Barang</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Satuan</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant={item.isCustom ? 'secondary' : 'default'}>
                                {item.isCustom ? 'Custom' : 'Gudang'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.namaBarang}</div>
                                {item.isCustom && (
                                  <div className="text-xs text-gray-500">Kode: {item.customKode}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>{item.satuan}</TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeBarangFromForm(index)}
                              >
                                Hapus
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setForm({
                      gudangAsalId: "",
                      gudangTujuanId: "",
                      namaSupir: "",
                      nopolKendaraan: "",
                      keterangan: "",
                      items: [],
                    });
                    setAvailableBarang([]);
                    setSelectedBarang(null);
                    setItemType('warehouse');
                    setCustomItem({ kode: '', nama: '', satuan: '', harga: '' });
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={
                    !form.gudangAsalId ||
                    !form.gudangTujuanId ||
                    !form.namaSupir ||
                    !form.nopolKendaraan ||
                    form.items.length === 0
                  }
                >
                  Simpan Transaksi
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat Delivery Order Baru</DialogTitle>
            <DialogDescription>
              Isi form berikut untuk membuat delivery order baru
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gudangAsal">Gudang Asal</Label>
                <Select
                  value={form.gudangAsalId}
                  onValueChange={(value) => {
                    setForm({ ...form, gudangAsalId: value, items: [] });
                    fetchAvailableBarang(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Gudang" />
                  </SelectTrigger>
                  <SelectContent>
                    {gudangList?.data.map((gudang) => (
                      <SelectItem key={gudang.id} value={gudang.id}>
                        {gudang.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="gudangTujuan">Gudang Tujuan</Label>
                <Select
                  value={form.gudangTujuanId}
                  onValueChange={(value) =>
                    setForm({ ...form, gudangTujuanId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Gudang Tujuan" />
                  </SelectTrigger>
                  <SelectContent>
                    {gudangList?.data
                      ?.filter((g) => g.id !== form.gudangAsalId)
                      .map((gudang) => (
                        <SelectItem key={gudang.id} value={gudang.id}>
                          {gudang.nama}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="namaSupir">Nama Supir</Label>
                <Input
                  id="namaSupir"
                  placeholder="Masukkan nama supir"
                  value={form.namaSupir}
                  onChange={(e) =>
                    setForm({ ...form, namaSupir: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="nopolKendaraan">Nomor Polisi</Label>
                <Input
                  id="nopolKendaraan"
                  placeholder="Masukkan nomor polisi"
                  value={form.nopolKendaraan}
                  onChange={(e) =>
                    setForm({ ...form, nopolKendaraan: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="keterangan">Keterangan</Label>
              <Textarea
                id="keterangan"
                placeholder="Masukkan keterangan (opsional)"
                value={form.keterangan}
                onChange={(e) =>
                  setForm({ ...form, keterangan: e.target.value })
                }
              />
            </div>

            {/* Barang Selection */}
            {form.gudangAsalId && (
              <div>
                <Label>Tipe Barang</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={itemType === 'warehouse' ? 'default' : 'outline'}
                    onClick={() => setItemType('warehouse')}
                    type="button"
                    className="flex-1"
                  >
                    Dari Gudang
                  </Button>
                  <Button
                    variant={itemType === 'custom' ? 'default' : 'outline'}
                    onClick={() => setItemType('custom')}
                    type="button"
                    className="flex-1"
                  >
                    Custom/Manual
                  </Button>
                </div>

                {itemType === 'warehouse' ? (
                  <div className="mt-4">
                    <Label>Pilih Barang dari Gudang</Label>
                    <div className="flex gap-2 mt-2">
                      <Select
                        value={selectedBarang?.barangId || ""}
                        onValueChange={(value) => {
                          const barang = availableBarang.find(b => b.barangId === value);
                          setSelectedBarang(barang || null);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Pilih barang yang akan dipindahkan" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBarang.map((barang) => (
                            <SelectItem key={barang.barangId} value={barang.barangId}>
                              {barang.barangNama} (Stok: {barang.stok} {barang.satuan})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={addBarangToForm}
                        disabled={!selectedBarang}
                        type="button"
                      >
                        Tambah
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <Label>Input Barang Custom</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="custom-kode-modal">Kode Barang</Label>
                        <Input
                          id="custom-kode-modal"
                          placeholder="Masukkan kode barang"
                          value={customItem.kode}
                          onChange={(e) => setCustomItem({...customItem, kode: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-nama-modal">Nama Barang</Label>
                        <Input
                          id="custom-nama-modal"
                          placeholder="Masukkan nama barang"
                          value={customItem.nama}
                          onChange={(e) => setCustomItem({...customItem, nama: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-satuan-modal">Satuan</Label>
                        <Input
                          id="custom-satuan-modal"
                          placeholder="pcs, box, dll"
                          value={customItem.satuan}
                          onChange={(e) => setCustomItem({...customItem, satuan: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="custom-harga-modal">Harga (Optional)</Label>
                        <Input
                          id="custom-harga-modal"
                          type="number"
                          placeholder="0"
                          value={customItem.harga}
                          onChange={(e) => setCustomItem({...customItem, harga: e.target.value})}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={addBarangToForm}
                      disabled={!customItem.kode || !customItem.nama || !customItem.satuan}
                      type="button"
                      className="w-full"
                    >
                      Tambah Barang Custom
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Items Table */}
            {form.items.length > 0 && (
              <div>
                <Label>Barang yang Akan Dipindahkan</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barang</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Satuan</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.namaBarang}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>{item.satuan}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeBarangFromForm(index)}
                          >
                            Hapus
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !form.gudangAsalId ||
                !form.gudangTujuanId ||
                !form.namaSupir ||
                !form.nopolKendaraan ||
                form.items.length === 0
              }
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Delivery Order</DialogTitle>
            <DialogDescription>
              Informasi lengkap transaksi Delivery Order
            </DialogDescription>
          </DialogHeader>
          {selectedDeliveryOrder && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>No. DO</Label>
                  <p className="font-medium">{selectedDeliveryOrder.noDO}</p>
                </div>
                <div>
                  <Label>Tanggal</Label>
                  <p className="font-medium">
                    {format(
                      new Date(selectedDeliveryOrder.tanggal),
                      "dd MMM yyyy HH:mm",
                      { locale: id }
                    )}
                  </p>
                </div>
                <div>
                  <Label>Gudang Asal</Label>
                  <p className="font-medium">
                    {selectedDeliveryOrder.gudangAsal.nama}
                  </p>
                </div>
                <div>
                  <Label>Tujuan</Label>
                  <p className="font-medium">
                    {selectedDeliveryOrder.gudangTujuanRel?.nama || selectedDeliveryOrder.gudangTujuan}
                  </p>
                </div>
                <div>
                  <Label>Supir</Label>
                  <p className="font-medium">
                    {selectedDeliveryOrder.namaSupir}
                  </p>
                </div>
                <div>
                  <Label>Nomor Polisi</Label>
                  <p className="font-medium">
                    {selectedDeliveryOrder.nopolKendaraan}
                  </p>
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1">
                  {getStatusBadge(selectedDeliveryOrder.status)}
                </div>
              </div>
              {selectedDeliveryOrder.keterangan && (
                <div>
                  <Label>Keterangan</Label>
                  <p className="font-medium">
                    {selectedDeliveryOrder.keterangan}
                  </p>
                </div>
              )}
              {selectedDeliveryOrder.detail &&
                selectedDeliveryOrder.detail.length > 0 && (
                  <div>
                    <Label>Barang yang Dikirim</Label>
                    <Table className="mt-2">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama Barang</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Satuan</TableHead>
                          <TableHead>Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDeliveryOrder.detail.map(
                          (item: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{item.namaBarang}</TableCell>
                              <TableCell>{item.qty}</TableCell>
                              <TableCell>{item.satuan}</TableCell>
                              <TableCell>{item.keterangan || "-"}</TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            {selectedDeliveryOrder?.status === TRANSACTION_STATUS.DELIVERED && (
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
            <Button
              variant="outline"
              onClick={() => setIsDetailModalOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus delivery order "
              {selectedDeliveryOrder?.noDO}"? Tindakan ini tidak dapat
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Component - Only rendered when there's selected data */}
      {selectedDeliveryOrder && (
        <div style={{ display: "none" }}>
          <DeliveryOrderPrint
            ref={printRef}
            data={selectedDeliveryOrder}
            onPrintComplete={() => {
              toast.success("Delivery Order berhasil dicetak");
            }}
          />
        </div>
      )}
    </div>
  );
}
