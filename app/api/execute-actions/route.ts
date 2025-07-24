import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { jiraCreateIssueForUser } from "@/connectors/jira/create-issue";
import { google } from "googleapis";
import { auth } from "@/auth"; // Use JWT-based auth

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { actions, accessToken } = await req.json();
    await connectMongo();

    const results: any[] = [];
    for (const action of actions) {
      try {
        let result;

        switch (action.type) {
          case "jira_create":
            result = await executeJiraCreate(action, userId);
            break;

          

          case "calendar_create":
            result = await executeCalendarCreate(action, accessToken);
            break;

           
          default:
            result = { success: false, error: "Unknown action type" };
        }

        results.push({
          actionId: action.id,
          success: result.success,
          data: "data" in result ? result.data : null,
          error: "error" in result ? result.error : null,
        });
      } catch (error) {
        console.error("Action error:", error);
        results.push({
          actionId: action.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Action execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute actions" },
      { status: 500 }
    );
  }
}

/**
 * JIRA: CREATE ISSUE
 * projectKey & issueType are optional; helper will auto-discover.
 */
async function executeJiraCreate(action: any, userId: string) {
  try {
    // Enhanced labels handling
    let labels = action?.metadata?.labels;
    
    if (typeof labels === 'string') {
      // Split comma-separated strings and trim whitespace
      labels = labels.split(',').map(label => label.trim()).filter(label => label.length > 0);
    } else if (!Array.isArray(labels)) {
      labels = [];
    }
    
    // Ensure all labels are strings
    labels = labels.filter((label: any) => typeof label === 'string' && label.trim().length > 0);

    const result = await jiraCreateIssueForUser(userId, {
      title: action.title,
      description: action.description,
      projectKey: action?.metadata?.projectKey,
      issueType: action?.metadata?.issueType,
      priority: action?.metadata?.priority,
      assigneeAccountId: action?.metadata?.assigneeAccountId,
      labels, // Now guaranteed to be array of strings
    });
    
    return result;
  } catch (e: any) {
    console.error("[executeJiraCreate] error:", e);
    return {
      success: false,
      error: e?.message || "Failed to create Jira issue",
    };
  }
}


/**
 * JIRA: UPDATE ISSUE (still TODO)
 */
// async function executeJiraUpdate(_action: any, _userId: string) {
//   return { success: false, error: "Jira update not implemented yet" };
// }

/**
 * GOOGLE CALENDAR: CREATE EVENT
 */
async function executeCalendarCreate(action: any, token: string) {
  if (!token) return { success: false, error: "Google Calendar access token required" };

  const gAuth = new google.auth.OAuth2();
  gAuth.setCredentials({ access_token: token });

  const calendar = google.calendar({ version: "v3", auth: gAuth });
  const startTime = new Date(action.metadata?.datetime || Date.now() + 86400000);
  const endTime = new Date(
    startTime.getTime() + (action.metadata?.duration || 3600000)
  );

  const event = {
    summary: action.title,
    description: action.description,
    start: { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
    end: { dateTime: endTime.toISOString(), timeZone: "Asia/Kolkata" },
    attendees: (action.metadata?.attendees || []).map((email: string) => ({
      email,
    })),
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return {
      success: true,
      data: { eventId: response.data.id, htmlLink: response.data.htmlLink },
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to create calendar event" };
  }
}

/**
 * GOOGLE CALENDAR: DELETE EVENT (placeholder)
 */
// async function executeCalendarDelete(_action: any, _token: string) {
//   return { success: false, error: "Calendar delete not implemented yet" };
// }