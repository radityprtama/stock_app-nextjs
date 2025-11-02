import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { sendNotification } from '@/lib/notifications'

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password minimal 8 karakter').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password harus mengandung huruf besar, huruf kecil, dan angka'),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, approved: true, aktif: true }
    })

    if (!currentUser || !['super_admin', 'admin'].includes(currentUser.role) || !currentUser.approved || !currentUser.aktif) {
      return NextResponse.json({ success: false, error: 'Only admins can reset passwords' }, { status: 403 })
    }

    const body = await request.json()
    const { newPassword } = resetPasswordSchema.parse(body)

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, namaLengkap: true, aktif: true }
    })

    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if (!targetUser.aktif) {
      return NextResponse.json({ success: false, error: 'Cannot reset password for inactive user' }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password and reset login attempts
    await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        loginAttempts: 0,
        lockedUntil: null,
      }
    })

    // Send notification to user
    await sendNotification({
      userId: targetUser.id,
      type: 'info',
      title: 'Password Direset',
      message: 'Password Anda telah direset oleh administrator. Silakan login dengan password baru.',
      category: 'system',
      actionUrl: '/auth/login'
    })

    // Also send email notification (implement email service later)
    // await sendPasswordResetEmail(targetUser.email, targetUser.namaLengkap)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    })

  } catch (error) {
    console.error('Reset password error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to reset password'
    }, { status: 500 })
  }
}
