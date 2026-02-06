import { addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';
import { RecurrencePattern } from './db';

const SINGAPORE_TZ = 'Asia/Singapore';

/**
 * Calculate the next due date based on recurrence pattern
 * All calculations maintain Singapore timezone
 */
export function calculateNextDueDate(
  currentDueDate: string,
  pattern: RecurrencePattern
): string {
  const current = toZonedTime(new Date(currentDueDate), SINGAPORE_TZ);
  let next: Date;

  switch (pattern) {
    case 'daily':
      next = addDays(current, 1);
      break;
    case 'weekly':
      next = addWeeks(current, 1);
      break;
    case 'monthly':
      next = addMonths(current, 1);
      break;
    case 'yearly':
      next = addYears(current, 1);
      break;
    default:
      throw new Error(`Invalid recurrence pattern: ${pattern}`);
  }

  return format(toZonedTime(next, SINGAPORE_TZ), 'yyyy-MM-dd HH:mm:ss', {
    timeZone: SINGAPORE_TZ,
  });
}

/**
 * Calculate the next N occurrences for preview
 */
export function calculateNextOccurrences(
  startDate: string,
  pattern: RecurrencePattern,
  count: number = 5
): string[] {
  const occurrences: string[] = [startDate];
  let current = startDate;

  for (let i = 0; i < count - 1; i++) {
    current = calculateNextDueDate(current, pattern);
    occurrences.push(current);
  }

  return occurrences;
}
