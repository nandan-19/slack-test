// app/api/connectors/jira/issues/route.ts
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Integration from "@/models/Integration";
import JiraIssue from "@/models/JiraIssue";
import { auth } from "@/auth";

/**
 * Return normalized Jira issues from Mongo for the logged-in user.
 * The client (page.tsx) expects { ok: true, issues: Issue[] }.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", issues: [] },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || "50");

    await connectMongo();

    // Ensure user actually has a Jira integration (so we know which cloudId to select).
    const integ = await Integration.findOne({ userId, provider: "jira" }).lean();
    if (!integ) {
      return NextResponse.json({ ok: true, issues: [] }); // Not connected yet; empty but OK
    }

    // Pull normalized issues from Mongo.
    const docs = await JiraIssue.find({
      userId,
      cloudId: integ.cloudId,
    })
      .sort({ updatedAtISO: -1 })
      .limit(limit)
      .lean();

    // Map Mongo doc -> dashboard Issue shape
    const issues = docs.map((d: any) => ({
      issueKey: d.issueKey,
      title: d.title,
      state: d.state,
      priority: d.priority,
      type: d.type,
      assignee: d.assignee,
      labels: d.labels || [],
      updatedAtISO: d.updatedAtISO,
      createdAtISO: d.createdAtISO,
    }));

    return NextResponse.json({ ok: true, issues });
  } catch (err) {
    console.error("Jira issues error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch Jira issues", issues: [] },
      { status: 500 }
    );
  }
}
