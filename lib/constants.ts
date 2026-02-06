/**
 * Shared constants for client and server components
 * This file contains no database or server-only dependencies
 */

// ============================================================================
// Type Definitions (safe for client components)
// ============================================================================

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

// ============================================================================
// Helper Types (for calculateProgress - needs to be duplicated to avoid circular imports)
// ============================================================================

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: number;
  position: number;
  created_at: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate progress for subtasks
 */
export function calculateProgress(subtasks: Subtask[]): {
  completed: number;
  total: number;
  percentage: number;
} {
  const total = subtasks.length;
  const completed = subtasks.filter(s => s.completed === 1).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percentage };
}

/**
 * Predefined color palette for tags
 */
export const TAG_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#84CC16', // Lime
];

/**
 * Get random color for new tags
 */
export function getRandomTagColor(): string {
  return TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
}

// ============================================================================
// Priority Configuration
// ============================================================================

export interface PriorityConfig {
  value: Priority;
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  sortOrder: number;
  icon: string;
}

export const PRIORITY_CONFIGS: Record<Priority, PriorityConfig> = {
  high: {
    value: 'high',
    label: 'High',
    color: 'red',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-500',
    sortOrder: 0,
    icon: '🔥',
  },
  medium: {
    value: 'medium',
    label: 'Medium',
    color: 'yellow',
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-800',
    borderClass: 'border-yellow-500',
    sortOrder: 1,
    icon: '⚡',
  },
  low: {
    value: 'low',
    label: 'Low',
    color: 'green',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-500',
    sortOrder: 2,
    icon: '✓',
  },
};

// ============================================================================
// Recurrence Configuration
// ============================================================================

export interface RecurrenceConfig {
  value: RecurrencePattern | null;
  label: string;
  description: string;
  icon: string;
}

export const RECURRENCE_CONFIGS: Record<string, RecurrenceConfig> = {
  none: {
    value: null,
    label: 'Does not repeat',
    description: 'One-time task',
    icon: '🔵',
  },
  daily: {
    value: 'daily',
    label: 'Daily',
    description: 'Repeats every day',
    icon: '📅',
  },
  weekly: {
    value: 'weekly',
    label: 'Weekly',
    description: 'Repeats every week',
    icon: '📆',
  },
  monthly: {
    value: 'monthly',
    label: 'Monthly',
    description: 'Repeats every month',
    icon: '📊',
  },
  yearly: {
    value: 'yearly',
    label: 'Yearly',
    description: 'Repeats every year',
    icon: '🎂',
  },
};

// ============================================================================
// Reminder Configuration
// ============================================================================

export interface ReminderOption {
  value: number | null;
  label: string;
  description: string;
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { value: null, label: 'No reminder', description: 'None' },
  { value: 15, label: '15 minutes before', description: '15 min' },
  { value: 30, label: '30 minutes before', description: '30 min' },
  { value: 60, label: '1 hour before', description: '1 hr' },
  { value: 120, label: '2 hours before', description: '2 hrs' },
  { value: 1440, label: '1 day before', description: '1 day' },
  { value: 2880, label: '2 days before', description: '2 days' },
  { value: 10080, label: '1 week before', description: '1 wk' },
];
