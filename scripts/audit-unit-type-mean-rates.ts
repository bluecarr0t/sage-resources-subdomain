/**
 * Audit per–unit-type mean ADR for glamping market overview (US snapshot cohort).
 * Run: npx tsx scripts/audit-unit-type-mean-rates.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '../lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '../lib/glamping-market-snapshot-region';
import { bucketGlampingIsOpenForMetrics } from '../lib/glamping-is-open';
import { normalizeGlampingUnitTypeForStorage } from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function sitesForRow(row: {
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
}): number {
  const fromUnits = parsePositiveNumber(row.quantity_of_units);
  const fromTotal = parsePositiveNumber(row.property_total_sites);
  return Math.round(fromUnits ?? fromTotal ?? 0);
}

type Row = {
  property_name: string | null;
  unit_type: string | null;
  is_open: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
  rate_avg_retail_daily_rate: string | number | null;
};

function summarize(label: string, rates: number[], siteWeights: number[]) {
  const n = rates.length;
  if (n === 0) {
    console.log(`\n${label}: no rated open rows`);
    return;
  }
  const mean = rates.reduce((s, x) => s + x, 0) / n;
  const sorted = [...rates].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  const siteWeighted =
    siteWeights.length === rates.length && siteWeights.some((w) => w > 0)
      ? rates.reduce((s, r, i) => s + r * (siteWeights[i] ?? 1), 0) /
        siteWeights.reduce((s, w) => s + w, 0)
      : null;

  console.log(`\n${label}`);
  console.log(`  rated open rows: ${n}`);
  console.log(`  unweighted mean: $${mean.toFixed(2)} (display rounds to $${Math.round(mean)})`);
  console.log(`  median: $${median.toFixed(2)}`);
  if (siteWeighted != null) {
    console.log(`  site-weighted mean: $${siteWeighted.toFixed(2)} (rounds to $${Math.round(siteWeighted)})`);
  }
  console.log(`  min–max: $${sorted[0]!.toFixed(0)} – $${sorted[n - 1]!.toFixed(0)}`);
  console.log(`  sample rates: ${sorted.slice(0, 8).map((r) => `$${r.toFixed(0)}`).join(', ')}${n > 8 ? '…' : ''}`);
}

async function main() {
  const adrByLabel = new Map<string, number[]>();
  const sitesByLabel = new Map<string, number[]>();
  const rawUnitTypes = new Map<string, Set<string>>();

  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(
        'property_name, unit_type, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate'
      )
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .in('country', [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN])
      .order('id', { ascending: true })
      .range(offset, offset + 999);

    if (error) throw error;
    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (bucketGlampingIsOpenForMetrics(row.is_open) !== 'yes') continue;
      const adr = parsePositiveNumber(row.rate_avg_retail_daily_rate);
      if (adr == null) continue;

      const primaryLabel = normalizeGlampingUnitTypeForStorage(row.unit_type);
      if (!primaryLabel) continue;

      const sites = sitesForRow(row);
      if (!adrByLabel.has(primaryLabel)) {
        adrByLabel.set(primaryLabel, []);
        sitesByLabel.set(primaryLabel, []);
        rawUnitTypes.set(primaryLabel, new Set());
      }
      adrByLabel.get(primaryLabel)!.push(adr);
      sitesByLabel.get(primaryLabel)!.push(sites);
      if (row.unit_type) rawUnitTypes.get(primaryLabel)!.add(row.unit_type.trim());
    }

    if (batch.length < 1000) break;
    offset += 1000;
  }

  for (const label of ['Tiny Home', 'Bell Tent']) {
    summarize(label, adrByLabel.get(label) ?? [], sitesByLabel.get(label) ?? []);
    const raw = [...(rawUnitTypes.get(label) ?? [])].slice(0, 12);
    if (raw.length) console.log(`  raw unit_type samples: ${raw.join(' | ')}`);
  }

  // Distribution check: how much do high-rate rows pull the mean?
  for (const label of ['Tiny Home', 'Bell Tent']) {
    const rates = adrByLabel.get(label) ?? [];
    if (rates.length === 0) continue;
    const sorted = [...rates].sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)]!;
    const above400 = rates.filter((r) => r >= 400).length;
    const above600 = rates.filter((r) => r >= 600).length;
    console.log(
      `\n${label} distribution: p90=$${p90.toFixed(0)}, rows ≥$400: ${above400}, rows ≥$600: ${above600}`
    );
  }

  console.log('\n--- Top 5 by sites (same as overview) ---');
  const sitesTotals = new Map<string, number>();
  for (const [label, weights] of sitesByLabel) {
    sitesTotals.set(label, weights.reduce((s, w) => s + w, 0));
  }
  const top5 = [...sitesTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  for (const [label, siteCount] of top5) {
    const rates = adrByLabel.get(label) ?? [];
    const mean =
      rates.length > 0 ? rates.reduce((s, x) => s + x, 0) / rates.length : null;
    console.log(
      `  ${label}: ${siteCount} sites, ${rates.length} rated rows, mean $${mean != null ? mean.toFixed(2) : '—'} → $${mean != null ? Math.round(mean) : '—'}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
