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
  Tag,
  Package,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { GolonganFormData, golonganSchema } from '@/lib/validations'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

interface Golongan {
  id: string
  kode: string
  nama: string
  deskripsi?: string
  aktif: boolean
  createdAt: string
  updatedAt: string
  _count: {
    barang: number
  }
}

export default function GolonganPage() {
  const [golongans, setGolongans] = useState<Golongan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGolongan, setEditingGolongan] = useState<Golongan | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<GolonganFormData>({
    resolver: zodResolver(golonganSchema),
  })

  const fetchGolongans = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      })

      const response = await fetch(`/api/master/golongan?${params}`)
      const result = await response.json()

      if (result.success) {
        setGolongans(result.data)
        setPagination(result.pagination)
      } else {
        toast.error('Gagal mengambil data golongan')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGolongans()
  }, [pagination.page, search])

  const onSubmit = async (data: GolonganFormData) => {
    setSubmitting(true)
    try {
      const url = editingGolongan
        ? `/api/master/golongan/${editingGolongan.id}`
        : '/api/master/golongan'
      const method = editingGolongan ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(
          editingGolongan
            ? 'Golongan berhasil diperbarui'
            : 'Golongan berhasil ditambahkan'
        )
        setDialogOpen(false)
        reset()
        setEditingGolongan(null)
        fetchGolongans()
      } else {
        toast.error(result.error || 'Gagal menyimpan data')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (golongan: Golongan) => {
    setEditingGolongan(golongan)
    setValue('kode', golongan.kode)
    setValue('nama', golongan.nama)
    setValue('deskripsi', golongan.deskripsi || '')
    setValue('aktif', golongan.aktif)
    setDialogOpen(true)
  }

  const handleDelete = async (golongan: Golongan) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus golongan "${golongan.nama}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/master/golongan/${golongan.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Golongan berhasil dihapus')
        fetchGolongans()
      } else {
        toast.error(result.error || 'Gagal menghapus golongan')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghapus golongan')
    }
  }

  const openAddDialog = () => {
    setEditingGolongan(null)
    reset()
    setValue('aktif', true)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Master Golongan</h1>
          <p className="text-muted-foreground">
            Kelola data golongan atau kategori barang
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Golongan
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingGolongan ? 'Edit Golongan' : 'Tambah Golongan Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingGolongan
                  ? 'Edit informasi golongan yang sudah ada.'
                  : 'Tambahkan golongan baru ke sistem.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="kode">Kode Golongan</Label>
                  <Input
                    id="kode"
                    {...register('kode')}
                    placeholder="Contoh: GL001"
                    disabled={submitting}
                  />
                  {errors.kode && (
                    <p className="text-sm text-red-600">{errors.kode.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nama">Nama Golongan</Label>
                  <Input
                    id="nama"
                    {...register('nama')}
                    placeholder="Contoh: Elektronik"
                    disabled={submitting}
                  />
                  {errors.nama && (
                    <p className="text-sm text-red-600">{errors.nama.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deskripsi">Deskripsi</Label>
                  <Textarea
                    id="deskripsi"
                    {...register('deskripsi')}
                    placeholder="Masukkan deskripsi golongan"
                    disabled={submitting}
                    rows={3}
                  />
                  {errors.deskripsi && (
                    <p className="text-sm text-red-600">{errors.deskripsi.message}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="aktif"
                    checked={editingGolongan ? editingGolongan.aktif : true}
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
                  {submitting ? 'Menyimpan...' : editingGolongan ? 'Perbarui' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Golongan</CardTitle>
          <CardDescription>
            Total {pagination.total} golongan terdaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari golongan..."
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
                    <TableHead>Nama Golongan</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Statistik</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {golongans.map((golongan) => (
                    <TableRow key={golongan.id}>
                      <TableCell className="font-medium">{golongan.kode}</TableCell>
                      <TableCell>{golongan.nama}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {golongan.deskripsi || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <Package className="h-3 w-3" />
                            <span>{golongan._count.barang}</span>
                          </Badge>
                          <Badge variant="outline" className="flex items-center space-x-1">
                            <BarChart3 className="h-3 w-3" />
                            <span>Barang</span>
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={golongan.aktif ? 'default' : 'secondary'}>
                          {golongan.aktif ? 'Aktif' : 'Non-aktif'}
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
                            <DropdownMenuItem onClick={() => handleEdit(golongan)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(golongan)}
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

              {golongans.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Tag className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Belum ada data golongan
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Mulai dengan menambahkan golongan pertama
                  </p>
                  <Button onClick={openAddDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Golongan
                  </Button>
                </div>
              )}

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Menampilkan {golongans.length} dari {pagination.total} data
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
    </div>
  )
}