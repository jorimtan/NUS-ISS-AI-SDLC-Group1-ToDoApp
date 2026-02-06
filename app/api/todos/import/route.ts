/**
 * Import API Endpoint
 * POST /api/todos/import
 * Imports data with ID remapping and tag merging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, subtaskDB, tagDB, templateDB, db, Todo, Subtask, Tag } from '@/lib/db';

interface ExportData {
  version: string;
  exported_at: string;
  data: {
    todos: (Todo & { subtasks: Subtask[]; tag_ids: number[] })[];
    tags: Tag[];
    templates: any[];
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ExportData;

    // Validation
    const validationErrors = validateExportData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid import data', details: validationErrors },
        { status: 400 }
      );
    }

    // ID remapping structures
    const tagIdMap = new Map<number, number>(); // old ID → new ID
    const todoIdMap = new Map<number, number>();

    // Import tags first (handle duplicates by name)
    const existingTags = tagDB.findByUser(session.userId);
    const existingTagNames = new Map(existingTags.map((t) => [t.name.toLowerCase(), t.id]));

    body.data.tags.forEach((tag) => {
      const lowerName = tag.name.toLowerCase();
      if (existingTagNames.has(lowerName)) {
        // Reuse existing tag
        tagIdMap.set(tag.id, existingTagNames.get(lowerName)!);
      } else {
        // Create new tag
        const newTag = tagDB.create({
          name: tag.name,
          color: tag.color,
          user_id: session.userId,
        });
        tagIdMap.set(tag.id, newTag.id);
        existingTagNames.set(lowerName, newTag.id);
      }
    });

    // Import todos
    body.data.todos.forEach((todo) => {
      // Create new todo (omit old ID, let DB assign new one)
      const newTodo = todoDB.create({
        title: todo.title,
        user_id: session.userId,
        priority: todo.priority,
        due_date: todo.due_date,
        recurrence_pattern: todo.recurrence_pattern,
        reminder_minutes: todo.reminder_minutes,
      });

      todoIdMap.set(todo.id, newTodo.id);

      // Mark as completed if needed (update after creation)
      if (todo.completed) {
        db.prepare(`
          UPDATE todos
          SET completed = 1, completed_at = ?
          WHERE id = ?
        `).run(todo.completed_at || new Date().toISOString(), newTodo.id);
      }

      // Import subtasks with remapped todo_id
      if (todo.subtasks && Array.isArray(todo.subtasks)) {
        todo.subtasks.forEach((subtask) => {
          subtaskDB.create({
            todo_id: newTodo.id,
            title: subtask.title,
            position: subtask.position,
          });

          // Mark subtask as completed if needed
          if (subtask.completed) {
            db.prepare(`
              UPDATE subtasks
              SET completed = 1
              WHERE todo_id = ? AND title = ?
            `).run(newTodo.id, subtask.title);
          }
        });
      }

      // Recreate tag relationships with remapped IDs
      if (todo.tag_ids && Array.isArray(todo.tag_ids)) {
        todo.tag_ids.forEach((oldTagId) => {
          const newTagId = tagIdMap.get(oldTagId);
          if (newTagId) {
            db.prepare(
              `
              INSERT OR IGNORE INTO todo_tags (todo_id, tag_id)
              VALUES (?, ?)
            `
            ).run(newTodo.id, newTagId);
          }
        });
      }
    });

    // Import templates (independent of todos)
    body.data.templates.forEach((template) => {
      templateDB.create({
        user_id: session.userId,
        name: template.name,
        title: template.title,
        category: template.category,
        priority: template.priority,
        due_offset_days: template.due_offset_days,
        subtasks_json: template.subtasks_json,
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Import completed successfully',
      imported: {
        todos: body.data.todos.length,
        tags: body.data.tags.length,
        templates: body.data.templates.length,
        subtasks: body.data.todos.flatMap((t) => t.subtasks || []).length,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import data' }, { status: 500 });
  }
}

/**
 * Validate export data structure
 */
function validateExportData(data: any): string[] {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data structure: expected object');
    return errors;
  }

  if (!data.version) {
    errors.push('Missing version field');
  }

  if (!data.data || typeof data.data !== 'object') {
    errors.push('Missing data field');
    return errors;
  }

  // Validate todos array
  if (!Array.isArray(data.data.todos)) {
    errors.push('data.todos must be an array');
  } else {
    data.data.todos.forEach((todo: any, index: number) => {
      if (!todo.title || typeof todo.title !== 'string') {
        errors.push(`todos[${index}]: missing or invalid title`);
      }
      if (!todo.priority || !['high', 'medium', 'low'].includes(todo.priority)) {
        errors.push(`todos[${index}]: invalid priority`);
      }
      if (todo.subtasks !== undefined && !Array.isArray(todo.subtasks)) {
        errors.push(`todos[${index}]: subtasks must be an array`);
      }
      if (todo.tag_ids !== undefined && !Array.isArray(todo.tag_ids)) {
        errors.push(`todos[${index}]: tag_ids must be an array`);
      }
    });
  }

  // Validate tags array
  if (!Array.isArray(data.data.tags)) {
    errors.push('data.tags must be an array');
  } else {
    data.data.tags.forEach((tag: any, index: number) => {
      if (!tag.name || typeof tag.name !== 'string') {
        errors.push(`tags[${index}]: missing or invalid name`);
      }
      if (!tag.color || typeof tag.color !== 'string') {
        errors.push(`tags[${index}]: missing or invalid color`);
      }
    });
  }

  // Validate templates array
  if (!Array.isArray(data.data.templates)) {
    errors.push('data.templates must be an array');
  }

  return errors;
}
