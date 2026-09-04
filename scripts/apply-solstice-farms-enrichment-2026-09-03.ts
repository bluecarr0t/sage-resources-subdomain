#!/usr/bin/env npx tsx
/**
 * Publish Solstice Farms and split into 4 lodging SKUs.
 *
 * Usage:
 *   npx tsx scripts/apply-solstice-farms-enrichment-2026-09-03.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/enrich-solstice-farms-2026-09-03.sql'),
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
              is_open, is_glamping_property, research_status, country, state,
              city, lat, lon, url, phone_number, unit_pets, unit_private_bathroom,
              rate_basis, rate_avg_retail_daily_rate, rate_summer_weekday,
              ota_url_airbnb, ota_url_hipcamp
       FROM all_sage_data
       WHERE property_id = 'd9895069-0a5f-4c7a-9c8d-a5ce7247cb51'
       ORDER BY
         CASE unit_type
           WHEN 'Airstream' THEN 1
           WHEN 'Vintage Trailer' THEN 2
           WHEN 'A-Frame' THEN 3
           WHEN 'Bell Tent' THEN 4
           ELSE 5
         END,
         site_name`
    );
    console.log('✓ Solstice Farms enrichment applied');
    console.table(rows);
    const qty = rows.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(
      `rows=${rows.length} qty_sum=${qty} country=${rows[0]?.country} state=${rows[0]?.state} city=${rows[0]?.city} lat=${rows[0]?.lat} lon=${rows[0]?.lon} published=${rows[0]?.research_status} total_sites=${rows[0]?.property_total_sites}`
    );
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
