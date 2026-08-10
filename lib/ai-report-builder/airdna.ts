/**
 * Optional AirDNA market snapshot connector (AIRDNA_API_KEY).
 * Soft-fails when unset or API unavailable. Can cache into stvr_market_snapshots.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { parseNum } from '@/lib/comps-v2/geo';

export interface AirdnaSnapshot {
  listing_count: number | null;
  occupancy: number | null;
  adr: number | null;
  market_name: string | null;
  fetched_at: string;
  source: string;
}

function normOcc(v: number | null): number | null {
  if (v == null || !Number.isFinite(v)) return null;
  return v > 1 ? v / 100 : v;
}

function bucketCoord(n: number, precision = 2): number {
  const f = 10 ** precision;
  return Math.round(n * f) / f;
}

export async function fetchAirdnaMarketSnapshot(
  lat: number,
  lng: number,
  supabase?: SupabaseClient
): Promise<AirdnaSnapshot | null> {
  const key = process.env.AIRDNA_API_KEY?.trim();
  if (!key) return null;

  const latB = bucketCoord(lat);
  const lngB = bucketCoord(lng);
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  if (supabase) {
    try {
      const { data } = await supabase
        .from('stvr_market_snapshots')
        .select('listing_count, occupancy, adr, market_name, fetched_at')
        .eq('lat_bucket', latB)
        .eq('lng_bucket', lngB)
        .eq('month', month)
        .eq('source', 'airdna')
        .maybeSingle();
      if (data) {
        return {
          listing_count: parseNum(data.listing_count),
          occupancy: normOcc(parseNum(data.occupancy)),
          adr: parseNum(data.adr),
          market_name: data.market_name != null ? String(data.market_name) : null,
          fetched_at: String(data.fetched_at ?? new Date().toISOString()),
          source: 'airdna_cache',
        };
      }
    } catch {
      // table may not exist yet
    }
  }

  const base = process.env.AIRDNA_API_BASE?.trim() || 'https://api.airdna.co';
  const url = `${base.replace(/\/$/, '')}/v1/market/summary?lat=${lat}&lng=${lng}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`AirDNA HTTP ${res.status}`);
  }
  const json = (await res.json()) as Record<string, unknown>;
  const data = (json.data ?? json) as Record<string, unknown>;
  const snapshot: AirdnaSnapshot = {
    listing_count: parseNum(data.listing_count ?? data.active_listings ?? data.listings),
    occupancy: normOcc(parseNum(data.occupancy ?? data.avg_occupancy)),
    adr: parseNum(data.adr ?? data.average_daily_rate ?? data.avg_adr),
    market_name:
      typeof data.market_name === 'string'
        ? data.market_name
        : typeof data.name === 'string'
          ? data.name
          : null,
    fetched_at: new Date().toISOString(),
    source: 'airdna',
  };

  if (supabase) {
    try {
      await supabase.from('stvr_market_snapshots').upsert(
        {
          lat_bucket: latB,
          lng_bucket: lngB,
          month,
          listing_count: snapshot.listing_count,
          occupancy: snapshot.occupancy,
          adr: snapshot.adr,
          market_name: snapshot.market_name,
          source: 'airdna',
          fetched_at: snapshot.fetched_at,
        } as never,
        { onConflict: 'lat_bucket,lng_bucket,month,source' } as never
      );
    } catch {
      // ignore cache write failures
    }
  }

  return snapshot;
}
