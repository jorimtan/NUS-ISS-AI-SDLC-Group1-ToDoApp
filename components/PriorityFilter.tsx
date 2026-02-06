'use client';

/**
 * Priority Filter Component
 * Filter todos by priority level
 */

import { Priority } from '@/lib/db';
import { PRIORITY_CONFIGS } from '@/lib/constants';

interface PriorityFilterProps {
  selectedPriority?: Priority | null;
  onFilterChange?: (priority: Priority | null) => void;
  value?: Priority | null;
  onChange?: (priority: Priority | null) => void;
  className?: string;
}

export function PriorityFilter({ 
  selectedPriority, 
  onFilterChange,
  value,
  onChange,
  className = ''
}: PriorityFilterProps) {
  const priority = value ?? selectedPriority ?? null;
  const handleChange = onChange ?? onFilterChange ?? (() => {});
  
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <select
        value={priority || 'all'}
        onChange={(e) => {
          const val = e.target.value;
          handleChange(val === 'all' ? null : val as Priority);
        }}
        aria-label="Priority filter"
        className={className || "px-4 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"}
      >
        <option value="all">All Priorities</option>
        {Object.values(PRIORITY_CONFIGS).map((config) => (
          <option key={config.value} value={config.value}>
            {config.icon} {config.label}
          </option>
        ))}
      </select>
    </div>
  );
}
