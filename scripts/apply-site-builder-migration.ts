#!/usr/bin/env npx tsx
/**
 * Apply Site Builder tables migration to Supabase.
 * Run: npx tsx scripts/apply-site-builder-migration.ts
 *
 * Requires SUPABASE_DB_URL in .env.local.
 * After migration, run: npx tsx scripts/seed-site-builder-data.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATIONS = [
  'scripts/migrations/create-site-builder-tables.sql',
  'scripts/migrations/add-amenity-source-references.sql',
];

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    for (const path of MIGRATIONS) {
      const sql = readFileSync(resolve(process.cwd(), path), 'utf-8');
      await client.query(sql);
    }
    console.log('✓ Site Builder tables created (site_builder_glamping_types, site_builder_rv_site_types, site_builder_amenity_costs)');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
