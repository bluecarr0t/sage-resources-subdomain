/**
 * @jest-environment jsdom
 */

import {
  clearGoogleSheetsOAuthAccessToken,
  GOOGLE_SHEETS_OAUTH_REAUTH_PROMPT_REMAINING_MS,
  readGoogleSheetsOAuthAccessToken,
  shouldPromptGoogleSheetsOAuthReconnect,
  writeGoogleSheetsOAuthAccessToken,
} from '@/lib/google-sheets-oauth-session';

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

describe('google-sheets-oauth-session', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-23T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null when nothing is stored', () => {
    expect(readGoogleSheetsOAuthAccessToken(SCOPE)).toBeNull();
  });

  it('round-trips a token for the same scope', () => {
    writeGoogleSheetsOAuthAccessToken('token-abc', SCOPE, 3600);
    expect(readGoogleSheetsOAuthAccessToken(SCOPE)).toBe('token-abc');
  });

  it('returns null for a different scope', () => {
    writeGoogleSheetsOAuthAccessToken('token-abc', SCOPE, 3600);
    expect(readGoogleSheetsOAuthAccessToken('other-scope')).toBeNull();
  });

  it('expires tokens before the reported expiry time', () => {
    writeGoogleSheetsOAuthAccessToken('token-abc', SCOPE, 3600);
    jest.setSystemTime(new Date('2026-06-23T12:58:30Z'));
    expect(readGoogleSheetsOAuthAccessToken(SCOPE)).toBe('token-abc');
    jest.setSystemTime(new Date('2026-06-23T12:59:01Z'));
    expect(readGoogleSheetsOAuthAccessToken(SCOPE)).toBeNull();
  });

  it('clears stored tokens', () => {
    writeGoogleSheetsOAuthAccessToken('token-abc', SCOPE, 3600);
    clearGoogleSheetsOAuthAccessToken();
    expect(readGoogleSheetsOAuthAccessToken(SCOPE)).toBeNull();
  });

  it('prompts reconnect when the token is within the soft-expiry window', () => {
    writeGoogleSheetsOAuthAccessToken('token-abc', SCOPE, 3600);
    jest.setSystemTime(new Date('2026-06-23T12:48:00Z'));
    expect(shouldPromptGoogleSheetsOAuthReconnect(SCOPE)).toBe(false);
    jest.setSystemTime(new Date('2026-06-23T12:51:00Z'));
    expect(
      shouldPromptGoogleSheetsOAuthReconnect(SCOPE, GOOGLE_SHEETS_OAUTH_REAUTH_PROMPT_REMAINING_MS)
    ).toBe(true);
  });
});
