'use client'

import { useState, useEffect } from 'react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  Building,
  Package,
  Truck,
  FileText,
  Warehouse,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatPhoneNumber } from '@/lib/utils'
import { GudangFormData, gudangSchema } from '@/lib/validations'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface Gudang {
  id: string
  kode: string
  nama: string
  alamat: string
  telepon?: string
  pic?: string
  aktif: boolean
  createdAt: string
  updatedAt: string
  _count: {
    stokBarang: number
    barangMasuk: number
    suratJalan: number
  }
}

type GudangFormValues = z.input<typeof gudangSchema>
const defaultGudangFormValues: GudangFormValues = {
  kode: '',
  nama: '',
  alamat: '',
  telepon: '',
  pic: '',
  aktif: true,
}

export default function GudangPage() {
  const [gudangs, setGudangs] = useState<Gudang[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGudang, setEditingGudang] = useState<Gudang | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedGudang, setSelectedGudang] = useState<Gudang | null>(null)
  const [activeTab, setActiveTab] = useState('browse')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<GudangFormValues>({
    resolver: zodResolver(gudangSchema),
    defaultValues: defaultGudangFormValues,
  })

  const fetchGudangs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      })

      const response = await fetch(`/api/master/gudang?${params}`)
      const result = await response.json()

      if (result.success) {
        setGudangs(result.data)
        setPagination(result.pagination)
      } else {
        toast.error('Gagal mengambil data gudang')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGudangs()
  }, [pagination.page, search])

  const onSubmit = async (data: GudangFormValues, isTabSubmit: boolean = false) => {
    setSubmitting(true)
    try {
      const payload: GudangFormData = gudangSchema.parse(data)
      const url = editingGudang
        ? `/api/master/gudang/${editingGudang.id}`
        : '/api/master/gudang'
      const method = editingGudang ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(
          editingGudang
            ? 'Gudang berhasil diperbarui'
            : 'Gudang berhasil ditambahkan'
        )
        if (!isTabSubmit) {
          setDialogOpen(false)
        }
        reset(defaultGudangFormValues)
        setEditingGudang(null)
        fetchGudangs()
        if (isTabSubmit) {
          setActiveTab('browse')
        }
      } else {
        toast.error(result.error || 'Gagal menyimpan data')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (gudang: Gudang) => {
    setEditingGudang(gudang)
    setValue('kode', gudang.kode)
    setValue('nama', gudang.nama)
    setValue('alamat', gudang.alamat)
    setValue('telepon', gudang.telepon ?? '')
    setValue('pic', gudang.pic ?? '')
    setValue('aktif', gudang.aktif)
    setDialogOpen(true)
  }

  const openDeleteDialog = (gudang: Gudang) => {
    setSelectedGudang(gudang)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedGudang) return

    try {
      const response = await fetch(`/api/master/gudang/${selectedGudang.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Gudang berhasil dihapus')
        setDeleteDialogOpen(false)
        setSelectedGudang(null)
        fetchGudangs()
      } else {
        toast.error(result.error || 'Gagal menghapus gudang')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghapus gudang')
    }
  }

  const openAddDialog = () => {
    setEditingGudang(null)
    reset(defaultGudangFormValues)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Master Gudang</h1>
        <p className="text-muted-foreground">
          Kelola data gudang dan lokasi penyimpanan barang
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse" className="flex items-center gap-2">
            <Warehouse className="h-4 w-4" />
            Browse Data
          </TabsTrigger>
          <TabsTrigger value="input" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Input Gudang
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Gudang</CardTitle>
              <CardDescription>
                Total {pagination.total} gudang terdaftar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari gudang..."
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
                        <TableHead>Nama Gudang</TableHead>
                        <TableHead>Alamat</TableHead>
                        <TableHead>PIC</TableHead>
                        <TableHead>Telepon</TableHead>
                        <TableHead>Statistik</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gudangs.map((gudang) => (
                        <TableRow key={gudang.id}>
                          <TableCell className="font-medium">{gudang.kode}</TableCell>
                          <TableCell>{gudang.nama}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {gudang.alamat}
                          </TableCell>
                          <TableCell>{gudang.pic || '-'}</TableCell>
                          <TableCell>
                            {gudang.telepon ? formatPhoneNumber(gudang.telepon) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Badge variant="secondary" className="flex items-center space-x-1">
                                <Package className="h-3 w-3" />
                                <span>{gudang._count.stokBarang}</span>
                              </Badge>
                              <Badge variant="outline" className="flex items-center space-x-1">
                                <Truck className="h-3 w-3" />
                                <span>{gudang._count.barangMasuk}</span>
                              </Badge>
                              <Badge variant="outline" className="flex items-center space-x-1">
                                <FileText className="h-3 w-3" />
                                <span>{gudang._count.suratJalan}</span>
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={gudang.aktif ? 'default' : 'secondary'}>
                              {gudang.aktif ? 'Aktif' : 'Non-aktif'}
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
                                <DropdownMenuItem onClick={() => handleEdit(gudang)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openDeleteDialog(gudang)}
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

                  {gudangs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Building className="h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Belum ada data gudang
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Mulai dengan menambahkan gudang pertama
                      </p>
                      <Button onClick={() => setActiveTab('input')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Gudang
                      </Button>
                    </div>
                  )}

                  {pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-gray-500">
                        Menampilkan {gudangs.length} dari {pagination.total} data
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

        <TabsContent value="input" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Gudang Baru</CardTitle>
              <CardDescription>
                Tambahkan data gudang baru ke sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((data) => onSubmit(data, true))} className="space-y-6">
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="kode-tab">Kode Gudang</Label>
                    <Input
                      id="kode-tab"
                      {...register('kode')}
                      placeholder="Contoh: G001"
                      disabled={submitting}
                    />
                    {errors.kode && (
                      <p className="text-sm text-red-600">{errors.kode.message}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="nama-tab">Nama Gudang</Label>
                    <Input
                      id="nama-tab"
                      {...register('nama')}
                      placeholder="Contoh: Gudang Utama"
                      disabled={submitting}
                    />
                    {errors.nama && (
                      <p className="text-sm text-red-600">{errors.nama.message}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="alamat-tab">Alamat</Label>
                    <Textarea
                      id="alamat-tab"
                      {...register('alamat')}
                      placeholder="Masukkan alamat lengkap"
                      disabled={submitting}
                      rows={3}
                    />
                    {errors.alamat && (
                      <p className="text-sm text-red-600">{errors.alamat.message}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="telepon-tab">Telepon</Label>
                    <Input
                      id="telepon-tab"
                      {...register('telepon')}
                      placeholder="Contoh: 021-1234567"
                      disabled={submitting}
                    />
                    {errors.telepon && (
                      <p className="text-sm text-red-600">{errors.telepon.message}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="pic-tab">PIC (Person in Charge)</Label>
                    <Input
                      id="pic-tab"
                      {...register('pic')}
                      placeholder="Nama penanggung jawab"
                      disabled={submitting}
                    />
                    {errors.pic && (
                      <p className="text-sm text-red-600">{errors.pic.message}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="aktif-tab"
                      checked={editingGudang ? editingGudang.aktif : true}
                      onCheckedChange={(checked) => setValue('aktif', checked)}
                      disabled={submitting}
                    />
                    <Label htmlFor="aktif-tab">Aktif</Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset(defaultGudangFormValues)
                      setActiveTab('browse')
                    }}
                    disabled={submitting}
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Menyimpan...' : 'Simpan Gudang'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog - preserved for editing functionality */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Gudang</DialogTitle>
            <DialogDescription>
              Edit informasi gudang yang sudah ada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((data) => onSubmit(data, false))}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="kode-edit">Kode Gudang</Label>
                <Input
                  id="kode-edit"
                  {...register('kode')}
                  placeholder="Contoh: G001"
                  disabled={submitting}
                />
                {errors.kode && (
                  <p className="text-sm text-red-600">{errors.kode.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nama-edit">Nama Gudang</Label>
                <Input
                  id="nama-edit"
                  {...register('nama')}
                  placeholder="Contoh: Gudang Utama"
                  disabled={submitting}
                />
                {errors.nama && (
                  <p className="text-sm text-red-600">{errors.nama.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="alamat-edit">Alamat</Label>
                <Textarea
                  id="alamat-edit"
                  {...register('alamat')}
                  placeholder="Masukkan alamat lengkap"
                  disabled={submitting}
                />
                {errors.alamat && (
                  <p className="text-sm text-red-600">{errors.alamat.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telepon-edit">Telepon</Label>
                <Input
                  id="telepon-edit"
                  {...register('telepon')}
                  placeholder="Contoh: 021-1234567"
                  disabled={submitting}
                />
                {errors.telepon && (
                  <p className="text-sm text-red-600">{errors.telepon.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pic-edit">PIC (Person in Charge)</Label>
                <Input
                  id="pic-edit"
                  {...register('pic')}
                  placeholder="Nama penanggung jawab"
                  disabled={submitting}
                />
                {errors.pic && (
                  <p className="text-sm text-red-600">{errors.pic.message}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="aktif-edit"
                  checked={editingGudang ? editingGudang.aktif : true}
                  onCheckedChange={(checked) => setValue('aktif', checked)}
                  disabled={submitting}
                />
                <Label htmlFor="aktif-edit">Aktif</Label>
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
                {submitting ? 'Menyimpan...' : 'Perbarui'}
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
              Apakah Anda yakin ingin menghapus gudang "{selectedGudang?.nama}"? Tindakan ini tidak dapat dibatalkan.
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
