import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS } from '@/lib/glamping-market-overview-cache';
import type { GlampingMarketSnapshotMarket } from '@/lib/glamping-market-snapshot-region';
import {
  airportHasCoordinates,
  type Airport,
  type AirportHubSize,
} from '@/lib/types/airports';

export type FetchAirportsOptions = {
  /** Restrict to USA or Canada market snapshot. Defaults to both. */
  market?: GlampingMarketSnapshotMarket | 'all';
  /** Restrict hub sizes. Defaults to large + medium (major / large hubs). */
  hubSizes?: AirportHubSize[];
};

const AIRPORT_SELECT =
  'id, name, iata_code, icao_code, city, state_province, country, latitude, longitude, hub_size, avg_annual_passengers, traffic_year, traffic_metric, data_source, created_at, updated_at';

function normalizeAirportRow(row: Record<string, unknown>): Airport | null {
  const lat = row.latitude == null ? null : Number(row.latitude);
  const lon = row.longitude == null ? null : Number(row.longitude);
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const hub = row.hub_size;
  if (hub !== 'large' && hub !== 'medium' && hub !== 'small') return null;

  return {
    id: Number(row.id),
    name: String(row.name),
    iata_code: String(row.iata_code),
    icao_code: row.icao_code == null ? null : String(row.icao_code),
    city: row.city == null ? null : String(row.city),
    state_province: row.state_province == null ? null : String(row.state_province),
    country: String(row.country ?? 'USA'),
    latitude: lat,
    longitude: lon,
    hub_size: hub,
    avg_annual_passengers:
      row.avg_annual_passengers == null ? null : Number(row.avg_annual_passengers),
    traffic_year: row.traffic_year == null ? null : Number(row.traffic_year),
    traffic_metric: String(row.traffic_metric ?? 'enplanements'),
    data_source: row.data_source == null ? null : String(row.data_source),
    created_at: String(row.created_at ?? ''),
    updated_at: String(row.updated_at ?? ''),
  };
}

async function loadAirports(options: FetchAirportsOptions = {}): Promise<Airport[]> {
  const supabase = createServerClient();
  const hubSizes = options.hubSizes ?? (['large', 'medium'] as AirportHubSize[]);
  const market = options.market ?? 'all';

  let query = supabase
    .from('airports')
    .select(AIRPORT_SELECT)
    .in('hub_size', hubSizes)
    .order('avg_annual_passengers', { ascending: false });

  if (market === 'us') {
    query = query.in('country', ['USA', 'US', 'United States']);
  } else if (market === 'ca') {
    query = query.in('country', ['Canada', 'CA']);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load airports: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => normalizeAirportRow(row as Record<string, unknown>))
    .filter((a): a is Airport => a != null && airportHasCoordinates(a));
}

/**
 * Cached major/large airports for proximity analysis on `/glamping-market-overview`.
 */
export async function fetchAirports(
  options: FetchAirportsOptions = {}
): Promise<{ ok: true; data: Airport[] } | { ok: false; error: string }> {
  const market = options.market ?? 'all';
  const hubKey = (options.hubSizes ?? ['large', 'medium']).slice().sort().join(',');
  try {
    const data = await unstable_cache(
      () => loadAirports(options),
      ['airports', market, hubKey],
      {
        revalidate: GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS,
        tags: ['airports', 'glamping-market-overview'],
      }
    )();
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown airports fetch error',
    };
  }
}
