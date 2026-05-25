import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import { GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN } from '@/lib/glamping-market-snapshot-region';
import {
  meanAndMedianAdr,
  propertyLevelAdrValues,
  recordPropertyAdrSample,
} from '@/lib/fetch-glamping-industry-metrics';
import { GLAMPING_MARKET_SNAPSHOT_CA_PROVINCE_SELECT } from '@/lib/glamping-market-snapshot-row-select';
import {
  applyGlampingMarketSnapshotTierToQuery,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import {
  applyGlampingOnlyPropertyTypeFilter,
  isGlampingMarketSnapshotPropertyType,
} from '@/lib/glamping-market-snapshot-property-type-filter';
import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';
import { normalizeCaProvinceToCode } from '@/lib/normalize-ca-province-key';

const PAGE_SIZE = 1000;

type Row = {
  property_name: string | null;
  property_type: string | null;
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

function normalizeIsOpen(raw: string | null | undefined): 'yes' | 'under_construction' | 'closed' | 'other' {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'yes') return 'yes';
  if (v === 'under construction') return 'under_construction';
  if (v === 'closed' || v === 'no') return 'closed';
  return 'other';
}

function unitsForRow(row: Row): number {
  const fromUnits = parsePositiveNumber(row.quantity_of_units);
  const fromTotal = parsePositiveNumber(row.property_total_sites);
  const n = fromUnits ?? fromTotal ?? 0;
  return Math.round(n);
}

function isCanadaRow(country: string | null | undefined): boolean {
  const u = (country ?? '').trim().toUpperCase();
  return u === 'CANADA' || u === 'CA';
}

/** Same row shape as US state metrics (reused by region UIs). */
export type GlampingCaProvinceMetricRow = {
  propertyCount: number;
  unitCount: number;
  avgRetailDailyRateMean: number | null;
  avgRetailDailyRateMedian: number | null;
};

export type GlampingCaProvinceMetricsMap = Record<string, GlampingCaProvinceMetricRow>;

type Agg = {
  names: Set<string>;
  units: number;
  adrByProperty: Map<string, number[]>;
};

/**
 * Per-province/territory aggregates for published commercial glamping in Canada only.
 */
export async function fetchGlampingIndustryCaProvinceMetrics(
  tier: GlampingMarketSnapshotTierFilter = 'all'
): Promise<{ ok: true; data: GlampingCaProvinceMetricsMap } | { ok: false; error: string }> {
  const supabase = createServerClient();
  const aggs = new Map<string, Agg>();

  let offset = 0;
  for (;;) {
    let query = applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from('all_glamping_properties')
        .select(GLAMPING_MARKET_SNAPSHOT_CA_PROVINCE_SELECT)
        .eq('is_glamping_property', 'Yes')
        .eq('research_status', 'published')
        .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
        .in('country', [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN])
    );
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
      if (!isGlampingMarketSnapshotPropertyType(row.property_type)) continue;
      if (isExcludedGlampingMarketSnapshotUnitType(row.unit_type)) continue;
      if (!isCanadaRow(row.country)) continue;
      const code = normalizeCaProvinceToCode(row.state);
      if (!code) continue;

      const name = (row.property_name ?? '').trim();
      let agg = aggs.get(code);
      if (!agg) {
        agg = { names: new Set(), units: 0, adrByProperty: new Map() };
        aggs.set(code, agg);
      }

      if (name) agg.names.add(name);
      agg.units += unitsForRow(row);

      if (normalizeIsOpen(row.is_open) === 'yes' && name) {
        const adr = parsePositiveNumber(row.rate_avg_retail_daily_rate);
        if (adr != null) recordPropertyAdrSample(agg.adrByProperty, name, adr);
      }
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const out: GlampingCaProvinceMetricsMap = {};
  for (const [code, agg] of aggs) {
    const propertyAdrs = propertyLevelAdrValues(agg.adrByProperty);
    const { mean, median } = meanAndMedianAdr(propertyAdrs);
    out[code] = {
      propertyCount: agg.names.size,
      unitCount: agg.units,
      avgRetailDailyRateMean: mean != null ? Math.round(mean) : null,
      avgRetailDailyRateMedian: median != null ? Math.round(median) : null,
    };
  }

  return { ok: true, data: out };
}
