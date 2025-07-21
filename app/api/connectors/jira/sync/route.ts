
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Integration from "@/models/Integration";
import JiraIssue from "@/models/JiraIssue";
import { ensureValidAccessToken } from "@/connectors/jira/refresh";
import { jiraSearchBearer } from "@/connectors/jira/client";
import { normalizeJiraIssue } from "@/connectors/jira/normalize";

// Demo user
const DEMO_USER_ID = "demo-user-1";

const FIELDS = [
  "summary", "status", "issuetype", "priority", "assignee", "reporter", "labels",
  "created", "updated", "project"
];

export async function POST() {
  await connectMongo();
  const integ = await Integration.findOne({ userId: DEMO_USER_ID, provider: "jira" });
  if (!integ) return NextResponse.json({ ok: false, error: "Not connected" }, { status: 400 });

  const { accessToken, integration } = await ensureValidAccessToken(integ._id.toString());
  const cloudId = integration.cloudId;

  // Build incremental JQL
  const baseJql = process.env.JIRA_SYNC_JQL || "ORDER BY updated DESC";
  const jql = integration.lastUpdatedCursor
    ? `updated > "${integration.lastUpdatedCursor}" ORDER BY updated ASC`
    : baseJql;

  let startAt = 0;
  const pageSize = 100;
  let totalFetched = 0;
  let newestTimestamp = integration.lastUpdatedCursor || "";

  while (true) {
    const batch = await jiraSearchBearer({
      accessToken,
      cloudId,
      jql,
      fields: FIELDS,
      startAt,
      maxResults: pageSize
    });

    if (!batch.issues.length) break;
    totalFetched += batch.issues.length;

    // Normalize & upsert
    for (const issue of batch.issues) {
      const n = normalizeJiraIssue(issue);
      // track newest updated timestamp
      if (!newestTimestamp || n.updatedAtISO > newestTimestamp) {
        newestTimestamp = n.updatedAtISO;
      }

      await JiraIssue.findOneAndUpdate(
        { userId: DEMO_USER_ID, cloudId, issueKey: n.issueKey },
        {
          userId: DEMO_USER_ID,
          cloudId,
          issueKey: n.issueKey,
          projectKey: n.projectKey,
          title: n.title,
          state: n.state,
          priority: n.priority,
          type: n.type,
          assignee: n.assignee,
          reporter: n.reporter,
          labels: n.labels,
          createdAtISO: n.createdAtISO,
          updatedAtISO: n.updatedAtISO,
          raw: n.raw
        },
        { upsert: true }
      );
    }

    startAt += batch.issues.length;
    if (startAt >= batch.total) break;
    if (batch.issues.length < pageSize) break;
  }

  // Update integration cursor
  if (newestTimestamp) {
    integration.lastUpdatedCursor = newestTimestamp;
    integration.lastSyncAt = new Date();
    await integration.save();
  }

  return NextResponse.json({ ok: true, fetched: totalFetched, lastUpdatedCursor: newestTimestamp });
}
