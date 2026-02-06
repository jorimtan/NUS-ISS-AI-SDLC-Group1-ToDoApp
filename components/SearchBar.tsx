/**
 * SearchBar Component
 * Real-time search input with debouncing
 */

'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface SearchBarProps {
  onSearch: (term: string) => void;
  placeholder?: string;
  initialValue?: string;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search todos, tags, and subtasks...',
  initialValue = '',
}: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    onSearch(debouncedSearch);
  }, [debouncedSearch, onSearch]);

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2 pl-10 text-base bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        aria-label="Search todos"
      />
      <span
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg"
        aria-hidden="true"
      >
        🔍
      </span>
      {searchTerm && (
        <button
          onClick={() => setSearchTerm('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors text-xl font-bold leading-none"
          aria-label="Clear search"
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
