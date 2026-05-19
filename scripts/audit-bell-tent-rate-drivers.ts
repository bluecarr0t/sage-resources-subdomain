/**
 * Which published US open Bell Tent rows drive the market-overview avg rate?
 * Run: npx tsx scripts/audit-bell-tent-rate-drivers.ts
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

type Row = {
  id: number;
  property_name: string | null;
  unit_type: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  is_open: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
  rate_avg_retail_daily_rate: string | number | null;
};

function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function sitesForRow(row: Row): number {
  const fromUnits = parsePositiveNumber(row.quantity_of_units);
  const fromTotal = parsePositiveNumber(row.property_total_sites);
  return Math.round(fromUnits ?? fromTotal ?? 0);
}

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

async function main() {
  const bellTentRows: Array<{
    id: number;
    property_name: string;
    city: string;
    state: string;
    unit_type: string;
    adr: number;
    sites: number;
    weightedContribution: number;
  }> = [];

  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select(
        'id, property_name, unit_type, city, state, country, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate'
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
      if (primaryLabel !== 'Bell Tent') continue;

      const sites = sitesForRow(row);
      const siteWeight = sites > 0 ? sites : 1;
      bellTentRows.push({
        id: row.id,
        property_name: (row.property_name ?? '').trim() || '(unnamed)',
        city: (row.city ?? '').trim(),
        state: (row.state ?? '').trim(),
        unit_type: (row.unit_type ?? '').trim(),
        adr,
        sites: siteWeight,
        weightedContribution: adr * siteWeight,
      });
    }

    if (batch.length < 1000) break;
    offset += 1000;
  }

  const totalSites = bellTentRows.reduce((s, r) => s + r.sites, 0);
  const totalWeighted = bellTentRows.reduce((s, r) => s + r.weightedContribution, 0);
  const mean = totalSites > 0 ? totalWeighted / totalSites : 0;

  const sortedByRate = [...bellTentRows].sort((a, b) => b.adr - a.adr);
  const sortedByContribution = [...bellTentRows].sort(
    (a, b) => b.weightedContribution - a.weightedContribution
  );

  const median = (() => {
    const rates = bellTentRows.map((r) => r.adr).sort((a, b) => a - b);
    const n = rates.length;
    if (n === 0) return 0;
    const mid = Math.floor(n / 2);
    return n % 2 === 1 ? rates[mid]! : (rates[mid - 1]! + rates[mid]!) / 2;
  })();

  console.log(`Bell Tent cohort (US market overview): ${bellTentRows.length} rated open rows`);
  console.log(`Site-weighted mean: ${fmtUsd(mean)} | median row rate: ${fmtUsd(median)}`);
  console.log(`Total site weight: ${totalSites}\n`);

  console.log('=== Top 20 by nightly rate (may be low site count) ===');
  for (const r of sortedByRate.slice(0, 20)) {
    console.log(
      `  ${fmtUsd(r.adr).padStart(8)}  ${String(r.sites).padStart(4)} sites  ${r.property_name} — ${r.city}, ${r.state}  [id ${r.id}]`
    );
  }

  console.log('\n=== Top 15 by site-weighted contribution (rate × sites) ===');
  let cumulative = 0;
  for (const r of sortedByContribution.slice(0, 15)) {
    cumulative += r.weightedContribution;
    const pctOfWeighted = totalWeighted > 0 ? (100 * r.weightedContribution) / totalWeighted : 0;
    console.log(
      `  ${fmtUsd(r.adr).padStart(8)} × ${String(r.sites).padStart(4)} = ${fmtUsd(r.weightedContribution).padStart(8)} (${pctOfWeighted.toFixed(1)}% of weighted sum)  ${r.property_name} — ${r.city}, ${r.state}`
    );
  }
  console.log(
    `\nTop 15 rows account for ${fmtUsd(cumulative)} of ${fmtUsd(totalWeighted)} weighted rate×sites (${totalWeighted > 0 ? ((100 * cumulative) / totalWeighted).toFixed(1) : 0}%)`
  );

  const tiers = [
    { label: 'Under $200', min: 0, max: 200 },
    { label: '$200–$299', min: 200, max: 300 },
    { label: '$300–$399', min: 300, max: 400 },
    { label: '$400–$599', min: 400, max: 600 },
    { label: '$600+', min: 600, max: Infinity },
  ];
  console.log('\n=== Site-weighted share by rate tier ===');
  for (const tier of tiers) {
    const inTier = bellTentRows.filter((r) => r.adr >= tier.min && r.adr < tier.max);
    const tierSites = inTier.reduce((s, r) => s + r.sites, 0);
    const tierWeighted = inTier.reduce((s, r) => s + r.weightedContribution, 0);
    console.log(
      `  ${tier.label.padEnd(12)} ${String(inTier.length).padStart(3)} rows  ${String(tierSites).padStart(4)} sites  ${totalWeighted > 0 ? ((100 * tierWeighted) / totalWeighted).toFixed(1) : '0'}% of weighted mean`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
