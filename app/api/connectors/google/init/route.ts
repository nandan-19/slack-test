import { getOAuthClient, SCOPES } from '@/lib/google';
import { NextResponse } from 'next/server';

export async function GET() {
  const oauthClient = getOAuthClient();

  const authUrl = oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });

  return NextResponse.redirect(authUrl);
}
