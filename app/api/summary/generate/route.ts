import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Add this import
import { connectMongo } from "@/lib/mongo";
import JiraIssue from "@/models/JiraIssue";
import MeetingSummary from "@/models/MeetingSummary";
import { callGemini } from "@/services/gemini";
import { getSlackTokenForUser } from "@/lib/slack";

// Remove the hardcoded USER_ID
const JIRA_LIMIT = 15;
const SLACK_MSG_LIMIT_PER_CHANNEL = 50;
const SLACK_CHANNEL_SCAN_LIMIT = 10;

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

/* --------------- Enhanced Fallback Summaries --------------- */
function fallbackJiraSummary(issues: any[], keywords: string[]): string {
  if (!issues.length) return "None.";
  
  const relevantIssues = issues.filter(i => 
    keywords.some(k => i.title.toLowerCase().includes(k))
  );
  
  const issuesToShow = relevantIssues.length > 0 ? relevantIssues : issues.slice(0, 5);
  
  return issuesToShow.map(i => 
    `• ${i.issueKey} [${i.state}] "${i.title}" (Priority: ${i.priority || "NoPri"}${i.assignee ? `, Assigned to: ${i.assignee}` : ''})`
  ).join("\n");
}

function fallbackSlackSummary(messages: any[], keywords: string[]): string {
  if (!messages.length) return "None.";
  
  const relevantMessages = messages.filter(m =>
    keywords.some(k => m.text.toLowerCase().includes(k))
  );
  
  const messagesToShow = relevantMessages.length > 0 ? relevantMessages : messages.slice(0, 5);
  
  return messagesToShow.map(m => 
    `• #${m.channel}: "${m.text.slice(0, 100)}${m.text.length > 100 ? '...' : ''}"`
  ).join("\n");
}

