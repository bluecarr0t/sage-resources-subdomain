#!/usr/bin/env npx tsx
/**
 * Publish / reject the remaining in-progress screenshot properties (2026-09-04 batch 20).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-batch20-2026-09-04.ts
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
    name: 'Reject screenshot batch20 ghosts',
    file: 'reject-screenshot-batch20-ghosts-2026-09-04.sql',
    where: `id IN (11228, 11087, 11074, 11103)`,
  },
  {
    name: 'Publish screenshot batch20 operators',
    file: 'enrich-screenshot-batch20-2026-09-04.sql',
    where: `id IN (10963, 10975, 13061, 11166, 11207, 11101, 11258, 11259, 11057)`,
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
        'utf8'
      );
      await client.query(sql);
      const { rows } = await client.query(
        `SELECT id, property_name, site_name, unit_type, quantity_of_units,
                property_total_sites, is_open, is_glamping_property,
                research_status, property_type, city, state, country,
                phone_number, rate_basis, rate_summer_weekday,
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

    const { rows: untouched } = await client.query(
      `SELECT id, property_name, city, research_status
       FROM all_sage_data
       WHERE id IN (11094, 10968, 13124, 11044, 11083, 11042, 11121, 11117, 11082)
       ORDER BY id`
    );
    console.log(
      'Expect untouched (batch19 + La Piantata + Glampingspot siblings + Veluwe):'
    );
    console.table(untouched);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
