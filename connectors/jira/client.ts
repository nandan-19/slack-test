
// connectors/jira/client.ts
import axios from "axios";

export interface JiraSearchResult {
  issues: any[];
  startAt: number;
  maxResults: number;
  total: number;
}

export async function jiraSearchBearer(params: {
  accessToken: string;
  cloudId: string;
  jql: string;
  fields?: string[];
  startAt?: number;
  maxResults?: number;
}) {
  const { accessToken, cloudId, jql, fields, startAt, maxResults } = params;
  const query = new URLSearchParams();
  query.set("jql", jql);
  if (fields?.length) query.set("fields", fields.join(","));
  if (startAt !== undefined) query.set("startAt", String(startAt));
  if (maxResults !== undefined) query.set("maxResults", String(maxResults));

  const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/search?${query.toString()}`;

  const res = await axios.get<JiraSearchResult>(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" }
  });
  return res.data;
}
