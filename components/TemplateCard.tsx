/**
 * TemplateCard Component
 * Displays a template with details and action buttons
 */

'use client';

import { TemplateWithSubtasks } from '@/lib/db';
import { PriorityBadge } from './PriorityBadge';
import { addDays } from 'date-fns';
import { getSingaporeNow, formatSingaporeDate } from '@/lib/timezone';

interface TemplateCardProps {
  template: TemplateWithSubtasks;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TemplateCard({ template, onUse, onEdit, onDelete }: TemplateCardProps) {
  // Calculate preview due date
  const calculatedDueDate = addDays(getSingaporeNow(), template.due_offset_days);
  const dueDateStr = formatSingaporeDate(calculatedDueDate, 'MMM d, yyyy');

  const offsetText =
    template.due_offset_days === 0
      ? 'today'
      : template.due_offset_days === 1
      ? 'tomorrow'
      : `in ${template.due_offset_days} days`;

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-lg text-gray-900">{template.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{template.title}</p>
          {template.category && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 capitalize">
              {template.category}
            </span>
          )}
        </div>
        <PriorityBadge priority={template.priority} size="sm" />
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          📅 Due: {dueDateStr} ({offsetText})
        </p>

        {template.subtasks && template.subtasks.length > 0 && (
          <p className="text-sm text-gray-600">
            ✓ {template.subtasks.length} subtask{template.subtasks.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Preview Subtasks */}
      {template.subtasks && template.subtasks.length > 0 && (
        <div className="mb-4 p-2 bg-gray-50 rounded text-xs">
          <p className="font-medium mb-1 text-gray-700">Subtasks:</p>
          <ul className="list-disc list-inside space-y-0.5 text-gray-600">
            {template.subtasks.slice(0, 3).map((subtask, idx) => (
              <li key={idx}>{subtask.title}</li>
            ))}
            {template.subtasks.length > 3 && (
              <li className="text-gray-500">+ {template.subtasks.length - 3} more...</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onUse}
          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          type="button"
        >
          Use Template
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          type="button"
          title="Edit template"
        >
          ✏️
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
          type="button"
          title="Delete template"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
