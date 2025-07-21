
// app/api/slack/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  try {
    const response = await axios.post('https://slack.com/api/oauth.v2.access', null, {
      params: {
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: process.env.SLACK_REDIRECT_URI!,
      }
    });

    const data = response.data;
    if (!data.ok) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    // Save to tokens.json
    const tokenPath = path.join(process.cwd(), 'tokens.json');
    const existing = fs.existsSync(tokenPath)
      ? JSON.parse(fs.readFileSync(tokenPath, 'utf-8'))
      : {};

    existing[data.authed_user.id] = {
      access_token: data.access_token,
      team_id: data.team?.id,
      team_name: data.team?.name,
    };

    fs.writeFileSync(tokenPath, JSON.stringify(existing, null, 2));

    return new NextResponse(
      `<h2>✅ Slack Connected!</h2><pre>${JSON.stringify(data, null, 2)}</pre>`,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (err: any) {
    console.error('Slack OAuth error:', err.message);
    return NextResponse.json({ error: 'OAuth error' }, { status: 500 });
  }
}
