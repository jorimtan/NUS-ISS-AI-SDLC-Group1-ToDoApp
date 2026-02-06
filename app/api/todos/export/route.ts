/**
 * Export API Endpoint
 * GET /api/todos/export
 * Exports all user data (todos, subtasks, tags, templates) to JSON
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB, templateDB, db } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Export all todos with relationships
    const todos = todoDB.findByUser(session.userId, { includeCompleted: true });
    const tags = tagDB.findByUser(session.userId);
    const templates = templateDB.findByUser(session.userId);

    // Get all subtasks and tag relationships for todos
    const subtasksMap: Record<number, any[]> = {};
    const tagsMap: Record<number, number[]> = {};

    todos.forEach((todo) => {
      subtasksMap[todo.id] = subtaskDB.findByTodo(todo.id);

      // Get tag IDs for this todo
      const todoTags = db
        .prepare(`
        SELECT tag_id FROM todo_tags WHERE todo_id = ?
      `)
        .all(todo.id) as { tag_id: number }[];

      tagsMap[todo.id] = todoTags.map((t) => t.tag_id);
    });

    // Build export structure
    const exportData = {
      version: '1.0',
      exported_at: getSingaporeNow().toISOString(),
      user_id: session.userId, // For reference only
      data: {
        todos: todos.map((todo) => ({
          ...todo,
          subtasks: subtasksMap[todo.id] || [],
          tag_ids: tagsMap[todo.id] || [],
        })),
        tags,
        templates,
      },
      metadata: {
        total_todos: todos.length,
        total_tags: tags.length,
        total_templates: templates.length,
        total_subtasks: Object.values(subtasksMap).flat().length,
      },
    };

    // Generate filename with date
    const dateStr = format(getSingaporeNow(), 'yyyy-MM-dd');
    const filename = `todos-backup-${dateStr}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
