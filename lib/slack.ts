
// lib/slack.ts
import { connectMongo } from './mongo';
import SlackIntegration from '@/models/SlackIntegration';
import { decrypt } from './crypto';

export async function getSlackTokenForUser(userId: string, teamId?: string) {
  await connectMongo();

  const query: any = { userId, isActive: true };
  if (teamId) query.teamId = teamId;

  const integration = await SlackIntegration.findOne(query).sort({ connectedAt: -1 });

  if (!integration) {
    return null;
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
  };
}
