/**
 * Calendar Utilities
 * Functions for generating calendar grids and handling date logic
 */

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { getSingaporeNow } from './timezone';

export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  todoCount: number;
  todos: any[];
}

/**
 * Generate calendar grid for a given month
 * Returns array of days including previous/next month days to fill weeks
 */
export function generateCalendarDays(
  year: number,
  month: number, // 1-12
  todosByDate: Record<string, any[]>,
  holidays: { date: string; name: string }[]
): CalendarDay[] {
  const targetDate = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  // Get full week range (includes prev/next month days)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const today = getSingaporeNow();
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]));

  return allDays.map((date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    const todos = todosByDate[dateString] || [];

    return {
      date,
      dateString,
      isCurrentMonth: isSameMonth(date, targetDate),
      isToday: isSameDay(date, today),
      isHoliday: holidayMap.has(dateString),
      holidayName: holidayMap.get(dateString),
      todoCount: todos.length,
      todos,
    };
  });
}

/**
 * Get intensity class for todo count (heat map styling)
 */
export function getTodoIntensityClass(count: number): string {
  if (count === 0) return '';
  if (count === 1) return 'bg-gray-100';
  if (count <= 3) return 'bg-blue-100';
  if (count <= 5) return 'bg-blue-200';
  return 'bg-blue-300';
}

/**
 * Get month string for URL (YYYY-MM)
 */
export function getMonthString(date: Date): string {
  return format(date, 'yyyy-MM');
}

/**
 * Parse month string from URL (YYYY-MM) to Date
 */
export function parseMonthString(monthStr: string): Date {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1);
}
