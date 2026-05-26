#!/usr/bin/env npx tsx
/**
 * Snapshot campings matviews (latest_sites, site_monthly_analytics) to Supabase tables.
 * Also run automatically by npm run transform:flat-sites.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { closeSupabaseDirectPool, getSupabaseDirectPool } from '../../lib/supabase-direct-db';
import { syncCampingsMatviewSnapshots } from './matview-snapshot';

config({ path: resolve(process.cwd(), '.env.local') });

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const pool = getSupabaseDirectPool();
  const client = await pool.connect();
  try {
    const results = await syncCampingsMatviewSnapshots({ supabaseClient: client, dryRun });
    console.log('\nMatview snapshot summary:');
    for (const r of results) {
      console.log(`  ${r.name}: ${r.exported} exported, ${r.upserted} upserted`);
    }
  } finally {
    client.release();
    await closeSupabaseDirectPool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
