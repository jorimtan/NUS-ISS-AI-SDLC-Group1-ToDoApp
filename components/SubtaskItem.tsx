/**
 * SubtaskItem Component
 * 
 * Individual subtask with checkbox, title, and action buttons.
 * Supports completion toggle, reordering (up/down), and deletion.
 */

import { Subtask } from '@/lib/db';
import { useState } from 'react';

interface SubtaskItemProps {
  subtask: Subtask;
  isFirst: boolean;
  isLast: boolean;
  onToggle: (id: number, completed: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function SubtaskItem({
  subtask,
  isFirst,
  isLast,
  onToggle,
  onMoveUp,
  onMoveDown,
  onDelete,
}: SubtaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = () => {
    if (confirm('Delete this subtask?')) {
      setIsDeleting(true);
      onDelete(subtask.id);
    }
  };

  return (
    <div
      className={`ml-8 py-2 flex items-center gap-2 group ${
        isDeleting ? 'opacity-50' : ''
      }`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={subtask.completed === 1}
        onChange={() => onToggle(subtask.id, subtask.completed === 1 ? 0 : 1)}
        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
      />

      {/* Title */}
      <span
        className={`flex-1 text-sm ${
          subtask.completed === 1
            ? 'line-through text-gray-500'
            : 'text-gray-800'
        }`}
      >
        {subtask.title}
      </span>

      {/* Action buttons (visible on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move up button */}
        {!isFirst && (
          <button
            onClick={() => onMoveUp(subtask.id)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Move up"
          >
            ↑
          </button>
        )}

        {/* Move down button */}
        {!isLast && (
          <button
            onClick={() => onMoveDown(subtask.id)}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Move down"
          >
            ↓
          </button>
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
          title="Delete subtask"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
