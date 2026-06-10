/**
 * Sum site/unit counts for Sage rows using `/glamping-market-overview` rules
 * (not matview row count).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import type { UnifiedFilterOptions } from '@/lib/comps-unified/apply-filters';
import { glampingMarketSnapshotUnitsForRow } from '@/lib/glamping-market-snapshot/site-units-for-row';
import { GLAMPING_MARKET_SNAPSHOT_US_STATE_SELECT } from '@/lib/glamping-market-snapshot-row-select';
import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';
import { isGlampingMarketSnapshotPropertyType } from '@/lib/glamping-market-snapshot-property-type-filter';

const PAGE_SIZE = 1000;

type SageCountRow = {
  property_type: string | null;
  unit_type: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
  rate_avg_retail_daily_rate: string | number | null;
  is_open: string | null;
};

function parseRate(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function rowMatchesUnitCategories(row: SageCountRow, categories: string[]): boolean {
  if (categories.length === 0) return true;
  const unitType = (row.unit_type ?? '').toLowerCase();
  return categories.some((cat) => {
    const c = cat.toLowerCase();
    return unitType === c || unitType.includes(c.replace(/_/g, ' '));
  });
}

/**
 * Total units for published Sage glamping rows matching unified comps filters
 * and the public market snapshot cohort (land tenure, unit-type exclusions).
 */
export async function countSageMarketSnapshotSiteUnits(
  supabase: SupabaseClient,
  opts: UnifiedFilterOptions
): Promise<number> {
  let total = 0;
  let offset = 0;

  for (;;) {
    let query = supabase
      .from('all_sage_data')
      .select(GLAMPING_MARKET_SNAPSHOT_US_STATE_SELECT)
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR);

    if (opts.expandedCountryValues.length > 0) {
      query = query.in('country', opts.expandedCountryValues);
    }
    if (opts.expandedStateValues.length > 0) {
      query = query.in('state', opts.expandedStateValues);
    }
    if (opts.openStatuses.length > 0) {
      query = query.in('is_open', opts.openStatuses);
    }

    const { data, error } = await query.order('id', { ascending: true }).range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('[comps/unified] countSageMarketSnapshotSiteUnits:', error.message);
      return total;
    }

    const batch = (data ?? []) as SageCountRow[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (!isGlampingMarketSnapshotPropertyType(row.property_type)) continue;
      if (isExcludedGlampingMarketSnapshotUnitType(row.unit_type)) continue;
      if (!rowMatchesUnitCategories(row, opts.unitCategories)) continue;

      const rate = parseRate(row.rate_avg_retail_daily_rate);
      if (opts.parsedMinAdr !== null && !Number.isNaN(opts.parsedMinAdr)) {
        if (rate === null || rate < opts.parsedMinAdr) continue;
      }
      if (opts.parsedMaxAdr !== null && !Number.isNaN(opts.parsedMaxAdr)) {
        if (rate === null || rate > opts.parsedMaxAdr) continue;
      }

      total += glampingMarketSnapshotUnitsForRow(row);
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return total;
}
