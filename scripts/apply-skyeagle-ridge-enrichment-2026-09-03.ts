#!/usr/bin/env npx tsx
/**
 * Publish SkyEagle Ridge and split into 3 lodging SKUs.
 *
 * Usage:
 *   npx tsx scripts/apply-skyeagle-ridge-enrichment-2026-09-03.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/enrich-skyeagle-ridge-2026-09-03.sql'),
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
              city, lat, lon, url, phone_number, unit_pets, unit_hot_tub,
              unit_sauna, planned_open_date, ota_url_airbnb, rate_basis,
              rate_avg_retail_daily_rate, rate_summer_weekday, rate_fall_weekday
       FROM all_sage_data
       WHERE property_id = 'e5db8283-f017-404f-a2e4-641cf6cd1f7f'
       ORDER BY
         CASE site_name
           WHEN 'ÖÖD Mirror House' THEN 1
           WHEN 'Aviator Geodome' THEN 2
           WHEN 'The Golden House' THEN 3
           ELSE 4
         END`
    );
    console.log('✓ SkyEagle Ridge enrichment applied');
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
