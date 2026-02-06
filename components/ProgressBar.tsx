/**
 * ProgressBar Component
 * 
 * Displays visual progress bar with completion percentage.
 * Shows "X of Y completed (Z%)" text above the bar.
 */

interface ProgressBarProps {
  completed: number;
  total: number;
  percentage: number;
}

export default function ProgressBar({ completed, total, percentage }: ProgressBarProps) {
  // Don't show progress bar if no subtasks
  if (total === 0) return null;

  return (
    <div className="mt-2 mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600">
          {completed} of {total} completed ({percentage}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
