#!/usr/bin/env npx tsx
/**
 * Publish / reject the remaining in-progress screenshot properties (2026-09-04 batch 21).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-batch21-2026-09-04.ts
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
    name: 'Reject screenshot batch21 ghosts',
    file: 'reject-screenshot-batch21-ghosts-2026-09-04.sql',
    where: `id IN (76, 11120, 62, 10986)`,
  },
  {
    name: 'Publish screenshot batch21 operators',
    file: 'enrich-screenshot-batch21-2026-09-04.sql',
    where: `id IN (11244, 11088, 13067, 11234, 11180, 13049, 11296, 11022, 11086, 11224, 11200, 11084, 11252)`,
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

    const { rows: seasonal } = await client.query(
      `SELECT id, property_name, rate_winter_weekday, rate_summer_weekday, rate_fall_weekday
       FROM all_sage_data
       WHERE id IN (13049, 11252)
       ORDER BY id`
    );
    console.log('Seasonal rates (Flora Bora + Quiet Site):');
    console.table(seasonal);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
