import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import axios from "axios";
import { connectMongo } from "@/lib/mongo";
import Integration from "@/models/Integration";
import { encryptToken } from "@/lib/security";
import { secondsFromNow } from "@/lib/time";

const DEMO_USER_ID = "demo-user-1";
const TOKEN_URL = "https://auth.atlassian.com/oauth/token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) {
    console.error("[Jira OAuth] Error param from Atlassian:", err);
    return NextResponse.json({ error: err }, { status: 400 });
  }

  try {
    await connectMongo();

    // 1️⃣ Check if user already has a valid token
    const existingIntegration = await Integration.findOne({
      userId: DEMO_USER_ID,
      provider: "jira",
    });

    if (
      existingIntegration &&
      new Date(existingIntegration.expiresAt).getTime() > Date.now()
    ) {
      console.log("[Jira OAuth] Valid token exists, skipping OAuth.");
      const redirect = new URL("/jira-dashboard", url.origin);
      redirect.searchParams.set("jira_connected", "true");
      return NextResponse.redirect(redirect);
    }

    // 2️⃣ Validate cookies
    const cookieStore = await cookies();
    const stateCookie = cookieStore.get("jira_state")?.value;
    const verifier = cookieStore.get("jira_verifier")?.value;

    if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
    if (!state || state !== stateCookie) {
      console.error("[Jira OAuth] State mismatch", { state, stateCookie });
      return NextResponse.json({ error: "State mismatch" }, { status: 400 });
    }
    if (!verifier) {
      console.error("[Jira OAuth] Missing PKCE verifier cookie");
      return NextResponse.json({ error: "Missing PKCE verifier" }, { status: 400 });
    }

    console.log("[Jira OAuth] Exchanging code for tokens...");
    const tokenPayload = {
      grant_type: "authorization_code",
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      code,
      redirect_uri: process.env.ATLASSIAN_REDIRECT_URI,
      code_verifier: verifier,
    };
    console.log("[Jira OAuth] Token payload (sanitized):", {
      ...tokenPayload,
      client_secret: tokenPayload.client_secret ? "***" : undefined,
    });

    // 3️⃣ Exchange code for tokens
    const tokenRes = await axios.post(TOKEN_URL, tokenPayload, {
      headers: { "Content-Type": "application/json" },
    });

    const { access_token, refresh_token, expires_in, scope } = tokenRes.data;
    console.log("[Jira OAuth] Received tokens. Scopes:", scope);

    // 4️⃣ Get accessible resources
    const resourcesRes = await axios.get(
      "https://api.atlassian.com/oauth/token/accessible-resources",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const resources = resourcesRes.data as any[];
    if (!resources.length) {
      console.error("[Jira OAuth] No accessible Jira resources returned");
      return NextResponse.json({ error: "No Jira sites returned" }, { status: 400 });
    }

    const site = resources[0];
    console.log("[Jira OAuth] Using site:", site);

    const scopes = scope ? scope.split(" ") : [];

    // 5️⃣ Save integration
    await Integration.findOneAndUpdate(
      { userId: DEMO_USER_ID, provider: "jira", cloudId: site.id },
      {
        userId: DEMO_USER_ID,
        provider: "jira",
        cloudId: site.id,
        siteName: site.name,
        siteUrl: site.url,
        scopes,
        accessTokenEnc: encryptToken(access_token),
        refreshTokenEnc: refresh_token ? encryptToken(refresh_token) : undefined,
        expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000), // ✅ Proper expiry
      },
      { upsert: true, new: true }
    );

    // 6️⃣ Redirect to dashboard
    const redirect = new URL("/jira-dashboard", url.origin);
    redirect.searchParams.set("jira_connected", "true");
    return NextResponse.redirect(redirect);
  } catch (e: any) {
    const details = e.response?.data || e.message;
    console.error("[Jira OAuth] Callback failure:", details);
    return NextResponse.json({ error: "OAuth exchange failed", details }, { status: 500 });
  }
}
