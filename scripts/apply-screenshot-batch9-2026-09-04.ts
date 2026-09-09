#!/usr/bin/env npx tsx
/**
 * Publish / reject the 17 in-progress screenshot properties (2026-09-04 batch 9).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-batch9-2026-09-04.ts
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
    name: 'Reject screenshot batch9 ghosts',
    file: 'reject-screenshot-batch9-ghosts-2026-09-04.sql',
    where: `id IN (44, 126, 11206)`,
  },
  {
    name: 'Canada domes',
    file: 'enrich-canada-domes-batch9-2026-09-04.sql',
    where: `id IN (13051, 13036, 13074, 13035, 13066, 13073)`,
  },
  {
    name: 'Acre + Bois Dormant + Chattanooga + Serenity',
    file: 'enrich-acre-bois-chattanooga-serenity-2026-09-04.sql',
    where: `id IN (27, 10977, 13082, 20)`,
  },
  {
    name: 'Trübsee + Trout Point + Jimera + Zenses',
    file: 'enrich-trubsee-trout-jimera-zenses-2026-09-04.sql',
    where: `id IN (11222, 17, 11179, 141)`,
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

    const { rows: sibling } = await client.query(
      `SELECT id, property_name, city, country, research_status
       FROM all_sage_data
       WHERE property_id = 'c4b9e669-a094-4de5-8c17-b8041d18948a'
       ORDER BY id`
    );
    console.log('Glamping Collective Clyde siblings (expect published, untouched):');
    console.table(sibling);
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
