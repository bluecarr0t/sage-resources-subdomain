import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { PRIVATE_COMMERCIAL_GLAMPING_LAND_OPERATOR_OR } from '@/lib/glamping-land-operator-category';
import {
  GLAMPING_MARKET_OVERVIEW_CACHE_TAGS,
  GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS,
} from '@/lib/glamping-market-overview-cache';
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
import { fetchAllSageDataLastUpdatedAt } from '@/lib/fetch-all-sage-data-last-updated';
import { isComparableMarketArdrRateBasis } from '@/lib/glamping-rate-basis';

const PAGE_SIZE = 1000;

export const TOP_UNIT_TYPES_COUNT = 5;

/**
 * When a service-tier filter is active, full-confidence unit-type ADR requires
 * at least this many rated open units (small-n averages are unstable).
 */
export const TOP_UNIT_TYPE_ADR_MIN_RATED_UNITS = 15;

/**
 * When a service-tier filter is active, show a provisional (tilde-prefixed) ADR
 * when rated open unit weight is in
 * [{@link TOP_UNIT_TYPE_ADR_PROVISIONAL_MIN_RATED_UNITS}, {@link TOP_UNIT_TYPE_ADR_MIN_RATED_UNITS}).
 * Below the provisional floor, ADR stays hidden.
 */
export const TOP_UNIT_TYPE_ADR_PROVISIONAL_MIN_RATED_UNITS = 5;

export type GlampingTopUnitTypeRow = {
  label: string;
  /** Open operating unit weight for this primary `unit_type` label. */
  openUnits: number;
  /**
   * Integer percent of **open** units (primary `unit_type` label per row).
   * Pipeline / cancelled inventory is excluded from the mix.
   */
  pctOfUnits: number;
  /**
   * Unit-weighted mean retail ADR for open rows with this primary unit label and a recorded
   * rate (`quantity_of_units`, else `property_total_sites`, else weight 1).
   * Excludes `rate_basis=all_inclusive`. Null when no rates, or when a tier filter is active
   * and rated unit weight is below {@link TOP_UNIT_TYPE_ADR_PROVISIONAL_MIN_RATED_UNITS}.
   */
  avgRetailDailyRateMean: number | null;
  /** Rated open unit weight used for the ADR mean (0 when no rated open rows). */
  ratedUnitWeight: number;
  /**
   * True when a tier filter is active and the mean is shown with rated weight in
   * [{@link TOP_UNIT_TYPE_ADR_PROVISIONAL_MIN_RATED_UNITS}, {@link TOP_UNIT_TYPE_ADR_MIN_RATED_UNITS}).
   */
  avgRetailDailyRateProvisional: boolean;
};

export type GlampingIndustryMetrics = {
  totalProperties: number;
  openProperties: number;
  underConstructionProperties: number;
  proposedDevelopmentProperties: number;
  totalUnits: number;
  avgRetailDailyRateMean: number | null;
  avgRetailDailyRateMedian: number | null;
  /** Top {@link TOP_UNIT_TYPES_COUNT} unit types by open unit weight (sidebar). */
  topUnitTypesByUnits: GlampingTopUnitTypeRow[];
  /** All open unit types with counts + ADR (Unit Type by Rate chart). */
  unitTypesByUnits: GlampingTopUnitTypeRow[];
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
  rate_basis: string | null;
};

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
 * Resolve unit-type ADR display under an optional tier sample-size floor.
 * When `applySampleFloor` is false (market-wide “all” view), any positive mean is shown.
 */
export function resolveTopUnitTypeAdrDisplay(
  unitMean: number | null,
  ratedUnitWeight: number,
  applySampleFloor: boolean
): { avgRetailDailyRateMean: number | null; avgRetailDailyRateProvisional: boolean } {
  if (unitMean == null || ratedUnitWeight <= 0) {
    return { avgRetailDailyRateMean: null, avgRetailDailyRateProvisional: false };
  }
  const rounded = Math.round(unitMean);
  if (!applySampleFloor) {
    return { avgRetailDailyRateMean: rounded, avgRetailDailyRateProvisional: false };
  }
  if (ratedUnitWeight >= TOP_UNIT_TYPE_ADR_MIN_RATED_UNITS) {
    return { avgRetailDailyRateMean: rounded, avgRetailDailyRateProvisional: false };
  }
  if (ratedUnitWeight >= TOP_UNIT_TYPE_ADR_PROVISIONAL_MIN_RATED_UNITS) {
    return { avgRetailDailyRateMean: rounded, avgRetailDailyRateProvisional: true };
  }
  return { avgRetailDailyRateMean: null, avgRetailDailyRateProvisional: false };
}

/**
 * Rank unit types by **open** unit weight and attach ADR (with optional tier floor).
 * Pass `limit` to cap the list (e.g. sidebar top N); omit for the full mix.
 */
