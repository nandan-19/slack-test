
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Integration from "@/models/Integration";
import { decryptToken } from "@/lib/security";

// Demo single user
const DEMO_USER_ID = "demo-user-1";

export async function GET() {
  await connectMongo();
  const integ = await Integration.findOne({ userId: DEMO_USER_ID, provider: "jira" });
  if (!integ) return NextResponse.json({ connected: false });
  return NextResponse.json({
    connected: true,
    cloudId: integ.cloudId,
    siteName: integ.siteName,
    siteUrl: integ.siteUrl,
    expiresAt: integ.expiresAt,
    scopes: integ.scopes
    // never send token
  });
}
