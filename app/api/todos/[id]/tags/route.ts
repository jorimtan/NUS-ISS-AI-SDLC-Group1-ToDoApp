import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, tagDB } from '@/lib/db';

/**
 * POST /api/todos/[id]/tags
 * Assign tags to a todo (replaces existing tags)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { tag_ids } = await request.json();
  const todo = todoDB.findById(Number(id));

  if (!todo || todo.user_id !== session.userId) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  // Validate tag_ids is an array
  if (!Array.isArray(tag_ids)) {
    return NextResponse.json(
      { error: 'tag_ids must be an array' },
      { status: 400 }
    );
  }

  // Verify all tags belong to user
  for (const tagId of tag_ids) {
    const tag = tagDB.findById(tagId);
    if (!tag || tag.user_id !== session.userId) {
      return NextResponse.json(
        { error: `Tag ${tagId} not found or not accessible` },
        { status: 404 }
      );
    }
  }

  // Clear existing tags for this todo
  todoDB.removeTag(todo.id, -1); // Remove all tags (hack: if we pass -1, we should clear all)
  
  // Actually, let me use a better approach - clear all first
  const existingTags = todoDB.getTags(todo.id);
  existingTags.forEach(tag => {
    todoDB.removeTag(todo.id, tag.id);
  });

  // Add new tags
  tag_ids.forEach((tagId: number) => {
    todoDB.addTag(todo.id, tagId);
  });

  // Return todo with tags
  const tags = todoDB.getTags(todo.id);
  return NextResponse.json({ todo: { ...todo, tags } });
}
