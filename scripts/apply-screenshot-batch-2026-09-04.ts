#!/usr/bin/env npx tsx
/**
 * Publish / reject the 21 in-progress screenshot properties (2026-09-04).
 *
 * Usage:
 *   npx tsx scripts/apply-screenshot-batch-2026-09-04.ts
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
    name: 'Reject screenshot ghosts',
    file: 'reject-screenshot-ghosts-2026-09-04.sql',
    where: `id IN (11141, 11102, 11213, 49, 61, 105, 106, 10981)`,
  },
  {
    name: 'Log House Holidays',
    file: 'enrich-log-house-holidays-2026-09-04.sql',
    where: `property_id = 'c514a453-77b6-45f5-b8ef-d92816a68865'`,
  },
  {
    name: 'Harvest Moon Holidays',
    file: 'enrich-harvest-moon-holidays-2026-09-04.sql',
    where: `property_id = '91d8006a-c6e9-4c74-8ec4-ca7b7929a8ac'`,
  },
  {
    name: 'Living Room + Lanrick',
    file: 'enrich-living-room-lanrick-2026-09-04.sql',
    where: `id IN (11284, 11286)`,
  },
  {
    name: 'Island Beach + EKÖ',
    file: 'enrich-island-beach-eko-2026-09-04.sql',
    where: `property_id IN ('11988caa-9154-47a0-9f6a-6f58d26eba57','e3fca711-a1f7-4755-8c24-37652640a7e2')`,
  },
  {
    name: 'Foz do Arelho',
    file: 'enrich-foz-do-arelho-2026-09-04.sql',
    where: `property_id = '0b467f81-63ad-43a8-9643-7cae2fa2ef80'`,
  },
  {
    name: 'Alpujarra Camping',
    file: 'enrich-alpujarra-camping-2026-09-04.sql',
    where: `property_id = '688c9e8b-8d90-4893-ab24-a1ec92048e94'`,
  },
  {
    name: 'Mount Engadine Lodge',
    file: 'enrich-mount-engadine-lodge-2026-09-04.sql',
    where: `property_id = '33387855-ffc9-4b5c-a51c-52c18c93b495'`,
  },
  {
    name: 'German Baumhaushotels',
    file: 'enrich-baumhaus-germany-2026-09-04.sql',
    where: `property_id IN ('329da681-9864-43aa-b1e0-29ed53c45464','40279bf4-a620-4ec1-acbb-a19b0aa05b67','5e052193-7efc-4ea7-9b73-24eec2cf5774')`,
  },
  {
    name: 'Palmaïa',
    file: 'enrich-boomkamp-palmaia-2026-09-04.sql',
    where: `property_id = '3fd0c119-c0b4-4ed7-a956-8979a5b2b5da'`,
  },
  {
    name: 'Patch confirmed seasonal rates',
    file: 'patch-screenshot-batch-rates-2026-09-04.sql',
    where: `id IN (11263, 13333, 13334, 13032, 11197, 11003, 142) OR (property_id = '40279bf4-a620-4ec1-acbb-a19b0aa05b67' AND site_name = 'See-Lodge')`,
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
      console.log(`✓ ${m.name}`);
      console.table(rows);
      console.log(
        `  published=${published.length} rejected=${rejected.length} qty_sum=${qty} type=${published[0]?.property_type ?? rejected[0]?.property_type} rate_basis=${published[0]?.rate_basis ?? ''}`
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
