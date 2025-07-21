//
// // app/api/summary/generate/route.ts
// import { NextResponse } from "next/server";
// import fs from "fs";
// import path from "path";
// import { connectMongo } from "@/lib/mongo";
// import JiraIssue from "@/models/JiraIssue";
// import MeetingSummary from "@/models/MeetingSummary";
// import { callGemini } from "@/services/gemini";
//
// // TEMP user id (replace with real auth later)
// const USER_ID = "demo-user-1";
//
// const JIRA_LIMIT = 15;
// const SLACK_MSG_LIMIT_PER_CHANNEL = 25;
// const SLACK_CHANNEL_SCAN_LIMIT = 2;
//
// export async function POST(req: Request) {
//   try {
//     await connectMongo();
//     const { googleAccessToken } = await req.json();
//     if (!googleAccessToken) {
//       return NextResponse.json({ ok: false, error: "Missing googleAccessToken" }, { status: 400 });
//     }
//
//     // 1. Fetch next calendar event
//     const nowISO = new Date().toISOString();
//     const calRes = await fetch(
//       `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(nowISO)}&maxResults=1`,
//       { headers: { Authorization: `Bearer ${googleAccessToken}` } }
//     );
//     if (!calRes.ok) {
//       return NextResponse.json({ ok: false, error: "Calendar fetch failed" }, { status: 500 });
//     }
//     const calJson = await calRes.json();
//     const event = (calJson.items || [])[0];
//     if (!event) {
//       return NextResponse.json({ ok: false, error: "No upcoming event" }, { status: 404 });
//     }
//
//     const meetingTitle = event.summary || "(Untitled Meeting)";
//     const meetingStart = event.start?.dateTime || event.start?.date;
//     const meetingEnd = event.end?.dateTime || event.end?.date;
//     const attendees = (event.attendees || []).map((a: any) => a.email || a.displayName).filter(Boolean);
//
//     const keywords = meetingTitle
//       .toLowerCase()
//       .split(/[\s\-\_\:\(\)\[\],\.]+/)
//       .filter(w => w.length > 3);
//
//     // 2. Jira issues (already in DB)
//     const recent = await JiraIssue.find({ userId: USER_ID })
//       .sort({ updatedAtISO: -1 })
//       .limit(60)
//       .lean();
//
//     const filtered = recent.filter(i =>
//       keywords.some(k =>
//         i.title.toLowerCase().includes(k) ||
//         i.issueKey.toLowerCase().includes(k)
//       )
//     );
//
//     const jiraSelected = (filtered.length ? filtered : recent).slice(0, JIRA_LIMIT);
//
//     const jiraBlock = jiraSelected.map(i =>
//       `• ${i.issueKey} [${i.state}] (${i.priority || "NoPri"}) ${i.title}${i.assignee ? ` (assignee:${i.assignee})` : ""}`
//     ).join("\n");
//
//     // 3. Slack messages (read tokens.json)
//     const tokenPath = path.join(process.cwd(), "tokens.json");
//     let slackMessages: any[] = [];
//     let usedChannels: string[] = [];
//     if (fs.existsSync(tokenPath)) {
//       const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
//       // naive: just take first user in file
//       const firstUser = Object.keys(tokens)[0];
//       const slackToken = tokens[firstUser]?.access_token;
//       if (slackToken) {
//         // list channels
//         const chRes = await fetch("https://slack.com/api/conversations.list?limit=50", {
//           headers: { Authorization: `Bearer ${slackToken}` }
//         });
//         const chJson = await chRes.json();
//         if (chJson.ok) {
//           const channels: any[] = chJson.channels || [];
//           // rank by keyword presence
//           const ranked = channels.map(c => {
//             const hay = (c.name + " " + (c.topic?.value || "") + " " + (c.purpose?.value || "")).toLowerCase();
//             const score = keywords.reduce((acc, k) => acc + (hay.includes(k) ? 1 : 0), 0);
//             return { c, score };
//           }).sort((a, b) => b.score - a.score);
//           const pick = (ranked.some(r => r.score > 0) ? ranked.filter(r => r.score > 0) : ranked).slice(0, SLACK_CHANNEL_SCAN_LIMIT);
//
//           for (const { c } of pick) {
//             const hist = await fetch(
//               `https://slack.com/api/conversations.history?channel=${c.id}&limit=${SLACK_MSG_LIMIT_PER_CHANNEL}`,
//               { headers: { Authorization: `Bearer ${slackToken}` } }
//             );
//             const hJson = await hist.json();
//             if (hJson.ok) {
//               const msgs = (hJson.messages || [])
//                 .filter((m: any) => !m.subtype)
//                 .map((m: any) => ({
//                   id: `${c.id}:${m.ts}`,
//                   channel: c.name,
//                   user: m.user,
//                   text: (m.text || "").replace(/\s+/g, " ").trim()
//                 }));
//               slackMessages.push(...msgs);
//               usedChannels.push(c.name);
//             }
//           }
//         }
//       }
//     }
//
//     const slackBlock = slackMessages.slice(0, 60).map(m =>
//       `- #${m.channel} ${m.user}: ${m.text}`
//     ).join("\n");
//
//     // 4. Prompt
//     const prompt = `
// You are generating a concise pre-meeting brief. Return ONLY valid JSON (no markdown).
// Meeting Title: ${meetingTitle}
// Start: ${meetingStart}
// Attendees: ${attendees.join(", ") || "None"}
//
// JIRA:
// ${jiraBlock || "(none)"}
//
// SLACK:
// ${slackBlock || "(none)"}
//
// Return JSON:
// {
//  "agenda": "...",
//  "jira": "...",
//  "slack": "...",
//  "blockers": "...",
//  "actions": "...",
//  "overall": "..."
// }
//
// Rules:
// - If no data for a section, use "None".
// - Do not invent issues or messages.
// - "overall" ≤ 100 words.
// `;
//
//     // 5. Gemini
//     const raw = await callGemini(prompt);
//
//     let parsed: any;
//     try {
//       const startIdx = raw.indexOf("{");
//       parsed = JSON.parse(raw.slice(startIdx));
//     } catch {
//       parsed = {
//         agenda: "Parse error",
//         jira: raw.slice(0, 300),
//         slack: "",
//         blockers: "",
//         actions: "",
//         overall: ""
//       };
//     }
//
//     // 6. Store
//     const doc = await MeetingSummary.create({
//       userId: USER_ID,
//       meetingTitle,
//       meetingStart: meetingStart ? new Date(meetingStart) : undefined,
//       meetingEnd: meetingEnd ? new Date(meetingEnd) : undefined,
//       attendees,
//       sections: {
//         agenda: parsed.agenda || "",
//         jira: parsed.jira || "",
//         slack: parsed.slack || "",
//         blockers: parsed.blockers || "",
//         actions: parsed.actions || "",
//         overall: parsed.overall || ""
//       },
//       sources: {
//         jiraIssueKeys: jiraSelected.map(i => i.issueKey),
//         slackChannels: usedChannels
//       },
//       rawPrompt: prompt,
//       rawResponse: raw
//     });
//
//     return NextResponse.json({ ok: true, summaryId: doc._id });
//   } catch (e: any) {
//     console.error("[summary/generate] error", e);
//     return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
//   }
// }
//
//
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectMongo } from "@/lib/mongo";
import JiraIssue from "@/models/JiraIssue";
import MeetingSummary from "@/models/MeetingSummary";
import { callGemini } from "@/services/gemini";

