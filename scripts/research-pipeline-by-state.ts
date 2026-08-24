#!/usr/bin/env npx tsx
/**
 * State/province-scoped glamping pipeline research (Proposed / Under Construction).
 *
 * Usage:
 *   npx tsx scripts/research-pipeline-by-state.ts --state TX
 *   npx tsx scripts/research-pipeline-by-state.ts --state QC --country Canada
 *   npx tsx scripts/research-pipeline-by-state.ts --priority 0 --dry-run
 *   npx tsx scripts/research-pipeline-by-state.ts --states TX,FL,NC --dry-run
 *   npx tsx scripts/research-pipeline-by-state.ts --all-states --skip-covered
 *   npx tsx scripts/research-pipeline-by-state.ts --all-provinces --skip-covered
 *
 * Inserts use research_status = in_progress.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import type { PipelineCountry } from '../lib/glamping-pipeline/constants';
import { runRegionPipelineSync } from '../lib/glamping-pipeline/run-region-sync';
import {
  CA_PIPELINE_REGIONS,
  US_PIPELINE_REGIONS,
  findPipelineRegion,
  parsePipelineCountry,
  regionsAtPriority,
  sortRegionsByPriority,
  type PipelineRegion,
} from '../lib/glamping-pipeline/regions';
import { fetchPipelineCoverageSnapshot } from '../lib/glamping-pipeline/state-coverage';
import type { PipelineQueryTier } from '../lib/glamping-pipeline/region-queries';

config({ path: resolve(process.cwd(), '.env.local') });

const args = process.argv.slice(2);

function flag(name: string): boolean {
  return args.includes(name);
}

function opt(name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return undefined;
}

const dryRun = flag('--dry-run');
const force = flag('--force');
const skipCovered = flag('--skip-covered');
const includeRv = flag('--include-rv');
const allStates = flag('--all-states');
const allProvinces = flag('--all-provinces');
const countryArg = parsePipelineCountry(opt('--country')) ?? 'United States';
const stateArg = opt('--state')?.trim().toUpperCase();
const statesArg = opt('--states');
const priorityArg = opt('--priority');
const tiersArg = opt('--tiers');
const limitIdx = args.indexOf('--limit');
const limitPerQuery =
  limitIdx >= 0 && args[limitIdx + 1]
    ? parseInt(args[limitIdx + 1], 10)
    : undefined;

function parseTiers(raw: string | undefined): PipelineQueryTier[] {
  if (!raw) return ['A', 'B'];
  const parts = raw
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is PipelineQueryTier => s === 'A' || s === 'B' || s === 'C');
  return parts.length > 0 ? parts : ['A', 'B'];
}

function parsePriority(raw: string | undefined): number | null {
  if (raw == null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 && n <= 5 ? n : null;
}

async function resolveRegions(
  supabase: ReturnType<typeof createClient>
): Promise<PipelineRegion[]> {
  const selected: PipelineRegion[] = [];

  if (stateArg) {
    const region = findPipelineRegion(countryArg, stateArg);
    if (!region) {
      throw new Error(`Unknown region ${countryArg} ${stateArg}`);
    }
    selected.push(region);
  }

  if (statesArg) {
    for (const code of statesArg.split(',')) {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed) continue;
      const region = findPipelineRegion(countryArg, trimmed);
      if (!region) {
        throw new Error(`Unknown region ${countryArg} ${trimmed}`);
      }
      selected.push(region);
    }
  }

  const priority = parsePriority(priorityArg);
  if (priority != null) {
    const countryFilter: PipelineCountry | 'all' = allProvinces
      ? 'Canada'
      : allStates
        ? 'United States'
        : countryArg;
    selected.push(...regionsAtPriority(countryFilter, priority));
  }

  if (allStates) {
    selected.push(...US_PIPELINE_REGIONS);
  }
  if (allProvinces) {
    selected.push(...CA_PIPELINE_REGIONS);
  }

  const unique = new Map<string, PipelineRegion>();
  for (const region of selected) {
    unique.set(`${region.country}:${region.code}`, region);
  }
  let regions = sortRegionsByPriority([...unique.values()]);

  if (regions.length === 0) {
    throw new Error(
      'Specify --state TX, --states TX,FL, --priority 0, --all-states, or --all-provinces'
    );
  }

  if (skipCovered) {
    const snapshot = await fetchPipelineCoverageSnapshot(supabase);
    const covered = new Set(
      snapshot
        .filter(
          (row) =>
            row.sweepStatus === 'complete' || row.sweepStatus === 'no_projects_found'
        )
        .map((row) => `${row.country}:${row.regionCode}`)
    );
    regions = regions.filter((r) => !covered.has(`${r.country}:${r.code}`));
  }

  return regions;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const tavilyKey = process.env.TAVILY_API_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!openaiApiKey) {
    console.error('Missing OPENAI_API_KEY');
    process.exit(1);
  }
  if (!tavilyKey) {
    console.error('Missing TAVILY_API_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const tiers = parseTiers(tiersArg);
  const regions = await resolveRegions(supabase);

  console.log(
    `Pipeline region sweep${dryRun ? ' (dry run)' : ''}${force ? ' (force)' : ''}: ${regions
      .map((r) => `${r.code} (${r.country})`)
      .join(', ')}`
  );

  let failed = 0;
  for (const region of regions) {
    console.log(`\n=== ${region.name} (${region.code}) ===`);
    const { metrics, error } = await runRegionPipelineSync(supabase, openai, tavilyKey, {
      country: region.country,
      regionCode: region.code,
      dryRun,
      force,
      limitPerQuery,
      tiers,
      includeRv,
    });
    console.log(JSON.stringify(metrics, null, 2));
    if (error) {
      failed++;
      console.error(`Region ${region.code} failed:`, error);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
