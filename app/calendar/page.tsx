'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, addMonths, subMonths } from 'date-fns';
import { getSingaporeNow } from '@/lib/timezone';
import {
  generateCalendarDays,
  getTodoIntensityClass,
  getMonthString,
  parseMonthString,
  CalendarDay,
} from '@/lib/calendar';

interface Todo {
  id: number;
  title: string;
  due_date: string;
  priority: string;
  completed: boolean;
}

interface Holiday {
  date: string;
  name: string;
}

interface CalendarData {
  month: string;
  todosByDate: Record<string, Todo[]>;
  holidays: Holiday[];
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get('month');

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (monthParam) {
      return parseMonthString(monthParam);
    }
    return getSingaporeNow();
  });

  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const monthStr = getMonthString(currentDate);
      const response = await fetch(`/api/calendar?month=${monthStr}`);
      if (!response.ok) throw new Error('Failed to fetch calendar data');

      const data: CalendarData = await response.json();

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const days = generateCalendarDays(year, month, data.todosByDate, data.holidays);
      setCalendarDays(days);
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const newDate = subMonths(currentDate, 1);
    setCurrentDate(newDate);
    router.push(`/calendar?month=${getMonthString(newDate)}`);
  };

  const handleNextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    setCurrentDate(newDate);
    router.push(`/calendar?month=${getMonthString(newDate)}`);
  };

  const handleTodayClick = () => {
    const today = getSingaporeNow();
    setCurrentDate(today);
    router.push(`/calendar?month=${getMonthString(today)}`);
  };

  const handleDayClick = (day: CalendarDay) => {
    setSelectedDate(day);
  };

  const handleTodoToggle = async (todo: Todo) => {
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (!response.ok) throw new Error('Failed to toggle todo');

      // Refresh calendar data
      await fetchCalendarData();
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  };

  const closeModal = () => {
    setSelectedDate(null);
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Calendar View</h1>
            <a
              href="/"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to Todos
            </a>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrevMonth}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              data-testid="prev-month"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold text-gray-800" data-testid="current-month">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <button
                onClick={handleTodayClick}
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md"
                data-testid="today-button"
              >
                Today
              </button>
            </div>

            <button
              onClick={handleNextMonth}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              data-testid="next-month"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-gray-500">Loading calendar...</div>
            </div>
          ) : (
            <>
              {/* Week Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-sm font-semibold text-gray-600 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2" data-testid="calendar-grid">
                {calendarDays.map((day) => (
                  <CalendarDayCell
                    key={day.dateString}
                    day={day}
                    onClick={() => handleDayClick(day)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Heat Map Legend</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 border border-gray-200 rounded" />
              <span>0 todos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 border border-gray-200 rounded" />
              <span>1 todo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 border border-gray-200 rounded" />
              <span>2-3 todos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-200 border border-gray-200 rounded" />
              <span>4-5 todos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-300 border border-gray-200 rounded" />
              <span>6+ todos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Detail Modal */}
      {selectedDate && (
        <DateDetailModal
          day={selectedDate}
          onClose={closeModal}
          onTodoToggle={handleTodoToggle}
        />
      )}
    </div>
  );
}

interface CalendarDayCellProps {
  day: CalendarDay;
  onClick: () => void;
}

function CalendarDayCell({ day, onClick }: CalendarDayCellProps) {
  const intensityClass = getTodoIntensityClass(day.todoCount);

  return (
    <button
      onClick={onClick}
      className={`
        min-h-24 p-2 border border-gray-200 rounded-lg text-left transition-colors
        hover:border-blue-300 hover:shadow-sm
        ${intensityClass}
        ${day.isToday ? 'ring-2 ring-blue-500' : ''}
        ${!day.isCurrentMonth ? 'opacity-40' : ''}
      `}
      data-date={day.dateString}
      data-testid={`calendar-day-${day.dateString}`}
    >
      <div className="flex flex-col h-full">
        {/* Date Number */}
        <div className="flex items-center justify-between mb-1">
          <span
            className={`text-sm font-semibold ${
              day.isToday
                ? 'text-blue-600'
                : !day.isCurrentMonth
                  ? 'text-gray-400'
                  : 'text-gray-700'
            }`}
          >
            {format(day.date, 'd')}
          </span>
          {day.todoCount > 0 && (
            <span className="text-xs font-medium text-gray-600 bg-white/80 px-1.5 py-0.5 rounded">
              {day.todoCount}
            </span>
          )}
        </div>

        {/* Holiday Indicator */}
        {day.isHoliday && (
          <div
            className="text-xs text-red-600 font-medium mb-1 truncate"
            title={day.holidayName}
            data-testid={`holiday-${day.dateString}`}
          >
            🎉 {day.holidayName}
          </div>
        )}

        {/* Todo Preview (first 2) */}
        <div className="flex-1 space-y-1">
          {day.todos.slice(0, 2).map((todo: Todo) => (
            <div
              key={todo.id}
              className={`text-xs truncate ${
                todo.completed ? 'line-through text-gray-400' : 'text-gray-700'
              }`}
              title={todo.title}
            >
              • {todo.title}
            </div>
          ))}
          {day.todoCount > 2 && (
            <div className="text-xs text-gray-500">+{day.todoCount - 2} more</div>
          )}
        </div>
      </div>
    </button>
  );
}

interface DateDetailModalProps {
  day: CalendarDay;
  onClose: () => void;
  onTodoToggle: (todo: Todo) => void;
}

function DateDetailModal({ day, onClose, onTodoToggle }: DateDetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      data-testid="date-detail-modal"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {format(day.date, 'EEEE, MMMM d, yyyy')}
              </h2>
              {day.isHoliday && (
                <p className="text-sm text-red-600 font-medium mt-1">
                  🎉 {day.holidayName}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              data-testid="close-modal"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {day.todoCount === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No todos for this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Todos ({day.todoCount})
              </h3>
              {day.todos.map((todo: Todo) => (
                <div
                  key={todo.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => onTodoToggle(todo)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    data-testid={`todo-checkbox-${todo.id}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`font-medium ${
                          todo.completed ? 'line-through text-gray-400' : 'text-gray-800'
                        }`}
                      >
                        {todo.title}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${getPriorityBadge(todo.priority)}`}
                      >
                        {todo.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
