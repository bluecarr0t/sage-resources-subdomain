#!/usr/bin/env npx tsx
/**
 * Post-P0 verification queries + optional unified_comps refresh.
 *
 * Run:
 *   npx tsx scripts/verify-p0-sage-data-remediation-2026-07-09.ts
 *   npx tsx scripts/verify-p0-sage-data-remediation-2026-07-09.ts --refresh-comps
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';
import { execSync } from 'child_process';

config({ path: resolve(process.cwd(), '.env.local') });

const CHECKS: Array<{ label: string; sql: string; expect?: string }> = [
  {
    label: 'Fragmented property_id groups (name+city+state)',
    sql: `SELECT COUNT(*)::int AS cnt FROM (
      SELECT 1 FROM public.all_sage_data
      WHERE property_name IS NOT NULL AND btrim(property_name) <> ''
      GROUP BY lower(btrim(property_name)), lower(btrim(coalesce(city,''))), lower(btrim(coalesce(state,'')))
      HAVING COUNT(DISTINCT property_id) > 1
    ) s`,
    expect: '0',
  },
  {
    label: 'Published + non-Yes is_open rows',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.all_sage_data
      WHERE lower(trim(coalesce(research_status,''))) = 'published'
        AND lower(trim(coalesce(is_open,''))) <> 'yes'`,
    expect: '0',
  },
  {
    label: 'property_geocode rows',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.property_geocode`,
  },
  {
    label: 'property_embeddings rows',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.property_embeddings`,
  },
  {
    label: 'List anchor count',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.all_sage_data_list_anchors`,
  },
  {
    label: 'Douglas Lake Ranch distinct property_ids',
    sql: `SELECT COUNT(DISTINCT property_id)::int AS cnt FROM public.all_sage_data
      WHERE lower(btrim(property_name)) LIKE '%douglas lake ranch%'`,
    expect: '1',
  },
  {
    label: 'Westgate River Ranch distinct property_ids',
    sql: `SELECT COUNT(DISTINCT property_id)::int AS cnt FROM public.all_sage_data
      WHERE lower(btrim(property_name)) LIKE '%westgate river ranch%'`,
    expect: '1',
  },
  {
    label: 'Bliss Camps distinct property_ids (Lyons CO)',
    sql: `SELECT COUNT(DISTINCT property_id)::int AS cnt FROM public.all_sage_data
      WHERE lower(btrim(property_name)) LIKE '%bliss camps%'
        AND lower(btrim(coalesce(city,''))) = 'lyons'
        AND lower(btrim(coalesce(state,''))) = 'co'`,
    expect: '1',
  },
];

async function main() {
  const refreshComps = process.argv.includes('--refresh-comps');
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('SUPABASE_DB_URL is required in .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  let failed = 0;

  try {
    await client.connect();
    console.log('\n=== P0 verification ===\n');

    for (const check of CHECKS) {
      const { rows } = await client.query(check.sql);
      const value = String((rows[0] as { cnt: number }).cnt);
      const ok = check.expect == null || value === check.expect;
      if (!ok) failed += 1;
      const status = ok ? 'OK' : 'FAIL';
      const expectSuffix = check.expect != null ? ` (expected ${check.expect})` : '';
      console.log(`${status}  ${check.label}: ${value}${expectSuffix}`);
    }

    const proximity = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM public.properties_within_radius(37.7749, -122.4194, 80, 5)`
    );
    const proxCnt = (proximity.rows[0] as { cnt: number }).cnt;
    console.log(`${proxCnt > 0 ? 'OK' : 'WARN'}  properties_within_radius(SF, 80km, 5): ${proxCnt} rows`);

    if (refreshComps) {
      console.log('\nRefreshing unified_comps...');
      execSync('npm run refresh:unified-comps', {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
    }
  } finally {
    await client.end();
  }

  if (failed > 0) {
    console.error(`\n${failed} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll expected checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
