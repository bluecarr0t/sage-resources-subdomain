#!/usr/bin/env npx tsx
/**
 * Resolve the 11 Review property-name clusters.
 *
 * Usage:
 *   npx tsx scripts/apply-resolve-11-review-name-duplicates-2026-09-04.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(
    process.cwd(),
    'scripts/migrations/resolve-11-review-name-duplicates-2026-09-04.sql'
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

    const { rows: charmed } = await client.query(
      `SELECT TRIM(property_name) AS property_name, property_id::text, city
       FROM all_sage_data
       WHERE property_name ILIKE 'Charmed Resorts%'
       GROUP BY 1, 2, 3
       ORDER BY 1`
    );
    const { rows: gone } = await client.query(
      `SELECT TRIM(property_name) AS leftover
       FROM all_sage_data
       WHERE TRIM(property_name) IN (
         'Hilo Glamping Yurt',
         'Bel Air Tremblant',
         'Marmora Retreat (expansion)',
         'Ipfun',
         'Ecochique Glamping',
         'Glamping Ecochique'
       )
       GROUP BY 1`
    );

    console.log('✓ Review-11 resolution applied');
    console.table(charmed);
    if (gone.length > 0) {
      console.error('Alias names still present', gone);
      process.exit(1);
    }
    if (charmed.length !== 2 || charmed[0].property_id === charmed[1].property_id) {
      console.error('Charmed split failed', charmed);
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
