/**
 * Nearest major airport for feasibility enrich (from airports table).
 */

import { haversineDistanceMiles } from '@/lib/comps-v2/geo';
import { loadAirports } from '@/lib/fetch-airports';

export interface NearestAirportResult {
  name: string;
  iata_code: string;
  city: string | null;
  state_province: string | null;
  distance_miles: number;
  avg_annual_passengers: number | null;
  hub_size: string;
  fetched_at: string;
  source: string;
}

export async function fetchNearestAirport(
  lat: number,
  lng: number
): Promise<NearestAirportResult | null> {
  try {
    const airports = await loadAirports({ market: 'us', hubSizes: ['large', 'medium'] });

    let best: NearestAirportResult | null = null;
    for (const a of airports) {
      const d = haversineDistanceMiles(lat, lng, a.latitude, a.longitude);
      if (!best || d < best.distance_miles) {
        best = {
          name: a.name,
          iata_code: a.iata_code,
          city: a.city,
          state_province: a.state_province,
          distance_miles: Math.round(d * 10) / 10,
          avg_annual_passengers: a.avg_annual_passengers,
          hub_size: a.hub_size,
          fetched_at: new Date().toISOString(),
          source: 'airports',
        };
      }
    }
    return best;
  } catch (err) {
    console.warn('[nearest-airport]', err);
    return null;
  }
}

export function formatNearestAirportForPrompt(
  a: NearestAirportResult | undefined | null
): string {
  if (!a) return '';
  const pax =
    a.avg_annual_passengers != null
      ? `${Math.round(a.avg_annual_passengers).toLocaleString()} annual passengers`
      : 'passenger volume n/a';
  return `Nearest major airport: ${a.name} (${a.iata_code}), ${a.distance_miles} mi — ${pax} [${a.hub_size} hub]`;
}
