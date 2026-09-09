#!/usr/bin/env npx tsx
/**
 * Publish / reject the 18 in-progress screenshot properties (2026-09-04 batch 18).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-batch18-2026-09-04.ts
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
    name: 'Reject screenshot batch18 ghosts',
    file: 'reject-screenshot-batch18-ghosts-2026-09-04.sql',
    where: `id IN (12948, 167, 98, 169, 51, 156, 94, 171, 122, 158, 99, 148, 136, 86)`,
  },
  {
    name: 'Publish screenshot batch18 operators',
    file: 'enrich-screenshot-batch18-2026-09-04.sql',
    where: `id IN (11278, 11211, 11443, 11442)`,
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

    const { rows: untouched } = await client.query(
      `SELECT id, property_name, city, research_status, unit_type, quantity_of_units
       FROM all_sage_data
       WHERE id IN (10018, 10498, 11348, 10744, 10751, 159)
       ORDER BY id`
    );
    console.log(
      'Expect untouched (Eastwind Windham published/rejected, Glamping Resorts, Hobbit Haven Mazunte):'
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
