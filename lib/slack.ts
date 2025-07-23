// lib/slack.ts
import { connectMongo } from './mongo';
import SlackIntegration from '@/models/SlackIntegration';
import { decrypt } from './crypto';

export async function getSlackTokenForUser(nextAuthUserId: string, teamId?: string) {
  await connectMongo();
  
  const query: any = { nextAuthUserId, isActive: true };
  if (teamId) query.teamId = teamId;
  
  const integration = await SlackIntegration.findOne(query).sort({ connectedAt: -1 });
  
  if (!integration) {
    console.log(`No Slack integration found for nextAuthUserId: ${nextAuthUserId}`);
    return null;
  }
  
  // Update last used timestamp
  await SlackIntegration.findByIdAndUpdate(integration._id, { 
    lastUsedAt: new Date() 
  });
  
  console.log(`Using Slack integration for session user: ${nextAuthUserId}`);
  
  return {
    accessToken: decrypt(integration.encryptedAccessToken),
    refreshToken: integration.encryptedRefreshToken ? decrypt(integration.encryptedRefreshToken) : null,
    teamId: integration.teamId,
    teamName: integration.teamName,
    scopes: integration.scopes,
    slackUserId: integration.userId, // Return the actual Slack user ID
    nextAuthUserId: integration.nextAuthUserId
  };
}
