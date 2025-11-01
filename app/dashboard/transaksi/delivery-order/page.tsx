'use client'

import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeliveryOrderList } from '@/hooks/use-query-hooks'
import { useCreateDeliveryOrder, useUpdateDeliveryOrderStatus, useDeleteDeliveryOrder } from '@/hooks/use-mutation-hooks'
import { useGudangList } from '@/hooks/use-query-hooks'
import { TRANSACTION_STATUS } from '@/src/constants'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { toast } from 'sonner'
import { DeliveryOrderPrint, type DeliveryOrderPrintRef } from '@/components/print'
import { Plus, Search, Printer, Package } from 'lucide-react'

type DeliveryOrderForm = {
  noDO?: string
  tanggal?: Date
  gudangAsalId: string
  gudangTujuan: string
  namaSupir: string
  nopolKendaraan: string
  keterangan?: string
  items: {
    barangId: string
    namaBarang: string
    qty: number
    satuan: string
    keterangan?: string
  }[]
}

export default function DeliveryOrderPage() {
  const printRef = useRef<DeliveryOrderPrintRef>(null)
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedDeliveryOrder, setSelectedDeliveryOrder] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [gudangFilter, setGudangFilter] = useState('')
  const [page, setPage] = useState(1)

  const [form, setForm] = useState<DeliveryOrderForm>({
    gudangAsalId: '',
    gudangTujuan: '',
    namaSupir: '',
    nopolKendaraan: '',
    keterangan: '',
    items: []
  })

  // Query hooks
  const { data: deliveryOrdersData, isLoading, refetch } = useDeliveryOrderList({
    search,
    status: statusFilter,
    gudangAsalId: gudangFilter,
    page,
    limit: 10
  })

  const { data: gudangList } = useGudangList()

  // Mutation hooks
  const createDeliveryOrder = useCreateDeliveryOrder()
  const updateStatus = useUpdateDeliveryOrderStatus()
  const deleteDeliveryOrder = useDeleteDeliveryOrder()

  const handleCreate = async () => {
    try {
      const result = await createDeliveryOrder.mutateAsync(form)
      if (result.success) {
        toast.success('Delivery Order berhasil dibuat')
        setIsCreateModalOpen(false)
        setForm({
          gudangAsalId: '',
          gudangTujuan: '',
          namaSupir: '',
          nopolKendaraan: '',
          keterangan: '',
          items: []
        })
        refetch()
      }
    } catch (error) {
      toast.error('Gagal membuat Delivery Order')
    }
  }

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const result = await updateStatus.mutateAsync({ id, status })
      if (result.success) {
        toast.success(`Status berhasil diubah ke ${status}`)
        refetch()
      }
    } catch (error) {
      toast.error('Gagal mengubah status')
    }
  }

  const handleDelete = async () => {
    if (!selectedDeliveryOrder) return

    try {
      const result = await deleteDeliveryOrder.mutateAsync(selectedDeliveryOrder.id)
      if (result.success) {
        toast.success('Delivery Order berhasil dihapus')
        setDeleteDialogOpen(false)
        setSelectedDeliveryOrder(null)
        refetch()
      }
    } catch (error) {
      toast.error('Gagal menghapus Delivery Order')
    }
  }

  const openAddDialog = () => {
    setForm({
      gudangAsalId: '',
      gudangTujuan: '',
      namaSupir: '',
      nopolKendaraan: '',
      keterangan: '',
      items: []
    })
    setIsCreateModalOpen(true)
  }

  const openDetailModal = (deliveryOrder: any) => {
    setSelectedDeliveryOrder(deliveryOrder)
    setIsDetailModalOpen(true)
  }

  const openDeleteDialog = (deliveryOrder: any) => {
    setSelectedDeliveryOrder(deliveryOrder)
    setDeleteDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      in_transit: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }

    const labels = {
      draft: 'Draft',
      in_transit: 'Dalam Perjalanan',
      delivered: 'Terkirim',
      cancelled: 'Dibatalkan'
    }

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  const handlePrint = (deliveryOrder: any) => {
    setSelectedDeliveryOrder(deliveryOrder)
    setTimeout(() => {
      printRef.current?.print()
    }, 100)
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'unauthenticated') {
    router.push('/auth/login')
    return null
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Delivery Order</h1>
          <p className="text-gray-600">Kelola pengiriman barang antar gudang</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          Buat Delivery Order Baru
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
                      <TableCell>{deliveryOrder.gudangTujuan}</TableCell>
                      <TableCell>{deliveryOrder.namaSupir}</TableCell>
                      <TableCell>{deliveryOrder.nopolKendaraan}</TableCell>
                      <TableCell>
                        {getStatusBadge(deliveryOrder.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailModal(deliveryOrder)}
                          >
                            Detail
                          </Button>
                          {deliveryOrder.status ===
                            TRANSACTION_STATUS.DRAFT && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(
                                  deliveryOrder.id,
                                  TRANSACTION_STATUS.IN_TRANSIT
                                )
                              }
                            >
                              Kirim
                            </Button>
                          )}
                          {deliveryOrder.status ===
                            TRANSACTION_STATUS.IN_TRANSIT && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(
                                  deliveryOrder.id,
                                  TRANSACTION_STATUS.DELIVERED
                                )
                              }
                            >
                              Terima
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(deliveryOrder)}
                          >
                            <Printer className="w-4 h-4 mr-1" />
                            Print
                          </Button>
                          {(deliveryOrder.status === TRANSACTION_STATUS.DRAFT ||
                            deliveryOrder.status ===
                              TRANSACTION_STATUS.CANCELLED) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteDialog(deliveryOrder)}
                            >
                              Hapus
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {deliveryOrdersData?.data.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Belum ada transaksi Barang Masuk
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Mulai dengan membuat transaksi Barang Masuk pertama
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
                    {Math.min(page * 10, deliveryOrdersData.pagination.total)}{" "}
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
                  onValueChange={(value) =>
                    setForm({ ...form, gudangAsalId: value })
                  }
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
                <Input
                  id="gudangTujuan"
                  placeholder="Masukkan tujuan pengiriman"
                  value={form.gudangTujuan}
                  onChange={(e) =>
                    setForm({ ...form, gudangTujuan: e.target.value })
                  }
                />
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
                !form.gudangTujuan ||
                !form.namaSupir ||
                !form.nopolKendaraan
              }
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Delivery Order</DialogTitle>
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
                    {selectedDeliveryOrder.gudangTujuan}
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
            <Button onClick={() => setIsDetailModalOpen(false)}>Tutup</Button>
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

      {/* Print Component */}
      {selectedDeliveryOrder && (
        <DeliveryOrderPrint
          ref={printRef}
          data={selectedDeliveryOrder}
          onPrintComplete={() => {
            toast.success("Dokumen berhasil dicetak");
          }}
        />
      )}
    </div>
  );
}