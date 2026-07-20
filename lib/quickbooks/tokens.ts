import { createServerClient } from '@/lib/supabase';
import { getQuickbooksAppConfig } from '@/lib/quickbooks/config';
import { QBO_OAUTH_TOKEN_URL } from '@/lib/quickbooks/constants';

export type QuickbooksStoredConnection = {
  realmId: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  connectedAt: string | null;
  updatedAt: string | null;
  source: 'database' | 'env';
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
  token_type?: string;
};

function envConnection(
  env: NodeJS.ProcessEnv = process.env
): QuickbooksStoredConnection | null {
  const realmId = env.QUICKBOOKS_REALM_ID?.trim();
  const refreshToken = env.QUICKBOOKS_REFRESH_TOKEN?.trim();
  if (!realmId || !refreshToken) return null;
  return {
    realmId,
    refreshToken,
    accessToken: env.QUICKBOOKS_ACCESS_TOKEN?.trim() || null,
    accessTokenExpiresAt: env.QUICKBOOKS_ACCESS_TOKEN_EXPIRES_AT?.trim() || null,
    connectedAt: null,
    updatedAt: null,
    source: 'env',
  };
}

export async function loadQuickbooksConnection(): Promise<QuickbooksStoredConnection | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('quickbooks_oauth')
      .select(
        'realm_id, refresh_token, access_token, access_token_expires_at, connected_at, updated_at'
      )
      .eq('id', 1)
      .maybeSingle();

    if (!error && data?.realm_id && data?.refresh_token) {
      return {
        realmId: data.realm_id,
        refreshToken: data.refresh_token,
        accessToken: data.access_token ?? null,
        accessTokenExpiresAt: data.access_token_expires_at ?? null,
        connectedAt: data.connected_at ?? null,
        updatedAt: data.updated_at ?? null,
        source: 'database',
      };
    }
  } catch {
    // Table may not exist yet — fall through to env.
  }

  return envConnection();
}

export async function saveQuickbooksConnection(input: {
  realmId: string;
  refreshToken: string;
  accessToken?: string | null;
  accessTokenExpiresAt?: string | null;
  connectedByUserId?: string | null;
}): Promise<void> {
  const supabase = createServerClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from('quickbooks_oauth').upsert(
    {
      id: 1,
      realm_id: input.realmId,
      refresh_token: input.refreshToken,
      access_token: input.accessToken ?? null,
      access_token_expires_at: input.accessTokenExpiresAt ?? null,
      connected_by_user_id: input.connectedByUserId ?? null,
      connected_at: now,
      updated_at: now,
    },
    { onConflict: 'id' }
  );

  if (error) {
    throw new Error(`Failed to save QuickBooks connection: ${error.message}`);
  }
}

async function exchangeToken(body: URLSearchParams): Promise<TokenResponse> {
  const config = getQuickbooksAppConfig();
  if (!config) {
    throw new Error('QuickBooks app is not configured (missing client id/secret).');
  }

  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
    'base64'
  );
  const res = await fetch(QBO_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const json = (await res.json()) as TokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !json.access_token || !json.refresh_token) {
    throw new Error(
      json.error_description ||
        json.error ||
        `QuickBooks token exchange failed (${res.status})`
    );
  }

  return json;
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  realmId: string;
  connectedByUserId?: string | null;
}): Promise<QuickbooksStoredConnection> {
  const config = getQuickbooksAppConfig();
  if (!config) {
    throw new Error('QuickBooks app is not configured (missing client id/secret).');
  }

  const tokens = await exchangeToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: input.code,
      redirect_uri: config.redirectUri,
    })
  );

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await saveQuickbooksConnection({
    realmId: input.realmId,
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    accessTokenExpiresAt: expiresAt,
    connectedByUserId: input.connectedByUserId,
  });

  return {
    realmId: input.realmId,
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    accessTokenExpiresAt: expiresAt,
    connectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'database',
  };
}

export async function getValidAccessToken(): Promise<{
  accessToken: string;
  realmId: string;
  connection: QuickbooksStoredConnection;
}> {
  const connection = await loadQuickbooksConnection();
  if (!connection) {
    throw new Error(
      'QuickBooks is not connected. Connect from Admin → QuickBooks, or set QUICKBOOKS_REFRESH_TOKEN and QUICKBOOKS_REALM_ID.'
    );
  }

  const expiresAtMs = connection.accessTokenExpiresAt
    ? Date.parse(connection.accessTokenExpiresAt)
    : 0;
  const stillValid =
    Boolean(connection.accessToken) &&
    Number.isFinite(expiresAtMs) &&
    expiresAtMs - Date.now() > 60_000;

  if (stillValid && connection.accessToken) {
    return {
      accessToken: connection.accessToken,
      realmId: connection.realmId,
      connection,
    };
  }

  const tokens = await exchangeToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refreshToken,
    })
  );

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Persist rotated refresh token when connection lives in DB.
  if (connection.source === 'database') {
    await saveQuickbooksConnection({
      realmId: connection.realmId,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      accessTokenExpiresAt: expiresAt,
    });
  }

  return {
    accessToken: tokens.access_token,
    realmId: connection.realmId,
    connection: {
      ...connection,
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token,
      accessTokenExpiresAt: expiresAt,
      updatedAt: new Date().toISOString(),
    },
  };
}
