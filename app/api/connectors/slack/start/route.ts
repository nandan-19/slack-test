// app/api/connectors/slack/start/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  try {
    // Validate required environment variables
    const requiredEnvs = ['SLACK_CLIENT_ID', 'SLACK_REDIRECT_URI'];
    const missing = requiredEnvs.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      return NextResponse.json({ 
        error: `Missing environment variables: ${missing.join(', ')}` 
      }, { status: 500 });
    }

    const client_id = process.env.SLACK_CLIENT_ID!;
    const redirect_uri = process.env.SLACK_REDIRECT_URI!;
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // TODO: Store state in session/cookie for verification in callback
    
    const scopes = [
      'channels:read',
      'channels:history',
      'users:read',
      'chat:write',
      'channels:join'
    ].join(',');

    const slackURL = `https://slack.com/oauth/v2/authorize?client_id=${client_id}&scope=${scopes}&redirect_uri=${redirect_uri}&state=${state}`;

    return NextResponse.redirect(slackURL);
    
  } catch (error: any) {
    console.error('Slack start error:', error.message);
    return NextResponse.json({ 
      error: 'Failed to initiate Slack OAuth' 
    }, { status: 500 });
  }
}
