#!/usr/bin/env npx tsx
/**
 * Apply Shortgrass Resort enrichment migration.
 *
 * Usage:
 *   npx tsx scripts/apply-shortgrass-enrichment-2026-07-31.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/enrich-shortgrass-resort-2026-07-31.sql'),
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
      `SELECT id, property_name, site_name, unit_type, quantity_of_units,
              property_total_sites, address, city, state, zip_code, lat, lon,
              rate_avg_retail_daily_rate, rate_summer_weekday, rate_basis,
              rate_winter_weekday, glamping_service_tier, url, phone_number
       FROM all_sage_data WHERE id = 13144`
    );
    console.log('✓ Shortgrass Resort enrichment applied');
    console.table(rows);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
