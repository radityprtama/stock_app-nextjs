'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogTrigger,
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Users,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatPhoneNumber } from '@/lib/utils'
import { CustomerFormData, customerSchema } from '@/lib/validations'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

type CustomerType = z.infer<typeof customerSchema>['tipePelanggan']

interface Customer {
  id: string
  kode: string
  nama: string
  alamat: string
  telepon: string
  email?: string
  npwp?: string
  tipePelanggan: CustomerType
  limitKredit?: number
  aktif: boolean
  createdAt: string
  updatedAt: string
  _count: {
    suratJalan: number
    returJual: number
  }
}

type CustomerFormValues = z.input<typeof customerSchema>
const defaultCustomerFormValues: CustomerFormValues = {
  kode: '',
  nama: '',
  alamat: '',
  telepon: '',
  email: '',
  npwp: '',
  tipePelanggan: 'retail',
  limitKredit: 0,
  aktif: true,
}

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tipePelangganFilter, setTipePelangganFilter] = useState('all')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: defaultCustomerFormValues,
  })

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        ...(tipePelangganFilter !== 'all' && { tipePelanggan: tipePelangganFilter }),
      })

      const response = await fetch(`/api/master/customer?${params}`)
      const result = await response.json()

      if (result.success) {
        setCustomers(result.data)
        setPagination(result.pagination)
      } else {
        toast.error('Gagal mengambil data customer')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [pagination.page, search, tipePelangganFilter])

  const onSubmit = async (data: CustomerFormValues) => {
    setSubmitting(true)
    try {
      const payload: CustomerFormData = customerSchema.parse(data)

      // Only handle editing in the dialog flow
      if (editingCustomer) {
        const url = `/api/master/customer/${editingCustomer.id}`
        const method = 'PUT'

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        const result = await response.json()

        if (result.success) {
          toast.success('Customer berhasil diperbarui')
          setDialogOpen(false)
          reset(defaultCustomerFormValues)
          setEditingCustomer(null)
          fetchCustomers()
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

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setValue('kode', customer.kode)
    setValue('nama', customer.nama)
    setValue('alamat', customer.alamat)
    setValue('telepon', customer.telepon)
    setValue('email', customer.email ?? '')
    setValue('npwp', customer.npwp ?? '')
    setValue('tipePelanggan', customer.tipePelanggan)
    setValue('limitKredit', customer.limitKredit ?? 0)
    setValue('aktif', customer.aktif)
    setDialogOpen(true)
  }

  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedCustomer) return

    try {
      const response = await fetch(`/api/master/customer/${selectedCustomer.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Customer berhasil dihapus')
        setDeleteDialogOpen(false)
        setSelectedCustomer(null)
        fetchCustomers()
      } else {
        toast.error(result.error || 'Gagal menghapus customer')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghapus customer')
    }
  }

  const openAddDialog = () => {
    setEditingCustomer(null)
    reset(defaultCustomerFormValues)
    setAddDialogOpen(true)
  }

  const handleAddSubmit = async (data: CustomerFormValues) => {
    setSubmitting(true)
    try {
      const payload: CustomerFormData = customerSchema.parse(data)

      const response = await fetch('/api/master/customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Customer berhasil ditambahkan')
        setAddDialogOpen(false)
        reset(defaultCustomerFormValues)
        fetchCustomers()
      } else {
        toast.error(result.error || 'Gagal menyimpan data')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  const getTipePelangganText = (tipe: string) => {
    const types = {
      retail: 'Retail',
      wholesale: 'Wholesale',
      distributor: 'Distributor',
    }
    return types[tipe as keyof typeof types] || tipe
  }

  const getTipePelangganColor = (tipe: string) => {
    const colors = {
      retail: 'bg-blue-100 text-blue-800',
      wholesale: 'bg-green-100 text-green-800',
      distributor: 'bg-purple-100 text-purple-800',
    }
    return colors[tipe as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Customer</h1>
          <p className="text-muted-foreground">
            Kelola data customer dan pelanggan
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Input Customer Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Input Customer Baru</DialogTitle>
              <DialogDescription>
                Tambahkan customer baru ke sistem
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(handleAddSubmit)} className="space-y-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="kode-input">Kode Customer</Label>
                    <Input
                      id="kode-input"
                      {...register('kode')}
                      placeholder="Contoh: C001"
                      disabled={submitting}
                    />
                    {errors.kode && (
                      <p className="text-sm text-red-600">{errors.kode.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="nama-input">Nama Customer</Label>
                    <Input
                      id="nama-input"
                      {...register('nama')}
                      placeholder="Contoh: PT. Mega Store"
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
                    <Label htmlFor="tipePelanggan-input">Tipe Pelanggan</Label>
                    <Select
                      value={watch('tipePelanggan')}
                      onValueChange={(value) =>
                        setValue('tipePelanggan', value as CustomerType)
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih tipe pelanggan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="distributor">Distributor</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.tipePelanggan && (
                      <p className="text-sm text-red-600">{errors.tipePelanggan.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="limitKredit-input">Limit Kredit</Label>
                    <Input
                      id="limitKredit-input"
                      type="number"
                      {...register('limitKredit', { valueAsNumber: true })}
                      placeholder="0"
                      disabled={submitting}
                    />
                    {errors.limitKredit && (
                      <p className="text-sm text-red-600">{errors.limitKredit.message}</p>
                    )}
                  </div>
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reset(defaultCustomerFormValues)}
                  disabled={submitting}
                >
                  Reset Form
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan Customer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Customer</CardTitle>
          <CardDescription>
            Total {pagination.total} customer terdaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={tipePelangganFilter}
              onValueChange={setTipePelangganFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipe Pelanggan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
              </SelectContent>
            </Select>
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
                    <TableHead>Nama Customer</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Limit Kredit</TableHead>
                    <TableHead>Statistik</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.kode}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{customer.nama}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {customer.alamat}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getTipePelangganColor(customer.tipePelanggan)}>
                          {getTipePelangganText(customer.tipePelanggan)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatPhoneNumber(customer.telepon)}
                      </TableCell>
                      <TableCell>
                        {customer.limitKredit
                          ? formatCurrency(customer.limitKredit)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>{customer._count.suratJalan}</span>
                          </Badge>
                          <Badge variant="outline" className="flex items-center space-x-1">
                            <RotateCcw className="h-3 w-3" />
                            <span>{customer._count.returJual}</span>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.aktif ? 'default' : 'secondary'}>
                          {customer.aktif ? 'Aktif' : 'Non-aktif'}
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
                            <DropdownMenuItem onClick={() => handleEdit(customer)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(customer)}
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

              {customers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Belum ada data customer
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Mulai dengan menambahkan customer pertama
                  </p>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Customer
                  </Button>
                </div>
              )}

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Menampilkan {customers.length} dari {pagination.total} data
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

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? 'Edit Customer' : 'Tambah Customer Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? 'Edit informasi customer yang sudah ada.'
                : 'Tambahkan customer baru ke sistem.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 py-4 grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="kode">Kode Customer</Label>
                <Input
                  id="kode"
                  {...register('kode')}
                  placeholder="Contoh: C001"
                  disabled={submitting}
                />
                {errors.kode && (
                  <p className="text-sm text-red-600">{errors.kode.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nama">Nama Customer</Label>
                <Input
                  id="nama"
                  {...register('nama')}
                  placeholder="Contoh: PT. Mega Store"
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
                <Label htmlFor="tipePelanggan">Tipe Pelanggan</Label>
                <Select
                  value={watch('tipePelanggan')}
                  onValueChange={(value) =>
                    setValue('tipePelanggan', value as CustomerType)
                  }
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tipe pelanggan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipePelanggan && (
                  <p className="text-sm text-red-600">{errors.tipePelanggan.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="limitKredit">Limit Kredit</Label>
                <Input
                  id="limitKredit"
                  type="number"
                  {...register('limitKredit', { valueAsNumber: true })}
                  placeholder="0"
                  disabled={submitting}
                />
                {errors.limitKredit && (
                  <p className="text-sm text-red-600">{errors.limitKredit.message}</p>
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
                {submitting ? 'Menyimpan...' : editingCustomer ? 'Perbarui' : 'Simpan'}
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
              Apakah Anda yakin ingin menghapus customer "{selectedCustomer?.nama}"? Tindakan ini tidak dapat dibatalkan.
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
