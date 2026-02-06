/**
 * Search & Filter Utilities
 * Client-side search and filtering for todos
 */

import { Priority, RecurrencePattern, TodoWithRelations } from './db';

// Re-export for convenience
export type { TodoWithRelations, Priority, RecurrencePattern };

/**
 * Filter state interface
 */
export interface FilterState {
  searchText: string;
  searchMode: 'simple' | 'advanced';
  priority: Priority | null;
  tagId: number | null;
  completed: 'all' | 'incomplete' | 'complete';
  dateRange?: {
    start: string;
    end: string;
  };
}

/**
 * Search options interface
 */
export interface SearchOptions {
  caseSensitive: boolean;
  exactMatch: boolean;
  searchInSubtasks: boolean;
}

/**
 * Default filter state
 */
export const defaultFilters: FilterState = {
  searchText: '',
  searchMode: 'simple',
  priority: null,
  tagId: null,
  completed: 'incomplete', // Show incomplete by default
};

/**
 * Default search options
 */
export const defaultSearchOptions: SearchOptions = {
  caseSensitive: false,
  exactMatch: false,
  searchInSubtasks: true,
};

/**
 * Search and filter todos based on criteria
 */
export function searchTodos(
  todos: TodoWithRelations[],
  filters: FilterState,
  options: SearchOptions = defaultSearchOptions
): TodoWithRelations[] {
  let results = [...todos];

  // Apply search text filter
  if (filters.searchText) {
    const searchTerm = options.caseSensitive
      ? filters.searchText
      : filters.searchText.toLowerCase();

    results = results.filter((todo) => {
      // Search in title
      const title = options.caseSensitive ? todo.title : todo.title.toLowerCase();
      const titleMatch = options.exactMatch
        ? title === searchTerm
        : title.includes(searchTerm);

      if (filters.searchMode === 'simple') {
        return titleMatch;
      }

      // Advanced search: include tags
      const tagMatch = todo.tags?.some((tag) => {
        const tagName = options.caseSensitive ? tag.name : tag.name.toLowerCase();
        return options.exactMatch ? tagName === searchTerm : tagName.includes(searchTerm);
      });

      // Search in subtasks
      let subtaskMatch = false;
      if (options.searchInSubtasks && todo.subtasks) {
        subtaskMatch = todo.subtasks.some((subtask) => {
          const subtaskTitle = options.caseSensitive
            ? subtask.title
            : subtask.title.toLowerCase();
          return options.exactMatch
            ? subtaskTitle === searchTerm
            : subtaskTitle.includes(searchTerm);
        });
      }

      return titleMatch || tagMatch || subtaskMatch;
    });
  }

  // Apply priority filter
  if (filters.priority) {
    results = results.filter((todo) => todo.priority === filters.priority);
  }

  // Apply tag filter
  if (filters.tagId) {
    results = results.filter((todo) => todo.tags?.some((tag) => tag.id === filters.tagId));
  }

  // Apply completion filter
  if (filters.completed === 'incomplete') {
    results = results.filter((todo) => !todo.completed);
  } else if (filters.completed === 'complete') {
    results = results.filter((todo) => todo.completed);
  }

  // Apply date range filter
  if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
    const start = new Date(filters.dateRange.start);
    const end = new Date(filters.dateRange.end);
    // Set end date to end of day
    end.setHours(23, 59, 59, 999);

    results = results.filter((todo) => {
      const dueDate = new Date(todo.due_date);
      return dueDate >= start && dueDate <= end;
    });
  }

  return results;
}

/**
 * Check if any filters are active (excluding default state)
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return (
    filters.searchText !== '' ||
    filters.priority !== null ||
    filters.tagId !== null ||
    filters.completed !== 'incomplete' || // 'incomplete' is the default
    (filters.dateRange !== undefined &&
      filters.dateRange.start !== '' &&
      filters.dateRange.end !== '')
  );
}

/**
 * Get count of active filters
 */
export function getActiveFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.searchText) count++;
  if (filters.priority) count++;
  if (filters.tagId) count++;
  if (filters.completed !== 'incomplete') count++;
  if (filters.dateRange?.start && filters.dateRange?.end) count++;
  return count;
}
