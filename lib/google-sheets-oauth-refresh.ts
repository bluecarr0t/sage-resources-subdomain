'use client';

import { requestGoogleSheetsAccessToken } from '@/lib/google-sheets-oauth-client';
import {
  GOOGLE_SHEETS_OAUTH_REAUTH_PROMPT_REMAINING_MS,
  readGoogleSheetsOAuthAccessToken,
  readGoogleSheetsOAuthExpiresAt,
  shouldPromptGoogleSheetsOAuthReconnect,
  writeGoogleSheetsOAuthAccessToken,
} from '@/lib/google-sheets-oauth-session';

/** Attempt silent GIS refresh when this much time remains (~15 min on a 60 min token). */
export const GOOGLE_SHEETS_OAUTH_SILENT_REFRESH_REMAINING_MS = 15 * 60_000;

export type GoogleSheetsOAuthPromptContext = {
  cronSyncEnabled?: boolean;
  mirrorIncomplete?: boolean;
};

/** Server cron keeps the mirror fresh — browser OAuth is optional for day-to-day use. */
export function shouldSuppressGoogleSheetsOAuthReconnectPrompt(
  context: GoogleSheetsOAuthPromptContext
): boolean {
  return Boolean(context.cronSyncEnabled) && context.mirrorIncomplete !== true;
}

export function shouldSilentlyRefreshGoogleSheetsOAuth(
  scope: string,
  remainingMs: number = GOOGLE_SHEETS_OAUTH_SILENT_REFRESH_REMAINING_MS
): boolean {
  const expiresAt = readGoogleSheetsOAuthExpiresAt(scope);
  if (!expiresAt) return false;

  const remaining = expiresAt - Date.now();
  return remaining > 0 && remaining <= remainingMs;
}

export function shouldShowGoogleSheetsOAuthReconnectPrompt(
  scope: string,
  context: GoogleSheetsOAuthPromptContext = {},
  remainingMs: number = GOOGLE_SHEETS_OAUTH_REAUTH_PROMPT_REMAINING_MS
): boolean {
  if (shouldSuppressGoogleSheetsOAuthReconnectPrompt(context)) {
    return false;
  }
  return shouldPromptGoogleSheetsOAuthReconnect(scope, remainingMs);
}

export async function silentlyRefreshGoogleSheetsAccessToken(
  clientId: string,
  scope: string
): Promise<boolean> {
  if (!shouldSilentlyRefreshGoogleSheetsOAuth(scope)) {
    return Boolean(readGoogleSheetsOAuthAccessToken(scope));
  }

  try {
    const { accessToken, expiresIn } = await requestGoogleSheetsAccessToken(clientId, scope);
    writeGoogleSheetsOAuthAccessToken(accessToken, scope, expiresIn);
    return true;
  } catch {
    return false;
  }
}
