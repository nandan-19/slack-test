// app/api/connectors/jira/oauth/start/route.ts
import { NextResponse } from "next/server";
import { generateCodeVerifier, generateCodeChallenge, generateState } from "@/utils/pkce";

export async function GET() {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  const authUrl =
    "https://auth.atlassian.com/authorize" +
    `?audience=api.atlassian.com` +
    `&client_id=${process.env.ATLASSIAN_CLIENT_ID}` +
    `&scope=${encodeURIComponent(process.env.ATLASSIAN_SCOPES!)}` +
    `&redirect_uri=${encodeURIComponent(process.env.ATLASSIAN_REDIRECT_URI!)}` +
    `&state=${state}` +
    `&response_type=code` +
    `&prompt=consent` +
    `&code_challenge=${challenge}` +
    `&code_challenge_method=S256`;

  const res = NextResponse.redirect(authUrl);
  res.cookies.set("jira_state", state, { httpOnly: true, secure: true, path: "/", maxAge: 600 });
  res.cookies.set("jira_verifier", verifier, { httpOnly: true, secure: true, path: "/", maxAge: 600 });
  return res;
}
