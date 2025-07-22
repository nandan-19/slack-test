// app/api/connectors/slack/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { encrypt } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = response.data;

    if (!data.ok) {
      return NextResponse.json({ error: 'Slack OAuth failed', details: data.error }, { status: 400 });
    }

    // Encrypt tokens (optional, or you can skip this)
    const encryptedAccessToken = encrypt(data.access_token);
    const encryptedRefreshToken = data.refresh_token ? encrypt(data.refresh_token) : undefined;

    // Construct integration payload for localStorage
    const integrationPayload = {
      userId: data.authed_user.id,
      teamId: data.team?.id || 'unknown',
      teamName: data.team?.name || 'Unknown Team',
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      scopes: data.scope ? data.scope.split(',') : [],
      connectedAt: new Date().toISOString(),
      isActive: true,
    };

    // Redirect with payload in query or use a cookie (safer)
    const frontendUrl = "https://slack-test-theta.vercel.app/connectors/pre-meeting";

    // Method 1: Pass data in query string (only if small)
    const url = new URL(frontendUrl);
    url.searchParams.set("slack", "connected");
    url.searchParams.set("payload", encodeURIComponent(JSON.stringify(integrationPayload)));

    return NextResponse.redirect(url.toString());

  } catch (error: any) {
    console.error('Slack OAuth error:', error.message);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
