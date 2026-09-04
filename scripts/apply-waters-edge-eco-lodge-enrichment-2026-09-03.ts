#!/usr/bin/env npx tsx
/**
 * Publish Waters Edge Eco Lodge and split into 23 named WebRez sites.
 *
 * Usage:
 *   npx tsx scripts/apply-waters-edge-eco-lodge-enrichment-2026-09-03.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/enrich-waters-edge-eco-lodge-site-inventory-2026-09-03.sql'),
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
              is_glamping_property, research_status, country, city, lat, lon,
              url, phone_number, unit_pets, unit_private_bathroom,
              rate_basis, rate_avg_retail_daily_rate, rate_summer_weekday
       FROM all_sage_data
       WHERE property_id = '255c4582-7105-4404-90fa-7d39774931ee'
       ORDER BY unit_type, site_name`
    );
    console.log('✓ Waters Edge Eco Lodge enrichment applied');
    console.table(rows);
    const qty = rows.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(
      `rows=${rows.length} qty_sum=${qty} country=${rows[0]?.country} city=${rows[0]?.city} lat=${rows[0]?.lat} lon=${rows[0]?.lon} published=${rows[0]?.research_status}`
    );
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
