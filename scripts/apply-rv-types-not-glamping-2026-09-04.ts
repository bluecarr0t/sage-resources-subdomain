#!/usr/bin/env npx tsx
/**
 * Set is_glamping_property = No for every RV Resort / RV Park row.
 *
 * Usage:
 *   npx tsx scripts/apply-rv-types-not-glamping-2026-09-04.ts
 *
 * Requires SUPABASE_DB_URL in .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATION_SQL = readFileSync(
  resolve(process.cwd(), 'scripts/migrations/set-rv-types-not-glamping-2026-09-04.sql'),
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
    const { rows } = await client.query(
      `SELECT property_type,
              COALESCE(is_glamping_property, '(null)') AS glamping,
              COUNT(*) AS rows,
              COUNT(DISTINCT property_id) AS properties
       FROM all_sage_data
       WHERE property_type IN ('RV Resort', 'RV Park')
       GROUP BY 1, 2
       ORDER BY 1, 2`
    );
    console.log('✓ RV Resort / RV Park glamping flag set to No');
    console.table(rows);
    const stillYes = rows.filter((r) => r.glamping !== 'No');
    if (stillYes.length > 0) {
      console.error('Some RV Resort / RV Park rows are still not No');
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
