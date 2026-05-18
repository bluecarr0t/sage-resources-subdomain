/**
 * Top N unit types by summed site counts for the same cohort as
 * `/glamping-market-overview` (US market).
 *
 * Run: npx tsx scripts/report-usa-glamping-top-unit-types.ts
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
const TOP = 10;

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
  let totalSites = 0;
  const sitesByPrimaryUnitLabel = new Map<string, number>();
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select('unit_type, quantity_of_units, property_total_sites')
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
      const rowSites = sitesForRow(row);
      totalSites += rowSites;
      const primaryLabel = normalizeGlampingUnitTypeForStorage(row.unit_type);
      if (primaryLabel) {
        sitesByPrimaryUnitLabel.set(
          primaryLabel,
          (sitesByPrimaryUnitLabel.get(primaryLabel) ?? 0) + rowSites
        );
      }
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const ranked = [...sitesByPrimaryUnitLabel.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, TOP);

  console.log(`USA glamping snapshot cohort — total sites (sum of row site counts): ${totalSites}\n`);
  top.forEach(([label, n], i) => {
    const pct = totalSites > 0 ? Math.round((100 * n) / totalSites) : 0;
    console.log(`${i + 1}. ${label}\t${pct}%\t(${n} sites)`);
  });
}

main();
