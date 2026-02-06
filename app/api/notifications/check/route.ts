/**
 * Notifications API - Check for due reminders
 * GET /api/notifications/check - Get todos needing reminders
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { getSingaporeNow, formatSingaporeDate } from '@/lib/timezone';

/**
 * GET /api/notifications/check
 * Check for todos that need reminder notifications
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const now = getSingaporeNow();
    const todos = todoDB.findByUser(session.userId);

    const reminders = todos
      .filter(todo => {
        // Skip completed todos
        if (todo.completed) return false;

        // Skip todos without reminders
        if (!todo.reminder_minutes) return false;

        // Calculate reminder trigger time
        const dueTime = new Date(todo.due_date);
        const reminderTime = new Date(dueTime.getTime() - (todo.reminder_minutes * 60 * 1000));

        // Check if within reminder window (now >= reminderTime && now < dueTime)
        const isInWindow = now >= reminderTime && now < dueTime;
        if (!isInWindow) return false;

        // Prevent duplicate notifications (check last_notification_sent)
        if (todo.last_notification_sent) {
          const lastSent = new Date(todo.last_notification_sent);
          // Don't resend if already sent within last 5 minutes
          const minutesSinceLastSent = (now.getTime() - lastSent.getTime()) / (60 * 1000);
          if (minutesSinceLastSent < 5) return false;
        }

        return true;
      })
      .map(todo => {
        const dueTime = new Date(todo.due_date);
        const minutesUntilDue = Math.round((dueTime.getTime() - now.getTime()) / (60 * 1000));

        return {
          todo,
          minutesUntilDue,
        };
      });

    // Update last_notification_sent for returned todos
    reminders.forEach(({ todo }) => {
      todoDB.update(todo.id, {
        last_notification_sent: formatSingaporeDate(now),
      });
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error('Error checking notifications:', error);
    return NextResponse.json(
      { error: 'Failed to check notifications' },
      { status: 500 }
    );
  }
}
