#!/usr/bin/env npx tsx
/**
 * Publish The Disco Ranch (Disco Domes) inventory.
 *
 * Usage:
 *   npx tsx scripts/apply-the-disco-ranch-enrichment-2026-09-04.ts
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
    'scripts/migrations/enrich-the-disco-ranch-2026-09-04.sql'
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
              unit_pets, property_pool, property_hot_tub, property_family_friendly,
              rate_basis, rate_avg_retail_daily_rate, rate_summer_weekday,
              year_site_opened
       FROM all_sage_data
       WHERE property_id = '59ed4e96-43d0-4ba2-9949-bb8c68dde7a0'
       ORDER BY
         CASE site_name
           WHEN 'Disco Dome Africa' THEN 1
           WHEN 'Disco Dome Mexico' THEN 2
           ELSE 3
         END,
         id`
    );
    console.log('✓ The Disco Ranch enrichment applied');
    console.table(rows);
    const qty = rows.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(
      `rows=${rows.length} qty_sum=${qty} type=${rows[0]?.property_type} country=${rows[0]?.country} state=${rows[0]?.state} city=${rows[0]?.city} lat=${rows[0]?.lat} lon=${rows[0]?.lon} published=${rows[0]?.research_status} total_sites=${rows[0]?.property_total_sites} phone=${rows[0]?.phone_number} glamping=${rows[0]?.is_glamping_property} rate_basis=${rows[0]?.rate_basis}`
    );
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
