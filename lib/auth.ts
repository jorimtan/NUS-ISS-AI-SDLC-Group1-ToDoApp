/**
 * Authentication Utilities
 * 
 * Handles JWT session management for WebAuthn authentication.
 * Sessions stored as HTTP-only cookies with 7-day expiry.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface SessionData {
  userId: number;
  username: string;
  displayName: string;
}

/**
 * Create a new session for a user
 * @param userData - User data to store in session
 * @returns JWT token string
 */
export async function createSession(userData: SessionData): Promise<string> {
  const token = await new SignJWT({ 
    userId: userData.userId,
    username: userData.username,
    displayName: userData.displayName,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token to verify
 * @returns Session data or null if invalid
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      username: payload.username as string,
      displayName: payload.displayName as string,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get the current session from cookies (Next.js App Router)
 * @returns Session data or null if not authenticated
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  return verifySession(token);
}

/**
 * Set session cookie in response
 * @param token - JWT token to store
 * @param response - NextResponse to set cookie on
 */
export function setSessionCookie(token: string, response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Clear session cookie
 * @param response - NextResponse to clear cookie on
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}

/**
 * Get session from middleware request
 * @param request - NextRequest from middleware
 * @returns Session data or null
 */
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  return verifySession(token);
}

/**
 * Check if user is authenticated (middleware helper)
 * @param request - NextRequest from middleware
 * @returns True if authenticated
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const session = await getSessionFromRequest(request);
  return session !== null;
}
