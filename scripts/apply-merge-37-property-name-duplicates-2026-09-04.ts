#!/usr/bin/env npx tsx
/**
 * Merge 37 flagged property-name duplicate clusters.
 *
 * Usage:
 *   npx tsx scripts/apply-merge-37-property-name-duplicates-2026-09-04.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const KEEP_NAMES = [
  'The Look RV Resort',
  'Treehouse Point',
  'Asheville River Cabins',
  'Camp V',
  'UDOSCAPE',
  'Jellystone Park Bremen',
  'Lakedale',
  'Costanoa',
  'Zion Ponderosa Ranch Resort',
  'Conestoga Ranch',
  'Camp Long Creek',
  'The Fields of Michigan',
  'Boyne Mountain Resort Glamping Cabins',
  'The Sequoia High Sierra Camp',
  'The Resort at Paws Up',
  'Siwash Lake Wilderness Resort & Ranch',
  'The Destination',
  'Ventana Big Sur',
  'Firelight Camps',
  'Clayoquot Wilderness Lodge',
  'Fforest',
  'Aterra',
  'De Wije Werelt',
  'Glamping Jungfrau',
  'Camping & Glamping Allweglehen',
  'Canonici di San Marco',
  'Your Nature',
  'Warredal',
  'Longlands',
  'Monument Glamping',
  'Forest Days',
  'Wonder Inn Resort',
  'Nutchel Cosy Cabins',
  'Camping- und Ferienpark Wulfener Hals',
  'Camping De Zeeuwse Kust',
  'Frost Mountain Yurts',
  'Timberline Glamping at Lake Lanier River Forks',
] as const;

const GONE_NAMES = [
  'Ashevile River Cabins',
  'TreeHouse Point',
  'CampV',
  'Udoscape Eco-Glamping Resort',
  'Jellystone Park Camp-Resort in Bremen',
  'Lakedale Resort',
  'Costanoa Lodge',
  'Zion Ponderosa',
  'Conestoga Ranch Glamping Resort',
  'Camp Long Creek at Big Cedar Lodge',
  'The Fields',
  'Boyne Mountain Resort',
  'Sequoia High Sierra Camp',
  'Paws Up Montana',
  'Siwash Lake',
  'The Destination Glamping Resort',
  'Ventana Big Sur, an Alila Resort',
  'Ithaca by Firelight Camp',
  'Clayoquot Wilderness Resort',
  'Fforest Farm',
  'Aterra Eco Camping',
  'Glamping De Wije Werelt',
  'Camping Jungfrau',
  'Camping Jungfrau Holiday Park',
  'Camping Resort Allweglehen',
  'Glamping Canonici di San Marco',
  'Your Nature Resort',
  'Warredal Forest Camp',
  'Longlands Glamping',
  'Glamping at Longlands',
  'Glamping Tent',
  'Forest Days Glamping',
  'Wonder Inn',
  'Nutchel',
  'Nutchel Cosy Cabins Ardennes',
  'Nutchel Forest Camp',
  'Glamping Village Wulfener Hals',
  'Glamping De Zeeuwse Kust',
  'The Yurt Village at Frost Mountain',
  'Timberline Glamping at Lake Lanier',
] as const;

const MIGRATION_SQL = readFileSync(
  resolve(
    process.cwd(),
    'scripts/migrations/merge-37-property-name-duplicates-2026-09-04.sql'
  ),
  'utf-8'
);

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required. Add it to .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    await client.query(MIGRATION_SQL);

    const { rows: kept } = await client.query(
      `SELECT TRIM(property_name) AS property_name,
              COUNT(*) AS rows,
              COUNT(DISTINCT property_id) AS property_ids
       FROM all_sage_data
       WHERE TRIM(property_name) = ANY($1::text[])
       GROUP BY 1
       ORDER BY 1`,
      [KEEP_NAMES]
    );
    const { rows: leftover } = await client.query(
      `SELECT TRIM(property_name) AS property_name, COUNT(*) AS rows
       FROM all_sage_data
       WHERE TRIM(property_name) = ANY($1::text[])
       GROUP BY 1
       ORDER BY 1`,
      [GONE_NAMES]
    );

    console.log(`✓ 37-name merge applied. Keep names present: ${kept.length}/${KEEP_NAMES.length}`);
    console.table(kept);
    if (leftover.length > 0) {
      console.error('Alias names still present:');
      console.table(leftover);
      process.exit(1);
    }
    const missing = KEEP_NAMES.filter((n) => !kept.some((r) => r.property_name === n));
    const split = kept.filter((r) => Number(r.property_ids) !== 1);
    if (missing.length > 0 || split.length > 0) {
      console.error({ missing, split });
      process.exit(1);
    }
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
