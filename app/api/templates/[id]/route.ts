/**
 * Template API Routes - Individual template operations
 * PUT - Update template
 * DELETE - Delete template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { templateDB, Priority, TemplateCategory } from '@/lib/db';

export async function PUT(
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
  const { name, category, due_offset_days } = body;

  const updates:  Partial<{
    name: string;
    category: TemplateCategory | null;
    due_offset_days: number;
  }> = {};

  if (name !== undefined) {
    if (name.trim().length === 0 || name.length > 100) {
      return NextResponse.json(
        { error: 'Template name must be 1-100 characters' },
        { status: 400 }
      );
    }
    updates.name = name.trim();
  }

  if (category !== undefined) {
    updates.category = category || null;
  }

  if (due_offset_days !== undefined) {
    if (typeof due_offset_days !== 'number' || due_offset_days < 0) {
      return NextResponse.json(
        { error: 'Due offset must be a non-negative number' },
        { status: 400 }
      );
    }
    updates.due_offset_days = due_offset_days;
  }

  const updatedTemplate = templateDB.update(Number(id), updates);
  return NextResponse.json({ template: updatedTemplate });
}

export async function DELETE(
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

  templateDB.delete(Number(id));
  return NextResponse.json({ success: true });
}
