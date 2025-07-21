
// connectors/jira/refresh.ts
import axios from "axios";
import Integration from "@/models/Integration";
import { decryptToken, encryptToken } from "@/lib/security";
import { secondsFromNow } from "@/lib/time";

export async function ensureValidAccessToken(integrationId: string) {
  const doc = await Integration.findById(integrationId);
  if (!doc) throw new Error("Integration not found");
  if (doc.expiresAt.getTime() > Date.now() + 60_000) {
    return { accessToken: decryptToken(doc.accessTokenEnc), integration: doc };
  }
  if (!doc.refreshTokenEnc) throw new Error("No refresh token stored");

  const refresh = decryptToken(doc.refreshTokenEnc);

  const resp = await axios.post(process.env.ATLASSIAN_TOKEN_URL!, {
    grant_type: "refresh_token",
    client_id: process.env.ATLASSIAN_CLIENT_ID,
    client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
    refresh_token: refresh
  }, { headers: { "Content-Type": "application/json" } });

  const { access_token, expires_in, refresh_token } = resp.data;
  doc.accessTokenEnc = encryptToken(access_token);
  if (refresh_token) doc.refreshTokenEnc = encryptToken(refresh_token);
  doc.expiresAt = secondsFromNow(expires_in || 3600);
  await doc.save();

  return { accessToken: access_token, integration: doc };
}
