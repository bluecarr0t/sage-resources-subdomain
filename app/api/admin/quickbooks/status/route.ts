import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  getQuickbooksAppConfig,
  getQuickbooksEnvironment,
  isQuickbooksAppConfigured,
  loadQuickbooksConnection,
  QBO_APPRAISAL_DESCRIPTION_MATCH,
  QBO_APPRAISAL_DESCRIPTION_TARGET_ITEM_NAME,
  QBO_REMAP_DOC_NUMBER_PREFIX,
  QBO_REMAP_RULES,
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
      appraisalDescriptionMatch: QBO_APPRAISAL_DESCRIPTION_MATCH,
      appraisalDescriptionTargetItemName: QBO_APPRAISAL_DESCRIPTION_TARGET_ITEM_NAME,
      rules: QBO_REMAP_RULES.map((rule) => ({
        id: rule.id,
        label: rule.label,
        targetItemName: rule.targetItemName,
      })),
    },
  });
}, { requireRole: 'admin' });
