import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { subtaskDB, todoDB } from '@/lib/db';

/**
 * POST /api/subtasks/reorder
 * Reorder subtasks by swapping positions
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { subtask_id, new_position } = body;

  // Validate inputs
  if (typeof subtask_id !== 'number' || typeof new_position !== 'number') {
    return NextResponse.json(
      { error: 'Invalid subtask_id or new_position' },
      { status: 400 }
    );
  }

  const subtask = subtaskDB.findById(subtask_id);
  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  // Verify ownership
  const todo = todoDB.findById(subtask.todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Get all subtasks for this todo
  const allSubtasks = subtaskDB.findByTodo(subtask.todo_id);
  
  // Validate new_position is within bounds
  if (new_position < 0 || new_position >= allSubtasks.length) {
    return NextResponse.json(
      { error: 'Invalid position' },
      { status: 400 }
    );
  }

  const oldPosition = subtask.position;

  // No change needed
  if (oldPosition === new_position) {
    return NextResponse.json({ success: true });
  }

  // Reorder algorithm: shift all subtasks between old and new position
  if (oldPosition < new_position) {
    // Moving down: shift items up
    allSubtasks.forEach(s => {
      if (s.id === subtask_id) {
        subtaskDB.update(s.id, { position: new_position });
      } else if (s.position > oldPosition && s.position <= new_position) {
        subtaskDB.update(s.id, { position: s.position - 1 });
      }
    });
  } else {
    // Moving up: shift items down
    allSubtasks.forEach(s => {
      if (s.id === subtask_id) {
        subtaskDB.update(s.id, { position: new_position });
      } else if (s.position >= new_position && s.position < oldPosition) {
        subtaskDB.update(s.id, { position: s.position + 1 });
      }
    });
  }

  return NextResponse.json({ success: true });
}
