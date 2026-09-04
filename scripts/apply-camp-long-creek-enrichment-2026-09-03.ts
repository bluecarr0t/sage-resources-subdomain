#!/usr/bin/env npx tsx
/**
 * Publish Camp Long Creek and split into 6 lodging SKUs.
 *
 * Usage:
 *   npx tsx scripts/apply-camp-long-creek-enrichment-2026-09-03.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/enrich-camp-long-creek-2026-09-03.sql'),
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
              unit_pets, unit_hot_tub, property_pool, property_hot_tub,
              rate_basis, rate_avg_retail_daily_rate, rate_summer_weekday
       FROM all_sage_data
       WHERE property_id = '09e783b9-2d64-443a-aa9d-353560dbd3bd'
       ORDER BY
         CASE site_name
           WHEN 'Glamping Unit' THEN 1
           WHEN 'Family Glamping Unit' THEN 2
           WHEN 'Camp Hut' THEN 3
           WHEN 'Two Bedroom Camp Cabin' THEN 4
           WHEN 'Camp Cabin With Private Bedroom' THEN 5
           WHEN 'Single Room Camp Cabin' THEN 6
           ELSE 7
         END`
    );
    console.log('✓ Camp Long Creek enrichment applied');
    console.table(rows);
    const qty = rows.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(
      `rows=${rows.length} qty_sum=${qty} type=${rows[0]?.property_type} country=${rows[0]?.country} state=${rows[0]?.state} city=${rows[0]?.city} lat=${rows[0]?.lat} lon=${rows[0]?.lon} published=${rows[0]?.research_status} total_sites=${rows[0]?.property_total_sites}`
    );

    const { rows: rejected } = await client.query(
      `SELECT id, property_name, research_status, address
       FROM all_sage_data
       WHERE id = 205 AND property_id = '20d8f01c-3850-494a-bb46-00e69bda2d8c'`
    );
    console.log('rejected id 205 (must stay rejected):');
    console.table(rejected);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
