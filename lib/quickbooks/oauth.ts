import { randomBytes } from 'crypto';
import { getQuickbooksAppConfig } from '@/lib/quickbooks/config';
import {
  QBO_OAUTH_AUTHORIZE_URL,
  QBO_OAUTH_SCOPES,
} from '@/lib/quickbooks/constants';

export const QBO_OAUTH_STATE_COOKIE = 'qbo_oauth_state';

export function createQuickbooksOAuthState(): string {
  return randomBytes(24).toString('hex');
}

export function buildQuickbooksAuthorizeUrl(state: string): string {
  const config = getQuickbooksAppConfig();
  if (!config) {
    throw new Error('QuickBooks app is not configured (missing client id/secret).');
  }

  const url = new URL(QBO_OAUTH_AUTHORIZE_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', QBO_OAUTH_SCOPES);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('state', state);
  return url.toString();
}
