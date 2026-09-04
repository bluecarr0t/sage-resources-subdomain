#!/usr/bin/env npx tsx
/**
 * Apply Nauti Otter site/rate enrichment migration.
 *
 * Usage:
 *   npx tsx scripts/apply-nauti-otter-enrichment-2026-09-03.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/enrich-nauti-otter-site-inventory-2026-09-03.sql'),
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
              country, lat, lon, phone_number, research_status, rate_basis,
              rate_avg_retail_daily_rate, rate_summer_weekday, rate_fall_weekday,
              unit_private_bathroom, unit_pets, glamping_service_tier
       FROM all_sage_data
       WHERE property_id = 'e7db45f2-9ae4-409b-8819-e4c32d67792c'
       ORDER BY unit_type, site_name`
    );
    console.log('✓ Nauti Otter enrichment applied');
    console.table(rows);
    const qty = rows.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(`rows=${rows.length} qty_sum=${qty} country=${rows[0]?.country} lat=${rows[0]?.lat} lon=${rows[0]?.lon}`);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
