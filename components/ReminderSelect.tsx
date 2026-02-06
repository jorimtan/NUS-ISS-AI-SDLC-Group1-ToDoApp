import { REMINDER_OPTIONS } from '@/lib/constants';

interface ReminderSelectProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
  className?: string;
}

export function ReminderSelect({ value, onChange, className = '' }: ReminderSelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Reminder
      </label>
      <select
        value={value ?? 'none'}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === 'none' ? null : Number(val));
        }}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${className}`}
        aria-label="Reminder"
      >
        {REMINDER_OPTIONS.map((option) => (
          <option key={option.value ?? 'none'} value={option.value ?? 'none'}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
