import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import {
  GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN,
  GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN,
  type GlampingMarketSnapshotMarket,
} from '@/lib/glamping-market-snapshot-region';
import { bucketGlampingIsOpenForMetrics } from '@/lib/glamping-is-open';
import {
  applyGlampingMarketSnapshotTierToQuery,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import {
  applyGlampingOnlyPropertyTypeFilter,
  isGlampingMarketSnapshotPropertyType,
} from '@/lib/glamping-market-snapshot-property-type-filter';
import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';
import {
  glampingMarketSnapshotUnitsForRow,
  parseGlampingMarketSnapshotPositiveNumber,
} from '@/lib/glamping-market-snapshot/site-units-for-row';

const PAGE_SIZE = 1000;

export const TOP_UNIT_TYPES_COUNT = 5;

export type GlampingTopUnitTypeRow = {
  label: string;
  /** Integer percent of total units (primary `unit_type` label per row). */
  pctOfUnits: number;
  /**
   * Unit-weighted mean retail ADR for open rows with this primary unit label and a recorded
   * rate (`quantity_of_units`, else `property_total_sites`, else weight 1).
   */
  avgRetailDailyRateMean: number | null;
};

export type GlampingIndustryMetrics = {
  totalProperties: number;
  openProperties: number;
  underConstructionProperties: number;
  proposedDevelopmentProperties: number;
  totalUnits: number;
  avgRetailDailyRateMean: number | null;
  avgRetailDailyRateMedian: number | null;
  topUnitTypesByUnits: GlampingTopUnitTypeRow[];
  asOf: string;
};

type Row = {
  property_name: string | null;
  property_type: string | null;
  unit_type: string | null;
  is_open: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
  rate_avg_retail_daily_rate: string | number | null;
  updated_at: string | null;
  created_at: string | null;
};

function parseTimestampMs(value: string | null | undefined): number | null {
  if (value == null || !String(value).trim()) return null;
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

/** Median of a non-empty sorted array (ascending). */
export function medianSorted(sortedAsc: number[]): number {
  const n = sortedAsc.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  if (n % 2 === 1) return sortedAsc[mid];
  return (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}

/** Collect open-row ADRs under each trimmed `property_name`. */
export function recordPropertyAdrSample(
  byProperty: Map<string, number[]>,
  propertyName: string,
  adr: number
): void {
  const key = propertyName.trim();
  if (!key) return;
  const list = byProperty.get(key);
  if (list) list.push(adr);
  else byProperty.set(key, [adr]);
}

/**
 * Headline mean/median ADR uses one value per property (median of that property's
 * rated unit rows) so multi-unit resorts do not dominate state/national stats.
 */
export function propertyLevelAdrValues(byProperty: Map<string, number[]>): number[] {
  const values: number[] = [];
  for (const rowAdrs of byProperty.values()) {
    if (rowAdrs.length === 0) continue;
    const sorted = [...rowAdrs].sort((a, b) => a - b);
    values.push(medianSorted(sorted));
  }
  return values.sort((a, b) => a - b);
}

export function meanAndMedianAdr(samples: number[]): {
  mean: number | null;
  median: number | null;
} {
  if (samples.length === 0) return { mean: null, median: null };
  const mean = samples.reduce((s, x) => s + x, 0) / samples.length;
  return { mean, median: medianSorted(samples) };
}

/**
 * Published commercial-glamping universe (same land-tenure scope as the public map),
 * filtered to {@link GlampingMarketSnapshotMarket}: United States or Canada.
 * Rows whose `unit_type` is tent-site, RV, or vehicle inventory are omitted
 * ({@link isExcludedGlampingMarketSnapshotUnitType}), and rows whose `property_type`
 * must have `property_type` = Glamping ({@link isGlampingMarketSnapshotPropertyType}).
 */
export async function fetchGlampingIndustryMetrics(
  market: GlampingMarketSnapshotMarket = 'us',
  tier: GlampingMarketSnapshotTierFilter = 'all'
): Promise<{ ok: true; data: GlampingIndustryMetrics } | { ok: false; error: string }> {
  const supabase = createServerClient();

  const countryIn =
    market === 'ca'
      ? [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN]
      : [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];

  const distinctNames = new Set<string>();
  const openNames = new Set<string>();
  const underConstructionNames = new Set<string>();
  const proposedDevelopmentNames = new Set<string>();

  let totalUnits = 0;
  const adrByProperty = new Map<string, number[]>();
  const unitsByPrimaryUnitLabel = new Map<string, number>();
  const adrWeightByPrimaryUnitLabel = new Map<string, { rateTimesUnits: number; units: number }>();

  let dataFreshnessMs = 0;

  let offset = 0;
  for (;;) {
    let query = applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from('all_sage_data')
        .select(
          'property_name, property_type, unit_type, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate, updated_at, created_at'
        )
        .eq('is_glamping_property', 'Yes')
        .eq('research_status', 'published')
        .or(PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR)
        .in('country', countryIn)
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

      const u = parseTimestampMs(row.updated_at);
      const c = parseTimestampMs(row.created_at);
      const rowFresh = Math.max(u ?? 0, c ?? 0);
      if (rowFresh > 0) dataFreshnessMs = Math.max(dataFreshnessMs, rowFresh);

      const name = (row.property_name ?? '').trim();
      if (name) {
        distinctNames.add(name);
        const openState = bucketGlampingIsOpenForMetrics(row.is_open);
        if (openState === 'yes') openNames.add(name);
        if (openState === 'under_construction') underConstructionNames.add(name);
        if (openState === 'proposed_development') proposedDevelopmentNames.add(name);
      }

      const rowUnits = glampingMarketSnapshotUnitsForRow(row);
      totalUnits += rowUnits;

      const primaryLabel = normalizeGlampingUnitTypeForStorage(row.unit_type);
      if (primaryLabel) {
        unitsByPrimaryUnitLabel.set(
          primaryLabel,
          (unitsByPrimaryUnitLabel.get(primaryLabel) ?? 0) + rowUnits
        );
      }

      if (bucketGlampingIsOpenForMetrics(row.is_open) === 'yes') {
        const adr = parseGlampingMarketSnapshotPositiveNumber(row.rate_avg_retail_daily_rate);
        if (adr != null) {
          if (name) recordPropertyAdrSample(adrByProperty, name, adr);
          if (primaryLabel) {
            const unitWeight = rowUnits > 0 ? rowUnits : 1;
            const prev = adrWeightByPrimaryUnitLabel.get(primaryLabel) ?? {
              rateTimesUnits: 0,
              units: 0,
            };
            adrWeightByPrimaryUnitLabel.set(primaryLabel, {
              rateTimesUnits: prev.rateTimesUnits + adr * unitWeight,
              units: prev.units + unitWeight,
            });
          }
        }
      }
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const propertyAdrs = propertyLevelAdrValues(adrByProperty);
  const { mean, median } = meanAndMedianAdr(propertyAdrs);

  const rankedUnitTypes = [...unitsByPrimaryUnitLabel.entries()].sort((a, b) => b[1] - a[1]);
  const topUnitTypesByUnits: GlampingTopUnitTypeRow[] =
    totalUnits > 0
      ? rankedUnitTypes.slice(0, TOP_UNIT_TYPES_COUNT).map(([label, n]) => {
          const agg = adrWeightByPrimaryUnitLabel.get(label);
          const unitMean =
            agg && agg.units > 0 ? agg.rateTimesUnits / agg.units : null;
          return {
            label,
            pctOfUnits: Math.round((100 * n) / totalUnits),
            avgRetailDailyRateMean: unitMean != null ? Math.round(unitMean) : null,
          };
        })
      : [];

  return {
    ok: true,
    data: {
      totalProperties: distinctNames.size,
      openProperties: openNames.size,
      underConstructionProperties: underConstructionNames.size,
      proposedDevelopmentProperties: proposedDevelopmentNames.size,
      totalUnits,
      avgRetailDailyRateMean: mean != null ? Math.round(mean) : null,
      avgRetailDailyRateMedian: median != null ? Math.round(median) : null,
      topUnitTypesByUnits,
      asOf:
        dataFreshnessMs > 0
          ? new Date(dataFreshnessMs).toISOString()
          : new Date().toISOString(),
    },
  };
}
