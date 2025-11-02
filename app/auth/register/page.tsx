'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, User, Mail, Lock, Phone, Building, Eye, EyeOff, ShieldCheck, Clock } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Field,
  FieldContent,
  FieldDescription as FieldHint,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { cn } from '@/lib/utils'

const roleOptions = ['super_admin', 'admin', 'manager', 'staff_gudang', 'sales'] as const

const registerSchema = z
  .object({
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
    role: z.enum(roleOptions),
    telepon: z.string().optional(),
    alamat: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

const defaultValues: Partial<RegisterFormValues> = {
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  namaLengkap: '',
  role: undefined,
  telepon: '',
  alamat: '',
}

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues,
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
          result.details.forEach((error: { field: string; message: string }) => {
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
    if (!password) {
      return {
        score: 0,
        label: '',
        textClass: 'text-muted-foreground',
        barClass: 'bg-muted',
      }
    }

    const checks = [
      password.length >= 8,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^a-zA-Z\d]/.test(password),
    ]

    const score = checks.filter(Boolean).length

    if (score <= 2) {
      return {
        score,
        label: 'Lemah',
        textClass: 'text-red-600',
        barClass: 'bg-red-500',
      }
    }

    if (score === 3) {
      return {
        score,
        label: 'Sedang',
        textClass: 'text-yellow-600',
        barClass: 'bg-yellow-500',
      }
    }

    if (score === 4) {
      return {
        score,
        label: 'Kuat',
        textClass: 'text-blue-600',
        barClass: 'bg-blue-500',
      }
    }

    return {
      score,
      label: 'Sangat Kuat',
      textClass: 'text-green-600',
      barClass: 'bg-green-500',
    }
  }

  const passwordStrength = getPasswordStrength(watchedPassword || '')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Daftar Akun Baru</h2>
          <p className="mt-2 text-sm text-gray-600">
            Atau{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              login ke akun yang sudah ada
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-center">Form Registrasi</CardTitle>
            <CardDescription className="text-center">
              Lengkapi data berikut untuk membuat akun baru. Akun akan menunggu persetujuan administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
              <FieldSet>
                <FieldLegend>Informasi Pengguna</FieldLegend>
                <FieldGroup className="gap-6">
                  <Field data-invalid={Boolean(errors.namaLengkap)}>
                    <FieldLabel htmlFor="namaLengkap" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nama Lengkap
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="namaLengkap"
                        autoComplete="name"
                        placeholder="John Doe"
                        disabled={isSubmitting}
                        {...register('namaLengkap')}
                      />
                      <FieldHint>Gunakan nama lengkap sesuai identitas.</FieldHint>
                      <FieldError errors={errors.namaLengkap ? [errors.namaLengkap] : undefined} />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(errors.email)}>
                    <FieldLabel htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="john@example.com"
                        disabled={isSubmitting}
                        {...register('email')}
                      />
                      <FieldHint>Email digunakan sebagai akun login dan notifikasi.</FieldHint>
                      <FieldError errors={errors.email ? [errors.email] : undefined} />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(errors.username)}>
                    <FieldLabel htmlFor="username" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Username
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="username"
                        autoComplete="username"
                        placeholder="johndoe"
                        disabled={isSubmitting}
                        {...register('username')}
                      />
                      <FieldHint>Hanya huruf, angka, dan underscore tanpa spasi.</FieldHint>
                      <FieldError errors={errors.username ? [errors.username] : undefined} />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(errors.role)}>
                    <FieldLabel htmlFor="role" className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Role
                    </FieldLabel>
                    <FieldContent>
                      <Controller
                        name="role"
                        control={control}
                        render={({ field }) => (
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger id="role">
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
                      <FieldHint>Tentukan peran sesuai akses yang dibutuhkan.</FieldHint>
                      <FieldError
                        errors={
                          errors.role
                            ? [
                                {
                                  message:
                                    errors.role.message &&
                                    errors.role.message.includes('Expected')
                                      ? 'Role wajib dipilih'
                                      : errors.role.message,
                                },
                              ]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </FieldSet>

              <FieldSet>
                <FieldLegend>Kontak &amp; Alamat</FieldLegend>
                <FieldGroup className="gap-6">
                  <Field>
                    <FieldLabel htmlFor="telepon" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telepon (Opsional)
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="telepon"
                        type="tel"
                        placeholder="+62 812-3456-7890"
                        disabled={isSubmitting}
                        {...register('telepon')}
                      />
                      <FieldHint>Opsional. Nomor akan membantu tim menghubungi Anda.</FieldHint>
                    </FieldContent>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="alamat" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Alamat (Opsional)
                    </FieldLabel>
                    <FieldContent>
                      <Textarea
                        id="alamat"
                        placeholder="Masukkan alamat lengkap"
                        rows={3}
                        disabled={isSubmitting}
                        {...register('alamat')}
                      />
                      <FieldHint>Opsional. Cantumkan alamat lokasi kerja atau gudang.</FieldHint>
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </FieldSet>

              <FieldSet>
                <FieldLegend>Keamanan Akun</FieldLegend>
                <FieldGroup className="gap-6">
                  <Field data-invalid={Boolean(errors.password)}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="password" className="m-0 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Password
                      </FieldLabel>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm"
                        onClick={() => setShowPassword((prev) => !prev)}
                        disabled={isSubmitting}
                      >
                        {showPassword ? (
                          <span className="flex items-center gap-1">
                            <EyeOff className="h-4 w-4" />
                            Sembunyikan
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            Tampilkan
                          </span>
                        )}
                      </Button>
                    </div>
                    <FieldContent>
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        {...register('password')}
                      />
                      <FieldHint>Minimal 8 karakter dengan kombinasi huruf besar, kecil, dan angka.</FieldHint>
                      {watchedPassword && (
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span>Kekuatan password</span>
                            <span className={passwordStrength.textClass}>{passwordStrength.label}</span>
                          </div>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <span
                                key={index}
                                className={cn(
                                  'h-1.5 flex-1 rounded-full bg-muted transition-colors',
                                  index < passwordStrength.score ? passwordStrength.barClass : 'bg-muted'
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      <FieldError errors={errors.password ? [errors.password] : undefined} />
                    </FieldContent>
                  </Field>

                  <Field data-invalid={Boolean(errors.confirmPassword)}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="confirmPassword" className="m-0 flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Konfirmasi Password
                      </FieldLabel>
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-sm"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? (
                          <span className="flex items-center gap-1">
                            <EyeOff className="h-4 w-4" />
                            Sembunyikan
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            Tampilkan
                          </span>
                        )}
                      </Button>
                    </div>
                    <FieldContent>
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        disabled={isSubmitting}
                        {...register('confirmPassword')}
                      />
                      <FieldHint>Masukkan ulang password untuk memastikan kesesuaian.</FieldHint>
                      <FieldError errors={errors.confirmPassword ? [errors.confirmPassword] : undefined} />
                    </FieldContent>
                  </Field>
                </FieldGroup>
              </FieldSet>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertTitle>Menunggu Persetujuan</AlertTitle>
                <AlertDescription>
                  Setelah registrasi, akun Anda akan ditinjau oleh administrator sebelum dapat digunakan.
                  Anda akan menerima notifikasi ketika akun disetujui.
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Daftar Sekarang
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Sudah punya akun?{' '}
            <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500">
              Login di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
