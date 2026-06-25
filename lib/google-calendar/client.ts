import { google, type calendar_v3 } from 'googleapis';
import {
  parseGoogleServiceAccountFromEnv,
  type GoogleServiceAccountCredentials,
} from '@/lib/google-sheets-export';
import { getGoogleCalendarEventsScope } from '@/lib/google-calendar/config';

function createJwtAuth(
  credentials: GoogleServiceAccountCredentials,
  subject: string
): InstanceType<typeof google.auth.JWT> {
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [getGoogleCalendarEventsScope()],
    subject,
  });
}

export function createGoogleCalendarClientForUser(
  userEmail: string,
  env: NodeJS.ProcessEnv = process.env
): calendar_v3.Calendar {
  const credentials = parseGoogleServiceAccountFromEnv(env);
  if (!credentials) {
    throw new Error('Google Calendar service account is not configured');
  }

  const subject = userEmail.trim();
  if (!subject) {
    throw new Error('Google Calendar user email is required');
  }

  return google.calendar({
    version: 'v3',
    auth: createJwtAuth(credentials, subject),
  });
}
