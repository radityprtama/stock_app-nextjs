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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  Calendar as CalendarIcon,
  SendHorizontal,
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
import type { DeliveryOrderForm } from "@/src/types";

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
    tanggal: new Date(),
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
      const response = await fetch(
        `/api/transaksi/delivery-order/stock-info?gudangId=${gudangId}`
      );
      const data = await response.json();
      if (data.success) {
        setAvailableBarang(data.data);
      }
    } catch (error) {
      console.error("Error fetching available barang:", error);
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
          tanggal: new Date(),
          gudangAsalId: "",
          gudangTujuanId: "",
          namaSupir: "",
          nopolKendaraan: "",
          keterangan: "",
          items: [],
        });
        setAvailableBarang([]);
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
    if (!selectedBarang) return;

    const existingItemIndex = form.items.findIndex(
      (item) => item.barangId === selectedBarang.barangId
    );

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...form.items];
      updatedItems[existingItemIndex].qty += 1;
      setForm({ ...form, items: updatedItems });
    } else {
      // Add new item
      setForm({
        ...form,
        items: [
          ...form.items,
          {
            barangId: selectedBarang.barangId,
            namaBarang: selectedBarang.barangNama,
            qty: 1,
            satuan: selectedBarang.satuan,
            keterangan: "",
          },
        ],
      });
    }

    setSelectedBarang(null);
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
      tanggal: new Date(),
      gudangAsalId: "",
      gudangTujuanId: "",
      namaSupir: "",
      nopolKendaraan: "",
      keterangan: "",
      items: [],
    });
    setAvailableBarang([]);
    setSelectedBarang(null);
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
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Delivery Order</h1>
          <p className="text-gray-600">Kelola pengiriman barang antar gudang</p>
        </div>
        <Button onClick={openAddDialog} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Input Delivery Order Baru
        </Button>
      </div>
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
                            {deliveryOrder.gudangTujuanRel?.nama ||
                              deliveryOrder.gudangTujuan}
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
                                    <SendHorizontal className="mr-2 h-4 w-4" />
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
                                    <Truck className="mr-2 h-4 w-4" />
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

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Input Delivery Order Baru</DialogTitle>
            <DialogDescription>
              Buat transaksi pengiriman barang antar gudang
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="space-y-6"
          >
            <div className="grid gap-6">
              {/* Bagian Gudang & Tanggal */}
              <div className="grid gap-6">
                {/* Gudang Asal & Tujuan */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Gudang Asal</Label>
                    <Select
                      value={form.gudangAsalId}
                      onValueChange={(value) => {
                        setForm({
                          ...form,
                          gudangAsalId: value,
                          items: [],
                        });
                        fetchAvailableBarang(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Gudang Asal" />
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

                  <div className="grid gap-2">
                    <Label>Gudang Tujuan</Label>
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

                {/* Nama Supir & Nomor Polisi */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Nama Supir</Label>
                    <Input
                      placeholder="Masukkan nama supir"
                      value={form.namaSupir}
                      onChange={(e) =>
                        setForm({ ...form, namaSupir: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label>Nomor Polisi</Label>
                    <Input
                      placeholder="Masukkan nomor polisi"
                      value={form.nopolKendaraan}
                      onChange={(e) =>
                        setForm({ ...form, nopolKendaraan: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Tanggal & Keterangan */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Tanggal</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.tanggal
                            ? format(form.tanggal, "dd MMM yyyy", {
                                locale: id,
                              })
                            : "Pilih tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.tanggal}
                          onSelect={(date) =>
                            setForm({
                              ...form,
                              tanggal: date || new Date(),
                            })
                          }
                          locale={id}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid gap-2">
                    <Label>Keterangan</Label>
                    <Textarea
                      placeholder="Masukkan keterangan (opsional)"
                      value={form.keterangan}
                      onChange={(e) =>
                        setForm({ ...form, keterangan: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Barang Section */}
                {form.gudangAsalId && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">
                        Pilih Barang
                      </Label>
                      <div className="flex gap-2">
                        <Select
                          value={selectedBarang?.barangId || ""}
                          onValueChange={(value) => {
                            const barang = availableBarang.find(
                              (b) => b.barangId === value
                            );
                            setSelectedBarang(barang || null);
                          }}
                        >
                          <SelectTrigger className="w-[260px]">
                            <SelectValue placeholder="Pilih barang" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableBarang.map((barang) => (
                              <SelectItem
                                key={barang.barangId}
                                value={barang.barangId}
                              >
                                {barang.barangNama} (Stok: {barang.stok}{" "}
                                {barang.satuan})
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

                    {form.items.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
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
                                    onChange={(e) =>
                                      updateItemQuantity(
                                        index,
                                        parseInt(e.target.value) || 1
                                      )
                                    }
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>{item.satuan}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      removeBarangFromForm(index)
                                    }
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
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm({
                    tanggal: new Date(),
                    gudangAsalId: "",
                    gudangTujuanId: "",
                    namaSupir: "",
                    nopolKendaraan: "",
                    keterangan: "",
                    items: [],
                  });
                  setAvailableBarang([]);
                  setSelectedBarang(null);
                }}
              >
                Reset
              </Button>
              <Button
                type="submit"
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
          </form>
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
                    {selectedDeliveryOrder.gudangTujuanRel?.nama ||
                      selectedDeliveryOrder.gudangTujuan}
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
