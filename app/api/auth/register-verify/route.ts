/**
 * WebAuthn Registration - Verify Response
 * POST /api/auth/register-verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { userDB, authenticatorDB } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credential } = body;

    // Get stored challenge and username from cookies
    const expectedChallenge = request.cookies.get('reg_challenge')?.value;
    const username = request.cookies.get('reg_username')?.value;

    if (!expectedChallenge || !username) {
      return NextResponse.json(
        { error: 'Registration session expired' },
        { status: 400 }
      );
    }

    const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
    const origin = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000';

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: 'Registration verification failed' },
        { status: 400 }
      );
    }

    // In @simplewebauthn/server v11, credential data is nested
    const { credential: credentialInfo } = verification.registrationInfo;
    const credentialID = credentialInfo.id;
    const credentialPublicKey = credentialInfo.publicKey;
    const counter = credentialInfo.counter;

    console.log('credentialInfo.id type:', typeof credentialID);
    console.log('credentialInfo.id:', credentialID);
    console.log('Is Uint8Array:', credentialID instanceof Uint8Array);

    // Create user
    const user = userDB.create(username, username);

    // Store authenticator
    // credentialInfo.id is a Uint8Array of raw bytes, convert to base64url for storage
    // If it's already a string (shouldn't be), use it as-is
    let credentialIdBase64: string;
    if (typeof credentialID === 'string') {
      credentialIdBase64 = credentialID;
    } else {
      credentialIdBase64 = isoBase64URL.fromBuffer(Buffer.from(credentialID));
    }
    
    const publicKeyBase64 = isoBase64URL.fromBuffer(Buffer.from(credentialPublicKey));
    
    authenticatorDB.create({
      user_id: user.id,
      credential_id: credentialIdBase64,
      public_key: publicKeyBase64,
      counter: counter ?? 0,
      transports: null,
    });

    // Create session
    const sessionToken = await createSession({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
    });

    // Set session cookie and clear registration cookies
    const response = NextResponse.json({ success: true, user });
    setSessionCookie(sessionToken, response);
    response.cookies.delete('reg_challenge');
    response.cookies.delete('reg_username');

    return response;
  } catch (error) {
    console.error('Error verifying registration:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to complete registration' },
      { status: 500 }
    );
  }
}
