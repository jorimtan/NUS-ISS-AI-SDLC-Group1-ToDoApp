/**
 * WebAuthn Registration - Generate Options
 * POST /api/auth/register-options
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = userDB.findByUsername(username.trim());
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    const rpName = process.env.NEXT_PUBLIC_RP_NAME || 'Todo App';
    const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: username.trim(),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store options in session for verification
    // For production, use Redis or database instead
    const response = NextResponse.json({ options });
    response.cookies.set('reg_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
    });
    response.cookies.set('reg_username', username.trim(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
    });

    return response;
  } catch (error) {
    console.error('Error generating registration options:', error);
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}
