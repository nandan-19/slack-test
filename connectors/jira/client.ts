// connectors/jira/client.ts
import axios from "axios";

export interface JiraSearchResult {
  issues: any[];
  startAt: number;
  maxResults: number;
  total: number;
}

interface JiraSearchParams {
  accessToken: string;
  cloudId: string;
  jql: string;
  fields?: string[];
  startAt?: number;
  maxResults?: number;
}

/**
 * Jira search (POST body) to avoid URL length + encoding problems.
 */
export async function jiraSearchBearer({
  accessToken,
  cloudId,
  jql,
  fields = ["summary", "status", "priority"],
  startAt = 0,
  maxResults = 50,
}: JiraSearchParams): Promise<JiraSearchResult> {
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search`;
  const body = { jql, fields, startAt, maxResults };

  const res = await axios.post<JiraSearchResult>(url, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  return res.data;
}

/**
 * Fetch accessible Jira projects for the current user/token.
 */
export async function jiraFetchProjects(
  cloudId: string,
  accessToken: string
): Promise<Array<{ id: string; key: string; name: string }>> {
  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/project/search`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const values = Array.isArray(res.data?.values) ? res.data.values : [];
  return values.map((p: any) => ({ id: p.id, key: p.key, name: p.name }));
}