/**
 * Template Use API Route
 * POST - Create todo from template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, todoDB, subtaskDB } from '@/lib/db';
import { getSingaporeNow, formatSingaporeDate } from '@/lib/timezone';
import { addDays } from 'date-fns';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const template = templateDB.findById(Number(id));
  if (!template || template.user_id !== session.userId) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const body = await request.json();
  const { due_date_override } = body;

  // Calculate due date
  let dueDate: string;
  if (due_date_override) {
    dueDate = due_date_override;
  } else {
    const now = getSingaporeNow();
    const offsetDays = template.due_offset_days || 0;
    const due = addDays(now, offsetDays);
    dueDate = formatSingaporeDate(due, 'yyyy-MM-dd HH:mm:ss');
  }

  // Create todo
  const todo = todoDB.create({
    user_id: session.userId,
    title: template.title,
    due_date: dueDate,
    priority: template.priority,
  });

  // Create subtasks
  if (template.subtasks_json) {
    try {
      const subtasksData = JSON.parse(template.subtasks_json);
      subtasksData.forEach((data: any) => {
        subtaskDB.create({
          todo_id: todo.id,
          title: data.title,
          position: data.position,
        });
      });
    } catch (error) {
      console.error('Failed to create subtasks from template:', error);
    }
  }

  // Get todo with subtasks
  const subtasks = subtaskDB.findByTodo(todo.id);
  return NextResponse.json({ todo: { ...todo, subtasks } }, { status: 201 });
}
