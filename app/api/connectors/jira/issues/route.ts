
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import JiraIssue from "@/models/JiraIssue";

const DEMO_USER_ID = "demo-user-1";

export async function GET(req: Request) {
  await connectMongo();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const issues = await JiraIssue.find({ userId: DEMO_USER_ID })
    .sort({ updatedAtISO: -1 })
    .limit(limit)
    .lean();
  return NextResponse.json({ ok: true, issues });
}
