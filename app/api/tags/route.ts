import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagDB, getRandomTagColor } from '@/lib/db';

/**
 * GET /api/tags
 * Get all tags for the authenticated user
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const withCount = searchParams.get('with_count') === 'true';

  const tags = withCount
    ? tagDB.findByUserWithCount(session.userId)
    : tagDB.findByUser(session.userId);

  return NextResponse.json({ tags });
}

/**
 * POST /api/tags
 * Create a new tag
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  let { name, color } = body;

  // Validate name
  if (!name || name.trim().length === 0 || name.length > 30) {
    return NextResponse.json(
      { error: 'Tag name must be 1-30 characters' },
      { status: 400 }
    );
  }

  name = name.trim();

  // Check for duplicate
  const existing = tagDB.findByUserAndName(session.userId, name);
  if (existing) {
    return NextResponse.json(
      { error: 'Tag name already exists' },
      { status: 409 }
    );
  }

  // Default color if not provided
  if (!color) {
    color = getRandomTagColor();
  }

  // Validate color format
  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    return NextResponse.json(
      { error: 'Invalid color format. Use hex (e.g., #3B82F6)' },
      { status: 400 }
    );
  }

  const tag = tagDB.create({
    user_id: session.userId,
    name,
    color,
  });

  return NextResponse.json({ tag }, { status: 201 });
}
