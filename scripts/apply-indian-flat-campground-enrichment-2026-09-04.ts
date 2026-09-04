#!/usr/bin/env npx tsx
/**
 * Publish Indian Flat Campground and split Jupe / RV / tent / cabin inventory.
 *
 * Usage:
 *   npx tsx scripts/apply-indian-flat-campground-enrichment-2026-09-04.ts
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
    'scripts/migrations/enrich-indian-flat-campground-2026-09-04.sql'
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
              unit_pets, property_pool, rate_basis,
              rate_avg_retail_daily_rate, rate_fall_weekday
       FROM all_sage_data
       WHERE property_id = 'ddfbb2f3-7dc0-4345-85d5-2ac081fc8309'
       ORDER BY
         CASE unit_type
           WHEN 'RV Site' THEN 1
           WHEN 'Tent Site' THEN 2
           WHEN 'Cabin Tent' THEN 3
           WHEN 'Cottage' THEN 4
           WHEN 'Jupe' THEN 5
           ELSE 6
         END,
         site_name`
    );
    console.log('✓ Indian Flat Campground enrichment applied');
    console.table(rows);
    const qty = rows.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(
      `rows=${rows.length} qty_sum=${qty} type=${rows[0]?.property_type} country=${rows[0]?.country} state=${rows[0]?.state} city=${rows[0]?.city} lat=${rows[0]?.lat} lon=${rows[0]?.lon} published=${rows[0]?.research_status} total_sites=${rows[0]?.property_total_sites} phone=${rows[0]?.phone_number}`
    );
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
