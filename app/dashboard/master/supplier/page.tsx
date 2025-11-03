'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, MoreHorizontal, Edit, Trash2, Truck, Package, RotateCcw, Building } from 'lucide-react'
import { toast } from 'sonner'
import { formatPhoneNumber } from '@/lib/utils'
import { SupplierFormData, supplierSchema } from '@/lib/validations'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface Supplier {
  id: string
  kode: string
  nama: string
  alamat: string
  telepon: string
  email?: string
  npwp?: string
  termPembayaran: number
  aktif: boolean
  createdAt: string
  updatedAt: string
  _count: {
    barangMasuk: number
    returBeli: number
    supplierBarang: number
  }
}

type SupplierFormValues = z.input<typeof supplierSchema>
const defaultSupplierFormValues: SupplierFormValues = {
  kode: '',
  nama: '',
  alamat: '',
  telepon: '',
  email: '',
  npwp: '',
  termPembayaran: 30,
  aktif: true,
}

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({
    page: 1, limit: 10, total: 0, totalPages: 0,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: defaultSupplierFormValues,
  })

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      })

      const response = await fetch(`/api/master/supplier?${params}`)
      const result = await response.json()

      if (result.success) {
        setSuppliers(result.data)
        setPagination(result.pagination)
      } else {
        toast.error('Gagal mengambil data supplier')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSuppliers() }, [pagination.page, search])

  const onSubmit = async (data: SupplierFormValues) => {
    setSubmitting(true)
    try {
      const payload: SupplierFormData = supplierSchema.parse(data)

      // Only handle editing in the dialog flow
      if (editingSupplier) {
        const url = `/api/master/supplier/${editingSupplier.id}`
        const method = 'PUT'

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await response.json()

        if (result.success) {
          toast.success('Supplier berhasil diperbarui')
          setDialogOpen(false)
          reset(defaultSupplierFormValues)
          setEditingSupplier(null)
          fetchSuppliers()
        } else {
          toast.error(result.error || 'Gagal menyimpan data')
        }
      } else {
        // Add new item from Input tab
        const response = await fetch('/api/master/supplier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const result = await response.json()

        if (result.success) {
          toast.success('Supplier berhasil ditambahkan')
          reset(defaultSupplierFormValues)
          fetchSuppliers()
        } else {
          toast.error(result.error || 'Gagal menyimpan data')
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setValue('kode', supplier.kode)
    setValue('nama', supplier.nama)
    setValue('alamat', supplier.alamat)
    setValue('telepon', supplier.telepon)
    setValue('email', supplier.email ?? '')
    setValue('npwp', supplier.npwp ?? '')
    setValue('termPembayaran', supplier.termPembayaran)
    setValue('aktif', supplier.aktif)
    setDialogOpen(true)
  }

  const openDeleteDialog = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedSupplier) return

    try {
      const response = await fetch(`/api/master/supplier/${selectedSupplier.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast.success('Supplier berhasil dihapus')
        setDeleteDialogOpen(false)
        setSelectedSupplier(null)
        fetchSuppliers()
      } else {
        toast.error(result.error || 'Gagal menghapus supplier')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghapus supplier')
    }
  }

  const openAddDialog = () => {
    setEditingSupplier(null)
    reset(defaultSupplierFormValues)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Master Supplier</h1>
        <p className="text-muted-foreground">Kelola data supplier dan vendor</p>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">
            <Truck className="mr-2 h-4 w-4" />
            Browse Data
          </TabsTrigger>
          <TabsTrigger value="input">
            <Plus className="mr-2 h-4 w-4" />
            Input Supplier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">

          <Card>
            <CardHeader>
              <CardTitle>Daftar Supplier</CardTitle>
              <CardDescription>
                Total {pagination.total} supplier terdaftar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari supplier..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-gray-500">Memuat data...</div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kode</TableHead>
                        <TableHead>Nama Supplier</TableHead>
                        <TableHead>Telepon</TableHead>
                        <TableHead>Term Pembayaran</TableHead>
                        <TableHead>Statistik</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell className="font-medium">{supplier.kode}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{supplier.nama}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">{supplier.alamat}</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatPhoneNumber(supplier.telepon)}</TableCell>
                          <TableCell>{supplier.termPembayaran} hari</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Badge variant="secondary" className="flex items-center space-x-1">
                                <Truck className="h-3 w-3" />
                                <span>{supplier._count.barangMasuk}</span>
                              </Badge>
                              <Badge variant="outline" className="flex items-center space-x-1">
                                <RotateCcw className="h-3 w-3" />
                                <span>{supplier._count.returBeli}</span>
                              </Badge>
                              <Badge variant="outline" className="flex items-center space-x-1">
                                <Package className="h-3 w-3" />
                                <span>{supplier._count.supplierBarang}</span>
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={supplier.aktif ? 'default' : 'secondary'}>
                              {supplier.aktif ? 'Aktif' : 'Non-aktif'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(supplier)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Hapus
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {suppliers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Truck className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Belum ada data supplier
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Mulai dengan menambahkan supplier pertama
                      </p>
                      <Button onClick={() => {
                        toast.info('Silakan pindah ke tab "Input Supplier" untuk menambah supplier baru')
                      }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Supplier
                      </Button>
                    </div>
                  )}

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Menampilkan {suppliers.length} dari {pagination.total} data
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
              <CardTitle>Input Supplier Baru</CardTitle>
              <CardDescription>
                Tambahkan supplier baru ke sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="kode-input">Kode Supplier</Label>
                      <Input
                        id="kode-input"
                        {...register('kode')}
                        placeholder="Contoh: S001"
                        disabled={submitting}
                      />
                      {errors.kode && (
                        <p className="text-sm text-red-600">{errors.kode.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nama-input">Nama Supplier</Label>
                      <Input
                        id="nama-input"
                        {...register('nama')}
                        placeholder="Contoh: PT. Tech Supplier"
                        disabled={submitting}
                      />
                      {errors.nama && (
                        <p className="text-sm text-red-600">{errors.nama.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="alamat-input">Alamat</Label>
                    <Textarea
                      id="alamat-input"
                      {...register('alamat')}
                      placeholder="Masukkan alamat lengkap"
                      disabled={submitting}
                    />
                    {errors.alamat && (
                      <p className="text-sm text-red-600">{errors.alamat.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="telepon-input">Telepon</Label>
                      <Input
                        id="telepon-input"
                        {...register('telepon')}
                        placeholder="Contoh: 021-1234567"
                        disabled={submitting}
                      />
                      {errors.telepon && (
                        <p className="text-sm text-red-600">{errors.telepon.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email-input">Email</Label>
                      <Input
                        id="email-input"
                        type="email"
                        {...register('email')}
                        placeholder="email@example.com"
                        disabled={submitting}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="termPembayaran-input">Term Pembayaran (hari)</Label>
                      <Input
                        id="termPembayaran-input"
                        type="number"
                        {...register('termPembayaran', { valueAsNumber: true })}
                        placeholder="30"
                        disabled={submitting}
                      />
                      {errors.termPembayaran && (
                        <p className="text-sm text-red-600">{errors.termPembayaran.message}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="npwp-input">NPWP</Label>
                      <Input
                        id="npwp-input"
                        {...register('npwp')}
                        placeholder="Nomor NPWP"
                        disabled={submitting}
                      />
                      {errors.npwp && (
                        <p className="text-sm text-red-600">{errors.npwp.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="aktif-input"
                        checked={watch('aktif')}
                        onCheckedChange={(checked) => setValue('aktif', checked)}
                        disabled={submitting}
                      />
                      <Label htmlFor="aktif-input">Aktif</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset(defaultSupplierFormValues)}
                    disabled={submitting}
                  >
                    Reset Form
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Menyimpan...' : 'Simpan Supplier'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? 'Edit informasi supplier yang sudah ada.'
                : 'Tambahkan supplier baru ke sistem.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4 grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="kode">Kode Supplier</Label>
                <Input
                  id="kode"
                  {...register('kode')}
                  placeholder="Contoh: S001"
                  disabled={submitting}
                />
                {errors.kode && (
                  <p className="text-sm text-red-600">{errors.kode.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nama">Nama Supplier</Label>
                <Input
                  id="nama"
                  {...register('nama')}
                  placeholder="Contoh: PT. Tech Supplier"
                  disabled={submitting}
                />
                {errors.nama && (
                  <p className="text-sm text-red-600">{errors.nama.message}</p>
                )}
              </div>
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="alamat">Alamat</Label>
                <Textarea
                  id="alamat"
                  {...register('alamat')}
                  placeholder="Masukkan alamat lengkap"
                  disabled={submitting}
                />
                {errors.alamat && (
                  <p className="text-sm text-red-600">{errors.alamat.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telepon">Telepon</Label>
                <Input
                  id="telepon"
                  {...register('telepon')}
                  placeholder="Contoh: 021-1234567"
                  disabled={submitting}
                />
                {errors.telepon && (
                  <p className="text-sm text-red-600">{errors.telepon.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="email@example.com"
                  disabled={submitting}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="termPembayaran">Term Pembayaran (hari)</Label>
                <Input
                  id="termPembayaran"
                  type="number"
                  {...register('termPembayaran', { valueAsNumber: true })}
                  placeholder="30"
                  disabled={submitting}
                />
                {errors.termPembayaran && (
                  <p className="text-sm text-red-600">{errors.termPembayaran.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="npwp">NPWP</Label>
                <Input
                  id="npwp"
                  {...register('npwp')}
                  placeholder="Nomor NPWP"
                  disabled={submitting}
                />
                {errors.npwp && (
                  <p className="text-sm text-red-600">{errors.npwp.message}</p>
                )}
              </div>
              <div className="flex items-center space-x-2 col-span-2">
                <Switch
                  id="aktif"
                  checked={watch('aktif')}
                  onCheckedChange={(checked) => setValue('aktif', checked)}
                  disabled={submitting}
                />
                <Label htmlFor="aktif">Aktif</Label>
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
                {submitting ? 'Menyimpan...' : editingSupplier ? 'Perbarui' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus supplier "{selectedSupplier?.nama}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
