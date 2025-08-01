import { getOAuthClient, SCOPES } from '@/lib/google';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'No code' }, { status: 400 });

  const oauthClient = getOAuthClient();
  const { tokens } = await oauthClient.getToken(code);

  const redirectUrl = new URL('https://slack-test-five.vercel.app/connectors/pre-meeting');
  redirectUrl.searchParams.set('token', tokens.access_token || '');

  return NextResponse.redirect(redirectUrl);

}
