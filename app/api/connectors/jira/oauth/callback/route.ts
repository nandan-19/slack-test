// app/api/connectors/jira/oauth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectMongo } from "@/lib/mongo";
import Integration from "@/models/Integration";
import { encryptToken } from "@/lib/security"; // keep using your wrapper
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    // Require signed-in user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const url = req.nextUrl;
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    // Read PKCE + state cookies set in /oauth/start
    const cookieStore = await cookies();
    const verifier = cookieStore.get("jira_verifier")?.value;
    const expectedState = cookieStore.get("jira_state")?.value;

    if (!verifier) {
      return NextResponse.json({ error: "Missing PKCE verifier in cookies" }, { status: 400 });
    }
    if (!expectedState || expectedState !== state) {
      return NextResponse.json({ error: "State mismatch" }, { status: 400 });
    }

    // Env config
    const clientId = process.env.ATLASSIAN_CLIENT_ID;
    const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET;
    const redirectUri = process.env.ATLASSIAN_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json({ error: "Atlassian OAuth misconfigured" }, { status: 500 });
    }

    // Exchange auth code for tokens (PKCE)
    const tokenResp = await fetch("https://auth.atlassian.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });

    if (!tokenResp.ok) {
      const error = await tokenResp.text();
      console.error("[Jira OAuth] token error:", error);
      return NextResponse.json({ error: "OAuth exchange failed", details: error }, { status: 500 });
    }

    const tokenData = await tokenResp.json();
    const accessTokenEnc = encryptToken(tokenData.access_token);
    const refreshTokenEnc = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : undefined;
    const expiresAt = new Date(Date.now() + (tokenData.expires_in ?? 3600) * 1000);
    const scopes = typeof tokenData.scope === "string" ? tokenData.scope.split(" ").filter(Boolean) : [];

    // Fetch accessible Jira cloud sites
    const siteResp = await fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!siteResp.ok) {
      const error = await siteResp.text();
      console.error("[Jira OAuth] accessible-resources error:", error);
      return NextResponse.json({ error: "Failed to fetch Jira sites", details: error }, { status: 500 });
    }
    const sites = (await siteResp.json()) as any[];
    if (!sites.length) {
      return NextResponse.json({ error: "No Jira sites returned" }, { status: 400 });
    }
    const site = sites[0]; // TODO: choose site via UI if >1

    await connectMongo();
    await Integration.findOneAndUpdate(
      { userId, provider: "jira", cloudId: site.id },
      {
        userId,
        provider: "jira",
        cloudId: site.id,
        siteName: site.name,
        siteUrl: site.url,
        scopes,
        accessTokenEnc,
        refreshTokenEnc,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    // Redirect back to your UI (fallback to request origin if APP_BASE_URL not defined)
    const dest =
      process.env.APP_BASE_URL && process.env.APP_BASE_URL.trim().length > 0
        ? new URL(`/jira-dashboard?success=jira`, process.env.APP_BASE_URL)
        : new URL(`/jira-dashboard?success=jira`, url.origin);

    return NextResponse.redirect(dest);
  } catch (error: any) {
    console.error("[Jira OAuth/callback] error:", error);
    return NextResponse.json({ error: "OAuth callback failed" }, { status: 500 });
  }
}
