// app/api/connectors/jira/oauth/start/route.ts
import { NextResponse } from "next/server";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
} from "@/utils/pkce";

export async function GET() {
  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  const redirectUri = process.env.ATLASSIAN_REDIRECT_URI;
  const scopes = process.env.ATLASSIAN_SCOPES;

  if (!clientId || !redirectUri || !scopes) {
    return NextResponse.json(
      { error: "Atlassian OAuth not configured (missing env vars)." },
      { status: 500 }
    );
  }

  const state = generateState();
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  // TEMP debug; remove once working
  console.log("[Jira OAuth/start]", {
    hasClientId: !!clientId,
    redirectUri,
    scopes,
    state,
    verifierPreview: verifier.slice(0, 5) + "...",
  });

  const authUrl =
    "https://auth.atlassian.com/authorize" +
    `?audience=api.atlassian.com` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code` +
    `&prompt=consent` +
    `&code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256`;

  const res = NextResponse.redirect(authUrl);

  // IMPORTANT: secure=false in dev (http://localhost) so cookies are actually set.
  const secure = process.env.NODE_ENV === "production";

  res.cookies.set("jira_state", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });

  res.cookies.set("jira_verifier", verifier, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return res;
}
