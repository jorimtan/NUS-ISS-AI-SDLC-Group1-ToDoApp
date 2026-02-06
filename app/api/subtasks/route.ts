import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

/**
 * POST /api/subtasks
 * Create a new subtask for a todo
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { todo_id, title } = body;

  // Validate title
  if (!title || title.trim().length === 0 || title.length > 200) {
    return NextResponse.json(
      { error: 'Title must be 1-200 characters' },
      { status: 400 }
    );
  }

  // Validate todo_id
  if (!todo_id || typeof todo_id !== 'number') {
    return NextResponse.json(
      { error: 'Invalid todo_id' },
      { status: 400 }
    );
  }

  // Verify todo exists and belongs to user
  const todo = todoDB.findById(todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  // Get next position (0-indexed, so length = next position)
  const existingSubtasks = subtaskDB.findByTodo(todo_id);
  const nextPosition = existingSubtasks.length;

  const subtask = subtaskDB.create({
    todo_id,
    title: title.trim(),
    position: nextPosition,
  });

  return NextResponse.json({ subtask }, { status: 201 });
}
