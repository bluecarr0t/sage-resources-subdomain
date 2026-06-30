import type { calendar_v3 } from 'googleapis';
import { createGoogleCalendarClientForUser } from '@/lib/google-calendar/client';
import { insertGoogleCalendarEvent } from '@/lib/google-calendar/insert-event';

async function findGoogleCalendarEventByICalUID(
  calendar: calendar_v3.Calendar,
  iCalUID: string
): Promise<string | null> {
  const response = await calendar.events.list({
    calendarId: 'primary',
    iCalUID,
    maxResults: 1,
  });

  return response.data.items?.[0]?.id ?? null;
}

export async function upsertGoogleCalendarEvent(input: {
  calendarUserEmail: string;
  event: calendar_v3.Schema$Event;
  env?: NodeJS.ProcessEnv;
}): Promise<string | null> {
  const iCalUID = input.event.iCalUID?.trim();
  if (!iCalUID) {
    return insertGoogleCalendarEvent(input);
  }

  const calendar = createGoogleCalendarClientForUser(
    input.calendarUserEmail,
    input.env
  );

  const existingEventId = await findGoogleCalendarEventByICalUID(calendar, iCalUID);
  if (!existingEventId) {
    return insertGoogleCalendarEvent(input);
  }

  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId: existingEventId,
    sendUpdates: 'all',
    requestBody: input.event,
  });

  return response.data.id ?? existingEventId;
}
