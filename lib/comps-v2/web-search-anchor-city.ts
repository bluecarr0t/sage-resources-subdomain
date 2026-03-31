import { reverseGeocodeCityUsa } from '@/lib/geocode';

export interface AnchorCityForWebInput {
  structuredCity: string;
  locationLine: string;
  lat: number;
  lng: number;
}

/**
 * City string used in Tavily radius queries. Prefers structured city, then a plausible segment
 * from the place line; if still weak, uses reverse geocode at the discovery anchor.
 */
export async function resolveAnchorCityForWebSearch(input: AnchorCityForWebInput): Promise<string> {
  const sc = input.structuredCity.trim();
  if (sc.length >= 2) return sc;

  const line = input.locationLine.trim();
  const firstComma = line.includes(',') ? line.split(',')[0]?.trim() ?? '' : '';
  const fromLine = firstComma || line;
  if (fromLine.length >= 3 && /[a-z]/i.test(fromLine)) {
    return fromLine;
  }

  const rev = await reverseGeocodeCityUsa(input.lat, input.lng);
  return rev ?? fromLine;
}
