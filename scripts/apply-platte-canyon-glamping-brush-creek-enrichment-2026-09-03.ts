#!/usr/bin/env npx tsx
/**
 * Publish Platte Canyon Glamping at Brush Creek Ranch and split into 3 SKUs.
 *
 * Usage:
 *   npx tsx scripts/apply-platte-canyon-glamping-brush-creek-enrichment-2026-09-03.ts
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
    'scripts/migrations/enrich-platte-canyon-glamping-brush-creek-2026-09-03.sql'
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
              is_open, is_glamping_property, research_status, property_type,
              country, state, city, lat, lon, url, phone_number,
              unit_private_bathroom, unit_wood_burning_stove, rate_basis,
              rate_avg_retail_daily_rate, rate_summer_weekday, minimum_nights
       FROM all_sage_data
       WHERE property_id = 'c57fe3f8-4876-46ee-a9c5-76f149b8e8f6'
       ORDER BY
         CASE site_name
           WHEN 'Uline Yurt' THEN 1
           WHEN 'One Bar Eleven Glamping Tent' THEN 2
           WHEN 'XH Glamping Tent' THEN 3
           ELSE 4
         END`
    );
    console.log('✓ Platte Canyon Glamping enrichment applied');
    console.table(rows);
    const qty = rows.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(
      `rows=${rows.length} qty_sum=${qty} type=${rows[0]?.property_type} country=${rows[0]?.country} state=${rows[0]?.state} city=${rows[0]?.city} lat=${rows[0]?.lat} lon=${rows[0]?.lon} published=${rows[0]?.research_status} total_sites=${rows[0]?.property_total_sites} rate_basis=${rows[0]?.rate_basis}`
    );
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
