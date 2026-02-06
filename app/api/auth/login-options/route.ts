/**
 * WebAuthn Login - Generate Options
 * POST /api/auth/login-options
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { isoBase64URL } from '@simplewebauthn/server/helpers';

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

    // Check if user exists
    const user = userDB.findByUsername(username.trim());
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's authenticators  
    const authenticators = authenticatorDB.findByUser(user.id);
    if (authenticators.length === 0) {
      return NextResponse.json(
        { error: 'No authenticators registered for this user' },
        { status: 404 }
      );
    }

    const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';

    // For passkeys/resident keys, we can omit allowCredentials
    // The authenticator will present available credentials
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    // Store challenge in session for verification
    const response = NextResponse.json({ options });
    response.cookies.set('auth_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300, // 5 minutes
    });
    response.cookies.set('auth_username', username.trim(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
    });

    return response;
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    );
  }
}
