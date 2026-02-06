/**
 * Todo API Routes - Individual Todo Operations
 * GET /api/todos/[id] - Get a specific todo
 * PUT /api/todos/[id] - Update a todo
 * DELETE /api/todos/[id] - Delete a todo
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, Priority, RecurrencePattern } from '@/lib/db';
import { getSingaporeNow, formatSingaporeDate } from '@/lib/timezone';

/**
 * GET /api/todos/[id]
 * Retrieve a specific todo by ID
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const todoId = parseInt(id, 10);

    if (isNaN(todoId)) {
      return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
    }

    const todo = todoDB.findById(todoId);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Verify ownership
    if (todo.user_id !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ todo });
  } catch (error) {
    console.error('Error fetching todo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todo' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/todos/[id]
 * Update a todo (including marking as complete)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const todoId = parseInt(id, 10);

    if (isNaN(todoId)) {
      return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
    }

    const todo = todoDB.findById(todoId);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Verify ownership
    if (todo.user_id !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Validate and prepare update data
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Title must be a non-empty string' },
          { status: 400 }
        );
      }
      if (body.title.trim().length > 500) {
        return NextResponse.json(
          { error: 'Title must be 500 characters or less' },
          { status: 400 }
        );
      }
      updateData.title = body.title.trim();
    }

    if (body.due_date !== undefined) {
      updateData.due_date = body.due_date;
    }

    if (body.priority !== undefined) {
      if (!['high', 'medium', 'low'].includes(body.priority)) {
        return NextResponse.json(
          { error: 'Invalid priority value' },
          { status: 400 }
        );
      }
      updateData.priority = body.priority;
    }

    if (body.recurrence_pattern !== undefined) {
      if (body.recurrence_pattern !== null && 
          !['daily', 'weekly', 'monthly', 'yearly'].includes(body.recurrence_pattern)) {
        return NextResponse.json(
          { error: 'Invalid recurrence pattern' },
          { status: 400 }
        );
      }
      updateData.recurrence_pattern = body.recurrence_pattern;
    }

    if (body.reminder_minutes !== undefined) {
      updateData.reminder_minutes = body.reminder_minutes;
    }

    // Handle completion
    let nextTodo: any = null;
    if (body.completed !== undefined) {
      const isCompleting = body.completed === 1 && todo.completed === 0;
      
      updateData.completed = body.completed;
      
      if (isCompleting) {
        // Set completion timestamp
        updateData.completed_at = formatSingaporeDate(getSingaporeNow());

        // If recurring, create next instance with tags and subtasks
        if (todo.recurrence_pattern) {
          nextTodo = todoDB.createRecurringInstance(todo);
        }
      } else if (body.completed === 0) {
        // Marking as incomplete, clear completion timestamp
        updateData.completed_at = null;
      }
    }

    // Update the todo
    const updatedTodo = todoDB.update(todoId, updateData);

    const response: any = { todo: updatedTodo };
    if (nextTodo) {
      response.next_todo = nextTodo;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/todos/[id]
 * Delete a todo (cascades to subtasks and tag relationships)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const todoId = parseInt(id, 10);

    if (isNaN(todoId)) {
      return NextResponse.json({ error: 'Invalid todo ID' }, { status: 400 });
    }

    const todo = todoDB.findById(todoId);

    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // Verify ownership
    if (todo.user_id !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete the todo (CASCADE will handle subtasks and tag relationships)
    todoDB.delete(todoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
