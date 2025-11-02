'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Key,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Filter,
  UserPlus,
  Lock,
  Unlock,
  Package,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

interface User {
  id: string
  email: string
  username: string
  namaLengkap: string
  role: string
  telepon?: string
  alamat?: string
  profileImage?: string
  aktif: boolean
  approved: boolean
  approvedAt?: string
  lastLoginAt?: string
  loginAttempts: number
  lockedUntil?: string
  createdAt: string
  updatedAt: string
  approvedByUser?: {
    id: string
    namaLengkap: string
    email: string
  }
}

interface UserStatistics {
  totalUsers: number
  approvedUsers: number
  pendingUsers: number
  activeUsers: number
  inactiveUsers: number
  lockedUsers: number
}

const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  namaLengkap: z.string().min(2),
  role: z.enum(['super_admin', 'admin', 'manager', 'staff_gudang', 'sales']),
  telepon: z.string().optional(),
  alamat: z.string().optional(),
  aktif: z.boolean().default(true),
})

const approveUserSchema = z.object({
  approved: z.boolean(),
  role: z.enum(['super_admin', 'admin', 'manager', 'staff_gudang', 'sales']).optional(),
})

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
})

type CreateUserFormValues = z.infer<typeof createUserSchema>
type CreateUserFormInputs = z.input<typeof createUserSchema>
type ApproveUserFormValues = z.infer<typeof approveUserSchema>
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [statistics, setStatistics] = useState<UserStatistics>({
    totalUsers: 0,
    approvedUsers: 0,
    pendingUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    lockedUsers: 0,
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedApproved, setSelectedApproved] = useState('')
  const [selectedAktif, setSelectedAktif] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false)
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Form states
  const [submitting, setSubmitting] = useState(false)

  const {
    register: registerCreate,
    handleSubmit: handleCreateSubmit,
    reset: resetCreate,
    control: createControl,
    formState: { errors: createErrors },
  } = useForm<CreateUserFormInputs>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      aktif: true,
      role: 'staff_gudang',
    },
  })

  const {
    register: registerApprove,
    handleSubmit: handleApproveSubmit,
    setValue: setApproveValue,
    watch: watchApprove,
    reset: resetApprove,
  } = useForm<ApproveUserFormValues>()

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    reset: resetReset,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const watchedApproved = watchApprove('approved')

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
      })

      if (selectedRole) params.append('role', selectedRole)
      if (selectedApproved !== '') params.append('approved', selectedApproved)
      if (selectedAktif !== '') params.append('aktif', selectedAktif)

      const response = await fetch(`/api/users?${params}`)
      const result = await response.json()

      if (result.success) {
        setUsers(result.data)
        setPagination(result.pagination)

        // Calculate statistics
        const stats: UserStatistics = {
          totalUsers: result.data.length,
          approvedUsers: result.data.filter((u: User) => u.approved).length,
          pendingUsers: result.data.filter((u: User) => !u.approved).length,
          activeUsers: result.data.filter((u: User) => u.aktif).length,
          inactiveUsers: result.data.filter((u: User) => !u.aktif).length,
          lockedUsers: result.data.filter((u: User) => u.lockedUntil && new Date(u.lockedUntil) > new Date()).length,
        }
        setStatistics(stats)
      } else {
        toast.error('Gagal mengambil data users')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengambil data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, search, selectedRole, selectedApproved, selectedAktif])

  const handleCreateUser = async (data: CreateUserFormInputs) => {
    const parsedData = createUserSchema.parse(data)

    setSubmitting(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedData),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('User berhasil dibuat')
        setCreateDialogOpen(false)
        resetCreate()
        fetchUsers()
      } else {
        toast.error(result.error || 'Gagal membuat user')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat membuat user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveUser = async (data: ApproveUserFormValues) => {
    if (!selectedUser) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          action: 'approve'
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        setApproveDialogOpen(false)
        resetApprove()
        setSelectedUser(null)
        fetchUsers()
      } else {
        toast.error(result.error || 'Gagal mengupdate user')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mengupdate user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (data: ResetPasswordFormValues) => {
    if (!selectedUser) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        setResetPasswordDialogOpen(false)
        resetReset()
        setSelectedUser(null)
      } else {
        toast.error(result.error || 'Gagal reset password')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat reset password')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user "${user.namaLengkap}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('User berhasil dihapus')
        fetchUsers()
      } else {
        toast.error(result.error || 'Gagal menghapus user')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menghapus user')
    }
  }

  const handleViewUser = async (user: User) => {
    setSelectedUser(user)
    setViewDialogOpen(true)
  }

  const openApproveDialog = (user: User) => {
    setSelectedUser(user)
    setApproveValue('approved', !user.approved)
    setApproveValue('role', user.role as any)
    setApproveDialogOpen(true)
  }

  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user)
    resetReset()
    setResetPasswordDialogOpen(true)
  }

  const formatDate = (dateValue: string) => {
    return format(new Date(dateValue), 'dd MMM yyyy, HH:mm', { locale: id })
  }

  const getStatusBadge = (user: User) => {
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return <Badge variant="destructive"><Lock className="w-3 h-3 mr-1" />Terlocked</Badge>
    }
    if (!user.aktif) {
      return <Badge variant="secondary"><UserX className="w-3 h-3 mr-1" />Non-aktif</Badge>
    }
    if (!user.approved) {
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
    }
    return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Aktif</Badge>
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      super_admin: { variant: 'destructive' as const, icon: Shield, label: 'Super Admin' },
      admin: { variant: 'default' as const, icon: ShieldCheck, label: 'Admin' },
      manager: { variant: 'secondary' as const, icon: Users, label: 'Manager' },
      staff_gudang: { variant: 'outline' as const, icon: Package, label: 'Staff Gudang' },
      sales: { variant: 'outline' as const, icon: TrendingUp, label: 'Sales' },
    }

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.staff_gudang
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center">
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const clearFilters = () => {
    setSelectedRole('')
    setSelectedApproved('')
    setSelectedAktif('')
    setSearch('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen User</h1>
          <p className="text-muted-foreground">
            Kelola user dan persetujuan registrasi
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Tambah User
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total User</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disetujui</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.approvedUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statistics.pendingUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.activeUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non-aktif</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{statistics.inactiveUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Terlocked</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statistics.lockedUsers}</div>
          </CardContent>
        </Card>
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
                placeholder="Cari user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={selectedRole || undefined}
              onValueChange={(value) => setSelectedRole(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff_gudang">Staff Gudang</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedApproved || undefined}
              onValueChange={(value) => setSelectedApproved(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status Persetujuan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="true">Disetujui</SelectItem>
                <SelectItem value="false">Menunggu</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedAktif || undefined}
              onValueChange={(value) => setSelectedAktif(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status Aktif" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="true">Aktif</SelectItem>
                <SelectItem value="false">Non-aktif</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar User</CardTitle>
          <CardDescription>
            Total {pagination.total} user terdaftar
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
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Terakhir Login</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.namaLengkap}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">@{user.username}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getStatusBadge(user)}
                            {user.approvedByUser && (
                              <div className="text-xs text-gray-500">
                                Disetujui oleh {user.approvedByUser.namaLengkap}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt ? (
                            <div>
                              <div className="text-sm">{formatDate(user.lastLoginAt)}</div>
                              {user.loginAttempts > 0 && (
                                <div className="text-xs text-orange-600">
                                  {user.loginAttempts} failed attempts
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Belum login</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(user.createdAt)}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewUser(user)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Detail
                              </DropdownMenuItem>

                              {!user.approved && (
                                <DropdownMenuItem onClick={() => openApproveDialog(user)}>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Setujui
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem onClick={() => openResetPasswordDialog(user)}>
                                <Key className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`Toggle status aktif untuk ${user.namaLengkap}?`)) {
                                    // TODO: Implement toggle active status
                                  }
                                }}
                              >
                                {user.aktif ? (
                                  <UserX className="mr-2 h-4 w-4" />
                                ) : (
                                  <UserCheck className="mr-2 h-4 w-4" />
                                )}
                                {user.aktif ? 'Non-aktifkan' : 'Aktifkan'}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(user)}
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
              </div>

              {users.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Tidak ada user
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Mulai dengan menambah user pertama
                  </p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Tambah User
                  </Button>
                </div>
              )}

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-500">
                    Menampilkan {users.length} dari {pagination.total} data
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

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Tambah User Baru</DialogTitle>
            <DialogDescription>
              Buat user baru dengan akses langsung (tanpa persetujuan)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit(handleCreateUser)}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="namaLengkap">Nama Lengkap</Label>
                  <Input
                    id="namaLengkap"
                    {...registerCreate('namaLengkap')}
                    className="mt-1"
                  />
                  {createErrors.namaLengkap && (
                    <p className="mt-1 text-sm text-red-600">{createErrors.namaLengkap.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...registerCreate('email')}
                    className="mt-1"
                  />
                  {createErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{createErrors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    {...registerCreate('username')}
                    className="mt-1"
                  />
                  {createErrors.username && (
                    <p className="mt-1 text-sm text-red-600">{createErrors.username.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Controller
                    control={createControl}
                    name="role"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => field.onChange(value as CreateUserFormInputs['role'])}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Pilih role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff_gudang">Staff Gudang</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...registerCreate('password')}
                  className="mt-1"
                />
                {createErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{createErrors.password.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telepon">Telepon</Label>
                  <Input
                    id="telepon"
                    {...registerCreate('telepon')}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="alamat">Alamat</Label>
                  <Input
                    id="alamat"
                    {...registerCreate('alamat')}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detail User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Lengkap</Label>
                  <p className="font-medium">{selectedUser.namaLengkap}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label>Username</Label>
                  <p className="font-medium">@{selectedUser.username}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                </div>
                <div>
                  <Label>Telepon</Label>
                  <p className="font-medium">{selectedUser.telepon || '-'}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedUser)}</div>
                </div>
                <div>
                  <Label>Dibuat</Label>
                  <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <Label>Terakhir Update</Label>
                  <p className="font-medium">{formatDate(selectedUser.updatedAt)}</p>
                </div>
                <div>
                  <Label>Terakhir Login</Label>
                  <p className="font-medium">
                    {selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : 'Belum login'}
                  </p>
                </div>
                <div>
                  <Label>Login Attempts</Label>
                  <p className="font-medium">{selectedUser.loginAttempts}</p>
                </div>
              </div>

              {selectedUser.alamat && (
                <div>
                  <Label>Alamat</Label>
                  <p className="font-medium">{selectedUser.alamat}</p>
                </div>
              )}

              {selectedUser.approvedByUser && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>User Disetujui</AlertTitle>
                  <AlertDescription>
                    Disetujui oleh {selectedUser.approvedByUser.namaLengkap} ({selectedUser.approvedByUser.email})
                    pada {selectedUser.approvedAt ? formatDate(selectedUser.approvedAt) : '-'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve User Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {watchedApproved ? 'Setujui User' : 'Batalkan Persetujuan'}
            </DialogTitle>
            <DialogDescription>
              {watchedApproved
                ? 'Setujui user agar dapat login ke sistem'
                : 'Batalkan persetujuan user'}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleApproveSubmit(handleApproveUser)}>
              <div className="space-y-4 py-4">
                <div>
                  <Label>User</Label>
                  <p className="font-medium">{selectedUser.namaLengkap} ({selectedUser.email})</p>
                </div>

                <div>
                  <Label htmlFor="approved">Status Persetujuan</Label>
                  <div className="mt-2">
                    <Switch
                      id="approved"
                      checked={watchedApproved}
                      onCheckedChange={(checked) => setApproveValue('approved', checked)}
                    />
                    <span className="ml-2">
                      {watchedApproved ? 'Disetujui' : 'Menunggu Persetujuan'}
                    </span>
                  </div>
                </div>

                {watchedApproved && (
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={watchApprove('role')}
                      onValueChange={(value) => setApproveValue('role', value as any)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff_gudang">Staff Gudang</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApproveDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password untuk user: <strong>{selectedUser?.namaLengkap}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetSubmit(handleResetPassword)}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="newPassword">Password Baru</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...registerReset('newPassword')}
                  className="mt-1"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetPasswordDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Mereset...' : 'Reset Password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
