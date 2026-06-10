#!/usr/bin/env npx tsx
/**
 * Patch dashboard + remaining RPCs after all_sage_data rename.
 *
 * Run: npm run migrate:sage-data-dashboard-rpcs
 *
 * Requires SUPABASE_DB_URL in .env.local (run against production Supabase).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_FILE =
  'scripts/migrations/patch-dashboard-and-remaining-sage-data-rpcs-2026-06-10.sql';

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
    console.log('✓ Dashboard and remaining Sage data RPCs patched.');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
