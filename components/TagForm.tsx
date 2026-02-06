/**
 * TagForm Component
 * 
 * Form for creating or editing a tag with name and color picker.
 */

import { useState, FormEvent } from 'react';
import { TAG_COLORS, getRandomTagColor } from '@/lib/constants';

interface TagFormProps {
  initialName?: string;
  initialColor?: string;
  onSubmit: (name: string, color: string) => void;
  onCancel: () => void;
}

export function TagForm({ initialName = '', initialColor, onSubmit, onCancel }: TagFormProps) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor || getRandomTagColor());

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length === 0) return;
    onSubmit(name.trim(), color);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tag name"
        maxLength={30}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
        required
      />

      <div className="flex gap-2 flex-wrap">
        {TAG_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-8 h-8 rounded-full border-2 transition-transform ${
              color === c ? 'border-gray-900 scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {initialName ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
