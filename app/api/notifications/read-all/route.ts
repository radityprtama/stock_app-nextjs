import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { notifications } from '../route'

// PUT /api/notifications/read-all - Mark all notifications as read
export async function PUT() {
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