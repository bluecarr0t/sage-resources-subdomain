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
import { fetchAirports } from '@/lib/fetch-airports';
import {
  buildGlampingProximityAnalysis,
  type GlampingProximityAnalysis,
  type ProximityAnchor,
  type ProximityPropertyRow,
} from '@/lib/glamping-proximity-analysis';
import { isComparableMarketArdrRateBasis } from '@/lib/glamping-rate-basis';

const PAGE_SIZE = 1000;

/** Screenshot thresholds for the public market-overview proximity cards. */
export const NATIONAL_PARKS_PROXIMITY_THRESHOLD_MILES = 100;
export const AIRPORTS_PROXIMITY_THRESHOLD_MILES = 100;

export type GlampingMarketProximityBundle = {
  nationalParks: GlampingProximityAnalysis | null;
  airports: GlampingProximityAnalysis;
};

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
  lat: string | number | null;
  lon: string | number | null;
};

type PropertyAgg = {
  lat: number;
  lon: number;
  openUnits: number;
  rateTimesUnits: number;
  ratedUnits: number;
};

function parseCoord(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Open published commercial-glamping properties with coordinates, rolled up to
 * one row per property_name (unit-weighted ADR).
 */
async function loadOpenProximityProperties(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter,
  states: string[] | null
): Promise<ProximityPropertyRow[]> {
  const supabase = createServerClient();
  const countryIn =
    market === 'ca'
      ? [...GLAMPING_MARKET_SNAPSHOT_CA_COUNTRY_IN]
      : [...GLAMPING_MARKET_SNAPSHOT_US_COUNTRY_IN];

  const byName = new Map<string, PropertyAgg>();
  let offset = 0;

  for (;;) {
    let query = applyGlampingOnlyPropertyTypeFilter(
      supabase
        .from('all_sage_data')
        .select(
          'property_name, property_type, unit_type, state, is_open, quantity_of_units, property_total_sites, rate_avg_retail_daily_rate, rate_basis, lat, lon'
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

      const name = (row.property_name ?? '').trim();
      if (!name) continue;
      const lat = parseCoord(row.lat);
      const lon = parseCoord(row.lon);
      if (lat == null || lon == null) continue;

      const rowUnits = glampingMarketSnapshotUnitsForRow(row);
      const adrRaw = parseGlampingMarketSnapshotPositiveNumber(
        row.rate_avg_retail_daily_rate
      );
      const adr =
        adrRaw != null && isComparableMarketArdrRateBasis(row.rate_basis)
          ? adrRaw
          : null;
      const prev = byName.get(name);
      if (!prev) {
        byName.set(name, {
          lat,
          lon,
          openUnits: rowUnits,
          rateTimesUnits: adr != null ? adr * (rowUnits > 0 ? rowUnits : 1) : 0,
          ratedUnits: adr != null ? (rowUnits > 0 ? rowUnits : 1) : 0,
        });
      } else {
        prev.openUnits += rowUnits;
        if (adr != null) {
          const w = rowUnits > 0 ? rowUnits : 1;
          prev.rateTimesUnits += adr * w;
          prev.ratedUnits += w;
        }
      }
    }

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const rows: ProximityPropertyRow[] = [];
  for (const [propertyName, agg] of byName) {
    rows.push({
      propertyName,
      lat: agg.lat,
      lon: agg.lon,
      openUnits: agg.openUnits,
      avgRetailDailyRate:
        agg.ratedUnits > 0 ? agg.rateTimesUnits / agg.ratedUnits : null,
    });
  }
  return rows;
}

async function loadNationalParkAnchors(): Promise<ProximityAnchor[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('national-parks')
    .select('latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) throw new Error(error.message);

  const anchors: ProximityAnchor[] = [];
  for (const row of data ?? []) {
    const lat = parseCoord(row.latitude as string | number | null);
    const lon = parseCoord(row.longitude as string | number | null);
    if (lat == null || lon == null) continue;
    anchors.push({ lat, lon });
  }
  return anchors;
}

async function loadAirportAnchors(
  market: GlampingMarketSnapshotMarket
): Promise<ProximityAnchor[]> {
  const result = await fetchAirports({
    market,
    hubSizes: ['large', 'medium'],
  });
  if (!result.ok) throw new Error(result.error);
  return result.data.map((a) => ({ lat: a.latitude, lon: a.longitude }));
}

async function loadProximityBundle(
  market: GlampingMarketSnapshotMarket,
  tier: GlampingMarketSnapshotTierFilter,
  states: string[] | null
): Promise<GlampingMarketProximityBundle> {
  const geoStates = market === 'us' ? states : null;
  const propertiesPromise = loadOpenProximityProperties(market, tier, geoStates);
  const airportsPromise = loadAirportAnchors(market);
  const parksPromise =
    market === 'us' ? loadNationalParkAnchors() : Promise.resolve([] as ProximityAnchor[]);

  const [properties, airportAnchors, parkAnchors] = await Promise.all([
    propertiesPromise,
    airportsPromise,
    parksPromise,
  ]);

  const airports = buildGlampingProximityAnalysis(properties, airportAnchors, {
    thresholdMiles: AIRPORTS_PROXIMITY_THRESHOLD_MILES,
    bandWidthMiles: 50,
    maxChartMiles: 250,
  });

  const nationalParks =
    market === 'us'
      ? buildGlampingProximityAnalysis(properties, parkAnchors, {
          thresholdMiles: NATIONAL_PARKS_PROXIMITY_THRESHOLD_MILES,
          rateImpactDirection: 'nearerMinusFarther',
        })
      : null;

  return { nationalParks, airports };
}

/**
 * Cached National Parks + Airport proximity KPIs for `/glamping-market-overview`.
 * Properties are loaded once and reused for both analyses.
 */
export async function fetchGlampingMarketProximityBundle(
  market: GlampingMarketSnapshotMarket = 'us',
  tier: GlampingMarketSnapshotTierFilter = 'all',
  states: string[] | null = null
): Promise<
  { ok: true; data: GlampingMarketProximityBundle } | { ok: false; error: string }
> {
  const statesKey = glampingMarketOverviewStatesKey(market === 'us' ? states : null);
  try {
    const data = await unstable_cache(
      () => loadProximityBundle(market, tier, market === 'us' ? states : null),
      [
        'glamping-market-proximity-bundle',
        market,
        tier,
        statesKey,
        'v14-us-states-filter',
      ],
      {
        revalidate: GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS,
        tags: [...GLAMPING_MARKET_OVERVIEW_CACHE_TAGS, 'airports'],
      }
    )();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown proximity analysis error',
    };
  }
}
