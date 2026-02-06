'use client';

/**
 * Priority Select Component
 * Dropdown for selecting todo priority
 */

import { Priority } from '@/lib/db';
import { PRIORITY_CONFIGS } from '@/lib/constants';

interface PrioritySelectProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  className?: string;
  disabled?: boolean;
}

export function PrioritySelect({ 
  value, 
  onChange, 
  className = '',
  disabled = false,
}: PrioritySelectProps) {
  const defaultClassName = 'px-4 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none';
  
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Priority)}
      disabled={disabled}
      className={className || defaultClassName}
    >
      {Object.values(PRIORITY_CONFIGS).map((config) => (
        <option key={config.value} value={config.value}>
          {config.icon} {config.label} Priority
        </option>
      ))}
    </select>
  );
}
