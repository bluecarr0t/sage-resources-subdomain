#!/usr/bin/env npx tsx
/**
 * Compare RV Industry Overview data paths: Postgres snapshot vs full campspot scan.
 *
 * Usage:
 *   npx tsx scripts/benchmark-rv-industry-overview.ts           # snapshot + metadata (fast)
 *   npx tsx scripts/benchmark-rv-industry-overview.ts --full-scan  # also time full table scan (slow)
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { performance } from 'perf_hooks';
import { createServerClient } from '../lib/supabase';
import { fetchCampspotRvOverviewPageDataUncached } from '../lib/rv-industry-overview/campspot-rv-overview-page-data';
import {
  CAMPSPOT_RV_OVERVIEW_PAGE_SIZE,
  CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES,
} from '../lib/rv-industry-overview/campspot-fetch-cap';

config({ path: resolve(process.cwd(), '.env.local') });

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

async function main() {
  const fullScan = process.argv.includes('--full-scan');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    console.error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local — cannot benchmark.'
    );
    process.exit(1);
  }

  const supabase = createServerClient();

  console.log('RV Industry Overview — performance benchmark\n');
  console.log(
    `Config: page_size=${CAMPSPOT_RV_OVERVIEW_PAGE_SIZE}, parallel_pages=${CAMPSPOT_RV_OVERVIEW_PARALLEL_PAGES}\n`
  );

  // --- Snapshot read (same table as migration) ---
  const snapTimes: number[] = [];
  let rowsInSnapshot: number | null = null;
  let payloadKb = 0;
  let computedAt: string | null = null;

  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const { data, error } = await supabase
      .from('campspot_rv_overview_cache')
      .select('payload, rows_scanned, computed_at')
      .eq('id', 1)
      .maybeSingle();
    const t1 = performance.now();
    snapTimes.push(t1 - t0);

    if (error) {
      const msg =
        error instanceof Error
          ? error.message
          : typeof error === 'object' && error !== null
            ? JSON.stringify(error)
            : String(error);
      console.error('Postgres snapshot read error:', msg);
      if (msg.includes('fetch') || msg.includes('network')) {
        console.error('(Check network/VPN and NEXT_PUBLIC_SUPABASE_URL.)');
      }
      process.exit(1);
    }
    if (!data?.payload) {
      if (i === 0) {
        console.log('No row in campspot_rv_overview_cache (id=1).');
        console.log(
          'Run POST /api/admin/rv-industry-overview/refresh-cache or load the admin page once to backfill.\n'
        );
        rowsInSnapshot = null;
      }
      break;
    }
    if (i === 0) {
      rowsInSnapshot = data.rows_scanned;
      computedAt = data.computed_at ?? null;
      try {
        payloadKb = Buffer.byteLength(JSON.stringify(data.payload), 'utf8') / 1024;
      } catch {
        payloadKb = 0;
      }
    }
  }

  const snapSorted = [...snapTimes].sort((a, b) => a - b);
  const snapMedian = snapSorted.length ? snapSorted[Math.floor(snapSorted.length / 2)]! : 0;
  const snapMin = snapSorted.length ? snapSorted[0]! : 0;
  const snapMax = snapSorted.length ? snapSorted[snapSorted.length - 1]! : 0;

  console.log('\n--- Postgres snapshot (SELECT id=1) ---');
  if (rowsInSnapshot != null) {
    if (computedAt) console.log(`  computed_at: ${computedAt}`);
    console.log(`  rows_scanned (stored): ${rowsInSnapshot}`);
    console.log(`  payload size (approx): ${payloadKb.toFixed(1)} KiB JSON`);
    console.log(`  5× read: min ${fmtMs(snapMin)} / median ${fmtMs(snapMedian)} / max ${fmtMs(snapMax)}`);
  } else {
    console.log('  (skipped — no snapshot row)');
  }

  // --- Full scan (optional) ---
  if (fullScan) {
    console.log('\n--- Full campspot scan + fold (fetchCampspotRvOverviewPageDataUncached) ---');
    console.log('  (this can take minutes on large tables)\n');
    const t0 = performance.now();
    const result = await fetchCampspotRvOverviewPageDataUncached(supabase);
    const t1 = performance.now();
    const elapsed = t1 - t0;
    console.log(`  wall time: ${fmtMs(elapsed)}`);
    console.log(`  rows scanned: ${result.mapResult.rowsScanned}`);
    console.log(`  map error: ${result.mapResult.error ?? 'none'}`);

    if (rowsInSnapshot != null && elapsed > 0) {
      const ratio = elapsed / snapMedian;
      console.log(`\n  vs snapshot median: ~${ratio.toFixed(0)}× slower (scan ${fmtMs(elapsed)} vs snapshot ${fmtMs(snapMedian)})`);
    }
  } else {
    console.log('\n--- Full scan ---');
    console.log('  Skipped (pass --full-scan to time full campspot aggregation).');
    if (rowsInSnapshot != null && snapMedian > 0) {
      console.log(`\n  With a warm snapshot, server work is ~${fmtMs(snapMedian)} of DB I/O + JSON parse instead of scanning ${rowsInSnapshot} campspot rows.`);
    }
  }

  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
