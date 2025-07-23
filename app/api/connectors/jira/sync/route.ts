// app/api/connectors/jira/sync/route.ts
import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Integration from "@/models/Integration";
import JiraIssue from "@/models/JiraIssue";
import { ensureValidAccessToken } from "@/connectors/jira/refresh";
import { jiraSearchBearer } from "@/connectors/jira/client";
import { normalizeJiraIssue } from "@/connectors/jira/normalize";
import { getUserIdOrNull } from "@/lib/user";

const FIELDS = [
  "summary",
  "status",
  "issuetype",
  "priority",
  "assignee",
  "reporter",
  "labels",
  "created",
  "updated",
  "project",
];

// Convert ISO date string to Jira-friendly format: yyyy-MM-dd HH:mm
function toJiraDateString(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    console.warn(`[Jira Sync] Invalid date received: ${dateString}, falling back to base JQL`);
    return "";
  }
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
}

export async function POST() {
  await connectMongo();
  const userId = await getUserIdOrNull();
  if (!userId)
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const integ = await Integration.findOne({ userId, provider: "jira" });
  if (!integ)
    return NextResponse.json({ ok: false, error: "Not connected" }, { status: 400 });

  const { accessToken, integration } = await ensureValidAccessToken(integ._id.toString());
  const cloudId = integration.cloudId;

  // Construct JQL with fixed date format
  const baseJql = process.env.JIRA_SYNC_JQL || "ORDER BY updated DESC";
  const jql =
    integration.lastUpdatedCursor && toJiraDateString(integration.lastUpdatedCursor)
      ? `updated > "${toJiraDateString(integration.lastUpdatedCursor)}" ORDER BY updated ASC`
      : baseJql;

  let startAt = 0;
  const pageSize = 100;
  let totalFetched = 0;
  let newestTimestamp = integration.lastUpdatedCursor || "";

  try {
    while (true) {
      const batch = await jiraSearchBearer({
        accessToken,
        cloudId,
        jql,
        fields: FIELDS,
        startAt,
        maxResults: pageSize,
      });

      if (!batch.issues?.length) {
        console.log("[Jira Sync] No more issues found.");
        break;
      }
      totalFetched += batch.issues.length;

      for (const issue of batch.issues) {
        const n = normalizeJiraIssue(issue);
        if (!newestTimestamp || n.updatedAtISO > newestTimestamp) {
          newestTimestamp = n.updatedAtISO;
        }

        await JiraIssue.findOneAndUpdate(
          { userId, cloudId, issueKey: n.issueKey },
          {
            userId,
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
            raw: n.raw,
          },
          { upsert: true }
        );
      }

      startAt += batch.issues.length;
      if (startAt >= batch.total || batch.issues.length < pageSize) {
        break;
      }
    }

    if (newestTimestamp) {
      integration.lastUpdatedCursor = newestTimestamp;
      integration.lastSyncAt = new Date();
      await integration.save();
    }

    return NextResponse.json({
      ok: true,
      fetched: totalFetched,
      lastUpdatedCursor: newestTimestamp,
    });
  } catch (err: any) {
    console.error("[Jira Sync] error:", err?.response?.data || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Sync failed" },
      { status: 500 }
    );
  }
}
