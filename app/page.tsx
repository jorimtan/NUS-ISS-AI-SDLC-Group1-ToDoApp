'use client';

/**
 * Main Todo Page - CRUD Operations
 * Implements PRP-01: Todo CRUD Operations with optimistic UI updates
 * Implements PRP-02: Priority System with filtering and visual indicators
 * Implements PRP-03: Recurring Todos
 * Implements PRP-04: Reminders & Notifications
 * Implements PRP-05: Subtasks & Progress Tracking
 * Implements PRP-06: Tag System
 * Implements PRP-08: Search & Filtering
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Priority, TodoWithRelations, RecurrencePattern } from '@/lib/db';
import { PRIORITY_CONFIGS } from '@/lib/constants';
import { FilterState, defaultFilters, searchTodos, hasActiveFilters, getActiveFilterCount } from '@/lib/search';
import { PriorityBadge } from '@/components/PriorityBadge';
import { PrioritySelect } from '@/components/PrioritySelect';
import { PriorityFilter } from '@/components/PriorityFilter';
import { RecurrenceBadge } from '@/components/RecurrenceBadge';
import { RecurrenceSelect } from '@/components/RecurrenceSelect';
import { RecurrencePreview } from '@/components/RecurrencePreview';
import { ReminderBadge } from '@/components/ReminderBadge';
import { ReminderSelect } from '@/components/ReminderSelect';
import { NotificationBanner } from '@/components/NotificationBanner';
import { useNotifications } from '@/lib/hooks/useNotifications';
import SubtaskList from '@/components/SubtaskList';
import { TagBadge } from '@/components/TagBadge';
import { TagSelector } from '@/components/TagSelector';
import { TagFilter } from '@/components/TagFilter';
import { TagManagementModal } from '@/components/TagManagementModal';
import { SearchBar } from '@/components/SearchBar';
import { FilterPanel } from '@/components/FilterPanel';
import { TemplateBrowser } from '@/components/TemplateBrowser';
import { SaveAsTemplateButton } from '@/components/SaveAsTemplateButton';
import { ExportButton } from '@/components/ExportButton';
import { ImportModal } from '@/components/ImportModal';

export default function HomePage() {
  const router = useRouter();
  const [todos, setTodos] = useState<TodoWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');

  // Initialize notification hook (starts polling when permission granted)
  useNotifications();

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newRecurrence, setNewRecurrence] = useState<RecurrencePattern | null>(null);
  const [newReminder, setNewReminder] = useState<number | null>(null);
  const [newTagIds, setNewTagIds] = useState<number[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editRecurrence, setEditRecurrence] = useState<RecurrencePattern | null>(null);
  const [editReminder, setEditReminder] = useState<number | null>(null);
  const [editTagIds, setEditTagIds] = useState<number[]>([]);

  // Filter state
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);
  const [tagFilter, setTagFilter] = useState<number | null>(null);
  
  // Search & Filter state
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  
  // Tag management modal
  const [showTagModal, setShowTagModal] = useState(false);
  
  // Template browser modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Fetch todos and user info on mount
  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch all todos (filtering done client-side)
      const res = await fetch('/api/todos');
      
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to fetch todos');
      }

      const data = await res.json();
      setTodos(data.todos || []);
      
      // Get username from session if available
      if (data.username) {
        setUsername(data.username);
      }
    } catch (err: any) {
      console.error('Error fetching todos:', err);
      setError(err.message || 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    
    const title = newTitle.trim();
    if (!title) {
      setError('Title is required');
      return;
    }

    if (!newDueDate) {
      setError('Due date is required');
      return;
    }

    // Create temporary todo for optimistic update
    const tempId = Date.now();
    const tempTodo: TodoWithRelations = {
      id: tempId,
      user_id: 0,
      title,
      due_date: newDueDate,
      priority: newPriority,
      completed: 0,
      completed_at: null,
      recurrence_pattern: newRecurrence,
      reminder_minutes: newReminder,
      last_notification_sent: null,
      created_at: new Date().toISOString(),
      subtasks: [],
      tags: [],
    };

    // Optimistic update
    setTodos(prev => [...prev, tempTodo]);
    setError('');

    // Clear form
    setNewTitle('');
    setNewDueDate('');
    setNewPriority('medium');
    setNewRecurrence(null);
    setNewReminder(null);
    setNewTagIds([]);
    setShowAdvanced(false);

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          due_date: newDueDate,
          priority: newPriority,
          recurrence_pattern: newRecurrence,
          reminder_minutes: newReminder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create todo');
      }

      const data = await res.json();
      
      // Assign tags if any selected
      if (newTagIds.length > 0) {
        await fetch(`/api/todos/${data.todo.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_ids: newTagIds }),
        });
      }
      
      // Replace temp todo with real one (refetch to get tags)
      fetchTodos();
    } catch (err: any) {
      console.error('Error creating todo:', err);
      setError(err.message || 'Failed to add todo');
      
      // Revert optimistic update
      setTodos(prev => prev.filter(t => t.id !== tempId));
    }
  }

  async function handleToggleComplete(todo: TodoWithRelations) {
    const newCompleted = todo.completed ? 0 : 1;

    // Optimistic update
    setTodos(prev =>
      prev.map(t =>
        t.id === todo.id
          ? { ...t, completed: newCompleted }
          : t
      )
    );

    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      });

      if (!res.ok) {
        throw new Error('Failed to update todo');
      }

      const data = await res.json();

      // If recurring, add next instance and show toast
      if (data.next_todo) {
        setTodos(prev => [...prev, data.next_todo]);
        const nextDate = new Date(data.next_todo.due_date).toLocaleString('en-SG', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Singapore',
        });
        setToast({ message: `Recurring todo completed. Next instance created for ${nextDate}`, type: 'success' });
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err: any) {
      console.error('Error updating todo:', err);
      setError(err.message || 'Failed to update todo');

      // Revert optimistic update
      setTodos(prev =>
        prev.map(t =>
          t.id === todo.id
            ? { ...t, completed: todo.completed }
            : t
        )
      );
    }
  }

  async function handleDeleteTodo(id: number) {
    if (!confirm('Are you sure you want to delete this todo?')) {
      return;
    }

    // Find todo for potential revert
    const todoToDelete = todos.find(t => t.id === id);

    // Optimistic removal
    setTodos(prev => prev.filter(t => t.id !== id));

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete todo');
      }
    } catch (err: any) {
      console.error('Error deleting todo:', err);
      setError(err.message || 'Failed to delete todo');

      // Restore todo
      if (todoToDelete) {
        setTodos(prev => [...prev, todoToDelete]);
      }
    }
  }

  function startEdit(todo: TodoWithRelations) {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDueDate(todo.due_date.slice(0, 16)); // Format for datetime-local
    setEditPriority(todo.priority);
    setEditRecurrence(todo.recurrence_pattern);
    setEditReminder(todo.reminder_minutes);
    setEditTagIds(todo.tags?.map(t => t.id) || []);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
    setEditDueDate('');
    setEditPriority('medium');
    setEditRecurrence(null);
    setEditReminder(null);
    setEditTagIds([]);
  }

  async function handleUpdateTodo(id: number) {
    const title = editTitle.trim();
    if (!title) {
      setError('Title is required');
      return;
    }

    if (!editDueDate) {
      setError('Due date is required');
      return;
    }

    // Store old values for revert
    const oldTodo = todos.find(t => t.id === id);

    // Optimistic update
    setTodos(prev =>
      prev.map(t =>
        t.id === id
          ? { ...t, title, due_date: editDueDate, priority: editPriority, recurrence_pattern: editRecurrence, reminder_minutes: editReminder }
          : t
      )
    );

    setEditingId(null);
    setError('');

    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          due_date: editDueDate,
          priority: editPriority,
          recurrence_pattern: editRecurrence,
          reminder_minutes: editReminder,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update todo');
      }

      const data = await res.json();

      // Assign tags
      await fetch(`/api/todos/${id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_ids: editTagIds }),
      });

      // Refetch to get updated tags
      fetchTodos();
    } catch (err: any) {
      console.error('Error updating todo:', err);
      setError(err.message || 'Failed to update todo');

      // Revert optimistic update
      if (oldTodo) {
        setTodos(prev => prev.map(t => t.id === id ? oldTodo : t));
      }
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  // ============================================================================
  // Subtask Handlers
  // ============================================================================

  async function handleAddSubtask(todoId: number, title: string) {
    try {
      const res = await fetch('/api/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todo_id: todoId, title }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add subtask');
      }

      const data = await res.json();

      // Optimistic update: add subtask to local state
      setTodos(prev =>
        prev.map(t =>
          t.id === todoId
            ? { ...t, subtasks: [...(t.subtasks || []), data.subtask] }
            : t
        )
      );

      showToast('Subtask added', 'success');
    } catch (err: any) {
      console.error('Error adding subtask:', err);
      showToast(err.message || 'Failed to add subtask', 'error');
    }
  }

  async function handleToggleSubtask(subtaskId: number, completed: number) {
    // Find which todo this subtask belongs to
    let parentTodoId: number | null = null;
    for (const todo of todos) {
      if (todo.subtasks?.some(s => s.id === subtaskId)) {
        parentTodoId = todo.id;
        break;
      }
    }

    if (!parentTodoId) return;

    // Optimistic update
    setTodos(prev =>
      prev.map(t =>
        t.id === parentTodoId
          ? {
              ...t,
              subtasks: t.subtasks?.map(s =>
                s.id === subtaskId ? { ...s, completed } : s
              ),
            }
          : t
      )
    );

    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });

      if (!res.ok) {
        throw new Error('Failed to update subtask');
      }
    } catch (err: any) {
      console.error('Error toggling subtask:', err);
      // Revert optimistic update
      setTodos(prev =>
        prev.map(t =>
          t.id === parentTodoId
            ? {
                ...t,
                subtasks: t.subtasks?.map(s =>
                  s.id === subtaskId ? { ...s, completed: completed === 1 ? 0 : 1 } : s
                ),
              }
            : t
        )
      );
      showToast('Failed to update subtask', 'error');
    }
  }

  async function handleReorderSubtask(subtaskId: number, newPosition: number) {
    try {
      const res = await fetch('/api/subtasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtask_id: subtaskId, new_position: newPosition }),
      });

      if (!res.ok) {
        throw new Error('Failed to reorder subtask');
      }

      // Refresh todos to get updated positions
      await fetchTodos();
    } catch (err: any) {
      console.error('Error reordering subtask:', err);
      showToast('Failed to reorder subtask', 'error');
    }
  }

  // Apply filters to todos using client-side search
  const filteredTodos = useMemo(() => {
    // Merge old filter state with new filter state for compatibility
    const mergedFilters: FilterState = {
      ...filters,
      priority: filters.priority || priorityFilter,
      tagId: filters.tagId || tagFilter,
    };
    return searchTodos(todos, mergedFilters);
  }, [todos, filters, priorityFilter, tagFilter]);

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleSearch = useCallback((term: string) => {
    updateFilters({ searchText: term });
  }, [updateFilters]);

  function clearAllFilters() {
    setFilters(defaultFilters);
    setPriorityFilter(null);
    setTagFilter(null);
  }

  async function handleDeleteSubtask(subtaskId: number) {
    // Find which todo this subtask belongs to
    let parentTodoId: number | null = null;
    for (const todo of todos) {
      if (todo.subtasks?.some(s => s.id === subtaskId)) {
        parentTodoId = todo.id;
        break;
      }
    }

    if (!parentTodoId) return;

    // Optimistic update
    setTodos(prev =>
      prev.map(t =>
        t.id === parentTodoId
          ? {
              ...t,
              subtasks: t.subtasks?.filter(s => s.id !== subtaskId),
            }
          : t
      )
    );

    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete subtask');
      }

      showToast('Subtask deleted', 'success');
    } catch (err: any) {
      console.error('Error deleting subtask:', err);
      showToast('Failed to delete subtask', 'error');
      // Refresh to restore correct state
      await fetchTodos();
    }
  }

  // Set default due date to tomorrow
  useEffect(() => {
    if (!newDueDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const formatted = tomorrow.toISOString().slice(0, 16);
      setNewDueDate(formatted);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
      {/* Notification Permission Banner */}
      <NotificationBanner />
      
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Toast Notifications */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white flex items-center gap-3`}>
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 hover:bg-white hover:bg-opacity-20 rounded px-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Todo App</h1>
            {username && (
              <p className="mt-1 text-slate-300">Welcome, {username}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              onExportComplete={() => {
                showToast('Data exported successfully!', 'success');
              }}
            />
            <a
              href="/calendar"
              className="px-4 py-2 text-sm bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700 transition-colors inline-block font-medium"
              data-testid="calendar-link"
            >
              Calendar
            </a>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              type="button"
            >
              Templates
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium"
              type="button"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600/50 rounded-lg">
            <p className="text-sm text-red-200">{error}</p>
            <button
              onClick={() => setError('')}
              className="mt-2 text-xs text-red-300 hover:text-red-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar
            onSearch={handleSearch}
            initialValue={filters.searchText}
          />
        </div>

        {/* Advanced Filters Toggle */}
        <div className="mb-4 flex gap-3 items-center">
          <PriorityFilter
            value={priorityFilter}
            onChange={setPriorityFilter}
            className="bg-slate-700/50 border-slate-600 text-white"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-sm bg-slate-700/50 border border-slate-600 text-slate-200 rounded-lg hover:bg-slate-600/50 flex items-center gap-2"
          >
            <span>▶</span>
            <span>Advanced</span>
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6">
            <FilterPanel
              filters={filters}
              onChange={updateFilters}
              onClear={clearAllFilters}
              hasActiveFilters={hasActiveFilters(filters) || priorityFilter !== null || tagFilter !== null}
            />
          </div>
        )}

        {/* Add Todo Form */}
        <div className="mb-8 bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-slate-700/50">
          <form onSubmit={handleAddTodo} className="space-y-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Add a new todo..."
                className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={500}
              />
            </div>
            <div className="flex gap-3 items-end">
              <div>
                <PrioritySelect
                  value={newPriority}
                  onChange={setNewPriority}
                  className="h-[44px] bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="flex-1">
                <input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-[44px]"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 font-medium h-[44px]"
              >
                Add
              </button>
            </div>
            
            {/* Advanced Options Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>{showAdvanced ? '▼' : '▶'}</span>
                <span>Advanced Options</span>
              </button>
            </div>

            {/* Advanced Options Section */}
            {showAdvanced && (
              <div className="space-y-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <RecurrenceSelect value={newRecurrence} onChange={setNewRecurrence} />
                <ReminderSelect value={newReminder} onChange={setNewReminder} />
                <TagSelector selectedTagIds={newTagIds} onChange={setNewTagIds} />
                <RecurrencePreview dueDate={newDueDate} pattern={newRecurrence} />
              </div>
            )}
          </form>
        </div>

        {/* Todo List */}
        <div className="space-y-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-blue-400">
              Pending ({filteredTodos.filter(t => !t.completed).length})
              {filteredTodos.length !== todos.length && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  showing {filteredTodos.length} of {todos.length}
                </span>
              )}
            </h2>
            {(hasActiveFilters(filters) || priorityFilter || tagFilter) && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {todos.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 rounded-lg shadow border border-slate-700/50">
              <p className="text-slate-400">No todos yet. Add one above!</p>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 rounded-lg shadow border border-slate-700/50">
              <p className="text-slate-400 mb-4">No todos found matching your filters.</p>
              <button
                onClick={clearAllFilters}
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className={`p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-md border-l-4 mb-4 ${
                  todo.completed
                    ? 'border-l-slate-500 opacity-60'
                    : todo.priority === 'high'
                    ? 'border-l-red-500'
                    : todo.priority === 'medium'
                    ? 'border-l-yellow-500'
                    : 'border-l-blue-500'
                }`}
              >
                {editingId === todo.id ? (
                  /* Edit Mode */
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={500}
                    />
                    <div className="flex gap-3 flex-wrap">
                      <input
                        type="datetime-local"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="px-3 py-2 bg-slate-700/50 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <PrioritySelect
                        value={editPriority}
                        onChange={setEditPriority}
                      />
                      <RecurrenceSelect
                        value={editRecurrence}
                        onChange={setEditRecurrence}
                      />
                      <ReminderSelect
                        value={editReminder}
                        onChange={setEditReminder}
                      />
                    </div>
                    <div>
                      <TagSelector selectedTagIds={editTagIds} onChange={setEditTagIds} />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleUpdateTodo(todo.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        type="button"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div>
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={!!todo.completed}
                        onChange={() => handleToggleComplete(todo)}
                        className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3
                            className={`text-lg font-medium ${
                              todo.completed ? 'line-through text-slate-500' : 'text-white'
                            }`}
                          >
                            {todo.title}
                          </h3>
                          <PriorityBadge priority={todo.priority} />
                          {todo.subtasks && todo.subtasks.length > 0 && (
                            <span className="text-xs text-slate-400">
                              {todo.subtasks.filter(st => st.completed).length}/{todo.subtasks.length} subtasks
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                          <span className="text-orange-400">
                            📅 {new Date(todo.due_date).toLocaleString('en-SG', {
                              timeZone: 'Asia/Singapore',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <RecurrenceBadge pattern={todo.recurrence_pattern} />
                          <ReminderBadge minutes={todo.reminder_minutes} />
                          {todo.tags && todo.tags.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {todo.tags.map(tag => (
                                <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!todo.completed && (
                          <button
                            onClick={() => startEdit(todo)}
                            className="px-3 py-1 text-sm text-blue-400 hover:bg-slate-700/50 rounded-md"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="px-3 py-1 text-sm text-red-400 hover:bg-slate-700/50 rounded-md"
                        >
                          Del
                        </button>
                      </div>
                    </div>

                    {/* Subtasks */}
                    {!todo.completed && (
                      <SubtaskList
                        todoId={todo.id}
                        subtasks={todo.subtasks || []}
                        onAdd={handleAddSubtask}
                        onToggle={handleToggleSubtask}
                        onReorder={handleReorderSubtask}
                        onDelete={handleDeleteSubtask}
                      />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Statistics Footer */}
          {todos.length > 0 && (
            <div className="mt-6 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 text-center">
              <div className="flex justify-center gap-6 text-sm">
                <span className="text-red-400">
                  {todos.filter(t => !t.completed && new Date(t.due_date) < new Date()).length} Overdue
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-blue-400">
                  {todos.filter(t => !t.completed && new Date(t.due_date) >= new Date()).length} Pending
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-green-400">
                  {todos.filter(t => t.completed).length} Completed
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tag Management Modal */}
      <TagManagementModal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onTagsChanged={fetchTodos}
      />

      {/* Template Browser Modal */}
      <TemplateBrowser
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onTemplateUsed={() => {
          fetchTodos();
          showToast('Todo created from template!', 'success');
        }}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          fetchTodos();
        }}
      />
    </div>
  );
}
