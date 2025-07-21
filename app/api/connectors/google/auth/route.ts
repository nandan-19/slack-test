import { NextResponse } from 'next/server';
import { getOAuthClient, SCOPES } from '@/lib/google';

export async function GET() {
  const oauthClient = getOAuthClient();

  const authUrl = oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force refresh_token every time
    scope: ['https://www.googleapis.com/auth/calendar'],
  });

  return NextResponse.redirect(authUrl);
}
