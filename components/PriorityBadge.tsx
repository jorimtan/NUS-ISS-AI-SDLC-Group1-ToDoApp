'use client';

/**
 * Priority Badge Component
 * Displays color-coded priority indicators with icons
 */

import { Priority } from '@/lib/db';
import { PRIORITY_CONFIGS } from '@/lib/constants';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function PriorityBadge({ 
  priority, 
  size = 'md', 
  showIcon = true 
}: PriorityBadgeProps) {
  const config = PRIORITY_CONFIGS[priority];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 
        font-semibold rounded-full border
        ${config.bgClass} 
        ${config.textClass} 
        ${config.borderClass}
        ${sizeClasses[size]}
      `}
    >
      {showIcon && <span>{config.icon}</span>}
      <span>{config.label}</span>
    </span>
  );
}
