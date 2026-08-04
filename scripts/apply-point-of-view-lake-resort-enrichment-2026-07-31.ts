#!/usr/bin/env npx tsx
/**
 * Apply Point of View Lake Resort enrichment migration.
 *
 * Usage:
 *   npx tsx scripts/apply-point-of-view-lake-resort-enrichment-2026-07-31.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(
    process.cwd(),
    'scripts/migrations/enrich-point-of-view-lake-resort-2026-07-31.sql'
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
      `SELECT id, site_name, unit_type, quantity_of_units, property_total_sites,
              rate_summer_weekday, rate_summer_weekend, rate_spring_weekday,
              rate_winter_weekday, rate_basis, rate_avg_retail_daily_rate,
              address, city, state, zip_code, lat, lon, phone_number
       FROM all_sage_data
       WHERE property_id = '7a90bd94-7636-414e-8a5c-2bb1b271ac98'
       ORDER BY id`
    );
    const qtySum = rows.reduce(
      (s, r) => s + (Number(r.quantity_of_units) || 0),
      0
    );
    console.log('✓ Point of View Lake Resort enrichment applied');
    console.log(`  rows=${rows.length} qty_sum=${qtySum}`);
    console.table(rows);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
