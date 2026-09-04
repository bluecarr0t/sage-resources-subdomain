#!/usr/bin/env npx tsx
/**
 * Add glamping_professionalization_score and refresh the list-anchors view.
 *
 * Usage:
 *   npx tsx scripts/apply-glamping-professionalization-score-column-2026-09-04.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(
    process.cwd(),
    'scripts/migrations/add-glamping-professionalization-score-2026-09-04.sql'
  ),
  'utf-8'
);

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(MIGRATION_SQL);
    const { rows } = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'all_sage_data'
         AND column_name = 'glamping_professionalization_score'`
    );
    console.log('✓ glamping_professionalization_score column ready');
    console.table(rows);
    if (rows.length === 0) {
      console.error('Column was not created');
      process.exit(1);
    }
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
