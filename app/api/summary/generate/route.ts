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
import { connectMongo } from "@/lib/mongo";
import JiraIssue from "@/models/JiraIssue";
import MeetingSummary from "@/models/MeetingSummary";
import { callGemini } from "@/services/gemini";
import { getSlackTokenForUser } from "@/lib/slack"; // Add this import

const USER_ID = "demo-user-1";
const JIRA_LIMIT = 15;
const SLACK_MSG_LIMIT_PER_CHANNEL = 50; // Increased for more comprehensive scraping
const SLACK_CHANNEL_SCAN_LIMIT = 10; // Increased to scrape more channels

/* ---------------- JSON Helpers ---------------- */
function stripCodeFences(text: string): string {
  return text.replace(/``````/gi, "").trim();
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

    // 3. Slack messages - UPDATED TO USE DATABASE
    let slackMessages: any[] = [];
    let usedChannels: string[] = [];
    let allChannelsData: any[] = [];

    // Get Slack token from database
    const slackData = await getSlackTokenForUser(USER_ID);
    if (slackData?.accessToken) {
      try {
        // Fetch ALL channels (not just limited)
        const chRes = await fetch("https://slack.com/api/conversations.list?limit=200&exclude_archived=true", {
          headers: { Authorization: `Bearer ${slackData.accessToken}` }
        });
        const chJson = await chRes.json();

        if (chJson.ok && chJson.channels) {
          allChannelsData = chJson.channels;

          // Scrape messages from ALL channels (as requested)
          for (const channel of allChannelsData) {
            try {
              const hist = await fetch(
                `https://slack.com/api/conversations.history?channel=${channel.id}&limit=${SLACK_MSG_LIMIT_PER_CHANNEL}`,
                { headers: { Authorization: `Bearer ${slackData.accessToken}` } }
              );
              const hJson = await hist.json();

              if (hJson.ok && hJson.messages) {
                const msgs = hJson.messages
                  .filter((m: any) => !m.subtype && m.text) // Only real user messages with text
                  .map((m: any) => ({
                    id: `${channel.id}:${m.ts}`,
                    channel: channel.name,
                    user: m.user,
                    text: (m.text || "").replace(/\s+/g, " ").trim(),
                    timestamp: m.ts
                  }));

                slackMessages.push(...msgs);
                if (msgs.length > 0) {
                  usedChannels.push(channel.name);
                }
              }
            } catch (channelError) {
              console.warn(`Failed to fetch messages from channel ${channel.name}:`, channelError);
            }
          }

          console.log(`✅ Scraped ${slackMessages.length} messages from ${usedChannels.length} channels`);
        }
      } catch (slackError) {
        console.error("Slack API error:", slackError);
      }
    }

    const slackBlock = slackMessages.slice(0, 100).map(m => `- #${m.channel} ${m.user}: ${m.text}`).join("\n");

    // 4. Enhanced Gemini prompt with agenda matching
    const prompt = `
You are a meeting assistant. Analyze the provided data and generate a pre-meeting brief.

IMPORTANT: Compare the calendar meeting agenda with the Slack messages to identify relevant discussions and context.

Rules:
- Return ONLY valid JSON (no markdown, no extra text).
- JSON keys: agenda, jira, slack, blockers, actions, overall, agenda_match.
- Use "None" for empty fields.
- For "agenda_match", analyze if Slack messages contain discussions related to the meeting agenda.

Meeting Title: ${meetingTitle}
Start: ${meetingStart}
Attendees: ${attendees.join(", ") || "None"}

JIRA ISSUES:
${jiraBlock || "None"}

SLACK MESSAGES (from ${usedChannels.length} channels):
${slackBlock || "None"}

ANALYSIS REQUIRED:
1. Does the Slack content relate to the meeting agenda: "${meetingTitle}"?
2. What relevant discussions or context exist in Slack?
3. Are there any blockers or action items mentioned in Slack?

Expected JSON format:
{
  "agenda": "Meeting agenda and objectives",
  "jira": "Relevant JIRA issues summary",
  "slack": "Relevant Slack discussions and context",
  "blockers": "Identified blockers from all sources",
  "actions": "Action items from all sources", 
  "overall": "Overall meeting context and preparation",
  "agenda_match": "Analysis of how Slack content relates to meeting agenda"
}
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
      overall: "",
      agenda_match: "Unable to analyze agenda match due to parse error"
    };

    // Normalize values
    const sections = {
      agenda: normalizeSectionValue(parsed.agenda),
      jira: normalizeSectionValue(parsed.jira),
      slack: normalizeSectionValue(parsed.slack),
      blockers: normalizeSectionValue(parsed.blockers),
      actions: normalizeSectionValue(parsed.actions),
      overall: normalizeSectionValue(parsed.overall),
      agenda_match: normalizeSectionValue(parsed.agenda_match || "No agenda matching performed")
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
        slackChannels: usedChannels,
        totalSlackMessages: slackMessages.length,
        totalChannelsScraped: allChannelsData.length
      },
      rawPrompt: prompt,
      rawResponse: raw
    });

    return NextResponse.json({
      ok: true,
      summaryId: doc._id,
      stats: {
        jiraIssues: jiraSelected.length,
        slackMessages: slackMessages.length,
        channelsScraped: usedChannels.length,
        totalChannels: allChannelsData.length
      }
    });
  } catch (e: any) {
    console.error("[summary/generate] error", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