export function buildUnitTypesByOpenUnits(
  openUnitsByPrimaryUnitLabel: Map<string, number>,
  adrWeightByPrimaryUnitLabel: Map<string, { rateTimesUnits: number; units: number }>,
  applyAdrSampleFloor: boolean,
  limit?: number
): GlampingTopUnitTypeRow[] {
  const openUnitsTotal = [...openUnitsByPrimaryUnitLabel.values()].reduce((s, n) => s + n, 0);
  if (openUnitsTotal <= 0) return [];

  const ranked = [...openUnitsByPrimaryUnitLabel.entries()].sort((a, b) => b[1] - a[1]);
  const sliced = limit != null ? ranked.slice(0, limit) : ranked;
  return sliced.map(([label, n]) => {
    const agg = adrWeightByPrimaryUnitLabel.get(label);
    const ratedUnitWeight = agg?.units ?? 0;
    const unitMean = agg && agg.units > 0 ? agg.rateTimesUnits / agg.units : null;
    const adr = resolveTopUnitTypeAdrDisplay(unitMean, ratedUnitWeight, applyAdrSampleFloor);
    return {
      label,
      openUnits: n,
      pctOfUnits: Math.round((100 * n) / openUnitsTotal),
      avgRetailDailyRateMean: adr.avgRetailDailyRateMean,
      ratedUnitWeight,
      avgRetailDailyRateProvisional: adr.avgRetailDailyRateProvisional,
    };
  });
}

/**
 * Rank top unit types by **open** unit weight and attach ADR (with optional tier floor).
 * Capped at {@link TOP_UNIT_TYPES_COUNT} for the overview sidebar.
 */
export function buildTopUnitTypesByOpenUnits(
  openUnitsByPrimaryUnitLabel: Map<string, number>,
  adrWeightByPrimaryUnitLabel: Map<string, { rateTimesUnits: number; units: number }>,
  applyAdrSampleFloor: boolean
): GlampingTopUnitTypeRow[] {
  return buildUnitTypesByOpenUnits(
    openUnitsByPrimaryUnitLabel,
    adrWeightByPrimaryUnitLabel,
    applyAdrSampleFloor,
    TOP_UNIT_TYPES_COUNT
  );
}

/**
 * Published commercial-glamping universe (same land-tenure scope as the public map),
 * filtered to {@link GlampingMarketSnapshotMarket}: United States or Canada.
 * Rows whose `unit_type` is tent-site, RV, or vehicle inventory are omitted
 * ({@link isExcludedGlampingMarketSnapshotUnitType}), and rows whose `property_type`
 * must have `property_type` = Glamping ({@link isGlampingMarketSnapshotPropertyType}).
 */
async function loadGlampingIndustryMetrics(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter
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
  /** Open operating units only — drives Top Unit Types ranking and %. */
  const openUnitsByPrimaryUnitLabel = new Map<string, number>();
  const adrWeightByPrimaryUnitLabel = new Map<string, { rateTimesUnits: number; units: number }>();

  let offset = 0;
  for (;;) {
    let query = applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from('all_sage_data')
        .select(
          'property_name, property_type, unit_type, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate, rate_basis'
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

      const openState = bucketGlampingIsOpenForMetrics(row.is_open);
      // Cancelled inventory is excluded from headline unit totals and unit-mix.
      if (openState === 'cancelled') continue;

      const name = (row.property_name ?? '').trim();
      if (name) {
        distinctNames.add(name);
        if (openState === 'yes') openNames.add(name);
        if (openState === 'under_construction') underConstructionNames.add(name);
        if (openState === 'proposed_development') proposedDevelopmentNames.add(name);
      }

      const rowUnits = glampingMarketSnapshotUnitsForRow(row);
      totalUnits += rowUnits;

      const primaryLabel = normalizeGlampingUnitTypeForStorage(row.unit_type);

      if (openState === 'yes') {
        if (primaryLabel) {
          openUnitsByPrimaryUnitLabel.set(
            primaryLabel,
            (openUnitsByPrimaryUnitLabel.get(primaryLabel) ?? 0) + rowUnits
          );
        }
        const adr = parseGlampingMarketSnapshotPositiveNumber(row.rate_avg_retail_daily_rate);
        if (adr != null && isComparableMarketArdrRateBasis(row.rate_basis)) {
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

  const applyAdrSampleFloor = tier !== 'all';
  const unitTypesByUnits = buildUnitTypesByOpenUnits(
    openUnitsByPrimaryUnitLabel,
    adrWeightByPrimaryUnitLabel,
    applyAdrSampleFloor
  );
  const topUnitTypesByUnits = unitTypesByUnits.slice(0, TOP_UNIT_TYPES_COUNT);

  const asOf = await fetchAllSageDataLastUpdatedAt();

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
      unitTypesByUnits,
      asOf,
    },
  };
}

/**
 * Cached national glamping market metrics for `/glamping-market-overview`.
 * Revalidates every {@link GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS} or via
 * `glamping-market-overview` / `properties` cache tags.
 */
export async function fetchGlampingIndustryMetrics(
  market: GlampingMarketSnapshotMarket = 'us',
  tier: GlampingMarketSnapshotTierFilter = 'all'
): Promise<{ ok: true; data: GlampingIndustryMetrics } | { ok: false; error: string }> {
  return unstable_cache(
    () => loadGlampingIndustryMetrics(market, tier),
    ['glamping-industry-metrics', market, tier, 'open-unit-mix-v4-rate-basis'],
    {
      revalidate: GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS,
      tags: [...GLAMPING_MARKET_OVERVIEW_CACHE_TAGS],
    }
  )();
}
