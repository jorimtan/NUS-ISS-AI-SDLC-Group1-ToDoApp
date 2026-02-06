/**
 * TemplateBrowser Component
 * Modal for browsing, filtering, and managing templates
 */

'use client';

import { useState, useEffect } from 'react';
import { TemplateWithSubtasks, TemplateCategory } from '@/lib/db';
import { TemplateCard } from './TemplateCard';

interface TemplateBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateUsed: () => void;
}

export function TemplateBrowser({ isOpen, onClose, onTemplateUsed }: TemplateBrowserProps) {
  const [templates, setTemplates] = useState<TemplateWithSubtasks[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [editingTemplate, setEditingTemplate] = useState<TemplateWithSubtasks | null>(null);
  const [editForm, setEditForm] = useState({ name: '', category: 'work' as TemplateCategory, due_offset_days: 0 });

  const fetchTemplates = async (category?: TemplateCategory) => {
    setLoading(true);
    setError(null);
    try {
      const url = category ? `/api/templates?category=${category}` : '/api/templates';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTemplates(categoryFilter === 'all' ? undefined : categoryFilter);
    }
  }, [isOpen, categoryFilter]);

  const handleUseTemplate = async (templateId: number) => {
    try {
      const res = await fetch(`/api/templates/${templateId}/use`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to use template');
      onTemplateUsed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to use template');
    }
  };

  const handleEditTemplate = (template: TemplateWithSubtasks) => {
    setEditingTemplate(template);
    setEditForm({
      name: template.name,
      category: template.category || 'work',
      due_offset_days: template.due_offset_days,
    });
  };

  const saveEdit = async () => {
    if (!editingTemplate) return;
    try {
      const res = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update template');
      setEditingTemplate(null);
      fetchTemplates(categoryFilter === 'all' ? undefined : categoryFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      fetchTemplates(categoryFilter === 'all' ? undefined : categoryFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  if (!isOpen) return null;

  const filteredTemplates =
    categoryFilter === 'all'
      ? templates
      : templates.filter((t) => t.category === categoryFilter);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">📋 Templates</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              type="button"
            >
              ×
            </button>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              type="button"
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('work')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === 'work'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              type="button"
            >
              Work
            </button>
            <button
              onClick={() => setCategoryFilter('personal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === 'personal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              type="button"
            >
              Personal
            </button>
            <button
              onClick={() => setCategoryFilter('other')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                categoryFilter === 'other'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              type="button"
            >
              Other
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-2">No templates yet</p>
              <p className="text-gray-400 text-sm">
                Save a todo as a template to reuse it later
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => handleUseTemplate(template.id)}
                  onEdit={() => handleEditTemplate(template)}
                  onDelete={() => handleDeleteTemplate(template.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value as TemplateCategory })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="work">Work</option>
                  <option value="personal">Personal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date Offset (days)
                </label>
                <input
                  type="number"
                  value={editForm.due_offset_days}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      due_offset_days: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="365"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of days from today when creating from this template
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={saveEdit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                type="button"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditingTemplate(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
