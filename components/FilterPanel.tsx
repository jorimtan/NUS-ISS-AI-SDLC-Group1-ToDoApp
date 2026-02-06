/**
 * FilterPanel Component
 * Advanced filtering UI for todos
 */

'use client';

import { useState, useEffect } from 'react';
import { Priority, FilterState } from '@/lib/search';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: Partial<FilterState>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function FilterPanel({ filters, onChange, onClear, hasActiveFilters }: FilterPanelProps) {
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
      console.error('Failed to fetch tags:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Search Mode Toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Search Mode</label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ searchMode: 'simple' })}
            className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
              filters.searchMode === 'simple'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={filters.searchMode === 'simple'}
          >
            Simple (Title only)
          </button>
          <button
            onClick={() => onChange({ searchMode: 'advanced' })}
            className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
              filters.searchMode === 'advanced'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={filters.searchMode === 'advanced'}
          >
            Advanced (All fields)
          </button>
        </div>
        {filters.searchMode === 'advanced' && (
          <p className="mt-1 text-xs text-gray-500">
            Searches in titles, tags, and subtasks
          </p>
        )}
      </div>

      {/* Priority Filter */}
      <div>
        <label htmlFor="priority-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </label>
        <select
          id="priority-filter"
          value={filters.priority || 'all'}
          onChange={(e) =>
            onChange({
              priority: e.target.value === 'all' ? null : (e.target.value as Priority),
            })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Priority filter"
        >
          <option value="all">All Priorities</option>
          <option value="high">🔴 High Priority</option>
          <option value="medium">🟡 Medium Priority</option>
          <option value="low">🟢 Low Priority</option>
        </select>
      </div>

      {/* Tag Filter */}
      <div>
        <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Tag
        </label>
        {loading ? (
          <div className="text-sm text-gray-500">Loading tags...</div>
        ) : (
          <select
            id="tag-filter"
            value={filters.tagId || 'all'}
            onChange={(e) =>
              onChange({
                tagId: e.target.value === 'all' ? null : Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Tag filter"
          >
            <option value="all">All Tags</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Completion Status Filter */}
      <div>
        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <select
          id="status-filter"
          value={filters.completed}
          onChange={(e) => onChange({ completed: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Status filter"
        >
          <option value="all">All Todos</option>
          <option value="incomplete">⭕ Incomplete Only</option>
          <option value="complete">✅ Completed Only</option>
        </select>
      </div>

      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Due Date Range</label>
        <div className="space-y-2">
          <input
            type="date"
            value={filters.dateRange?.start || ''}
            onChange={(e) =>
              onChange({
                dateRange: {
                  start: e.target.value,
                  end: filters.dateRange?.end || e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Start date"
            aria-label="Date range start"
          />
          <input
            type="date"
            value={filters.dateRange?.end || ''}
            onChange={(e) =>
              onChange({
                dateRange: {
                  start: filters.dateRange?.start || e.target.value,
                  end: e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="End date"
            aria-label="Date range end"
          />
        </div>
        {filters.dateRange?.start && filters.dateRange?.end && (
          <button
            onClick={() => onChange({ dateRange: undefined })}
            className="mt-2 text-xs text-gray-600 hover:text-gray-800 hover:underline"
            aria-label="Clear date range"
          >
            Clear date range
          </button>
        )}
      </div>
    </div>
  );
}
