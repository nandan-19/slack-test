import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Integration from "@/models/Integration";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ connected: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    await connectMongo();
    const integ = await Integration.findOne({ userId, provider: "jira" });

    if (!integ) return NextResponse.json({ connected: false });

    return NextResponse.json({
      connected: true,
      siteName: integ.siteName,
      siteUrl: integ.siteUrl,
      lastSyncAt: integ.lastSyncAt,
    });
  } catch (error) {
    console.error("Jira status error:", error);
    return NextResponse.json({ error: "Failed to fetch Jira status" }, { status: 500 });
  }
}
