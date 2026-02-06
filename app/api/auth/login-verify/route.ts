/**
 * WebAuthn Login - Verify Response
 * POST /api/auth/login-verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    // Get stored challenge and username from cookies
    const expectedChallenge = request.cookies.get('auth_challenge')?.value;
    const username = request.cookies.get('auth_username')?.value;

    if (!expectedChallenge || !username) {
      return NextResponse.json(
        { error: 'Login session expired' },
        { status: 400 }
      );
    }

    // Get user
    const user = userDB.findByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get authenticator by credential ID
    // credential.id is already a base64url string from the browser
    console.log('Looking up authenticator with credential.id:', credential.id);
    console.log('credential.id type:', typeof credential.id);
    
    const authenticator = authenticatorDB.findByCredentialId(credential.id);
    console.log('Found authenticator:', authenticator ? 'YES' : 'NO');
    
    if (authenticator) {
      console.log('Authenticator credential_id from DB:', authenticator.credential_id);
      console.log('User ID match:', authenticator.user_id === user.id);
    }

    if (!authenticator || authenticator.user_id !== user.id) {
      console.log('All authenticators for user:', authenticatorDB.findByUser(user.id).map(a => a.credential_id));
      return NextResponse.json(
        { error: 'Authenticator not found' },
        { status: 404 }
      );
    }

    const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
    const origin = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000';

    // Convert stored public key base64url string to Uint8Array
    // credential_id stays as base64url string
    const publicKeyBytes = isoBase64URL.toBuffer(authenticator.public_key);

    // Verify the authentication response
    // In @simplewebauthn/server v11, use 'credential' parameter (not 'authenticator')
    // credential.id is Base64URLString, credential.publicKey is Uint8Array
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: authenticator.credential_id,
        publicKey: publicKeyBytes,
        counter: authenticator.counter ?? 0,
        transports: authenticator.transports ? JSON.parse(authenticator.transports) : undefined,
      },
    });

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Authentication verification failed' },
        { status: 400 }
      );
    }

    // Update authenticator counter
    const { authenticationInfo } = verification;
    authenticatorDB.updateCounter(authenticator.id, authenticationInfo.newCounter ?? 0);

    // Create session
    const sessionToken = await createSession({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
    });

    // Set session cookie and clear auth cookies
    const response = NextResponse.json({ success: true, user });
    setSessionCookie(sessionToken, response);
    response.cookies.delete('auth_challenge');
    response.cookies.delete('auth_username');

    return response;
  } catch (error) {
    console.error('Error verifying authentication:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to complete authentication' },
      { status: 500 }
    );
  }
}
