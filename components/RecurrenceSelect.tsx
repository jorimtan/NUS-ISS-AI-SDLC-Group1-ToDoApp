import { RecurrencePattern } from '@/lib/db';
import { RECURRENCE_CONFIGS } from '@/lib/constants';

interface RecurrenceSelectProps {
  value: RecurrencePattern | null;
  onChange: (pattern: RecurrencePattern | null) => void;
  className?: string;
}

export function RecurrenceSelect({ value, onChange, className = '' }: RecurrenceSelectProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Repeat
      </label>
      <select
        value={value || 'none'}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === 'none' ? null : val as RecurrencePattern);
        }}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${className}`}
        aria-label="Recurrence"
      >
        {Object.entries(RECURRENCE_CONFIGS).map(([key, config]) => (
          <option key={key} value={key}>
            {config.icon} {config.label} - {config.description}
          </option>
        ))}
      </select>
    </div>
  );
}
