import type { calendar_v3 } from 'googleapis';
import { createGoogleCalendarClientForUser } from '@/lib/google-calendar/client';

export async function insertGoogleCalendarEvent(input: {
  calendarUserEmail: string;
  event: calendar_v3.Schema$Event;
  env?: NodeJS.ProcessEnv;
}): Promise<string | null> {
  const calendar = createGoogleCalendarClientForUser(
    input.calendarUserEmail,
    input.env
  );

  const response = await calendar.events.insert({
    calendarId: 'primary',
    sendUpdates: 'all',
    requestBody: input.event,
  });

  return response.data.id ?? null;
}
