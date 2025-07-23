import Integration from "@/models/Integration";
import { ensureValidAccessToken } from "@/connectors/jira/refresh";

/**
 * Discover first browsable project the current user can see.
 */
async function discoverDefaultProjectKey(
  accessToken: string,
  cloudId: string
): Promise<string | null> {
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search?maxResults=1`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const key = data?.values?.[0]?.key;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

/**
 * Discover a creatable issue type for the given project.
 */
async function discoverDefaultIssueType(
  accessToken: string,
  cloudId: string,
  projectKey: string
): Promise<string | null> {
  const url =
    `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue/createmeta` +
    `?projectKeys=${encodeURIComponent(projectKey)}` +
    `&expand=projects.issuetypes.fields`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  const proj = data?.projects?.[0];
  const it = proj?.issuetypes?.[0];
  return it?.name ?? null;
}

/**
 * Create a Jira issue for the given user.
 */
export async function jiraCreateIssueForUser(
  userId: string,
  payload: {
    title: string;
    description?: string;
    projectKey?: string;
    issueType?: string;
    priority?: string;
    assigneeAccountId?: string;
    labels?: string[];
  }
) {
  const integ = await Integration.findOne({ userId, provider: "jira" });
  if (!integ) {
    return { success: false, error: "Jira not connected" };
  }

  const { accessToken, integration } = await ensureValidAccessToken(integ._id.toString());

  // Resolve projectKey
  let projectKey = payload.projectKey?.trim();
  if (!projectKey) {
    const discovered = await discoverDefaultProjectKey(accessToken, integration.cloudId);
    projectKey = discovered ?? undefined;
  }
  if (!projectKey) {
    return { success: false, error: "No project specified and no default project found." };
  }

  // Resolve issueType
  let issueTypeName = payload.issueType?.trim();
  if (!issueTypeName) {
    const discovered = await discoverDefaultIssueType(accessToken, integration.cloudId, projectKey);
    issueTypeName = discovered ?? undefined;
  }
  if (!issueTypeName) {
    issueTypeName = "Task"; // fallback
  }

  // --- Build issue payload ---
  const fields: Record<string, any> = {
    project: { key: projectKey },
    summary: payload.title?.trim() || "(No title)",
    issuetype: { name: issueTypeName },
    description: {
      type: "doc",
      version: 1,
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: payload.description ?? "" }],
        },
      ],
    },
  };

  if (payload.priority) fields.priority = { name: payload.priority };
  if (payload.assigneeAccountId) fields.assignee = { accountId: payload.assigneeAccountId };
  if (payload.labels?.length) fields.labels = payload.labels;

  // Helper for POST
  async function postIssue(bodyFields: any) {
    const url = `https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/issue`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ fields: bodyFields }),
    });
    return resp;
  }

  // --- Create issue with retry (if priority fails) ---
  let resp = await postIssue(fields);

  if (!resp.ok) {
    let txt = await resp.text();
    let parsed: any;
    try {
      parsed = JSON.parse(txt);
    } catch {
      parsed = null;
    }

    const priorityBlocked =
      parsed?.errors?.priority &&
      parsed.errors.priority.toLowerCase().includes("cannot be set");

    if (priorityBlocked && fields.priority) {
      console.warn("[jiraCreateIssueForUser] Priority rejected. Retrying without priority.");
      delete fields.priority;
      resp = await postIssue(fields);
    } else {
      return { success: false, error: txt };
    }
  }

  if (!resp.ok) {
    const txt = await resp.text();
    return { success: false, error: txt };
  }

  const result = await resp.json();
  return {
    success: true,
    data: {
      key: result.key,
      url: `${integration.siteUrl}/browse/${result.key}`,
    },
  };
}