#!/usr/bin/env npx tsx
/**
 * Apply glamping pipeline state-coverage table + gap-fill inserts.
 * Run: npx tsx scripts/apply-glamping-pipeline-state-coverage-migration.ts
 *
 * Requires SUPABASE_DB_URL in .env.local, or run the SQL files in Supabase SQL Editor.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_FILES = [
  'scripts/migrations/create-glamping-pipeline-state-coverage-2026-08-24.sql',
  'scripts/migrations/add-pipeline-gap-fill-web-research-2026-08-24.sql',
] as const;

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    console.error('\nOr run these SQL files manually in Supabase SQL Editor:');
    for (const file of MIGRATION_FILES) {
      console.error(`  - ${file}`);
    }
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    for (const file of MIGRATION_FILES) {
      const sql = readFileSync(resolve(process.cwd(), file), 'utf-8');
      await client.query(sql);
      console.log(`✓ ${file}`);
    }
    console.log('✓ Glamping pipeline coverage + gap-fill migrations applied');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
