#!/usr/bin/env npx tsx
/**
 * Publish Collective Governors Island and split into 3 lodging SKUs.
 * Rejects the older "Collective Retreats Governors Island" duplicate.
 *
 * Usage:
 *   npx tsx scripts/apply-collective-governors-island-enrichment-2026-09-03.ts
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
    'scripts/migrations/enrich-collective-governors-island-2026-09-03.sql'
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
              unit_pets, unit_private_bathroom, property_restaurant,
              rate_basis, rate_avg_retail_daily_rate, rate_fall_weekday
       FROM all_sage_data
       WHERE property_id = '65f582dc-9a38-402b-a5b8-cb4c2914c615'
       ORDER BY
         CASE site_name
           WHEN 'Journey Tent' THEN 1
           WHEN 'Voyager Tent' THEN 2
           WHEN 'Basecamp Cabin' THEN 3
           ELSE 4
         END`
    );
    console.log('✓ Collective Governors Island enrichment applied');
    console.table(rows);
    const qty = rows.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(
      `rows=${rows.length} qty_sum=${qty} type=${rows[0]?.property_type} country=${rows[0]?.country} state=${rows[0]?.state} city=${rows[0]?.city} lat=${rows[0]?.lat} lon=${rows[0]?.lon} published=${rows[0]?.research_status} total_sites=${rows[0]?.property_total_sites}`
    );

    const { rows: rejected } = await client.query(
      `SELECT id, property_name, site_name, research_status
       FROM all_sage_data
       WHERE property_id = '54752c1b-e4ae-4f5e-9f4c-65234d4b95cd'
       ORDER BY id`
    );
    console.log('older Collective Retreats Governors Island rows (must be rejected):');
    console.table(rejected);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
