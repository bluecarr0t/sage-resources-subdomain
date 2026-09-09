#!/usr/bin/env npx tsx
/**
 * Publish / reject the 17 in-progress screenshot properties (2026-09-04 batch 5).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-batch5-2026-09-04.ts
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
    name: 'Reject screenshot batch5 ghosts',
    file: 'reject-screenshot-batch5-ghosts-2026-09-04.sql',
    where: `id IN (11232, 11238, 11015, 11017, 115, 11191, 11035)`,
  },
  {
    name: 'Molignon + Pianore + Scarabeo',
    file: 'enrich-molignon-pianore-scarabeo-2026-09-04.sql',
    where: `id IN (11230, 11072, 11070)`,
  },
  {
    name: 'Cielo + Bel Air + Nimmo',
    file: 'enrich-cielo-belair-nimmo-2026-09-04.sql',
    where: `id IN (13037, 13056, 209, 10766) OR property_id = '244e1abf-5198-47d1-99f4-56727ee7c629'`,
  },
  {
    name: 'Yurtcamp + Cabanes + Kustpark + Finca',
    file: 'enrich-yurtcamp-cabanes-kustpark-finca-2026-09-04.sql',
    where: `id IN (11277, 11184, 10978, 11183) OR property_id IN (
      '60152075-095f-4130-a285-3719914d5f5a',
      '22f36480-0dd4-4968-a72d-9c87fc4736c4'
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
       WHERE id IN (11123, 11016)
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
