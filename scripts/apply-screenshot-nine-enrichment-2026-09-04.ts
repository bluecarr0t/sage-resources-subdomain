#!/usr/bin/env npx tsx
/**
 * Publish the nine in-progress screenshot properties (2026-09-04).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-nine-enrichment-2026-09-04.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATIONS = [
  {
    name: 'La Donaira',
    file: 'enrich-la-donaira-2026-09-04.sql',
    where: `property_id = '10a0a04e-e767-46f0-90fb-13f0916becda'`,
  },
  {
    name: 'West Lexham',
    file: 'enrich-west-lexham-2026-09-04.sql',
    where: `property_id = '6bb2069d-9001-4c73-a963-4acfea5ed39e'`,
  },
  {
    name: 'Longlands',
    file: 'enrich-longlands-2026-09-04.sql',
    where: `property_id = 'c4d0437c-787d-4563-bdd4-f037d29d3c79'`,
  },
  {
    name: 'Camping de Lakens',
    file: 'enrich-camping-de-lakens-2026-09-04.sql',
    where: `property_id = '87d70e87-41c0-4808-a7d9-6781e83955f6'`,
  },
  {
    name: 'Bavarian Forest Glamping',
    file: 'enrich-bavarian-forest-glamping-2026-09-04.sql',
    where: `property_id = 'a1bdac86-2b31-4e98-ab21-56cfdf975cda'`,
  },
  {
    name: 'Lanzarote Retreats',
    file: 'enrich-lanzarote-retreats-2026-09-04.sql',
    where: `property_id = 'fd0942c1-508d-4694-9423-3a1439ff9f3c'`,
  },
  {
    name: 'Tree Inn',
    file: 'enrich-tree-inn-2026-09-04.sql',
    where: `property_id = '0da548b9-08be-4630-9465-72e1fae6db84'`,
  },
  {
    name: 'Treelodge (Retie only)',
    file: 'enrich-treelodge-2026-09-04.sql',
    where: `id = 10985`,
  },
  {
    name: 'Cabañas de Lires',
    file: 'enrich-cabanas-de-lires-2026-09-04.sql',
    where: `property_id = 'a0fec64e-acc0-4f7c-aa0a-b10bf01475a3'`,
  },
] as const;

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    for (const m of MIGRATIONS) {
      const sql = readFileSync(
        resolve(process.cwd(), 'scripts/migrations', m.file),
        'utf-8'
      );
      await client.query(sql);
      const { rows } = await client.query(
        `SELECT id, property_name, site_name, unit_type, quantity_of_units,
                property_total_sites, is_open, is_glamping_property,
                research_status, property_type, city, state, country,
                lat, lon, phone_number, rate_basis, rate_summer_weekday,
                year_site_opened
         FROM all_sage_data
         WHERE ${m.where}
         ORDER BY id`
      );
      const published = rows.filter((r) => r.research_status === 'published');
      const qty = published.reduce(
        (sum, r) => sum + Number(r.quantity_of_units || 0),
        0
      );
      console.log(`✓ ${m.name}`);
      console.table(rows);
      console.log(
        `  published_rows=${published.length} qty_sum=${qty} open=${published[0]?.is_open} type=${published[0]?.property_type} city=${published[0]?.city} total=${published[0]?.property_total_sites} rate_basis=${published[0]?.rate_basis}`
      );
    }
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