/* ---------------- Main Handler ---------------- */
export async function POST(req: Request) {
  try {
    // Get session and authenticate user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const USER_ID = session.user.id; // Use session user ID
    console.log(`🚀 Generating summary for user: ${USER_ID}`);

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

    // 2. Jira issues - now uses session user ID
    const recentIssues = await JiraIssue.find({ userId: USER_ID }).sort({ updatedAtISO: -1 }).limit(60).lean();
    const relevantIssues = recentIssues.filter(i => keywords.some(k => i.title.toLowerCase().includes(k)));
    const jiraSelected = (relevantIssues.length ? relevantIssues : recentIssues).slice(0, JIRA_LIMIT);
    
    // Enhanced JIRA block with more details
    const jiraBlock = jiraSelected.map(i =>
      `• ${i.issueKey} [${i.state}] "${i.title}" (Priority: ${i.priority || "NoPri"}${i.assignee ? `, Assigned to: ${i.assignee}` : ''})`
    ).join("\n");

    // 3. Slack messages - now uses session user ID
    let slackMessages: any[] = [];
    let usedChannels: string[] = [];
    let allChannelsData: any[] = [];

    // Get Slack token using session user ID
    const slackData = await getSlackTokenForUser(USER_ID);
    if (slackData?.accessToken) {
      try {
        // Fetch ALL channels (not just limited)
        const chRes = await fetch("https://slack.com/api/conversations.list?limit=200&exclude_archived=true", {
          headers: { Authorization: `Bearer ${slackData.accessToken}` }
        });
        const chJson = await chRes.json();

        console.log("Slack Token:", slackData?.accessToken?.slice(0, 6));
        if (chJson.ok && chJson.channels) {
          allChannelsData = chJson.channels;

          // Scrape messages from ALL channels
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

    // Enhanced Slack block with actual message content
    const slackBlock = slackMessages.slice(0, 50).map(m => 
      `- #${m.channel}: "${m.text}"`
    ).join("\n");

    // 4. Enhanced Gemini prompt with detailed content requirements
    const prompt = `
You are an AI meeting preparation assistant. Analyze the provided data and create a comprehensive pre-meeting brief in STRICT JSON format.

CRITICAL INSTRUCTIONS:
- You MUST return ONLY valid JSON - no markdown, no backticks, no extra text
- Start your response with { and end with }
- Do NOT use \`\`\`json or any markdown formatting
- For each field, provide SPECIFIC DETAILS about what was discussed/found

MEETING CONTEXT:
Title: "${meetingTitle}"
Date: ${meetingStart}
Attendees: ${attendees.join(", ") || "None"}

AVAILABLE DATA:

JIRA ISSUES (${jiraSelected.length} total):
${jiraBlock || "None"}

SLACK DISCUSSIONS (${slackMessages.length} messages from ${usedChannels.length} channels):
${slackBlock || "None"}

ANALYSIS REQUIREMENTS:
1. For JIRA section: Mention specific issue titles and current status
2. For SLACK section: Quote or summarize actual discussions that are relevant
3. For BLOCKERS: Identify specific technical issues or problems mentioned
4. For ACTIONS: List concrete next steps mentioned in conversations
5. Provide detailed agenda matching analysis

REQUIRED OUTPUT FORMAT:
{
  "agenda": "Clear meeting objectives based on '${meetingTitle}' - what needs to be accomplished",
  "jira": "Detailed summary of specific JIRA issues, including titles and status. Mention actual issue names and what they're about", 
  "slack": "Specific Slack discussions summarized - mention what people actually said about the topic, quote key messages",
  "blockers": "Specific technical or process blockers mentioned in JIRA or Slack discussions",
  "actions": "Concrete action items mentioned in conversations - be specific about what needs to be done",
  "overall": "Executive summary with specific context about the issues and discussions found",
  "agenda_match": "Detailed analysis of how the JIRA issues and Slack conversations relate to '${meetingTitle}' - mention specific examples"
}

CONTENT REQUIREMENTS:
- Include actual JIRA issue titles and descriptions where relevant
- Quote or paraphrase specific Slack messages that are relevant
- Mention specific technical details, usernames, channel names when relevant
- If someone discussed JWT, authentication problems, login errors - mention those specifically
- Focus on concrete details rather than generic summaries
- Each section should be 3-5 sentences with specific information

RESPOND WITH JSON ONLY - NO OTHER TEXT:`;

    // 5. Call Gemini with enhanced error handling
    const raw = await callGemini(prompt);
    console.log("[Gemini RAW Response Length]:", raw.length);
    console.log("[Gemini RAW First 200 chars]:", raw.substring(0, 200));

    // Enhanced parsing with multiple attempts
    let parsed = null;
    
    const parsingAttempts = [
      () => {
        const cleaned = raw.replace(/``````/gi, "").trim();
        return JSON.parse(cleaned);
      },
      () => {
        const jsonStr = extractBalancedJson(raw);
        return jsonStr ? JSON.parse(jsonStr) : null;
      },
      () => {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          return JSON.parse(raw.substring(start, end + 1));
        }
        return null;
      },
      () => {
        let cleaned = raw
          .replace(/^Here's the JSON response:?\s*/i, "")
          .replace(/^The JSON response is:?\s*/i, "")
          .replace(/^JSON:?\s*/i, "")
          .replace(/``````/gi, "")
          .trim();
        return JSON.parse(cleaned);
      }
    ];

    for (let i = 0; i < parsingAttempts.length; i++) {
      try {
        parsed = parsingAttempts[i]();
        if (parsed && typeof parsed === 'object') {
          console.log(`✅ Parsing succeeded with strategy ${i + 1}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Parsing strategy ${i + 1} failed:`, (error as Error).message);
        continue;
      }
    }

    // Enhanced fallback with detailed content analysis
   // Enhanced fallback with dynamic content analysis based on actual agenda
if (!parsed) {
  console.log("🔄 All parsing failed, creating dynamic intelligent fallback");
  
  // Dynamically filter JIRA issues based on meeting keywords
  const agendaRelatedJira = jiraSelected.filter(i => 
    keywords.some(k => 
      i.title.toLowerCase().includes(k) || 
      i.description?.toLowerCase().includes(k) ||
      i.issueKey.toLowerCase().includes(k)
    )
  );
  
  // Dynamically filter Slack messages based on meeting keywords + professional context
  const agendaRelatedSlack = slackMessages.filter(m => {
    const text = m.text.toLowerCase();
    
    // Check if message relates to meeting agenda
    const isRelevant = keywords.some(k => text.includes(k));
    
    // Filter out casual/personal messages
    const isCasual = 
      text.includes('lunch') ||
      text.includes('dinner') ||
      text.includes('how are you') ||
      text.includes('good morning') ||
      text.includes('thanks') ||
      text.includes('😄') ||
      text.includes('lol') ||
      text.includes('haha') ||
      text.length < 10; // Very short messages likely casual
    
    return isRelevant && !isCasual;
  });

  parsed = {
    agenda: `Analyze and address issues related to "${meetingTitle}". Focus on ${agendaRelatedJira.length} relevant JIRA issues and team discussions from ${usedChannels.length} channels.`,
    
    jira: agendaRelatedJira.length > 0 
      ? `Found ${agendaRelatedJira.length} relevant issues: ${agendaRelatedJira.map(i => `${i.issueKey} "${i.title}" (${i.state})`).join(', ')}. Issues relate to meeting agenda keywords: ${keywords.join(', ')}.`
      : `${jiraSelected.length} total JIRA issues available but none directly match "${meetingTitle}" agenda. Review general backlog items.`,
    
    slack: agendaRelatedSlack.length > 0
      ? `Team discussions related to "${meetingTitle}": ${agendaRelatedSlack.map(m => `#${m.channel}: "${m.text.slice(0, 80)}..."`).slice(0, 3).join(', ')}. Found ${agendaRelatedSlack.length} relevant messages from recent conversations.`
      : `${slackMessages.length} total messages scanned but limited relevant discussion found for "${meetingTitle}". Team may need to discuss agenda items in upcoming meeting.`,
    
    blockers: agendaRelatedSlack.some(m => 
      m.text.toLowerCase().includes('issue') || 
      m.text.toLowerCase().includes('problem') ||
      m.text.toLowerCase().includes('error') ||
      m.text.toLowerCase().includes('stuck') ||
      m.text.toLowerCase().includes('blocked')
    ) ? `Technical or process blockers identified in team discussions related to ${meetingTitle}.`
      : "No specific blockers mentioned in recent relevant discussions",
    
    actions: agendaRelatedSlack.some(m => 
      m.text.toLowerCase().includes('need to') ||
      m.text.toLowerCase().includes('should') ||
      m.text.toLowerCase().includes('todo') ||
      m.text.toLowerCase().includes('action') ||
      m.text.toLowerCase().includes('implement')
    ) ? `Action items mentioned in team conversations regarding ${meetingTitle}. Review specific implementation steps discussed.`
      : `Review ${agendaRelatedJira.length} JIRA issues and plan concrete next steps for ${meetingTitle}`,
    
    overall: `Meeting preparation for "${meetingTitle}" shows ${jiraSelected.length} total JIRA issues (${agendaRelatedJira.length} agenda-relevant) and ${slackMessages.length} recent messages (${agendaRelatedSlack.length} professionally relevant). Analysis based on keywords: ${keywords.join(', ')}.`,
    
    agenda_match: agendaRelatedSlack.length > 0 || agendaRelatedJira.length > 0
      ? `GOOD MATCH - Found ${agendaRelatedJira.length} JIRA issues and ${agendaRelatedSlack.length} Slack discussions directly relating to "${meetingTitle}". Team has relevant context for productive meeting.`
      : `LIMITED MATCH - Minimal direct discussion found for "${meetingTitle}". Meeting agenda may be new topic requiring fresh discussion and planning.`
  };
}

    const sections = {
      agenda: normalizeSectionValue(parsed.agenda),
      jira: normalizeSectionValue(parsed.jira), 
      slack: normalizeSectionValue(parsed.slack),
      blockers: normalizeSectionValue(parsed.blockers),
      actions: normalizeSectionValue(parsed.actions),
      overall: normalizeSectionValue(parsed.overall),
      agenda_match: normalizeSectionValue(parsed.agenda_match)
    };

    // 6. Store in DB with session user ID
    const doc = await MeetingSummary.create({
      userId: USER_ID, // Now uses session user ID
      meetingTitle,
      meetingStart: meetingStart ? new Date(meetingStart) : undefined,
      meetingEnd: meetingEnd ? new Date(meetingEnd) : undefined,
      attendees,
      sections,
      sources: {
        jiraIssueKeys: jiraSelected.map(i => i.issueKey),
        slackChannels: usedChannels,
        totalSlackMessages: slackMessages.length,
        totalChannelsScraped: allChannelsData.length,
        relevantSlackMessages: slackMessages.filter(m => 
          keywords.some(k => m.text.toLowerCase().includes(k))
        ).length,
        relevantJiraIssues: jiraSelected.filter(i =>
          keywords.some(k => i.title.toLowerCase().includes(k))
        ).length
      },
      rawPrompt: prompt,
      rawResponse: raw
    });

    return NextResponse.json({
      ok: true,
      summaryId: doc._id,
      userId: USER_ID, // Include user ID in response
      stats: {
        jiraIssues: jiraSelected.length,
        slackMessages: slackMessages.length,
        channelsScraped: usedChannels.length,
        totalChannels: allChannelsData.length,
        parsingMethod: parsed ? "success" : "fallback",
        relevantContent: {
          jiraMatches: jiraSelected.filter(i => keywords.some(k => i.title.toLowerCase().includes(k))).length,
          slackMatches: slackMessages.filter(m => keywords.some(k => m.text.toLowerCase().includes(k))).length
        }
      }
    });
  } catch (e: any) {
    console.error("[summary/generate] error", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
