#!/usr/bin/env npx tsx
/**
 * Publish Missing Hotel and fill dome / villa inventory.
 *
 * Usage:
 *   npx tsx scripts/apply-missing-hotel-enrichment-2026-09-04.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/enrich-missing-hotel-2026-09-04.sql'),
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
              unit_pets, property_pool, property_restaurant, property_hot_tub,
              rate_basis, rate_avg_retail_daily_rate, rate_fall_weekday
       FROM all_sage_data
       WHERE property_id = 'e9a87278-37c9-4575-81a9-e157199873b5'
       ORDER BY
         CASE unit_type
           WHEN 'Dome' THEN 1
           WHEN 'Villa' THEN 2
           ELSE 3
         END,
         site_name`
    );
    console.log('✓ Missing Hotel enrichment applied');
    console.table(rows);
    const qty = rows.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(
      `rows=${rows.length} qty_sum=${qty} type=${rows[0]?.property_type} country=${rows[0]?.country} state=${rows[0]?.state} city=${rows[0]?.city} lat=${rows[0]?.lat} lon=${rows[0]?.lon} published=${rows[0]?.research_status} total_sites=${rows[0]?.property_total_sites} phone=${rows[0]?.phone_number} glamping=${rows[0]?.is_glamping_property}`
    );
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
