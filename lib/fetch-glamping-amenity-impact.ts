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
  glampingMarketOverviewStatesKey,
  type GlampingMarketSnapshotTierFilter,
} from '@/lib/glamping-market-snapshot-classification';
import { rowPassesGlampingMarketUsStatesFilter } from '@/lib/glamping-market-snapshot-us-regions';
import { normalizeDbStateToUspsAbbr } from '@/lib/normalize-us-state-abbr';
import {
  applyGlampingOnlyPropertyTypeFilter,
  isGlampingMarketSnapshotPropertyType,
} from '@/lib/glamping-market-snapshot-property-type-filter';
import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';
import {
  glampingMarketSnapshotUnitsForRow,
  parseGlampingMarketSnapshotPositiveNumber,
} from '@/lib/glamping-market-snapshot/site-units-for-row';
import {
  emptyAmenityImpactBuckets,
  finalizeAmenityImpactBuckets,
  foldAmenityImpactRow,
  GLAMPING_MARKET_AMENITY_IMPACT_KEYS,
  type GlampingAmenityImpactRow,
  type GlampingMarketAmenityImpactKey,
} from '@/lib/glamping-amenity-impact';
import { isComparableMarketArdrRateBasis } from '@/lib/glamping-rate-basis';

const PAGE_SIZE = 1000;

type SageRow = {
  property_name: string | null;
  property_type: string | null;
  unit_type: string | null;
  state: string | null;
  is_open: string | null;
  quantity_of_units: string | number | null;
  property_total_sites: string | number | null;
  rate_avg_retail_daily_rate: string | number | null;
  rate_basis: string | null;
  unit_private_bathroom: string | null;
  property_hot_tub: string | null;
  property_food_on_site: string | null;
  property_restaurant: string | null;
};

async function loadAmenityImpact(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter,
  states: string[] | null
): Promise<GlampingAmenityImpactRow[]> {
  const supabase = createServerClient();
  const countryIn =
    market === 'ca'
      ? [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN]
      : [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];

  const buckets = emptyAmenityImpactBuckets();
  let offset = 0;

  for (;;) {
    let query = applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from('all_sage_data')
        .select(
          'property_name, property_type, unit_type, state, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate, rate_basis, unit_private_bathroom, property_hot_tub, property_food_on_site, property_restaurant'
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

    if (error) throw new Error(error.message);

    const batch = (data ?? []) as SageRow[];
    if (batch.length === 0) break;

    for (const row of batch) {
      if (!isGlampingMarketSnapshotPropertyType(row.property_type)) continue;
      if (isExcludedGlampingMarketSnapshotUnitType(row.unit_type)) continue;
      if (bucketGlampingIsOpenForMetrics(row.is_open) !== 'yes') continue;

      if (market === 'us') {
        const usps = normalizeDbStateToUspsAbbr(row.state);
        if (!rowPassesGlampingMarketUsStatesFilter(usps, states)) continue;
      }

      const adr = parseGlampingMarketSnapshotPositiveNumber(
        row.rate_avg_retail_daily_rate
      );
      if (adr == null || !isComparableMarketArdrRateBasis(row.rate_basis)) continue;

      const unitWeight = glampingMarketSnapshotUnitsForRow(row);
      const raw: Partial<Record<GlampingMarketAmenityImpactKey, unknown>> = {};
      for (const key of GLAMPING_MARKET_AMENITY_IMPACT_KEYS) {
        raw[key] = row[key];
      }
      foldAmenityImpactRow(buckets, raw, unitWeight, adr, undefined, row.property_name);
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return finalizeAmenityImpactBuckets(buckets);
}

/**
 * Cached amenity with/without ARDR impact for `/glamping-market-overview`.
 */
export async function fetchGlampingAmenityImpact(
  market: GlampingMarketSnapshotMarket = 'us',
  tier: GlampingMarketSnapshotTierFilter = 'all',
  states: string[] | null = null
): Promise<
  { ok: true; data: GlampingAmenityImpactRow[] } | { ok: false; error: string }
> {
  const statesKey = glampingMarketOverviewStatesKey(market === 'us' ? states : null);
  try {
    const data = await unstable_cache(
      () => loadAmenityImpact(market, tier, market === 'us' ? states : null),
      ['glamping-amenity-impact', market, tier, statesKey, 'v9-us-states'],
      {
        revalidate: GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS,
        tags: [...GLAMPING_MARKET_OVERVIEW_CACHE_TAGS],
      }
    )();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown amenity impact error',
    };
  }
}
