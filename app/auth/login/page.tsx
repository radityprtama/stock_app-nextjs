"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, Clock, AlertTriangle } from "lucide-react";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { toast } from "sonner";
import {
  Field,
  FieldContent,
  FieldDescription as FieldHint,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams?.get("message");

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("Email, password salah, atau akun belum disetujui");
        toast.error("Login gagal");
      } else {
        toast.success("Login berhasil");
        router.replace(result?.url || "/dashboard");
      }
    } catch (error) {
      setError("Terjadi kesalahan saat login");
      toast.error("Login gagal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-sm border border-border/50">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Login
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Masuk ke sistem inventory management
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            {/* Alert Messages */}
            <div className="space-y-4">
              {message === "registration_pending" && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Registrasi berhasil! Akun Anda sedang menunggu persetujuan
                    dari administrator.
                  </AlertDescription>
                </Alert>
              )}

              {message === "account_inactive" && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Akun Anda belum disetujui atau dinonaktifkan.
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
              {/* Email Field */}
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

              {/* Password Field */}
              <Field data-invalid={Boolean(errors.password)}>
                <div className="flex items-center justify-between mb-1">
                  <FieldLabel htmlFor="password">Password</FieldLabel>

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isLoading}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        Sembunyikan
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Tampilkan
                      </>
                    )}
                  </button>
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

              {/* Submit Button */}
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
