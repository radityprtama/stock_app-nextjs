import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendNotification } from '@/lib/notifications'

const updateSchema = z.object({
  namaLengkap: z.string().min(2).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  role: z.enum(['super_admin', 'admin', 'manager', 'staff_gudang', 'sales']).optional(),
  telepon: z.string().optional(),
  alamat: z.string().optional(),
  aktif: z.boolean().optional(),
  profileImage: z.string().optional(),
})

const approveSchema = z.object({
  approved: z.boolean(),
  role: z.enum(['super_admin', 'admin', 'manager', 'staff_gudang', 'sales']).optional(),
})

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
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

    if (!currentUser || !currentUser.approved || !currentUser.aktif) {
      return NextResponse.json({ success: false, error: 'Account not approved or inactive' }, { status: 403 })
    }

    if (!['super_admin', 'admin', 'manager'].includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        namaLengkap: true,
        role: true,
        telepon: true,
        alamat: true,
        profileImage: true,
        aktif: true,
        approved: true,
        approvedAt: true,
        lastLoginAt: true,
        loginAttempts: true,
        lockedUntil: true,
        createdAt: true,
        updatedAt: true,
        approvedByUser: {
          select: {
            id: true,
            namaLengkap: true,
            email: true,
          }
        },
      }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: user
    })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
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

    if (!currentUser || !currentUser.approved || !currentUser.aktif) {
      return NextResponse.json({ success: false, error: 'Account not approved or inactive' }, { status: 403 })
    }

    const body = await request.json()

    // Handle approval action
    if (body.action === 'approve') {
      if (!['super_admin', 'admin'].includes(currentUser.role)) {
        return NextResponse.json({ success: false, error: 'Only admins can approve users' }, { status: 403 })
      }

      const approveData = approveSchema.parse(body)
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, namaLengkap: true, approved: true }
      })

      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
      }

      if (targetUser.approved && approveData.approved) {
        return NextResponse.json({ success: false, error: 'User already approved' }, { status: 400 })
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          approved: approveData.approved,
          approvedAt: approveData.approved ? new Date() : null,
          approvedBy: approveData.approved ? session.user.id : null,
          role: approveData.role,
        },
        select: {
          id: true,
          email: true,
          namaLengkap: true,
          role: true,
          approved: true,
          approvedAt: true,
        }
      })

      // Send notification to user
      if (approveData.approved) {
        await sendNotification({
          userId: targetUser.id,
          type: 'success',
          title: 'Akun Disetujui',
          message: 'Selamat! Akun Anda telah disetujui. Sekarang Anda dapat login ke sistem.',
          category: 'system',
          actionUrl: '/auth/login'
        })

        // Also send email notification (implement email service later)
        // await sendApprovalEmail(targetUser.email, targetUser.namaLengkap)
      }

      return NextResponse.json({
        success: true,
        message: approveData.approved ? 'User approved successfully' : 'User approval revoked',
        data: updatedUser
      })
    }

    // Handle regular update
    if (!['super_admin', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: 'Only admins can update users' }, { status: 403 })
    }

    const updateData = updateSchema.parse(body)

    // Check if email or username already exists (excluding current user)
    if (updateData.email || updateData.username) {
      const uniqueConditions: Prisma.UserWhereInput[] = []

      if (updateData.email) {
        uniqueConditions.push({ email: updateData.email })
      }

      if (updateData.username) {
        uniqueConditions.push({ username: updateData.username })
      }

      const existingUser = uniqueConditions.length ? await prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: uniqueConditions,
        }
      }) : null

      if (existingUser) {
        return NextResponse.json({
          success: false,
          error: 'Email or username already exists'
        }, { status: 400 })
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        namaLengkap: true,
        role: true,
        telepon: true,
        alamat: true,
        profileImage: true,
        aktif: true,
        approved: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: user
    })

  } catch (error) {
    console.error('Update user error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update user'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
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

    if (!currentUser || currentUser.role !== 'super_admin' || !currentUser.approved || !currentUser.aktif) {
      return NextResponse.json({ success: false, error: 'Only super admin can delete users' }, { status: 403 })
    }

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, namaLengkap: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete user'
    }, { status: 500 })
  }
}
