import { RecurrencePattern } from '@/lib/db';
import { calculateNextOccurrences } from '@/lib/recurrence';

interface RecurrencePreviewProps {
  dueDate: string;
  pattern: RecurrencePattern | null;
}

export function RecurrencePreview({ dueDate, pattern }: RecurrencePreviewProps) {
  if (!pattern || !dueDate) return null;

  let occurrences: string[] = [];
  try {
    occurrences = calculateNextOccurrences(dueDate, pattern, 5);
  } catch (error) {
    return null;
  }

  return (
    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="text-sm font-semibold text-blue-900 mb-2">
        Next 5 occurrences:
      </h4>
      <ul className="space-y-1 text-sm text-blue-800">
        {occurrences.map((date, index) => (
          <li key={index}>
            {index + 1}. {new Date(date).toLocaleString('en-SG', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Singapore',
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
