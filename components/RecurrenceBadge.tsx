import { RecurrencePattern } from '@/lib/db';
import { RECURRENCE_CONFIGS } from '@/lib/constants';

interface RecurrenceBadgeProps {
  pattern: RecurrencePattern | null;
}

export function RecurrenceBadge({ pattern }: RecurrenceBadgeProps) {
  if (!pattern) return null;

  const config = RECURRENCE_CONFIGS[pattern];

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full border border-purple-300">
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
