/**
 * TagSelector Component
 * 
 * Multi-select dropdown for assigning tags to todos.
 * Shows selected tags as badges and allows adding/removing tags.
 */

'use client';

import { useState, useEffect } from 'react';
import { Tag } from '@/lib/db';
import { TagBadge } from './TagBadge';

interface TagSelectorProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

export function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  async function fetchTags() {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleToggle(tagId: number) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  }

  const selectedTags = tags.filter(t => selectedTagIds.includes(t.id));

  if (loading) {
    return <div className="text-sm text-gray-500">Loading tags...</div>;
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tags
      </label>

      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2 min-h-[28px]">
        {selectedTags.map(tag => (
          <TagBadge
            key={tag.id}
            name={tag.name}
            color={tag.color}
            size="sm"
            removable
            onRemove={() => handleToggle(tag.id)}
          />
        ))}
      </div>

      {/* Dropdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
      >
        {selectedTags.length > 0 ? 'Add more tags...' : 'Select tags...'}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {tags.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No tags available. Create one first!
              </div>
            ) : (
              tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggle(tag.id)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between transition-colors"
                >
                  <TagBadge name={tag.name} color={tag.color} size="sm" />
                  {selectedTagIds.includes(tag.id) && (
                    <span className="text-blue-600 font-bold">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
