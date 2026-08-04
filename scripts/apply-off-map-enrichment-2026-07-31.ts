#!/usr/bin/env npx tsx
/**
 * Apply Off Map site/rate enrichment migration.
 *
 * Usage:
 *   npx tsx scripts/apply-off-map-enrichment-2026-07-31.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/enrich-off-map-rates-sites-2026-07-31.sql'),
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
      `SELECT id, site_name, unit_type, quantity_of_units, property_total_sites,
              rate_avg_retail_daily_rate, rate_summer_weekday, rate_summer_weekend,
              rate_fall_weekday, rate_fall_weekend, rate_winter_weekday
       FROM all_sage_data
       WHERE property_id = 'ae850e9d-38db-4cea-93b4-711f855b4c44'
          OR property_name ILIKE '%off map%'
       ORDER BY id`
    );
    console.log('✓ Off Map enrichment applied');
    console.table(rows);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
