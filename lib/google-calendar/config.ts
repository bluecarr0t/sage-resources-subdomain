import { isGoogleSheetsServiceAccountConfigured } from '@/lib/google-sheets-export';

const CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function getGoogleCalendarEventsScope(): string {
  return CALENDAR_EVENTS_SCOPE;
}

export function isGoogleCalendarConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return isGoogleSheetsServiceAccountConfigured(env);
}

export function isPipelineCalendarEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!isGoogleCalendarConfigured(env)) return false;
  return env.PIPELINE_CALENDAR_ENABLED?.trim().toLowerCase() === 'true';
}

export function getGoogleCalendarTimezone(env: NodeJS.ProcessEnv = process.env): string {
  return env.GOOGLE_CALENDAR_TIMEZONE?.trim() || 'America/New_York';
}

/** When set, all review calendar events are created on this user's primary calendar. */
export function getPipelineCalendarTestRecipient(
  env: NodeJS.ProcessEnv = process.env
): string | null {
  const value = env.PIPELINE_CALENDAR_TEST_RECIPIENT?.trim().toLowerCase();
  return value || null;
}
