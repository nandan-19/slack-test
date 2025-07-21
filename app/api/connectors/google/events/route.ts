import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('access_token');
  if (!token) {
    return NextResponse.json({ success: false, message: 'Missing token' }, { status: 400 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date().toISOString();
  const twoMonthsFromNow = new Date();
  twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

  try {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now,
      timeMax: twoMonthsFromNow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return NextResponse.json({ success: true, events: res.data.items || [] });
  } catch (error) {
    console.error('Fetch calendar error:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch events' }, { status: 500 });
  }
}
