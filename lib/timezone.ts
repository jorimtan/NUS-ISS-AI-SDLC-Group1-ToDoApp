/**
 * Singapore Timezone Utilities
 * 
 * All date/time operations in this app MUST use Singapore timezone (Asia/Singapore).
 * These utilities ensure consistent timezone handling across the application.
 */

import { toZonedTime, format } from 'date-fns-tz';

const SINGAPORE_TZ = 'Asia/Singapore';

/**
 * Get the current date/time in Singapore timezone
 * Always use this instead of `new Date()` for timezone-aware operations
 */
export function getSingaporeNow(): Date {
  return toZonedTime(new Date(), SINGAPORE_TZ);
}

/**
 * Format a date in Singapore timezone
 * @param date - Date object or ISO string to format
 * @param formatStr - Format string (default: 'yyyy-MM-dd HH:mm:ss')
 * @returns Formatted date string in Singapore timezone
 */
export function formatSingaporeDate(
  date: Date | string, 
  formatStr: string = 'yyyy-MM-dd HH:mm:ss'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(toZonedTime(d, SINGAPORE_TZ), formatStr, { timeZone: SINGAPORE_TZ });
}

/**
 * Parse a date string and convert to Singapore timezone
 * @param dateStr - ISO date string to parse
 * @returns Date object in Singapore timezone
 */
export function parseSingaporeDate(dateStr: string): Date {
  return toZonedTime(new Date(dateStr), SINGAPORE_TZ);
}

/**
 * Check if a date is in the past (Singapore time)
 * @param date - Date to check
 * @returns True if the date is before current Singapore time
 */
export function isPastDate(date: Date | string): boolean {
  const d = parseSingaporeDate(typeof date === 'string' ? date : date.toISOString());
  const now = getSingaporeNow();
  return d < now;
}

/**
 * Get ISO string for a date in Singapore timezone
 * @param date - Date to convert
 * @returns ISO 8601 string
 */
export function toSingaporeISO(date: Date): string {
  return toZonedTime(date, SINGAPORE_TZ).toISOString();
}
