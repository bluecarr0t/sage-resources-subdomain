#!/usr/bin/env npx tsx
/**
 * Rename all_sage_properties → all_sage_data and rebuild dependent DB objects.
 *
 * Run: npm run migrate:sage-data-rename
 *
 * Requires SUPABASE_DB_URL in .env.local.
 * After success, refresh unified_comps (see rebuild SQL or npm run refresh:unified-comps).
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_FILES = [
  'scripts/migrations/rename-all-sage-properties-to-all-sage-data-2026-06-10.sql',
  'scripts/migrations/rebuild-unified-comps-after-sage-data-rename-2026-06-10.sql',
  'scripts/migrations/patch-sage-rpcs-after-sage-data-rename-2026-06-10.sql',
] as const;

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required in .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    for (const file of MIGRATION_FILES) {
      const sql = readFileSync(resolve(process.cwd(), file), 'utf-8');
      console.log(`Applying ${file}...`);
      await client.query(sql);
      console.log(`✓ ${file}`);
    }
    console.log('\n✓ Sage data table rename migrations applied.');
    console.log('  Run: REFRESH MATERIALIZED VIEW CONCURRENTLY public.unified_comps;');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
