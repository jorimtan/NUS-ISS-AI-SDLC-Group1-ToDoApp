'use client';

/**
 * Priority Filter Component
 * Filter todos by priority level
 */

import { Priority } from '@/lib/db';
import { PRIORITY_CONFIGS } from '@/lib/constants';

interface PriorityFilterProps {
  selectedPriority: Priority | null;
  onFilterChange: (priority: Priority | null) => void;
}

export function PriorityFilter({ 
  selectedPriority, 
  onFilterChange 
}: PriorityFilterProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <label className="text-sm font-medium text-gray-700">
        Filter by Priority:
      </label>
      
      <select
        value={selectedPriority || 'all'}
        onChange={(e) => {
          const value = e.target.value;
          onFilterChange(value === 'all' ? null : value as Priority);
        }}
        aria-label="Priority filter"
        className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="all">All Priorities</option>
        {Object.values(PRIORITY_CONFIGS).map((config) => (
          <option key={config.value} value={config.value}>
            {config.icon} {config.label}
          </option>
        ))}
      </select>
      
      {selectedPriority && (
        <button
          onClick={() => onFilterChange(null)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Clear filter
        </button>
      )}
      
      {selectedPriority && (
        <span className="text-sm text-gray-500">
          Showing {selectedPriority} priority todos only
        </span>
      )}
    </div>
  );
}
