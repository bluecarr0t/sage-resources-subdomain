import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN } from '@/lib/glamping-market-snapshot-region';
import { normalizeDbStateToUspsAbbr } from '@/lib/normalize-us-state-abbr';
import {
  meanAndMedianAdr,
  propertyLevelAdrValues,
  recordPropertyAdrSample,
} from '@/lib/fetch-glamping-industry-metrics';
import { bucketGlampingIsOpenForMetrics } from '@/lib/glamping-is-open';
import { GLAMPING_MARKET_SNAPSHOT_US_STATE_SELECT } from '@/lib/glamping-market-snapshot-row-select';
import {
  applyGlampingMarketSnapshotTierToQuery,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';

const PAGE_SIZE = 1000;

type Row = {
  property_name: string | null;
  unit_type: string | null;
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

function unitsForRow(row: Row): number {
  const fromUnits = parsePositiveNumber(row.quantity_of_units);
  const fromTotal = parsePositiveNumber(row.property_total_sites);
  const n = fromUnits ?? fromTotal ?? 0;
  return Math.round(n);
}

function isUsRow(country: string | null | undefined): boolean {
  const u = (country ?? '').trim().toUpperCase();
  return (
    u === 'UNITED STATES' ||
    u === 'USA' ||
    u === 'US' ||
    u === 'UNITED STATES OF AMERICA'
  );
}

export type GlampingUsStateMetricRow = {
  propertyCount: number;
  openProperties: number;
  underConstructionProperties: number;
  proposedDevelopmentProperties: number;
  unitCount: number;
  avgRetailDailyRateMean: number | null;
  avgRetailDailyRateMedian: number | null;
};

export type GlampingUsStateMetricsMap = Record<string, GlampingUsStateMetricRow>;

type Agg = {
  names: Set<string>;
  openNames: Set<string>;
  underConstructionNames: Set<string>;
  proposedDevelopmentNames: Set<string>;
  units: number;
  adrByProperty: Map<string, number[]>;
};

/**
 * Per-USPS-state aggregates for published commercial glamping in the United States only
 * (Canada is included in national snapshot metrics but has no US-state breakdown here).
 */
export async function fetchGlampingIndustryUsStateMetrics(
  tier: GlampingMarketSnapshotTierFilter = 'all'
): Promise<{ ok: true; data: GlampingUsStateMetricsMap } | { ok: false; error: string }> {
  const supabase = createServerClient();
  const aggs = new Map<string, Agg>();

  let offset = 0;
  for (;;) {
    let query = supabase
      .from('all_glamping_properties')
      .select(GLAMPING_MARKET_SNAPSHOT_US_STATE_SELECT)
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
      .in('country', [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN]);
    query = applyGlampingMarketSnapshotTierToQuery(query, tier);
    const { data, error } = await query
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return { ok: false, error: error.message };
    }

    const batch = (data ?? []) as Row[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (isExcludedGlampingMarketSnapshotUnitType(row.unit_type)) continue;
      if (!isUsRow(row.country)) continue;
      const abbr = normalizeDbStateToUspsAbbr(row.state);
      if (!abbr) continue;

      const name = (row.property_name ?? '').trim();
      let agg = aggs.get(abbr);
      if (!agg) {
        agg = {
          names: new Set(),
          openNames: new Set(),
          underConstructionNames: new Set(),
          proposedDevelopmentNames: new Set(),
          units: 0,
          adrByProperty: new Map(),
        };
        aggs.set(abbr, agg);
      }

      if (name) agg.names.add(name);
      const status = bucketGlampingIsOpenForMetrics(row.is_open);
      if (name && status === 'yes') agg.openNames.add(name);
      if (name && status === 'under_construction') agg.underConstructionNames.add(name);
      if (name && status === 'proposed_development') agg.proposedDevelopmentNames.add(name);
      agg.units += unitsForRow(row);

      if (status === 'yes' && name) {
        const adr = parsePositiveNumber(row.rate_avg_retail_daily_rate);
        if (adr != null) recordPropertyAdrSample(agg.adrByProperty, name, adr);
      }
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const out: GlampingUsStateMetricsMap = {};
  for (const [abbr, agg] of aggs) {
    const propertyAdrs = propertyLevelAdrValues(agg.adrByProperty);
    const { mean, median } = meanAndMedianAdr(propertyAdrs);
    out[abbr] = {
      propertyCount: agg.names.size,
      openProperties: agg.openNames.size,
      underConstructionProperties: agg.underConstructionNames.size,
      proposedDevelopmentProperties: agg.proposedDevelopmentNames.size,
      unitCount: agg.units,
      avgRetailDailyRateMean: mean != null ? Math.round(mean) : null,
      avgRetailDailyRateMedian: median != null ? Math.round(median) : null,
    };
  }

  return { ok: true, data: out };
}
