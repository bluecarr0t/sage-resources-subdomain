#!/usr/bin/env npx tsx
/**
 * Add acres_planted_raw column to wineries table.
 * Run: npx tsx scripts/apply-wineries-acreage-raw-migration.ts
 *
 * Requires SUPABASE_DB_URL in .env.local.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    process.exit(1);
  }

  const sql = readFileSync(
    resolve(process.cwd(), 'scripts/migrations/add-wineries-acreage-raw.sql'),
    'utf-8'
  );

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(sql);
    console.log('✓ acres_planted_raw column added to wineries');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
