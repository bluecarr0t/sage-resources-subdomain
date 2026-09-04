#!/usr/bin/env npx tsx
/**
 * Publish Chincoteague Bay RV Resort & Cottages and split tent / cottage / RV.
 *
 * Usage:
 *   npx tsx scripts/apply-chincoteague-bay-rv-resort-enrichment-2026-09-04.ts
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
    'scripts/migrations/enrich-chincoteague-bay-rv-resort-2026-09-04.sql'
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
              unit_pets, unit_full_kitchen, property_pool, property_pickball_courts,
              rate_basis, rate_avg_retail_daily_rate, rate_fall_weekday
       FROM all_sage_data
       WHERE property_id = 'db9f14a2-9b88-48e1-bc69-f08f8d4f815f'
       ORDER BY
         CASE unit_type
           WHEN 'RV Site' THEN 1
           WHEN 'Cottage' THEN 2
           WHEN 'Safari Tent' THEN 3
           ELSE 4
         END,
         site_name`
    );
    console.log('✓ Chincoteague Bay RV Resort & Cottages enrichment applied');
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
