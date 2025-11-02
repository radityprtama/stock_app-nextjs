import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const createNotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  category: z.enum(['stock', 'transaction', 'system', 'dropship', 'customer']).default('info'),
  userId: z.string().optional(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// In-memory notification storage for real-time notifications
// In production, you might want to use Redis or a database table
const notifications = new Map<string, any[]>()

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const category = searchParams.get('category')

    const userId = session.user.id
    const userNotifications = notifications.get(userId) || []

    // Filter notifications
    let filteredNotifications = userNotifications
    if (unreadOnly) {
      filteredNotifications = filteredNotifications.filter((n: any) => !n.read)
    }
    if (category) {
      filteredNotifications = filteredNotifications.filter((n: any) => n.category === category)
    }

    // Sort by timestamp (newest first)
    filteredNotifications.sort((a: any, b: any) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Pagination
    const startIndex = (page - 1) * limit
    const paginatedNotifications = filteredNotifications.slice(startIndex, startIndex + limit)

    const unreadCount = userNotifications.filter((n: any) => !n.read).length

    return NextResponse.json({
      success: true,
      data: {
        notifications: paginatedNotifications,
        pagination: {
          page,
          limit,
          total: filteredNotifications.length,
          totalPages: Math.ceil(filteredNotifications.length / limit),
        },
        unreadCount,
      },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications - Create notification
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createNotificationSchema.parse(body)

    const notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
      ...validatedData,
    }

    // Store notification (in production, use database)
    const userId = validatedData.userId || session.user.id
    if (!notifications.has(userId)) {
      notifications.set(userId, [])
    }

    notifications.get(userId)!.unshift(notification)

    // Limit to last 100 notifications per user
    const userNotifications = notifications.get(userId)!
    if (userNotifications.length > 100) {
      notifications.set(userId, userNotifications.slice(0, 100))
    }

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/[id]/read - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id
    const userNotifications = notifications.get(userId) || []

    const notification = userNotifications.find((n: any) => n.id === id)
    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    notification.read = true

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id
    const userNotifications = notifications.get(userId) || []

    const index = userNotifications.findIndex((n: any) => n.id === id)
    if (index === -1) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      )
    }

    userNotifications.splice(index, 1)

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }
}

// Helper function to create notifications from other API routes
export async function createNotification(params: {
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  category?: 'stock' | 'transaction' | 'system' | 'dropship' | 'customer'
  userId?: string
  actionUrl?: string
  metadata?: Record<string, any>
}) {
  try {
    const notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
      ...params,
    }

    // Send to specific user or all users (broadcast)
    const userIds = params.userId ? [params.userId] : Array.from(notifications.keys())

    for (const userId of userIds) {
      if (!notifications.has(userId)) {
        notifications.set(userId, [])
      }

      notifications.get(userId)!.unshift(notification)

      // Limit notifications
      const userNotifications = notifications.get(userId)!
      if (userNotifications.length > 100) {
        notifications.set(userId, userNotifications.slice(0, 100))
      }
    }

    return notification
  } catch (error) {
    console.error('Error creating notification helper:', error)
    return null
  }
}

// POST /api/notifications/broadcast - Broadcast notification to all users
export async function BROADCAST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !['admin', 'super_admin'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createNotificationSchema.parse(body)

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
      message: `Notification broadcasted to ${notifications.size} users`,
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

// PUT /api/notifications/read-all - Mark all notifications as read
export async function MARK_ALL_READ(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const userNotifications = notifications.get(userId) || []

    userNotifications.forEach((notification: any) => {
      notification.read = true
    })

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
    })
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/clear - Clear all notifications
export async function CLEAR_ALL(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    notifications.set(userId, [])

    return NextResponse.json({
      success: true,
      message: 'All notifications cleared',
    })
  } catch (error) {
    console.error('Error clearing notifications:', error)
    return NextResponse.json(
      { error: 'Failed to clear notifications' },
      { status: 500 }
    )
  }
}