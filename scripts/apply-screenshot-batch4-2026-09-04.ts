#!/usr/bin/env npx tsx
/**
 * Publish / reject the 17 in-progress screenshot properties (2026-09-04 batch 4).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-batch4-2026-09-04.ts
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
    name: 'Reject screenshot batch4 ghosts',
    file: 'reject-screenshot-batch4-ghosts-2026-09-04.sql',
    where: `id IN (11116, 10988, 10973, 11020, 11075, 11027, 11205, 11148, 10966)`,
  },
  {
    name: 'Campotel + 350 Farms + Mosel',
    file: 'enrich-campotel-350farms-mosel-2026-09-04.sql',
    where: `id IN (11012, 13072, 11014)`,
  },
  {
    name: 'Caserío + Torre + Holset',
    file: 'enrich-caserio-torre-holset-2026-09-04.sql',
    where: `property_id IN (
      '34784373-eb67-433c-8813-daf9f7b0f896',
      '4452df28-e16e-4f93-89c4-d4ddc6d54a1f',
      '79a76414-297f-49eb-9892-257a4b1fdda1'
    )`,
  },
  {
    name: 'Kleine Paradijs + Glamping Sintra',
    file: 'enrich-kleine-paradijs-sintra-2026-09-04.sql',
    where: `property_id IN (
      '4f4e99a5-3a8c-495e-8682-0a061bd25bdb',
      '5daf8a96-504c-45fa-ae3f-28bef099362c'
    )`,
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
                glamping_service_tier, year_site_opened
         FROM all_sage_data
         WHERE ${m.where}
         ORDER BY property_name, id`
      );
      const published = rows.filter((r) => r.research_status === 'published');
      const rejected = rows.filter((r) => r.research_status === 'rejected');
      const qty = published.reduce(
        (sum, r) => sum + Number(r.quantity_of_units || 0),
        0
      );
      const badTier = published.filter(
        (r) => r.glamping_service_tier === 'standard'
      );
      console.log(`✓ ${m.name}`);
      console.table(rows);
      console.log(
        `  published=${published.length} rejected=${rejected.length} qty_sum=${qty} type=${published[0]?.property_type ?? rejected[0]?.property_type} rate_basis=${published[0]?.rate_basis ?? ''}`
      );
      if (badTier.length) {
        throw new Error(
          `glamping_service_tier=standard on ids ${badTier.map((r) => r.id).join(',')}`
        );
      }
    }

    const { rows: leftover } = await client.query(
      `SELECT id, property_name, city, country, research_status
       FROM all_sage_data
       WHERE id IN (11147, 10996, 11140)
       ORDER BY id`
    );
    console.log('Untouched siblings (expect prior status):');
    console.table(leftover);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
