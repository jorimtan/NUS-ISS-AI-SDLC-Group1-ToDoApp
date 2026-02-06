/**
 * Import Preview API Endpoint
 * POST /api/todos/import/preview
 * Validates import data and returns preview without making changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

interface ExportData {
  version: string;
  exported_at: string;
  data: {
    todos: any[];
    tags: any[];
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

    // Validate
    const validationErrors = validateExportData(body);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        valid: false,
        errors: validationErrors,
      });
    }

    // Analyze import (no DB changes)
    const existingTags = tagDB.findByUser(session.userId);
    const existingTagNames = new Set(existingTags.map((t) => t.name.toLowerCase()));

    const tagsToCreate = body.data.tags.filter(
      (tag) => !existingTagNames.has(tag.name.toLowerCase())
    );
    const tagsToMerge = body.data.tags.filter((tag) =>
      existingTagNames.has(tag.name.toLowerCase())
    );

    return NextResponse.json({
      valid: true,
      preview: {
        todos_to_import: body.data.todos.length,
        tags_to_create: tagsToCreate.length,
        tags_to_merge: tagsToMerge.length,
        templates_to_import: body.data.templates.length,
        subtasks_to_import: body.data.todos.flatMap((t) => t.subtasks || []).length,
      },
      mergeDetails: {
        mergingTags: tagsToMerge.map((t) => t.name),
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({
      valid: false,
      errors: ['Failed to parse JSON or validate data'],
    });
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
      if (!Array.isArray(todo.subtasks)) {
        errors.push(`todos[${index}]: subtasks must be an array`);
      }
      if (!Array.isArray(todo.tag_ids)) {
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
