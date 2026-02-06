/**
 * SubtaskInput Component
 * 
 * Inline input field for adding new subtasks.
 * Shows when "Add Subtask" button is clicked.
 */

import { useState, KeyboardEvent } from 'react';

interface SubtaskInputProps {
  onAdd: (title: string) => void;
  onCancel: () => void;
}

export default function SubtaskInput({ onAdd, onCancel }: SubtaskInputProps) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = title.trim();

    if (!trimmed) {
      setError('Subtask title cannot be empty');
      return;
    }

    if (trimmed.length > 200) {
      setError('Subtask title must be 200 characters or less');
      return;
    }

    onAdd(trimmed);
    setTitle('');
    setError('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="ml-8 mt-2 mb-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter subtask title..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
        <button
          onClick={handleAdd}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          title="Add subtask"
        >
          ✓
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors text-sm"
          title="Cancel"
        >
          ✕
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
    </div>
  );
}
