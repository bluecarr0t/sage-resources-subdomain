import { NextRequest, NextResponse } from 'next/server';
import { checkGatedPageAccess } from '@/lib/check-gated-page-access';
import { GATED_PAGE_PIPELINE_QUARTERLY } from '@/lib/gated-access';
import {
  createGoogleSheetFromTabs,
  getGoogleSheetsExportAuthMode,
  getGoogleSheetsOAuthClientIdFromEnv,
  isGoogleSheetsExportConfigured,
  parseGoogleServiceAccountFromEnv,
  type GoogleSheetsExportRow,
} from '@/lib/google-sheets-export';
import {
  getPipelineQuarterlyPropertyExportColumns,
  getPipelineQuarterlyUnitMixExportColumns,
  PIPELINE_QUARTERLY_EXPORT_PROPERTY_SHEET_NAME,
  PIPELINE_QUARTERLY_EXPORT_UNIT_MIX_SHEET_NAME,
} from '@/lib/pipeline-quarterly/export-rows';
import { isPipelineQuarterlyProductEnabled } from '@/lib/pipeline-quarterly/is-enabled';
import { createServerClientWithCookies } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const MAX_EXPORT_ROWS = 10_000;

type ExportToSheetsTabBody = {
  title?: unknown;
  rows?: unknown;
  columns?: unknown;
};

type ExportToSheetsBody = {
  title?: unknown;
  accessToken?: unknown;
  tabs?: unknown;
  rows?: unknown;
  columns?: unknown;
};

const PROPERTY_COLUMN_SET = new Set<string>(
  getPipelineQuarterlyPropertyExportColumns()
);
const UNIT_MIX_COLUMN_SET = new Set<string>(getPipelineQuarterlyUnitMixExportColumns());

function isExportRow(value: unknown): value is GoogleSheetsExportRow {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseExportColumns(
  value: unknown,
  allowed: ReadonlySet<string>
): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every((column) => typeof column === 'string' && allowed.has(column))) {
    return null;
  }
  return value;
}

function parseExportTab(
  value: unknown,
  allowed: ReadonlySet<string>
): { title: string; rows: GoogleSheetsExportRow[]; columns: string[] } | null {
  if (typeof value !== 'object' || value === null) return null;
  const tab = value as ExportToSheetsTabBody;

  if (!Array.isArray(tab.rows) || !tab.rows.every(isExportRow)) return null;
  const columns = parseExportColumns(tab.columns, allowed);
  if (!columns) return null;

  const title =
    typeof tab.title === 'string' && tab.title.trim()
      ? tab.title.trim().slice(0, 100)
      : 'Sheet';

  return { title, rows: tab.rows, columns };
}

function parseTabs(body: ExportToSheetsBody): {
  title: string;
  tabs: { title: string; rows: GoogleSheetsExportRow[]; columns: string[] }[];
} | null {
  if (Array.isArray(body.tabs) && body.tabs.length > 0) {
    const tabs = body.tabs
      .map((tab) => {
        const propertyTab = parseExportTab(tab, PROPERTY_COLUMN_SET);
        if (propertyTab) return propertyTab;
        return parseExportTab(tab, UNIT_MIX_COLUMN_SET);
      })
      .filter((tab): tab is NonNullable<typeof tab> => tab !== null);

    if (!tabs.length) return null;

    const totalRows = tabs.reduce((sum, tab) => sum + tab.rows.length, 0);
    if (totalRows === 0 || totalRows > MAX_EXPORT_ROWS) return null;
    if (!tabs.some((tab) => tab.rows.length > 0)) return null;

    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, 120)
        : 'Pipeline Quarterly export';

    return { title, tabs };
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > MAX_EXPORT_ROWS) {
    return null;
  }
  if (!body.rows.every(isExportRow)) return null;

  const columns =
    parseExportColumns(body.columns, PROPERTY_COLUMN_SET) ??
    getPipelineQuarterlyPropertyExportColumns();

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : 'Pipeline Quarterly export';

  return {
    title,
    tabs: [{ title: PIPELINE_QUARTERLY_EXPORT_PROPERTY_SHEET_NAME, rows: body.rows, columns }],
  };
}

export async function GET() {
  if (!isPipelineQuarterlyProductEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const authMode = getGoogleSheetsExportAuthMode();
  const oauthClientId = getGoogleSheetsOAuthClientIdFromEnv();

  return NextResponse.json({
    configured: isGoogleSheetsExportConfigured(),
    authMode,
    oauthClientId: authMode === 'oauth' ? oauthClientId : null,
  });
}

export async function POST(request: NextRequest) {
  if (!isPipelineQuarterlyProductEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!isGoogleSheetsExportConfigured()) {
    return NextResponse.json(
      { error: 'Google Sheets export is not configured' },
      { status: 503 }
    );
  }

  const supabase = await createServerClientWithCookies();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hasAccess = await checkGatedPageAccess(supabase, user, GATED_PAGE_PIPELINE_QUARTERLY);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: ExportToSheetsBody;
  try {
    body = (await request.json()) as ExportToSheetsBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = parseTabs(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid export rows' }, { status: 400 });
  }

  const authMode = getGoogleSheetsExportAuthMode();
  const accessToken =
    typeof body.accessToken === 'string' && body.accessToken.trim()
      ? body.accessToken.trim()
      : null;

  if (authMode === 'oauth' && !accessToken) {
    return NextResponse.json(
      { error: 'Google authorization is required for Sheets export' },
      { status: 400 }
    );
  }

  if (authMode === 'service_account' && !parseGoogleServiceAccountFromEnv()) {
    return NextResponse.json(
      { error: 'Google Sheets export is not configured' },
      { status: 503 }
    );
  }

  try {
    const result = await createGoogleSheetFromTabs({
      title: parsed.title,
      tabs: parsed.tabs,
      accessToken: accessToken ?? undefined,
      shareWithAnyone: authMode === 'service_account',
    });

    return NextResponse.json({
      spreadsheetId: result.spreadsheetId,
      url: result.url,
    });
  } catch (error) {
    console.error('[pipeline-quarterly/export-to-sheets]', error);
    const message =
      error instanceof Error ? error.message : 'Failed to create Google Sheet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
