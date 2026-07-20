import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  getQuickbooksAppConfig,
  getQuickbooksEnvironment,
  isQuickbooksAppConfigured,
  loadQuickbooksConnection,
  QBO_REMAP_DOC_NUMBER_PREFIX,
  QBO_SOURCE_ITEM_NAME,
  QBO_TARGET_ITEM_NAME,
} from '@/lib/quickbooks';

export const dynamic = 'force-dynamic';

export const GET = withAdminAuth(async () => {
  const configured = isQuickbooksAppConfigured();
  const config = getQuickbooksAppConfig();
  const connection = configured ? await loadQuickbooksConnection() : null;

  return NextResponse.json({
    configured,
    connected: Boolean(connection),
    environment: getQuickbooksEnvironment(),
    redirectUri: config?.redirectUri ?? null,
    connection: connection
      ? {
          realmId: connection.realmId,
          source: connection.source,
          connectedAt: connection.connectedAt,
          updatedAt: connection.updatedAt,
          hasAccessToken: Boolean(connection.accessToken),
        }
      : null,
    remapRules: {
      docNumberPrefix: QBO_REMAP_DOC_NUMBER_PREFIX,
      sourceItemName: QBO_SOURCE_ITEM_NAME,
      targetItemName: QBO_TARGET_ITEM_NAME,
    },
  });
}, { requireRole: 'admin' });
