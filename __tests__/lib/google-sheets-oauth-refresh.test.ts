/**
 * @jest-environment jsdom
 */

import {
  GOOGLE_SHEETS_OAUTH_SILENT_REFRESH_REMAINING_MS,
  shouldShowGoogleSheetsOAuthReconnectPrompt,
  shouldSilentlyRefreshGoogleSheetsOAuth,
  shouldSuppressGoogleSheetsOAuthReconnectPrompt,
} from '@/lib/google-sheets-oauth-refresh';
import {
  GOOGLE_SHEETS_OAUTH_REAUTH_PROMPT_REMAINING_MS,
  writeGoogleSheetsOAuthAccessToken,
} from '@/lib/google-sheets-oauth-session';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

describe('google-sheets-oauth-refresh', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-23T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('suppresses reconnect prompt when server cron sync is enabled and mirror is complete', () => {
    writeGoogleSheetsOAuthAccessToken('token-abc', SCOPE, 3600);
    jest.setSystemTime(new Date('2026-06-23T12:51:00Z'));

    expect(
      shouldSuppressGoogleSheetsOAuthReconnectPrompt({
        cronSyncEnabled: true,
        mirrorIncomplete: false,
      })
    ).toBe(true);
    expect(
      shouldShowGoogleSheetsOAuthReconnectPrompt(SCOPE, {
        cronSyncEnabled: true,
        mirrorIncomplete: false,
      })
    ).toBe(false);
  });

  it('still prompts when cron is enabled but the mirror is incomplete', () => {
    writeGoogleSheetsOAuthAccessToken('token-abc', SCOPE, 3600);
    jest.setSystemTime(new Date('2026-06-23T12:51:00Z'));

    expect(
      shouldShowGoogleSheetsOAuthReconnectPrompt(SCOPE, {
        cronSyncEnabled: true,
        mirrorIncomplete: true,
      })
    ).toBe(true);
  });

  it('prompts in oauth-only mode when the token is within the soft-expiry window', () => {
    writeGoogleSheetsOAuthAccessToken('token-abc', SCOPE, 3600);
    jest.setSystemTime(new Date('2026-06-23T12:51:00Z'));

    expect(
      shouldShowGoogleSheetsOAuthReconnectPrompt(SCOPE, {
        cronSyncEnabled: false,
      })
    ).toBe(true);
  });

  it('targets silent refresh earlier than the reconnect prompt window', () => {
    expect(GOOGLE_SHEETS_OAUTH_SILENT_REFRESH_REMAINING_MS).toBeGreaterThan(
      GOOGLE_SHEETS_OAUTH_REAUTH_PROMPT_REMAINING_MS
    );
  });

  it('requests silent refresh only while the token is still valid', () => {
    writeGoogleSheetsOAuthAccessToken('token-abc', SCOPE, 3600);

    jest.setSystemTime(new Date('2026-06-23T12:30:00Z'));
    expect(shouldSilentlyRefreshGoogleSheetsOAuth(SCOPE)).toBe(false);

    jest.setSystemTime(new Date('2026-06-23T12:46:00Z'));
    expect(shouldSilentlyRefreshGoogleSheetsOAuth(SCOPE)).toBe(true);

    jest.setSystemTime(new Date('2026-06-23T12:59:30Z'));
    expect(shouldSilentlyRefreshGoogleSheetsOAuth(SCOPE)).toBe(false);
  });
});
