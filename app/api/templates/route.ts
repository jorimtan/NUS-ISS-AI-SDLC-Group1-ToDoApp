/**
 * Template API Routes
 * POST - Create template from todo
 * GET - Get all templates for user
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, todoDB, subtaskDB } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let templates;
  if (category && (category === 'work' || category === 'personal' || category === 'other')) {
    templates = templateDB.findByCategory(session.userId, category as any);
  } else {
    templates = templateDB.findByUser(session.userId);
  }

  // Parse subtasks for all templates
  const templatesWithSubtasks = templates.map(template => {
    let subtasks = [];
    if (template.subtasks_json) {
      try {
        subtasks = JSON.parse(template.subtasks_json);
      } catch (error) {
        console.error('Failed to parse template subtasks:', error);
      }
    }
    return { ...template, subtasks };
  });

  return NextResponse.json({ templates: templatesWithSubtasks });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { name, category, todo_id, due_offset_days = 0 } = body;

  // Validate name
  if (!name || name.trim().length === 0 || name.length > 100) {
    return NextResponse.json(
      { error: 'Template name must be 1-100 characters' },
      { status: 400 }
    );
  }

  // Get source todo
  const todo = todoDB.findById(todo_id);
  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  // Serialize subtasks
  const subtasks = subtaskDB.findByTodo(todo_id);
  const subtasksData = subtasks.map(s => ({
    title: s.title,
    position: s.position,
  }));
  const subtasks_json = JSON.stringify(subtasksData);

  // Create template
  const template = templateDB.create({
    user_id: session.userId,
    name: name.trim(),
    category: category || null,
    title: todo.title,
    priority: todo.priority,
    due_offset_days,
    subtasks_json,
  });

  return NextResponse.json({ template }, { status: 201 });
}
