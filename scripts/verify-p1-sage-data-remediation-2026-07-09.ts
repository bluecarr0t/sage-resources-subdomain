#!/usr/bin/env npx tsx
/**
 * Post-P1 verification checks for all_sage_data data quality remediation.
 *
 * Run:
 *   npx tsx scripts/verify-p1-sage-data-remediation-2026-07-09.ts
 *   npx tsx scripts/verify-p1-sage-data-remediation-2026-07-09.ts --refresh-comps
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';
import { execSync } from 'child_process';

config({ path: resolve(process.cwd(), '.env.local') });

const CHECKS: Array<{ label: string; sql: string; expect?: string }> = [
  {
    label: 'Conflicting property_total_sites per property_id',
    sql: `SELECT COUNT(*)::int AS cnt FROM (
      SELECT 1 FROM public.all_sage_data
      WHERE property_id IS NOT NULL AND btrim(property_id::text) <> ''
      GROUP BY property_id
      HAVING COUNT(DISTINCT property_total_sites) FILTER (
        WHERE property_total_sites IS NOT NULL AND btrim(property_total_sites::text) <> ''
      ) > 1
    ) s`,
    expect: '0',
  },
  {
    label: 'Exact 5-tuple duplicate groups',
    sql: `SELECT COUNT(*)::int AS cnt FROM (
      SELECT 1 FROM public.all_sage_data
      WHERE property_name IS NOT NULL AND btrim(property_name) <> ''
      GROUP BY
        lower(btrim(property_name)),
        lower(btrim(coalesce(city,''))),
        lower(btrim(coalesce(state,''))),
        lower(btrim(coalesce(unit_type,''))),
        lower(btrim(coalesce(site_name,'')))
      HAVING COUNT(*) > 1
    ) s`,
    expect: '0',
  },
  {
    label: 'Slug drift per property_id',
    sql: `SELECT COUNT(*)::int AS cnt FROM (
      SELECT 1 FROM public.all_sage_data
      WHERE property_id IS NOT NULL AND btrim(property_id::text) <> ''
        AND slug IS NOT NULL AND btrim(slug) <> ''
      GROUP BY property_id
      HAVING COUNT(DISTINCT slug) > 1
    ) s`,
    expect: '0',
  },
  {
    label: 'Published rows with google_place_id',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.all_sage_data
      WHERE lower(trim(coalesce(research_status,''))) = 'published'
        AND google_place_id IS NOT NULL AND btrim(google_place_id) <> ''`,
  },
  {
    label: 'Published anchor rows (list view)',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.all_sage_data_list_anchors
      WHERE lower(trim(coalesce(research_status,''))) = 'published'`,
  },
  {
    label: 'Published anchors with brand_id',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.all_sage_data_list_anchors
      WHERE lower(trim(coalesce(research_status,''))) = 'published'
        AND brand_id IS NOT NULL`,
  },
  {
    label: 'Total rows with google_place_id',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.all_sage_data
      WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> ''`,
  },
  {
    label: 'Published open glamping rows',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.all_sage_data
      WHERE lower(trim(coalesce(research_status,''))) = 'published'
        AND lower(trim(coalesce(is_open,''))) = 'yes'
        AND lower(trim(coalesce(is_glamping_property,''))) = 'yes'`,
  },
  {
    label: 'Published open glamping with positive ADR',
    sql: `SELECT COUNT(*)::int AS cnt FROM public.all_sage_data
      WHERE lower(trim(coalesce(research_status,''))) = 'published'
        AND lower(trim(coalesce(is_open,''))) = 'yes'
        AND lower(trim(coalesce(is_glamping_property,''))) = 'yes'
        AND rate_avg_retail_daily_rate IS NOT NULL
        AND rate_avg_retail_daily_rate::numeric > 0`,
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
    console.log('\n=== P1 all_sage_data verification ===\n');

    let publishedAnchors = 0;
    let publishedWithBrand = 0;
    let publishedWithPlaceId = 0;
    let publishedOpenGlamping = 0;
    let publishedOpenWithAdr = 0;

    for (const check of CHECKS) {
      const { rows } = await client.query<{ cnt: number }>(check.sql);
      const cnt = rows[0]?.cnt ?? 0;
      const ok = check.expect == null || String(cnt) === check.expect;
      if (!ok) failed += 1;

      if (check.label.includes('Published anchor rows')) publishedAnchors = cnt;
      if (check.label.includes('Published anchors with brand_id')) {
        publishedWithBrand = cnt;
      }
      if (check.label.includes('Published rows with google_place_id')) {
        publishedWithPlaceId = cnt;
      }
      if (check.label === 'Published open glamping rows') {
        publishedOpenGlamping = cnt;
      }
      if (check.label.includes('Published open glamping with positive ADR')) {
        publishedOpenWithAdr = cnt;
      }

      const status = ok ? 'PASS' : 'FAIL';
      const expectStr = check.expect != null ? ` (expect ${check.expect})` : '';
      console.log(`${status}  ${check.label}: ${cnt}${expectStr}`);
    }

    if (publishedAnchors > 0) {
      const brandPct = ((publishedWithBrand / publishedAnchors) * 100).toFixed(1);
      const placePct = ((publishedWithPlaceId / publishedAnchors) * 100).toFixed(1);
      console.log(`\nPublished brand_id coverage: ${brandPct}% (${publishedWithBrand}/${publishedAnchors})`);
      console.log(`Published google_place_id coverage: ${placePct}% (${publishedWithPlaceId}/${publishedAnchors})`);
      if (publishedWithBrand / publishedAnchors < 0.5) {
        console.log('WARN  Published brand_id coverage below 50% target');
      }
    }

    if (publishedOpenGlamping > 0) {
      const adrPct = ((publishedOpenWithAdr / publishedOpenGlamping) * 100).toFixed(1);
      console.log(
        `Published open glamping ADR coverage: ${adrPct}% (${publishedOpenWithAdr}/${publishedOpenGlamping})`
      );
      if (publishedOpenWithAdr / publishedOpenGlamping < 0.9) {
        console.log('WARN  Published open glamping ADR coverage below 90% target');
      }
    }

    if (refreshComps) {
      console.log('\nRefreshing unified_comps…');
      execSync('npm run refresh:unified-comps', { stdio: 'inherit' });
    }

    console.log(failed === 0 ? '\nAll strict checks passed.' : `\n${failed} check(s) failed.`);
    process.exit(failed === 0 ? 0 : 1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
