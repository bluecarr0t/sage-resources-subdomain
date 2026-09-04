#!/usr/bin/env npx tsx
/**
 * Recode 23 published lodge/ranch-primary properties to Ranch & Lodge.
 *
 * Usage:
 *   npx tsx scripts/apply-published-ranch-lodge-reclass-2026-09-04.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const NAMES = [
  'Alpine Lakes Lodge',
  'Bear Creek Lodge McCall',
  'Cathedral Lakes Lodge',
  'Firefall Ranch',
  'Lone Mountain Ranch',
  'Lost Creek Ranch & Spa',
  'Marble Mountain Ranch',
  'Paulina Lake Lodge',
  'Redfish Lake Lodge',
  'Sandy Valley Ranch',
  'Shore Lodge',
  'Sierra Mountain Lodge',
  'Sorrel River Ranch Resort & Spa',
  'Sylvan Dale Guest Ranch',
  'Teton Springs Lodge & Spa',
  'The Hideout Lodge & Guest Ranch',
  'The Lodge and Spa at Brush Creek Ranch',
  'The Lodge at Buckberry Creek',
  'The Lodge at Pico Bonito',
  'The Lodge on Little St. Simons Island',
  'The Ranch at Rock Creek',
  'Triple Creek Ranch',
  'Vista Verde Guest Ranch',
] as const;

const MIGRATION_SQL = readFileSync(
  resolve(
    process.cwd(),
    'scripts/migrations/reclass-published-ranch-lodge-2026-09-04.sql'
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
    const result = await client.query(MIGRATION_SQL);
    const { rows } = await client.query(
      `SELECT TRIM(property_name) AS property_name,
              COUNT(*) AS rows,
              COUNT(*) FILTER (WHERE research_status = 'published') AS published_rows,
              ARRAY_TO_STRING(ARRAY_AGG(DISTINCT COALESCE(property_type, '')), ', ') AS types,
              ARRAY_TO_STRING(ARRAY_AGG(DISTINCT COALESCE(is_glamping_property, '')), ', ') AS glamping
       FROM all_sage_data
       WHERE TRIM(property_name) = ANY($1::text[])
       GROUP BY 1
       ORDER BY 1`,
      [NAMES]
    );
    console.log(`✓ Ranch & Lodge reclass applied (rowCount=${result.rowCount ?? 0})`);
    console.table(rows);
    const offType = rows.filter((r) => r.types !== 'Ranch & Lodge');
    const stillGlamping = rows.filter((r) => r.glamping !== 'No');
    if (rows.length !== NAMES.length) {
      console.error(`Expected ${NAMES.length} properties, got ${rows.length}`);
      process.exit(1);
    }
    if (offType.length > 0 || stillGlamping.length > 0) {
      console.error('Some properties did not recode as expected');
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
