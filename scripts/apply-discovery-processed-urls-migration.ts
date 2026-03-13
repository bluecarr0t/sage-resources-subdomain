#!/usr/bin/env npx tsx
/**
 * Apply glamping_discovery_processed_urls migration to Supabase.
 * Run: npx tsx scripts/apply-discovery-processed-urls-migration.ts
 *
 * Requires SUPABASE_DB_URL in .env.local (Dashboard > Project Settings > Database > Connection string).
 * Or run scripts/migrations/create-glamping-discovery-processed-urls.sql manually in Supabase SQL Editor.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/create-glamping-discovery-processed-urls.sql'),
  'utf-8'
);

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    console.error('(Dashboard > Project Settings > Database > Connection string)');
    console.error('\nOr run scripts/migrations/create-glamping-discovery-processed-urls.sql manually in Supabase SQL Editor.');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(MIGRATION_SQL);
    console.log('✓ glamping_discovery_processed_urls table created/exists');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
