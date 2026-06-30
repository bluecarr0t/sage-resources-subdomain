#!/usr/bin/env npx tsx
/**
 * Manual sync: Job Numbers Google Sheet tab(s) → Supabase.
 *
 * Service account (production cron):
 *   npm run sync:project-pipeline
 *
 * OAuth (when only NEXT_PUBLIC_GOOGLE_SHEETS_OAUTH_CLIENT_ID is configured):
 *   GOOGLE_SHEETS_OAUTH_ACCESS_TOKEN=ya29... npm run sync:project-pipeline -- --sheet "2026 Jobs"
 *   GOOGLE_SHEETS_OAUTH_ACCESS_TOKEN=ya29... npm run sync:project-pipeline -- --all
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  assertProjectPipelineCronSyncConfigured,
  syncAllProjectPipelineSheetsToSupabase,
  syncProjectPipelineSheetToSupabase,
} from '../lib/project-pipeline/sync-to-supabase';
import { isGoogleSheetsServiceAccountConfigured } from '../lib/google-sheets-export';
import {
  PROJECT_PIPELINE_SHEET_TABS,
  resolveProjectPipelineSheetTab,
  type ProjectPipelineSheetTab,
} from '../lib/project-pipeline/sheet-tabs';

config({ path: resolve(process.cwd(), '.env.local') });

function parseArgs(argv: string[]): { syncAll: boolean; sheetName?: ProjectPipelineSheetTab } {
  let syncAll = false;
  let sheetName: ProjectPipelineSheetTab | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--all') {
      syncAll = true;
      continue;
    }
    if (arg === '--sheet') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --sheet');
      }
      sheetName = resolveProjectPipelineSheetTab(value);
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage:
  npm run sync:project-pipeline [-- --all]
  npm run sync:project-pipeline [-- --sheet "2026 Jobs"]

OAuth: set GOOGLE_SHEETS_OAUTH_ACCESS_TOKEN (from Job Pipeline sessionStorage after Connect Google Sheets).
Tabs: ${PROJECT_PIPELINE_SHEET_TABS.join(', ')}`);
      process.exit(0);
    }
  }

  return { syncAll, sheetName };
}

async function main() {
  const { syncAll, sheetName } = parseArgs(process.argv.slice(2));
  const accessToken = process.env.GOOGLE_SHEETS_OAUTH_ACCESS_TOKEN?.trim();
  const hasServiceAccount = isGoogleSheetsServiceAccountConfigured();

  if (!hasServiceAccount && !accessToken) {
    try {
      assertProjectPipelineCronSyncConfigured();
    } catch {
      console.error(
        'Set GOOGLE_SERVICE_ACCOUNT_* for service-account sync, or GOOGLE_SHEETS_OAUTH_ACCESS_TOKEN for OAuth sync.'
      );
      process.exit(1);
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const syncOptions = accessToken ? { accessToken } : {};

  if (syncAll || (!sheetName && !hasServiceAccount && accessToken)) {
    const result = await syncAllProjectPipelineSheetsToSupabase(supabase, syncOptions);
    console.log('✓ Project pipeline sync complete (all tabs)');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const targetSheet = sheetName ?? '2026 Jobs';
  const result = await syncProjectPipelineSheetToSupabase(supabase, targetSheet, syncOptions);
  console.log(`✓ Project pipeline sync complete (${targetSheet})`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
