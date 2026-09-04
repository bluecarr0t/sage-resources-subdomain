#!/usr/bin/env npx tsx
/**
 * Enrich The Fields of Michigan and reject the duplicate "The Fields" stub.
 *
 * Usage:
 *   npx tsx scripts/apply-the-fields-of-michigan-enrichment-2026-09-04.ts
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
    'scripts/migrations/enrich-the-fields-of-michigan-2026-09-04.sql'
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
      `SELECT id, property_name, site_name, unit_type, quantity_of_units,
              property_total_sites, research_status, property_type, lat, lon,
              url, phone_number, unit_pets, property_pool, property_restaurant,
              rate_basis, rate_avg_retail_daily_rate, rate_fall_weekday
       FROM all_sage_data
       WHERE property_id IN (
         '09eb4831-15c0-484a-ace9-f9a642ce6c8a',
         'e718dc0e-3562-4e2e-9e2a-8f6f9bcc06c7'
       )
       ORDER BY property_id, id`
    );
    console.log('✓ The Fields of Michigan enrichment applied');
    console.table(rows);
    const published = rows.filter((r) => r.research_status === 'published');
    const qty = published.reduce(
      (sum, r) => sum + Number(r.quantity_of_units || 0),
      0
    );
    const rejected = rows.filter((r) => r.research_status === 'rejected').length;
    console.log(
      `published_rows=${published.length} qty_sum=${qty} total_sites=${published[0]?.property_total_sites} rejected=${rejected} type=${published[0]?.property_type} lat=${published[0]?.lat} lon=${published[0]?.lon} phone=${published[0]?.phone_number} rate_basis=${published[0]?.rate_basis}`
    );
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
