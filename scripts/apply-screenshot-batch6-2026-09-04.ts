#!/usr/bin/env npx tsx
/**
 * Publish the remaining in-progress screenshot properties (2026-09-04 batch 6).
 * Skips Tenerife Glamping / Yurtcamp Devon / Kustpark Nieuwpoort / Cabanes Dosrius
 * (already published or rejected in batch 5).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-batch6-2026-09-04.ts
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
    name: 'Quinta M + Il Sole + Loveland',
    file: 'enrich-quinta-ilsole-loveland-2026-09-04.sql',
    where: `id IN (11154, 11043, 11275)`,
  },
  {
    name: 'Blackstrap + Treetop + Lava + Kuilart',
    file: 'enrich-blackstrap-treetop-lava-kuilart-2026-09-04.sql',
    where: `id IN (13047, 18, 10739, 10740, 10775, 11185, 11097)`,
  },
  {
    name: 'Algonquin + Poggio Rosso + Órgiva',
    file: 'enrich-algonquin-poggio-orgiva-2026-09-04.sql',
    where: `id IN (133, 11073, 11195) OR property_id = 'ebd9f6b8-dab4-44ed-85fe-e96dbaeb4651'`,
  },
  {
    name: 'Still Water + Mill Lake',
    file: 'enrich-stillwater-milllake-2026-09-04.sql',
    where: `id IN (13041, 13034)`,
  },
  {
    name: 'Treetop leftover rate cleanup',
    file: 'patch-treetop-haven-rates-2026-09-04.sql',
    where: `id IN (18, 10739, 10740, 10775)`,
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
       WHERE id IN (11191, 11277, 10978, 11184, 13353)
       ORDER BY id`
    );
    console.log('Already-done screenshot siblings (expect prior status):');
    console.table(leftover);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
