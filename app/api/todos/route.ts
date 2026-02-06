/**
 * Todo API Routes - List and Create
 * GET /api/todos - Get all todos for authenticated user
 * POST /api/todos - Create a new todo
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, Priority, RecurrencePattern } from '@/lib/db';
import { getSingaporeNow, isPastDate } from '@/lib/timezone';

/**
 * GET /api/todos
 * Retrieve all todos for the authenticated user with optional filters
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeCompleted = searchParams.get('include_completed') === 'true';
    const priorityFilter = searchParams.get('priority') as Priority | null;
    const tagIdFilter = searchParams.get('tag_id');

    // Build filter options
    const options: any = {
      includeCompleted,
    };

    if (priorityFilter && ['high', 'medium', 'low'].includes(priorityFilter)) {
      options.priority = priorityFilter;
    }

    if (tagIdFilter) {
      options.tagId = parseInt(tagIdFilter, 10);
    }

    // Fetch todos with relations (subtasks and tags)
    const todos = todoDB.findByUser(session.userId, options);

    return NextResponse.json({ 
      todos, 
      username: session.username 
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/todos
 * Create a new todo for the authenticated user
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, due_date, priority, recurrence_pattern, reminder_minutes } = body;

    // Validation: Title is required
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (title.trim().length > 500) {
      return NextResponse.json(
        { error: 'Title must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Validation: Due date is required
    if (!due_date || typeof due_date !== 'string') {
      return NextResponse.json(
        { error: 'Due date is required' },
        { status: 400 }
      );
    }

    // Validation: Due date cannot be in the past (Singapore time)
    if (isPastDate(due_date)) {
      return NextResponse.json(
        { error: 'Due date cannot be in the past' },
        { status: 400 }
      );
    }

    // Validation: Priority must be valid
    if (priority && !['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json(
        { error: 'Invalid priority value' },
        { status: 400 }
      );
    }

    // Validation: Recurrence pattern must be valid
    if (recurrence_pattern && !['daily', 'weekly', 'monthly', 'yearly'].includes(recurrence_pattern)) {
      return NextResponse.json(
        { error: 'Invalid recurrence pattern' },
        { status: 400 }
      );
    }

    // Validation: Reminder minutes must be positive
    if (reminder_minutes !== null && reminder_minutes !== undefined) {
      const reminderNum = parseInt(reminder_minutes, 10);
      if (isNaN(reminderNum) || reminderNum <= 0) {
        return NextResponse.json(
          { error: 'Reminder minutes must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Create the todo
    const todo = todoDB.create({
      user_id: session.userId,
      title,
      due_date,
      priority: priority || 'medium',
      recurrence_pattern: recurrence_pattern || null,
      reminder_minutes: reminder_minutes || null,
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json(
      { error: 'Failed to create todo' },
      { status: 500 }
    );
  }
}
