import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createNotification } from '../route'
import { z } from 'zod'

const broadcastSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  category: z.enum(['stock', 'transaction', 'system', 'dropship', 'customer']).default('system'),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// POST /api/notifications/broadcast - Broadcast notification to all users
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = broadcastSchema.parse(body)

    const notification = await createNotification(validatedData)

    if (!notification) {
      return NextResponse.json(
        { error: 'Failed to broadcast notification' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification broadcasted successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error broadcasting notification:', error)
    return NextResponse.json(
      { error: 'Failed to broadcast notification' },
      { status: 500 }
    )
  }
}