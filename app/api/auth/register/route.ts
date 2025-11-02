import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'

const registerSchema = z.object({
  email: z.string().email('Email tidak valid'),
  username: z.string().min(3, 'Username minimal 3 karakter').regex(/^[a-zA-Z0-9_]+$/, 'Username hanya boleh huruf, angka, dan underscore'),
  password: z.string().min(8, 'Password minimal 8 karakter').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf besar, huruf kecil, dan angka'),
  namaLengkap: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  role: z.enum(['staff_gudang', 'sales', 'manager']).default('staff_gudang'),
  telepon: z.string().optional(),
  alamat: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Check if email or username already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { username: validatedData.username }
        ]
      }
    })

    if (existingUser) {
      if (existingUser.email === validatedData.email) {
        return NextResponse.json({
          success: false,
          error: 'Email sudah terdaftar'
        }, { status: 400 })
      }
      if (existingUser.username === validatedData.username) {
        return NextResponse.json({
          success: false,
          error: 'Username sudah digunakan'
        }, { status: 400 })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    // Create user with pending approval status
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        username: validatedData.username,
        password: hashedPassword,
        namaLengkap: validatedData.namaLengkap,
        role: validatedData.role,
        telepon: validatedData.telepon,
        alamat: validatedData.alamat,
        approved: false, // Need admin approval
        aktif: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        namaLengkap: true,
        role: true,
        approved: true,
        createdAt: true,
      }
    })

    // Send notification to all super_admin users
    const superAdmins = await prisma.user.findMany({
      where: {
        role: 'super_admin',
        aktif: true,
        approved: true
      },
      select: { id: true }
    })

    // Notify all super admins about new user registration
    for (const admin of superAdmins) {
      await sendNotification({
        userId: admin.id,
        type: 'info',
        title: 'Registrasi User Baru',
        message: `${validatedData.namaLengkap} (${validatedData.email}) mendaftar sebagai ${validatedData.role.replace('_', ' ')}. Menunggu persetujuan.`,
        category: 'system',
        metadata: {
          userId: user.id,
          userName: user.namaLengkap,
          userEmail: user.email,
          userRole: user.role,
        },
        actionUrl: '/dashboard/users'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Registrasi berhasil! Akun Anda menunggu persetujuan dari administrator. Anda akan menerima email ketika akun disetujui.',
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        namaLengkap: user.namaLengkap,
        role: user.role,
        approved: user.approved,
        createdAt: user.createdAt,
      }
    })

  } catch (error) {
    console.error('Registration error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Terjadi kesalahan saat registrasi'
    }, { status: 500 })
  }
}