const USER_ID = "demo-user-1";
const JIRA_LIMIT = 15;
const SLACK_MSG_LIMIT_PER_CHANNEL = 25;
const SLACK_CHANNEL_SCAN_LIMIT = 2;

/* ---------------- JSON Helpers ---------------- */
function stripCodeFences(text: string): string {
  return text.replace(/```json|```/gi, "").trim();
}

function extractBalancedJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseGeminiSummary(raw: string): Record<string, any> | null {
  const cleaned = extractBalancedJson(stripCodeFences(raw));
  try {
    return cleaned ? JSON.parse(cleaned) : null;
  } catch {
    return null;
  }
}

function normalizeSectionValue(v: any): string {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v.map(item => `• ${item}`).join("\n");
  if (v && typeof v === "object") return JSON.stringify(v, null, 2);
  return v ? String(v) : "";
}

/* --------------- Fallback Summaries --------------- */
function fallbackJiraSummary(issues: any[]): string {
  if (!issues.length) return "None.";
  return issues
    .slice(0, 5)
    .map(i => `• ${i.issueKey} [${i.state}] (${i.priority || "NoPri"}) ${i.title}`)
    .join("\n");
}

function fallbackSlackSummary(messages: any[]): string {
  if (!messages.length) return "None.";
  return messages
    .slice(0, 5)
    .map(m => `• #${m.channel} ${m.user}: ${m.text}`)
    .join("\n");
}

