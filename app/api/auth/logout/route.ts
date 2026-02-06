/**
 * Logout API Route
 * POST /api/auth/logout
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  return response;
}
