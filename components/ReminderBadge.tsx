import { REMINDER_OPTIONS } from '@/lib/constants';

interface ReminderBadgeProps {
  minutes: number | null;
}

export function ReminderBadge({ minutes }: ReminderBadgeProps) {
  if (!minutes) return null;

  const option = REMINDER_OPTIONS.find(opt => opt.value === minutes);
  if (!option) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-300">
      <span>🔔</span>
      <span>{option.description}</span>
    </span>
  );
}
