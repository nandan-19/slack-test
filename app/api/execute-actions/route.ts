
import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from "@/lib/mongo";
import Integration from "@/models/Integration";
import { ensureValidAccessToken } from "@/connectors/jira/refresh";

import { google } from 'googleapis';

const DEMO_USER_ID = "demo-user-1";

export async function POST(req: NextRequest) {
  try {
    const { actions , accessToken } = await req.json();
    const results = [];

    for (const action of actions) {
      try {
        let result;
        
        switch (action.type) {
          case 'jira_create':
            result = await executeJiraCreate(action);
            break;
          case 'jira_update':
            result = await executeJiraUpdate(action);
            break;
          case 'calendar_create':
            result = await executeCalendarCreate(action,accessToken);
            break;
          case 'calendar_delete':
            result = await executeCalendarDelete(action);
            break;
          default:
            result = { success: false, error: 'Unknown action type' };
        }
        
        results.push({
          actionId: action.id,
          success: result.success,
          data: result.data,
          error: 'error' in result ? result.error : undefined
        });
      } catch (error) {
        results.push({
          actionId: action.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Action execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute actions' },
      { status: 500 }
    );
  }
}

async function executeJiraCreate(action: any) {
  await connectMongo();
  const integ = await Integration.findOne({ userId: DEMO_USER_ID, provider: "jira" });
  
  if (!integ) {
    return { success: false, error: 'Jira not connected' };
  }

  const { accessToken, integration } = await ensureValidAccessToken(integ._id.toString());
  
  const issueData = {
    fields: {
      project: { key: action.metadata.projectKey || 'SCRUM' },
      summary: action.title,
      description: action.description,
      issuetype: { name: action.metadata.issueType || 'Task' },
      priority: { name: action.metadata.priority || 'Medium' },
      ...(action.metadata.assignee && { assignee: { displayName: action.metadata.assignee } }),
      ...(action.metadata.labels && { labels: action.metadata.labels.map((l: string) => ({ name: l })) })
    }
  };

  const response = await fetch(`https://api.atlassian.com/ex/jira/${integration.cloudId}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issueData)
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error: `Jira API error: ${error}` };
  }

  const result = await response.json();
  return { 
    success: true, 
    data: { 
      key: result.key, 
      url: `${integration.siteUrl}/browse/${result.key}` 
    } 
  };
}

async function executeJiraUpdate(action: any) {
  // Similar implementation for updating existing Jira issues
  return { success: true, data: { message: 'Jira update not implemented yet' } };
}

async function executeCalendarCreate(action: any, token:string) {
// You'll need to pass this from the frontend
  
  if (!token) {
    return { success: false, error: 'Google Calendar access token required' };
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  const calendar = google.calendar({ version: 'v3', auth });

  const startTime = new Date(action.metadata.datetime || Date.now() + 86400000); // Default: tomorrow
  const endTime = new Date(startTime.getTime() + (action.metadata.duration || 3600000)); // Default: 1 hour

  const event = {
    summary: action.title,
    description: action.description,
    start: { dateTime: startTime.toISOString(), timeZone: 'Asia/Kolkata' },
    end: { dateTime: endTime.toISOString(), timeZone: 'Asia/Kolkata' },
    ...(action.metadata.attendees && { attendees: action.metadata.attendees.map((email: string) => ({ email })) })
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    ...event
  });

  return { 
    success: true, 
    data: { 
      eventId: response.data.id,
      htmlLink: response.data.htmlLink 
    } 
  };
}

async function executeCalendarDelete(action: any) {
  // Implementation for deleting calendar events
  return { success: true, data: { message: 'Calendar delete not implemented yet' } };
}
