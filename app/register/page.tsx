'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import {
  User,
  Mail,
  Lock,
  Phone,
  Building,
  Eye,
  EyeOff,
  ShieldCheck,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf besar, huruf kecil, dan angka'),
  confirmPassword: z.string(),
  namaLengkap: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  role: z.enum(['staff_gudang', 'sales', 'manager']),
  telepon: z.string().optional(),
  alamat: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      namaLengkap: '',
      role: undefined,
      telepon: '',
      alamat: '',
    },
  })

  const watchedPassword = watch('password')

  const onSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          username: data.username,
          password: data.password,
          namaLengkap: data.namaLengkap,
          role: data.role,
          telepon: data.telepon,
          alamat: data.alamat,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.message)
        setTimeout(() => {
          router.push('/auth/login?message=registration_pending')
        }, 2000)
      } else {
        if (result.details) {
          result.details.forEach((error: any) => {
            toast.error(`${error.field}: ${error.message}`)
          })
        } else {
          toast.error(result.error || 'Registrasi gagal')
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat registrasi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' }

    let strength = 0
    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^a-zA-Z\d]/.test(password),
    ]

    strength = checks.filter(Boolean).length

    if (strength <= 2) return { strength, text: 'Lemah', color: 'text-red-600' }
    if (strength <= 3) return { strength, text: 'Sedang', color: 'text-yellow-600' }
    if (strength <= 4) return { strength, text: 'Kuat', color: 'text-blue-600' }
    return { strength, text: 'Sangat Kuat', color: 'text-green-600' }
  }

  const passwordStrength = getPasswordStrength(watchedPassword || '')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Daftar Akun Baru
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Atau{' '}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              login ke akun yang sudah ada
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Form Registrasi</CardTitle>
            <CardDescription>
              Lengkapi data di bawah untuk membuat akun baru. Akun Anda akan menunggu persetujuan dari administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="namaLengkap" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Nama Lengkap
                  </Label>
                  <Input
                    id="namaLengkap"
                    type="text"
                    placeholder="John Doe"
                    {...register('namaLengkap')}
                    className="mt-1"
                  />
                  {errors.namaLengkap && (
                    <p className="mt-1 text-sm text-red-600">{errors.namaLengkap.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="flex items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...register('email')}
                    className="mt-1"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="username" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    {...register('username')}
                    className="mt-1"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role" className="flex items-center">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Role
                  </Label>
                  <Select onValueChange={(value) => setValue('role', value as any)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Pilih role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff_gudang">Staff Gudang</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="telepon" className="flex items-center">
                    <Phone className="mr-2 h-4 w-4" />
                    Telepon (Opsional)
                  </Label>
                  <Input
                    id="telepon"
                    type="tel"
                    placeholder="+62 812-3456-7890"
                    {...register('telepon')}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="alamat" className="flex items-center">
                    <Building className="mr-2 h-4 w-4" />
                    Alamat (Opsional)
                  </Label>
                  <Textarea
                    id="alamat"
                    placeholder="Masukkan alamat lengkap"
                    rows={3}
                    {...register('alamat')}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label htmlFor="password" className="flex items-center">
                    <Lock className="mr-2 h-4 w-4" />
                    Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('password')}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                  )}
                  {watchedPassword && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Kekuatan Password:</span>
                        <span className={passwordStrength.color}>{passwordStrength.text}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${passwordStrength.color.replace('text', 'bg')} ${
                            passwordStrength.strength === 0 ? 'w-0' : ''
                          } ${passwordStrength.strength === 1 ? 'w-1/5' : ''} ${
                            passwordStrength.strength === 2 ? 'w-2/5' : ''
                          } ${passwordStrength.strength === 3 ? 'w-3/5' : ''} ${
                            passwordStrength.strength === 4 ? 'w-4/5' : ''
                          } ${passwordStrength.strength === 5 ? 'w-full' : ''}`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="flex items-center">
                    <Lock className="mr-2 h-4 w-4" />
                    Konfirmasi Password
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('confirmPassword')}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              {/* Approval Notice */}
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Menunggu Persetujuan</AlertTitle>
                <AlertDescription>
                  Setelah registrasi, akun Anda akan ditinjau oleh administrator sebelum dapat digunakan.
                  Anda akan menerima notifikasi ketika akun disetujui.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Mendaftar...' : 'Daftar Sekarang'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Sudah punya akun?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Login di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
