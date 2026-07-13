#!/usr/bin/env npx tsx
/**
 * Apply P0 all_sage_data SQL migrations (property_id consolidation + status demotion).
 *
 * Run:
 *   npx tsx scripts/apply-p0-sage-data-migrations-2026-07-09.ts
 *   npx tsx scripts/apply-p0-sage-data-migrations-2026-07-09.ts --only=demote
 *   npx tsx scripts/apply-p0-sage-data-migrations-2026-07-09.ts --only=consolidate
 *
 * Requires SUPABASE_DB_URL in .env.local.
 * After success: npm run refresh:unified-comps
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const MIGRATIONS = {
  consolidate: 'scripts/migrations/consolidate-property-id-fragments-2026-07-09.sql',
  demote: 'scripts/migrations/demote-published-non-operating-2026-07-09.sql',
} as const;

function parseOnlyArg(): Array<keyof typeof MIGRATIONS> {
  const onlyArg = process.argv.find((a) => a.startsWith('--only='));
  if (!onlyArg) return ['consolidate', 'demote'];
  const value = onlyArg.split('=')[1]?.trim();
  if (value === 'consolidate' || value === 'demote') return [value];
  console.error('Invalid --only= value. Use consolidate or demote.');
  process.exit(1);
}

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required in .env.local');
    process.exit(1);
  }

  const steps = parseOnlyArg();
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    for (const step of steps) {
      const file = MIGRATIONS[step];
      const sql = readFileSync(resolve(process.cwd(), file), 'utf-8');
      console.log(`Applying ${file}...`);
      const result = await client.query(sql);
      console.log(`✓ ${file} (rowCount=${result.rowCount ?? 'n/a'})`);
    }
    console.log('\n✓ P0 SQL migrations applied.');
    console.log('  Next: npm run refresh:unified-comps');
    console.log('  Next: npx tsx scripts/backfill-property-geocode.ts');
    console.log('  Next: npx tsx scripts/embed-glamping-properties.ts --anchors-only');
  } catch (err) {
    console.error('Migration failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