/* ---------------- Main Handler ---------------- */
export async function POST(req: Request) {
  try {
    await connectMongo();
    const { googleAccessToken } = await req.json();
    if (!googleAccessToken) {
      return NextResponse.json({ ok: false, error: "Missing googleAccessToken" }, { status: 400 });
    }

    // 1. Fetch upcoming event
    const nowISO = new Date().toISOString();
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(nowISO)}&maxResults=1`,
      { headers: { Authorization: `Bearer ${googleAccessToken}` } }
    );
    if (!calRes.ok) return NextResponse.json({ ok: false, error: "Calendar fetch failed" }, { status: 500 });

    const calJson = await calRes.json();
    const event = (calJson.items || [])[0];
    if (!event) return NextResponse.json({ ok: false, error: "No upcoming event" }, { status: 404 });

    const meetingTitle = event.summary || "(Untitled Meeting)";
    const meetingStart = event.start?.dateTime || event.start?.date;
    const meetingEnd = event.end?.dateTime || event.end?.date;
    const attendees = (event.attendees || []).map((a: any) => a.email || a.displayName).filter(Boolean);

    interface CalendarEventAttendee {
      email?: string;
      displayName?: string;
    }

    interface CalendarEvent {
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      attendees?: CalendarEventAttendee[];
    }

    const keywords: string[] = meetingTitle
      .toLowerCase()
      .split(/[\s\-_:,\.]+/)
      .filter((w: string) => w.length > 3);

    // 2. Jira issues
    const recentIssues = await JiraIssue.find({ userId: USER_ID }).sort({ updatedAtISO: -1 }).limit(60).lean();
    const relevantIssues = recentIssues.filter(i => keywords.some(k => i.title.toLowerCase().includes(k)));
    const jiraSelected = (relevantIssues.length ? relevantIssues : recentIssues).slice(0, JIRA_LIMIT);
    const jiraBlock = jiraSelected.map(i =>
      `• ${i.issueKey} [${i.state}] (${i.priority || "NoPri"}) ${i.title}`
    ).join("\n");

    // 3. Slack messages
    const tokenPath = path.join(process.cwd(), "tokens.json");
    let slackMessages: any[] = [];
    let usedChannels: string[] = [];
    if (fs.existsSync(tokenPath)) {
      const tokens = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
      const slackToken = tokens[Object.keys(tokens)[0]]?.access_token;
      if (slackToken) {
        const chRes = await fetch("https://slack.com/api/conversations.list?limit=50", {
          headers: { Authorization: `Bearer ${slackToken}` }
        });
        const chJson = await chRes.json();
        if (chJson.ok) {
          const channels: any[] = chJson.channels || [];
          const ranked = channels.map(c => {
            const hay = (c.name + " " + (c.topic?.value || "") + " " + (c.purpose?.value || "")).toLowerCase();
            const score = keywords.reduce((acc, k) => acc + (hay.includes(k) ? 1 : 0), 0);
            return { c, score };
          }).sort((a, b) => b.score - a.score);

          for (const { c } of ranked.slice(0, SLACK_CHANNEL_SCAN_LIMIT)) {
            const hist = await fetch(
              `https://slack.com/api/conversations.history?channel=${c.id}&limit=${SLACK_MSG_LIMIT_PER_CHANNEL}`,
              { headers: { Authorization: `Bearer ${slackToken}` } }
            );
            const hJson = await hist.json();
            if (hJson.ok) {
              const msgs = (hJson.messages || []).map((m: any) => ({
                id: `${c.id}:${m.ts}`,
                channel: c.name,
                user: m.user,
                text: (m.text || "").replace(/\s+/g, " ").trim()
              }));
              slackMessages.push(...msgs);
              usedChannels.push(c.name);
            }
          }
        }
      }
    }
    const slackBlock = slackMessages.slice(0, 60).map(m => `- #${m.channel} ${m.user}: ${m.text}`).join("\n");

    // 4. Gemini prompt
    const prompt = `
You are a meeting assistant. Generate a concise pre-meeting brief.

Rules:
- Return ONLY valid JSON (no markdown, no extra text).
- JSON keys: agenda, jira, slack, blockers, actions, overall.
- Use "None" for empty fields.

Meeting Title: ${meetingTitle}
Start: ${meetingStart}
Attendees: ${attendees.join(", ") || "None"}

JIRA:
${jiraBlock || "None"}

SLACK:
${slackBlock || "None"}
`;

    // 5. Call Gemini and parse
    const raw = await callGemini(prompt);
    console.log("[Gemini RAW]:", raw);

    let parsed = parseGeminiSummary(raw) || {
      agenda: "Parse error",
      jira: fallbackJiraSummary(jiraSelected),
      slack: fallbackSlackSummary(slackMessages),
      blockers: "None.",
      actions: "None.",
      overall: ""
    };

    // Normalize values
    const sections = {
      agenda: normalizeSectionValue(parsed.agenda),
      jira: normalizeSectionValue(parsed.jira),
      slack: normalizeSectionValue(parsed.slack),
      blockers: normalizeSectionValue(parsed.blockers),
      actions: normalizeSectionValue(parsed.actions),
      overall: normalizeSectionValue(parsed.overall)
    };

    // 6. Store in DB
    const doc = await MeetingSummary.create({
      userId: USER_ID,
      meetingTitle,
      meetingStart: meetingStart ? new Date(meetingStart) : undefined,
      meetingEnd: meetingEnd ? new Date(meetingEnd) : undefined,
      attendees,
      sections,
      sources: {
        jiraIssueKeys: jiraSelected.map(i => i.issueKey),
        slackChannels: usedChannels
      },
      rawPrompt: prompt,
      rawResponse: raw
    });

    return NextResponse.json({ ok: true, summaryId: doc._id });
  } catch (e: any) {
    console.error("[summary/generate] error", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

