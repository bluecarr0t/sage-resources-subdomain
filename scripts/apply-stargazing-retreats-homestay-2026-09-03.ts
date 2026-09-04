#!/usr/bin/env npx tsx
/**
 * Insert Stargazing Retreats Homestay (Camp Verde, AZ) as a published
 * non-glamping property with 2 named sites.
 *
 * Usage:
 *   npx tsx scripts/apply-stargazing-retreats-homestay-2026-09-03.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/add-stargazing-retreats-homestay-2026-09-03.sql'),
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
      `SELECT id, property_name, site_name, unit_type, quantity_of_units, property_total_sites,
              is_glamping_property, research_status, country, lat, lon, url, phone_number,
              rate_basis, rate_avg_retail_daily_rate, unit_private_bathroom, unit_pets,
              property_type, property_id
       FROM all_sage_data
       WHERE property_id = '9100342e-d51f-4bf9-a007-f6826632baf6'
       ORDER BY id`
    );
    console.log('✓ Stargazing Retreats Homestay inserted');
    console.table(rows);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
