/**
 * Debug NV rows for /glamping-market-overview state panel.
 * Run: npx tsx scripts/audit-nevada-market-snapshot.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '../lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '../lib/glamping-market-snapshot-region';
import { isGlampingMarketSnapshotPropertyType } from '../lib/glamping-market-snapshot-property-type-filter';
import { isExcludedGlampingMarketSnapshotUnitType } from '../lib/glamping-market-snapshot-unit-filter';
import {
  meanAndMedianAdr,
  propertyLevelAdrValues,
  recordPropertyAdrSample,
} from '../lib/fetch-glamping-industry-metrics';
import { bucketGlampingIsOpenForMetrics } from '../lib/glamping-is-open';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  console.error('Missing env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  const { data, error } = await supabase
    .from('all_glamping_properties')
    .select(
      'property_name, site_name, property_type, unit_type, is_open, quantity_of_units, rate_avg_retail_daily_rate'
    )
    .eq('is_glamping_property', 'Yes')
    .eq('research_status', 'published')
    .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
    .in('country', [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN])
    .in('state', ['NV', 'Nevada']);

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  const adrByProperty = new Map<string, number[]>();
  const excluded: { name: string; unit: string; rate: number | null }[] = [];

  for (const row of rows) {
    const rate =
      row.rate_avg_retail_daily_rate != null
        ? Number(row.rate_avg_retail_daily_rate)
        : null;
    if (
      !isGlampingMarketSnapshotPropertyType(row.property_type) ||
      isExcludedGlampingMarketSnapshotUnitType(row.unit_type)
    ) {
      excluded.push({
        name: `${row.property_name} / ${row.site_name}`,
        unit: String(row.unit_type),
        rate,
      });
      continue;
    }
    const propertyName = (row.property_name ?? '').trim();
    if (
      propertyName &&
      bucketGlampingIsOpenForMetrics(row.is_open) === 'yes' &&
      rate != null &&
      rate > 0
    ) {
      recordPropertyAdrSample(adrByProperty, propertyName, rate);
    }
  }

  const propertyAdrs = propertyLevelAdrValues(adrByProperty);
  const { mean, median } = meanAndMedianAdr(propertyAdrs);

  console.log(`NV rows total: ${rows.length}`);
  console.log(`Excluded (RV/tent): ${excluded.length}`);
  excluded.forEach((r) => console.log(`  - ${r.name} | ${r.unit} | $${r.rate ?? '—'}`));
  console.log(`\nProperty-level ADR (median per property): ${propertyAdrs.join(', ')}`);
  console.log(`Mean: $${mean != null ? Math.round(mean) : '—'}`);
  console.log(`Median: $${median != null ? Math.round(median) : '—'}`);
}

main();
