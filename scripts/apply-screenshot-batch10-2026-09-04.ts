#!/usr/bin/env npx tsx
/**
 * Publish / reject the 15 in-progress screenshot properties (2026-09-04 batch 10).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-batch10-2026-09-04.ts
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
    name: 'Reject screenshot batch10 ghosts + duplicates',
    file: 'reject-screenshot-batch10-ghosts-2026-09-04.sql',
    where: `id IN (11190, 11156, 11187, 11100, 11095)`,
  },
  {
    name: 'Under the Oak + Appalaches Domes',
    file: 'enrich-under-oak-appalaches-2026-09-04.sql',
    where: `id IN (11266, 13044)`,
  },
  {
    name: 'Euro parks + Strandpark + TAIGA + Norcenni + Orlando',
    file: 'enrich-euro-parks-batch10-2026-09-04.sql',
    where: `id IN (11105, 11126, 11093, 11029, 11193, 11050, 11046)`,
  },
  {
    name: 'TCS Sempach + Sion',
    file: 'enrich-tcs-sempach-sion-2026-09-04.sql',
    where: `id IN (11209, 11214)`,
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
                glamping_service_tier
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
        `  published=${published.length} rejected=${rejected.length} qty_sum=${qty}`
      );
      if (badTier.length) {
        throw new Error(
          `glamping_service_tier=standard on ids ${badTier.map((r) => r.id).join(',')}`
        );
      }
    }

    const { rows: lanzarote } = await client.query(
      `SELECT id, property_name, site_name, quantity_of_units, research_status
       FROM all_sage_data
       WHERE property_id = 'fd0942c1-508d-4694-9423-3a1439ff9f3c'
       ORDER BY id`
    );
    console.log('Lanzarote Retreats siblings (expect published, untouched):');
    console.table(lanzarote);

    const { rows: friesland } = await client.query(
      `SELECT id, property_name, city, country, research_status
       FROM all_sage_data
       WHERE id = 11119`
    );
    console.log('Nature Glamping Friesland (expect in_progress, untouched):');
    console.table(friesland);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
