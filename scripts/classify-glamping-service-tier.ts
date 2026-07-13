#!/usr/bin/env npx tsx
/**
 * Classify glamping service tier (luxury / upscale / midscale / rustic) per property_id.
 *
 * Usage:
 *   npx tsx scripts/classify-glamping-service-tier.ts --dry-run
 *   npx tsx scripts/classify-glamping-service-tier.ts
 *   npx tsx scripts/classify-glamping-service-tier.ts --limit 50
 *
 * Skips properties where any row has glamping_service_tier_source = 'manual'.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  computeGlampingServiceTierFromRows,
  type GlampingServiceTier,
  type GlampingServiceTierRowInput,
} from '@/lib/glamping-service-tier';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLE = 'all_sage_data';
const PAGE_SIZE = 1000;

const SELECT_COLS = [
  'id',
  'property_id',
  'property_name',
  'city',
  'state',
  'glamping_service_tier',
  'glamping_service_tier_source',
  'unit_private_bathroom',
  'unit_air_conditioning',
  'unit_hot_tub',
  'property_hot_tub',
  'property_restaurant',
  'property_food_on_site',
  'property_pool',
  'property_sauna',
  'rate_avg_retail_daily_rate',
  'is_glamping_property',
  'research_status',
].join(', ');

type Row = GlampingServiceTierRowInput & {
  id: number;
  property_id: string | null;
  property_name: string | null;
  city: string | null;
  state: string | null;
  glamping_service_tier: string | null;
  glamping_service_tier_source: string | null;
  is_glamping_property: string | null;
  research_status: string | null;
};

function propertyGroupKey(row: Row): string {
  if (row.property_id?.trim()) return `pid:${row.property_id.trim()}`;
  const name = (row.property_name ?? '').trim().toLowerCase();
  const city = (row.city ?? '').trim().toLowerCase();
  const state = (row.state ?? '').trim().toLowerCase();
  return `legacy:${name}|${city}|${state}`;
}

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit =
    limitIdx >= 0 && process.argv[limitIdx + 1]
      ? Number.parseInt(process.argv[limitIdx + 1]!, 10)
      : undefined;
  return { dryRun, limit: Number.isFinite(limit) && limit! > 0 ? limit! : undefined };
}

async function fetchAllRows(): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(TABLE)
      .select(SELECT_COLS)
      .in('research_status', ['published', 'in_progress'])
      .eq('is_glamping_property', 'Yes')
      .order('id', { ascending: true })
      .range(from, to);
    if (error) throw error;
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function main() {
  const { dryRun, limit } = parseArgs();
  console.log(`Glamping service tier classifier${dryRun ? ' (dry-run)' : ''}\n`);

  const allRows = await fetchAllRows();
  console.log(`Loaded ${allRows.length} site rows (published + in_progress, is_glamping_property = Yes)\n`);

  const groups = new Map<string, Row[]>();
  for (const row of allRows) {
    const key = propertyGroupKey(row);
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const tierCounts: Record<GlampingServiceTier, number> = {
    luxury: 0,
    upscale: 0,
    midscale: 0,
    rustic: 0,
  };
  let skippedManual = 0;
  let unchanged = 0;
  let wouldChange = 0;
  let updated = 0;

  const entries = [...groups.entries()];
  const toProcess = limit != null ? entries.slice(0, limit) : entries;

  for (const [, groupRows] of toProcess) {
    const hasManual = groupRows.some(
      (r) => String(r.glamping_service_tier_source ?? '').trim().toLowerCase() === 'manual'
    );
    if (hasManual) {
      skippedManual += 1;
      continue;
    }

    const { tier, rationale } = computeGlampingServiceTierFromRows(groupRows);
    tierCounts[tier] += 1;

    const currentTier = groupRows[0]?.glamping_service_tier ?? null;
    const ids = groupRows.map((r) => r.id);
    const needsWrite =
      groupRows.some((r) => r.glamping_service_tier !== tier) ||
      groupRows.some((r) => r.glamping_service_tier_source !== 'auto');

    if (!needsWrite && currentTier === tier) {
      unchanged += 1;
      continue;
    }

    wouldChange += 1;
    const label = groupRows[0]?.property_name ?? propertyGroupKey(groupRows[0]!);
    console.log(
      `  ${label}: ${currentTier ?? '(null)'} → ${tier} [${rationale}] (${ids.length} rows)`
    );

    if (!dryRun) {
      const { error } = await supabase
        .from(TABLE)
        .update({
          glamping_service_tier: tier,
          glamping_service_tier_source: 'auto',
          glamping_service_tier_notes: rationale.slice(0, 500),
          date_updated: new Date().toISOString().split('T')[0],
        })
        .in('id', ids);
      if (error) {
        console.error(`    UPDATE failed: ${error.message}`);
      } else {
        updated += ids.length;
      }
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Properties (groups): ${toProcess.length}`);
  console.log(`Skipped (manual override): ${skippedManual}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Would change / changed groups: ${wouldChange}`);
  if (!dryRun) console.log(`Rows updated: ${updated}`);
  console.log('\nTier distribution (auto-classified groups):');
  for (const t of ['luxury', 'upscale', 'midscale', 'rustic'] as const) {
    console.log(`  ${t}: ${tierCounts[t]}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
