import { getOAuthClient, SCOPES } from '@/lib/google';
import { NextResponse } from 'next/server';

export async function GET() {
  const oAuth2Client = getOAuthClient();

  const url = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  return NextResponse.redirect(url);
}
