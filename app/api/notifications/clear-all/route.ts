import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { notifications } from '../route'

// DELETE /api/notifications/clear-all - Clear all notifications
export async function DELETE() {
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