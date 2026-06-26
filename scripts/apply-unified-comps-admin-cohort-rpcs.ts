#!/usr/bin/env npx tsx
/**
 * Add p_apply_admin_cohort to unified comps list / aggregate / geo RPCs.
 *
 * Run: npm run migrate:unified-comps-admin-cohort-rpcs
 *
 * Required when /admin/glamping-properties shows "Failed to fetch unified comps"
 * and logs mention unified_comps_list_properties missing p_apply_admin_cohort.
 *
 * Requires SUPABASE_DB_URL in .env.local.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_FILE =
  'scripts/migrations/unified-comps-admin-cohort-rpcs-all-sage-data-2026-06-23.sql';

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required in .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const sql = readFileSync(resolve(process.cwd(), MIGRATION_FILE), 'utf-8');
    console.log(`Applying ${MIGRATION_FILE}...`);
    await client.query(sql);
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✓ Unified comps admin cohort RPCs applied (PostgREST schema reload notified).');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
