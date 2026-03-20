#!/usr/bin/env npx tsx
/**
 * Apply CCE audit fixes migration (RLS, unique constraint, updated_at).
 * Run: npx tsx scripts/apply-cce-audit-fixes.ts
 *
 * If cce_cost_percentages has duplicates, run first:
 *   python scripts/extract-cce-pdf.py --clear-cce-cost-percentages
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/cce-audit-fixes.sql'),
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
    console.log('✓ CCE audit fixes applied (updated_at, unique constraint, RLS)');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
