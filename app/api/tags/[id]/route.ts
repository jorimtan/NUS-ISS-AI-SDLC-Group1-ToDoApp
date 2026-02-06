import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB } from '@/lib/db';

/**
 * PUT /api/tags/[id]
 * Update a tag (name and/or color)
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
  const tag = tagDB.findById(Number(id));

  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  // Validate name if provided
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 30) {
      return NextResponse.json(
        { error: 'Tag name must be 1-30 characters' },
        { status: 400 }
      );
    }

    // Check for duplicate name (excluding current tag)
    const existing = tagDB.findByUserAndName(session.userId, body.name.trim());
    if (existing && existing.id !== tag.id) {
      return NextResponse.json(
        { error: 'Tag name already exists' },
        { status: 409 }
      );
    }

    body.name = body.name.trim();
  }

  // Validate color if provided
  if (body.color !== undefined) {
    if (!/^#[0-9A-F]{6}$/i.test(body.color)) {
      return NextResponse.json(
        { error: 'Invalid color format. Use hex (e.g., #3B82F6)' },
        { status: 400 }
      );
    }
  }

  const updated = tagDB.update(Number(id), body);

  return NextResponse.json({ tag: updated });
}

/**
 * DELETE /api/tags/[id]
 * Delete a tag (cascades to todo_tags)
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

  const tag = tagDB.findById(Number(id));
  if (!tag || tag.user_id !== session.userId) {
    return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
  }

  tagDB.delete(Number(id));

  return NextResponse.json({ success: true });
}
