/**
 * SubtaskList Component
 * 
 * Container for all subtasks of a todo.
 * Includes progress bar, subtask items, and "Add Subtask" button.
 */

import { useState } from 'react';
import { Subtask } from '@/lib/db';
import { calculateProgress } from '@/lib/constants';
import ProgressBar from './ProgressBar';
import SubtaskItem from './SubtaskItem';
import SubtaskInput from './SubtaskInput';

interface SubtaskListProps {
  todoId: number;
  subtasks: Subtask[];
  onAdd: (todoId: number, title: string) => void;
  onToggle: (subtaskId: number, completed: number) => void;
  onReorder: (subtaskId: number, newPosition: number) => void;
  onDelete: (subtaskId: number) => void;
}

export default function SubtaskList({
  todoId,
  subtasks,
  onAdd,
  onToggle,
  onReorder,
  onDelete,
}: SubtaskListProps) {
  const [isAdding, setIsAdding] = useState(false);

  // Sort subtasks by position
  const sortedSubtasks = [...subtasks].sort((a, b) => a.position - b.position);

  // Calculate progress
  const progress = calculateProgress(subtasks);

  const handleAdd = (title: string) => {
    onAdd(todoId, title);
    setIsAdding(false);
  };

  const handleMoveUp = (subtaskId: number) => {
    const currentIndex = sortedSubtasks.findIndex(s => s.id === subtaskId);
    if (currentIndex > 0) {
      onReorder(subtaskId, currentIndex - 1);
    }
  };

  const handleMoveDown = (subtaskId: number) => {
    const currentIndex = sortedSubtasks.findIndex(s => s.id === subtaskId);
    if (currentIndex < sortedSubtasks.length - 1) {
      onReorder(subtaskId, currentIndex + 1);
    }
  };

  return (
    <div className="mt-2">
      {/* Progress Bar */}
      {subtasks.length > 0 && (
        <ProgressBar
          completed={progress.completed}
          total={progress.total}
          percentage={progress.percentage}
        />
      )}

      {/* Subtask Items */}
      {sortedSubtasks.map((subtask, index) => (
        <SubtaskItem
          key={subtask.id}
          subtask={subtask}
          isFirst={index === 0}
          isLast={index === sortedSubtasks.length - 1}
          onToggle={onToggle}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDelete={onDelete}
        />
      ))}

      {/* Add Subtask Input */}
      {isAdding ? (
        <SubtaskInput
          onAdd={handleAdd}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="ml-8 mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          + Add Subtask
        </button>
      )}
    </div>
  );
}
