import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

/**
 * PUT /api/subtasks/[id]
 * Update a subtask (title, completed, position)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const subtask = subtaskDB.findById(Number(id));

  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  // Verify ownership via parent todo
  const todo = todoDB.findById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Validate title if provided
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0 || body.title.length > 200) {
      return NextResponse.json(
        { error: 'Title must be 1-200 characters' },
        { status: 400 }
      );
    }
  }

  // Validate completed if provided
  if (body.completed !== undefined) {
    if (body.completed !== 0 && body.completed !== 1) {
      return NextResponse.json(
        { error: 'Completed must be 0 or 1' },
        { status: 400 }
      );
    }
  }

  // Update subtask
  const updated = subtaskDB.update(Number(id), body);

  return NextResponse.json({ subtask: updated });
}

/**
 * DELETE /api/subtasks/[id]
 * Delete a subtask and reorder remaining ones
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const subtask = subtaskDB.findById(Number(id));
  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  // Verify ownership
  const todo = todoDB.findById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const todoId = subtask.todo_id;

  // Delete subtask
  subtaskDB.delete(Number(id));

  // Reorder remaining subtasks (close gaps in position)
  const remaining = subtaskDB.findByTodo(todoId);
  remaining.sort((a, b) => a.position - b.position);
  remaining.forEach((s, index) => {
    if (s.position !== index) {
      subtaskDB.update(s.id, { position: index });
    }
  });

  return NextResponse.json({ success: true });
}
