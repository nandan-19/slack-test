
// app/api/slack/start/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const client_id = process.env.SLACK_CLIENT_ID!;
  const redirect_uri = process.env.SLACK_REDIRECT_URI!;
  const scopes = [
    'channels:read',
    'channels:history',
    'users:read',
    'chat:write',
    'channels:join'
  ].join(',');

  const slackURL = `https://slack.com/oauth/v2/authorize?client_id=${client_id}&scope=${scopes}&redirect_uri=${redirect_uri}`;

  return NextResponse.redirect(slackURL);
}
