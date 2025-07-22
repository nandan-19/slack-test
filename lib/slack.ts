// lib/slack.ts
import { connectMongo } from './mongo';
import SlackIntegration from '@/models/SlackIntegration';
import { decrypt } from './crypto';

export async function getSlackTokenForUser(userId: string, teamId?: string) {
  await connectMongo();

  const query: any = { userId, isActive: true };
  if (teamId) query.teamId = teamId;

  let integration = await SlackIntegration.findOne(query).sort({ connectedAt: -1 });

  // If no integration found for the specific user, get any available integration
  if (!integration) {
    console.log(`No Slack integration found for userId: ${userId}, trying any available...`);
    integration = await SlackIntegration.findOne({ isActive: true }).sort({ connectedAt: -1 });

    if (!integration) {
      console.log('No Slack integrations found at all');
      return null;
    }

    console.log(`Using Slack integration for userId: ${integration.userId}`);
  }

  // Update last used timestamp
  await SlackIntegration.findByIdAndUpdate(integration._id, {
    lastUsedAt: new Date()
  });

  return {
    accessToken: decrypt(integration.encryptedAccessToken),
    refreshToken: integration.encryptedRefreshToken ? decrypt(integration.encryptedRefreshToken) : null,
    teamId: integration.teamId,
    teamName: integration.teamName,
    scopes: integration.scopes,
    actualUserId: integration.userId // Return the actual Slack user ID used
  };
}
