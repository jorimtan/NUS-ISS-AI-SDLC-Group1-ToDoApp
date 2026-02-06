/**
 * TagFilter Component
 * 
 * Displays all tags as clickable badges for filtering todos.
 * Highlights the selected tag and shows clear filter option.
 */

'use client';

import { useState, useEffect } from 'react';
import { Tag } from '@/lib/db';
import { TagBadge } from './TagBadge';

interface TagFilterProps {
  selectedTagId: number | null;
  onFilterChange: (tagId: number | null) => void;
}

export function TagFilter({ selectedTagId, onFilterChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([]);
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

  if (loading) {
    return <div className="text-sm text-gray-500">Loading tags...</div>;
  }

  if (tags.length === 0) {
    return null;
  }

  const selectedTag = tags.find(t => t.id === selectedTagId);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-gray-700">Filter by tag:</span>
      
      {tags.map(tag => (
        <button
          key={tag.id}
          onClick={() => onFilterChange(tag.id === selectedTagId ? null : tag.id)}
          className={`transition-all ${
            tag.id === selectedTagId ? 'ring-2 ring-offset-2 scale-105' : 'opacity-60 hover:opacity-100'
          }`}
          type="button"
        >
          <TagBadge name={tag.name} color={tag.color} size="sm" />
        </button>
      ))}

      {selectedTagId && (
        <button
          onClick={() => onFilterChange(null)}
          className="text-sm text-blue-600 hover:text-blue-800 underline ml-2"
          type="button"
        >
          Clear filter
        </button>
      )}
    </div>
  );
}
