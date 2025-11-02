'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Eye, EyeOff, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { loginSchema, type LoginFormData } from '@/lib/validations'
import { toast } from 'sonner'
import { Field, FieldContent, FieldDescription as FieldHint, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams?.get('message')

  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: '/dashboard',
      })

      if (result?.error) {
        setError('Email, password salah, atau akun belum disetujui')
        toast.error('Login gagal')
      } else {
        toast.success('Login berhasil')
        if (result?.url) {
          router.replace(result.url)
        } else {
          router.replace('/dashboard')
        }
      }
    } catch (error) {
      setError('Terjadi kesalahan saat login')
      toast.error('Login gagal')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Login
          </CardTitle>
          <CardDescription className="text-center">
            Masuk ke sistem inventory management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <div className="space-y-4">
              {message === "registration_pending" && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Registrasi berhasil! Akun Anda sedang menunggu persetujuan
                    dari administrator. Anda akan menerima notifikasi ketika
                    akun disetujui.
                  </AlertDescription>
                </Alert>
              )}

              {message === "account_inactive" && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Akun Anda belum disetujui atau telah dinonaktifkan. Silakan
                    hubungi administrator.
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <FieldGroup>
              <Field data-invalid={Boolean(errors.email)}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <FieldContent>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    {...register("email")}
                    disabled={isLoading}
                  />
                  <FieldError
                    errors={errors.email ? [errors.email] : undefined}
                  />
                </FieldContent>
              </Field>

              <Field data-invalid={Boolean(errors.password)}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password" className="m-0">
                    Password
                  </FieldLabel>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                  >
                    {showPassword ? "Sembunyikan" : "Tampilkan"}
                  </Button>
                </div>
                <FieldContent>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    disabled={isLoading}
                  />
                  <FieldError
                    errors={errors.password ? [errors.password] : undefined}
                  />
                </FieldContent>
              </Field>

              <Field>
                <FieldContent className="flex flex-col gap-3">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Masuk
                  </Button>
                  <FieldHint className="text-center">
                    Belum punya akun?{" "}
                    <Link
                      href="/auth/register"
                      className="underline underline-offset-4"
                    >
                      Daftar sekarang
                    </Link>
                  </FieldHint>
                </FieldContent>
              </Field>
            </FieldGroup>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Akun Demo:</strong>
              </p>
              <p className="text-sm text-blue-700">Email: admin@example.com</p>
              <p className="text-sm text-blue-700">Password: admin123</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
                                                                                                                                                                                                                                                                      }
