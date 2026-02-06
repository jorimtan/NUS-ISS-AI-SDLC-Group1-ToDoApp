/**
 * SaveAsTemplateButton Component
 * Allows users to save a todo as a reusable template
 */

'use client';

import { useState } from 'react';
import { TemplateCategory } from '@/lib/db';

interface SaveAsTemplateButtonProps {
  todoId: number;
  onTemplateSaved?: () => void;
}

export function SaveAsTemplateButton({ todoId, onTemplateSaved }: SaveAsTemplateButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('work');
  const [dueOffsetDays, setDueOffsetDays] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim() || name.length > 100) {
      setError('Template name must be between 1 and 100 characters');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todo_id: todoId,
          name: name.trim(),
          category,
          due_offset_days: dueOffsetDays,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save template');
      }

      // Success - close modal and reset form
      setShowModal(false);
      setName('');
      setCategory('work');
      setDueOffsetDays(0);
      
      if (onTemplateSaved) {
        onTemplateSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-gray-500 hover:text-blue-600 transition-colors text-sm"
        type="button"
        title="Save as template"
      >
        💾 Save as Template
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Save as Template</h3>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Weekly Report Template"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                  required
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  {name.length}/100 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TemplateCategory)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Organize templates by category
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date Offset (days)
                </label>
                <input
                  type="number"
                  value={dueOffsetDays}
                  onChange={(e) =>
                    setDueOffsetDays(Math.max(0, Math.min(365, parseInt(e.target.value) || 0)))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="365"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of days from today when creating from this template (0-365)
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                type="button"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                }}
                disabled={saving}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:cursor-not-allowed"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
