#!/usr/bin/env npx tsx
/**
 * Phase 4: refresh consumers of public.hipcamp / public.campspot.
 *
 * 1. REFRESH MATERIALIZED VIEW public.unified_comps (admin comps, map, Sage AI)
 * 2. Invalidate Upstash facets cache for /admin/comps
 * 3. Recompute campspot_rv_overview_cache (RV Industry Overview)
 *
 * Usage:
 *   npm run refresh:downstream
 *   npm run refresh:downstream -- --dry-run
 *   npm run refresh:downstream -- --only=unified_comps
 *   npm run refresh:downstream -- --skip-rv-overview
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { closeSupabaseDirectPool } from '../../lib/supabase-direct-db';
import {
  executeDownstreamRefresh,
  type DownstreamStep,
} from './execute-downstream-refresh';

config({ path: resolve(process.cwd(), '.env.local') });

function parseSteps(argv: string[]): DownstreamStep[] {
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const defaultSteps: DownstreamStep[] = ['unified_comps', 'facets_cache', 'rv_overview'];

  let steps = [...defaultSteps];
  if (argv.includes('--skip-unified-comps')) {
    steps = steps.filter((s) => s !== 'unified_comps');
  }
  if (argv.includes('--skip-facets-cache')) {
    steps = steps.filter((s) => s !== 'facets_cache');
  }
  if (argv.includes('--skip-rv-overview')) {
    steps = steps.filter((s) => s !== 'rv_overview');
  }

  if (onlyArg) {
    const raw = onlyArg
      .slice(7)
      .split(',')
      .map((s) => s.trim()) as DownstreamStep[];
    const valid: DownstreamStep[] = [];
    for (const s of raw) {
      if (s === 'unified_comps' || s === 'facets_cache' || s === 'rv_overview') {
        valid.push(s);
      }
    }
    if (valid.length === 0) {
      throw new Error('--only must list unified_comps, facets_cache, and/or rv_overview');
    }
    steps = valid;
  }

  if (steps.length === 0) {
    throw new Error('No downstream steps selected');
  }
  return steps;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const steps = parseSteps(argv);

  console.log('Phase 4 downstream refresh');
  console.log(`  steps: ${steps.join(', ')}`);
  console.log(`  dry-run: ${dryRun}\n`);

  const result = await executeDownstreamRefresh({
    steps,
    dryRun,
    triggerSource: 'npm run refresh:downstream',
  });

  await closeSupabaseDirectPool();

  if (result.status === 'failed') {
    const failed = result.steps.filter((s) => s.status === 'failed');
    console.error('\nDownstream refresh failed:');
    for (const s of failed) console.error(`  - ${s.step}: ${s.error}`);
    process.exit(1);
  }

  console.log(`\nDone (${result.status}).`);
  if (result.runId != null) {
    console.log(`  Audit: downstream_refresh_runs id=${result.runId}`);
  }
  console.log(
    '  Note: Next.js tag rv-industry-overview revalidates on deploy or POST /api/admin/rv-industry-overview/refresh-cache'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
