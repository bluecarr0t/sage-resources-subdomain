#!/usr/bin/env npx tsx
/**
 * Publish Collective Retreats Vail (closed) last operating inventory.
 *
 * Usage:
 *   npx tsx scripts/apply-collective-retreats-vail-enrichment-2026-09-04.ts
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
    'scripts/migrations/enrich-collective-retreats-vail-2026-09-04.sql'
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
              unit_pets, rate_basis, rate_avg_retail_daily_rate,
              rate_summer_weekday, year_site_opened
       FROM all_sage_data
       WHERE property_id = '64029283-bd01-4fe0-abba-1e5c04e60e21'
       ORDER BY
         CASE research_status WHEN 'published' THEN 1 WHEN 'rejected' THEN 2 ELSE 3 END,
         CASE site_name
           WHEN 'Summit Tent' THEN 1
           WHEN 'Journey Tent' THEN 2
           ELSE 3
         END,
         id`
    );
    console.log('✓ Collective Retreats Vail enrichment applied');
    console.table(rows);
    const published = rows.filter((r) => r.research_status === 'published');
    const qty = published.reduce((sum, r) => sum + Number(r.quantity_of_units || 0), 0);
    console.log(
      `rows=${rows.length} published=${published.length} qty_sum=${qty} type=${published[0]?.property_type} city=${published[0]?.city} lat=${published[0]?.lat} lon=${published[0]?.lon} open=${published[0]?.is_open} total_sites=${published[0]?.property_total_sites} phone=${published[0]?.phone_number} glamping=${published[0]?.is_glamping_property} rate_basis=${published[0]?.rate_basis}`
    );
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
