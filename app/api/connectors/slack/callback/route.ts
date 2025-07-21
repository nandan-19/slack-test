// app/api/connectors/slack/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { connectMongo } from '@/lib/mongo'; // Using your connection
import SlackIntegration from '@/models/SlackIntegration';
import { encrypt } from '@/lib/crypto';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');

    if (!code) {
      return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    // Exchange code for access token
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
      console.error('Slack OAuth error:', data);
      return NextResponse.json({ 
        error: 'Slack OAuth failed', 
        details: data.error_description || data.error 
      }, { status: 400 });
    }

    // Connect to database using your function
    await connectMongo();

    // Encrypt sensitive data
    const encryptedAccessToken = encrypt(data.access_token);
    const encryptedRefreshToken = data.refresh_token ? encrypt(data.refresh_token) : undefined;

    // Save or update integration
    const integrationData = {
      userId: data.authed_user.id,
      teamId: data.team?.id || 'unknown',
      teamName: data.team?.name || 'Unknown Team',
      encryptedAccessToken,
      encryptedRefreshToken,
      scopes: data.scope ? data.scope.split(',') : [],
      connectedAt: new Date(),
      isActive: true,
    };

    await SlackIntegration.findOneAndUpdate(
      { userId: data.authed_user.id, teamId: data.team?.id || 'unknown' },
      integrationData,
      { upsert: true, new: true }
    );

    console.log(`✅ Slack integration saved for user: ${data.authed_user.id}`);

    // Redirect to success page
    const frontendUrl = "https://slack-test-theta.vercel.app/connectors/pre-meeting";
      
    return NextResponse.redirect(`${frontendUrl}/?slack=connected`);

  } catch (error: any) {
    console.error('Slack OAuth error:', error.message);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
