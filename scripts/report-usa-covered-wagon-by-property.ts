/**
 * Properties contributing the most "site" count where the primary unit type
 * normalizes to Covered Wagon (same cohort as glamping market snapshot, US only).
 *
 * Run: npx tsx scripts/report-usa-covered-wagon-by-property.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '../lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '../lib/glamping-market-snapshot-region';
import { normalizeGlampingUnitTypeForStorage } from '../lib/glamping-unit-type-normalize';

config({ path: resolve(process.cwd(), '.env.local') });
config();

const PAGE_SIZE = 1000;
const LIST_TOP = 25;

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
  property_name: string | null;
  unit_type: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
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
  const n = fromUnits ?? fromTotal ?? 0;
  return Math.round(n);
}

async function main() {
  const countryIn = [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];
  const byProperty = new Map<string, { sites: number; sampleRawTypes: Set<string> }>();
  let totalCoveredWagonSites = 0;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name, unit_type, quantity_of_units, property_total_sites')
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .in('country', countryIn)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(error.message);
      process.exit(1);
    }

    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;

    for (const row of batch) {
      const label = normalizeGlampingUnitTypeForStorage(row.unit_type);
      if (label !== 'Covered Wagon') continue;

      const name = (row.property_name ?? '').trim() || '(unnamed)';
      const sites = sitesForRow(row);
      totalCoveredWagonSites += sites;

      let agg = byProperty.get(name);
      if (!agg) {
        agg = { sites: 0, sampleRawTypes: new Set<string>() };
        byProperty.set(name, agg);
      }
      agg.sites += sites;
      const raw = (row.unit_type ?? '').trim();
      if (raw) agg.sampleRawTypes.add(raw);
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const ranked = [...byProperty.entries()].sort((a, b) => b[1].sites - a[1].sites);

  console.log(
    `USA snapshot cohort — rows whose primary normalized unit type is "Covered Wagon"\n` +
      `Total sites summed on those rows: ${totalCoveredWagonSites}\n` +
      `Distinct properties (by name): ${byProperty.size}\n`
  );

  ranked.slice(0, LIST_TOP).forEach(([name, agg], i) => {
    const pct =
      totalCoveredWagonSites > 0 ? ((100 * agg.sites) / totalCoveredWagonSites).toFixed(1) : '0';
    const samples = [...agg.sampleRawTypes].slice(0, 3).join(' · ');
    console.log(`${i + 1}. ${name}`);
    console.log(`   ${agg.sites} sites (${pct}% of covered-wagon site sum) — raw: ${samples || '—'}`);
  });
}

main();
