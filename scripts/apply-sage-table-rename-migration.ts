#!/usr/bin/env npx tsx
/**
 * Legacy: rename all_glamping_properties → all_sage_properties (use migrate:sage-data-rename for current table).
 *
 * Run: npx tsx scripts/apply-sage-table-rename-migration.ts
 *
 * Requires SUPABASE_DB_URL in .env.local.
 * After success, run: npm run refresh:downstream -- --only=unified_comps,facets_cache
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_FILES = [
  'scripts/migrations/rename-all-glamping-properties-to-all-sage-properties-2026-06-10.sql',
  'scripts/migrations/rebuild-unified-comps-after-sage-rename-2026-06-10.sql',
  'scripts/migrations/patch-sage-rpcs-after-rename-2026-06-10.sql',
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
    console.log('\n✓ Sage table rename migrations applied.');
    console.log('  Run: npm run refresh:downstream -- --only=unified_comps,facets_cache');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
