
// connectors/jira/normalize.ts
interface JiraIssueRaw { key: string; fields: any; }

export type UnifiedState = "OPEN" | "IN_PROGRESS" | "DONE" | "OTHER";

function mapStatus(name: string | undefined): UnifiedState {
  if (!name) return "OTHER";
  const s = name.toLowerCase();
  if (s.includes("progress") || s.includes("doing")) return "IN_PROGRESS";
  if (s.includes("done") || s.includes("closed") || s.includes("resolved")) return "DONE";
  if (s.includes("todo") || s.includes("to do") || s.includes("backlog")) return "OPEN";
  return "OTHER";
}

export function normalizeJiraIssue(issue: JiraIssueRaw) {
  const f = issue.fields || {};
  return {
    issueKey: issue.key,
    projectKey: f.project?.key || "",
    title: f.summary || "(Untitled)",
    state: mapStatus(f.status?.name),
    priority: f.priority?.name || "",
    type: f.issuetype?.name || "",
    assignee: f.assignee?.displayName || "",
    reporter: f.reporter?.displayName || "",
    labels: f.labels || [],
    createdAtISO: f.created,
    updatedAtISO: f.updated,
    raw: issue
  };
}
