/**
 * TagManagementModal Component
 * 
 * Modal for managing tags (CRUD operations).
 * Shows list of tags with usage counts, edit/delete buttons.
 */

'use client';

import { useState, useEffect } from 'react';
import { TagWithCount } from '@/lib/db';
import { TagBadge } from './TagBadge';
import { TagForm } from './TagForm';

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsChanged?: () => void;
}

export function TagManagementModal({ isOpen, onClose, onTagsChanged }: TagManagementModalProps) {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen]);

  async function fetchTags() {
    try {
      setLoading(true);
      const res = await fetch('/api/tags?with_count=true');
      const data = await res.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError('Failed to load tags');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(name: string, color: string) {
    try {
      setError('');
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });

      if (res.ok) {
        setIsCreating(false);
        fetchTags();
        onTagsChanged?.();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create tag');
      }
    } catch (err) {
      console.error('Error creating tag:', err);
      setError('Failed to create tag');
    }
  }

  async function handleUpdate(id: number, name: string, color: string) {
    try {
      setError('');
      const res = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });

      if (res.ok) {
        setEditingId(null);
        fetchTags();
        onTagsChanged?.();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update tag');
      }
    } catch (err) {
      console.error('Error updating tag:', err);
      setError('Failed to update tag');
    }
  }

  async function handleDelete(id: number, usageCount: number) {
    const confirmMsg = usageCount > 0
      ? `Delete this tag? It will be removed from ${usageCount} todo${usageCount !== 1 ? 's' : ''}.`
      : 'Delete this tag?';
    
    if (!confirm(confirmMsg)) return;

    try {
      setError('');
      const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
      
      if (res.ok) {
        fetchTags();
        onTagsChanged?.();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete tag');
      }
    } catch (err) {
      console.error('Error deleting tag:', err);
      setError('Failed to delete tag');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Manage Tags</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
              type="button"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading tags...</div>
          ) : (
            <>
              {/* Tag List */}
              <div className="space-y-3 mb-6">
                {tags.length === 0 && !isCreating && (
                  <div className="text-center py-8 text-gray-500">
                    No tags yet. Create your first one below!
                  </div>
                )}
                
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {editingId === tag.id ? (
                      <div className="flex-1">
                        <TagForm
                          initialName={tag.name}
                          initialColor={tag.color}
                          onSubmit={(name, color) => handleUpdate(tag.id, name, color)}
                          onCancel={() => setEditingId(null)}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <TagBadge name={tag.name} color={tag.color} />
                          <span className="text-sm text-gray-500">
                            Used by {tag.usage_count} todo{tag.usage_count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingId(tag.id)}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(tag.id, tag.usage_count)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Create New Tag */}
              {isCreating ? (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <TagForm
                    onSubmit={handleCreate}
                    onCancel={() => {
                      setIsCreating(false);
                      setError('');
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  type="button"
                >
                  + Create New Tag
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
