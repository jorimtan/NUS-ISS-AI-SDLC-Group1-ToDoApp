/**
 * Calendar API Endpoint
 * GET /api/calendar?month=YYYY-MM
 * Returns todos and holidays for a specific month
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month'); // Format: 2026-02

  // Default to current month if not specified
  let targetDate: Date;
  if (monthParam) {
    const [year, month] = monthParam.split('-').map(Number);
    targetDate = new Date(year, month - 1, 1);
  } else {
    targetDate = getSingaporeNow();
  }

  const monthStart = format(startOfMonth(targetDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(targetDate), 'yyyy-MM-dd');

  try {
    // Get todos for this month
    const todos = db
      .prepare(
        `
      SELECT id, title, due_date, priority, completed
      FROM todos
      WHERE user_id = ?
        AND date(due_date) >= ?
        AND date(due_date) <= ?
      ORDER BY due_date
    `
      )
      .all(session.userId, monthStart, monthEnd);

    // Get holidays for this year
    const year = targetDate.getFullYear();
    const holidays = db
      .prepare(
        `
      SELECT date, name
      FROM holidays
      WHERE year = ?
    `
      )
      .all(year);

    // Group todos by date
    const todosByDate: Record<string, any[]> = {};
    (todos as any[]).forEach((todo) => {
      const dateKey = todo.due_date.split('T')[0]; // Extract YYYY-MM-DD
      if (!todosByDate[dateKey]) {
        todosByDate[dateKey] = [];
      }
      todosByDate[dateKey].push(todo);
    });

    return NextResponse.json({
      month: format(targetDate, 'yyyy-MM'),
      todosByDate,
      holidays: (holidays as any[]).map((h) => ({
        date: h.date,
        name: h.name,
      })),
    });
  } catch (error) {
    console.error('Calendar fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
