/**
 * Geocode an address using Google Maps Geocoding API
 * Returns lat/lng or null if geocoding fails
 */

import { resolveUsStateAbbr } from '@/lib/us-state-centers';

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** US state abbreviation when known (Google components, request, or parsed from freeform line). */
  stateAbbr?: string;
}

const US_STATE_2 = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
  'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND',
  'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]);

type GoogleAddressComponent = { short_name: string; long_name: string; types: string[] };

function extractUsStateFromGoogleComponents(components?: GoogleAddressComponent[]): string | undefined {
  if (!components?.length) return undefined;
  let country = '';
  let admin1 = '';
  for (const c of components) {
    if (c.types.includes('country')) country = c.short_name;
    if (c.types.includes('administrative_area_level_1')) admin1 = c.short_name;
  }
  if (country === 'US' && admin1.length === 2 && US_STATE_2.has(admin1.toUpperCase())) {
    return admin1.toUpperCase();
  }
  return undefined;
}

/** Parse ", ST" or ", ST 12345" patterns from a US place line (e.g. "Austin, TX"). */
export function inferUsStateAbbrFromText(text: string): string | undefined {
  const t = text.trim();
  const m = t.match(/,\s*([A-Za-z]{2})(?:\s+\d{5}|\s*,|\s*$)/);
  if (!m) return undefined;
  const code = m[1].toUpperCase();
  return US_STATE_2.has(code) ? code : undefined;
}

function enrichGeocodeState(
  r: GeocodeResult,
  hints: { locationLine?: string; bodyState?: string }
): GeocodeResult {
  const body = hints.bodyState?.trim().toUpperCase().slice(0, 2);
  const fromBody = body?.length === 2 && US_STATE_2.has(body) ? body : undefined;
  const fromLine = hints.locationLine ? inferUsStateAbbrFromText(hints.locationLine) : undefined;
  return {
    ...r,
    stateAbbr: r.stateAbbr ?? fromBody ?? fromLine,
  };
}

/**
 * Key used for Geocoding API (server-side fetch). Prefer NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * so imports/scripts match the Maps JS key; GOOGLE_MAPS_API_KEY is an optional server-only override.
 */
function getGoogleGeocodingApiKey(): string | undefined {
  const pub = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const server = process.env.GOOGLE_MAPS_API_KEY?.trim();
  return pub || server || undefined;
}

export async function geocodeAddress(
  address: string,
  city: string,
  state: string,
  zipCode: string,
  country: string
): Promise<GeocodeResult | null> {
  const fullAddress = [address?.trim(), city?.trim(), state?.trim(), zipCode?.trim(), country?.trim()]
    .filter(Boolean)
    .join(', ');

  if (!fullAddress) return null;

  const apiKey = getGoogleGeocodingApiKey();

  if (!apiKey) {
    console.warn(
      '[geocode] No Google Maps API key; set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY) for geocoding'
    );
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      status: string;
      error_message?: string;
      results?: Array<{
        geometry: { location: { lat: number; lng: number } };
        address_components?: GoogleAddressComponent[];
      }>;
    };

    if (data.status === 'OK' && data.results?.[0]) {
      const row = data.results[0];
      const location = row.geometry.location;
      const stateAbbr = extractUsStateFromGoogleComponents(row.address_components);
      return { lat: location.lat, lng: location.lng, ...(stateAbbr ? { stateAbbr } : {}) };
    }
    if (data.status && data.status !== 'OK') {
      console.warn(
        '[geocode] Google Geocoding:',
        data.status,
        data.error_message ?? '',
        fullAddress.slice(0, 100)
      );
    }
    return null;
  } catch (err) {
    console.error('[geocode] Error:', err);
    return null;
  }
}

/**
 * Geocode a single freeform US place line, e.g. "Grants Pass, OR, USA".
 * Prefer this for city-level pins so the query matches what users type.
 */
/**
 * Google Places Find Place From Text (legacy) — strong for business/place names vs street geocoding.
 * Uses the same API key as Geocoding. Enable "Places API" in Google Cloud if requests return REQUEST_DENIED.
 */
export async function googlePlacesFindPlaceLatLng(
  input: string,
  locationBias?: { lat: number; lng: number; radiusMeters?: number }
): Promise<GeocodeResult | null> {
  const line = input?.trim();
  if (!line) return null;

  const apiKey = getGoogleGeocodingApiKey();
  if (!apiKey) return null;

  let url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(line)}&inputtype=textquery&fields=geometry&key=${apiKey}`;
  if (
    locationBias &&
    Number.isFinite(locationBias.lat) &&
    Number.isFinite(locationBias.lng)
  ) {
    const r = Math.min(
      50_000,
      Math.max(2000, Math.floor(locationBias.radiusMeters ?? 80_000))
    );
    url += `&locationbias=circle:${r}@${locationBias.lat},${locationBias.lng}`;
  }

  try {
    const response = await fetch(url);
    const data = (await response.json()) as {
      status?: string;
      error_message?: string;
      candidates?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
    };

    const loc = data.candidates?.[0]?.geometry?.location;
    if (data.status === 'OK' && loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
      return { lat: loc.lat, lng: loc.lng };
    }
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.warn('[geocode] Google Places Find Place:', data.status, data.error_message ?? '', line.slice(0, 80));
    }
    return null;
  } catch (err) {
    console.error('[geocode] Places Find Place error:', err);
    return null;
  }
}

export async function geocodePlaceLine(addressLine: string): Promise<GeocodeResult | null> {
  const line = addressLine?.trim();
  if (!line) return null;

  const apiKey = getGoogleGeocodingApiKey();

  if (!apiKey) {
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(line)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = (await response.json()) as {
      status: string;
      error_message?: string;
      results?: Array<{
        geometry: { location: { lat: number; lng: number } };
        address_components?: GoogleAddressComponent[];
      }>;
    };

    if (data.status === 'OK' && data.results?.[0]) {
      const row = data.results[0];
      const location = row.geometry.location;
      const stateAbbr = extractUsStateFromGoogleComponents(row.address_components);
      return { lat: location.lat, lng: location.lng, ...(stateAbbr ? { stateAbbr } : {}) };
    }
    if (data.status && data.status !== 'OK') {
      console.warn(
        '[geocode] Google Geocoding:',
        data.status,
        data.error_message ?? '',
        line.slice(0, 100)
      );
    }
    return null;
  } catch (err) {
    console.error('[geocode] Error:', err);
    return null;
  }
}

/** Geocode a US city + state (e.g. Grants Pass, OR) using a single "City, State, USA" place query. */
export async function geocodeCityStateUsa(
  city: string,
  state: string
): Promise<GeocodeResult | null> {
  const c = city?.trim();
  const s = state?.trim();
  if (!c || !s) return null;
  return geocodePlaceLine(`${c}, ${s}, USA`);
}

const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT?.trim() ||
  'SageResourcesSubdomain/1.0 (https://sageoutdooradvisory.com; admin geocoding)';

/**
 * Reverse geocode to a US locality name (city / town) for web search anchor copy.
 * Tries Google when a key is set, then Nominatim.
 */
export async function reverseGeocodeCityUsa(lat: number, lng: number): Promise<string | null> {
  const apiKey = getGoogleGeocodingApiKey();
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        status?: string;
        results?: Array<{ address_components?: GoogleAddressComponent[] }>;
      };
      if (data.status === 'OK' && data.results?.[0]?.address_components) {
        const comps = data.results[0].address_components;
        for (const c of comps) {
          if (c.types.includes('locality')) return c.long_name;
        }
        for (const c of comps) {
          if (c.types.includes('sublocality') || c.types.includes('sublocality_level_1')) {
            return c.long_name;
          }
        }
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_UA },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      address?: { city?: string; town?: string; village?: string; municipality?: string };
    };
    const a = data.address;
    return a?.city || a?.town || a?.village || a?.municipality || null;
  } catch {
    return null;
  }
}

/**
 * Reverse geocode to US locality + state; used to verify forward geocodes match the expected state.
 */
export async function reverseGeocodeLocalityAndStateUsa(
  lat: number,
  lng: number
): Promise<{ locality: string | null; stateAbbr: string | null }> {
  const apiKey = getGoogleGeocodingApiKey();
  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(url);
      const data = (await response.json()) as {
        status?: string;
        results?: Array<{ address_components?: GoogleAddressComponent[] }>;
      };
      if (data.status === 'OK' && data.results?.[0]?.address_components) {
        const comps = data.results[0].address_components;
        let locality: string | null = null;
        let stateAbbr: string | null = null;
        for (const c of comps) {
          if (c.types.includes('locality')) locality = c.long_name;
          if (c.types.includes('administrative_area_level_1')) {
            const s = c.short_name?.toUpperCase().slice(0, 2);
            if (s && US_STATE_2.has(s)) stateAbbr = s;
          }
        }
        if (!locality) {
          for (const c of comps) {
            if (c.types.includes('sublocality') || c.types.includes('sublocality_level_1')) {
              locality = c.long_name;
              break;
            }
          }
        }
        if (locality || stateAbbr) return { locality, stateAbbr };
      }
    } catch {
      /* fall through */
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_UA },
    });
    if (!response.ok) return { locality: null, stateAbbr: null };
    const data = (await response.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        state?: string;
      };
    };
    const a = data.address;
    const locality =
      a?.city || a?.town || a?.village || a?.municipality || null;
    const stateAbbr = a?.state ? resolveUsStateAbbr(a.state) : null;
    return { locality, stateAbbr };
  } catch {
    return { locality: null, stateAbbr: null };
  }
}

/**
 * OpenStreetMap Nominatim (no API key). Use as fallback when Google Geocoding is unavailable.
 * Respect OSM usage policy: low volume, identify app via User-Agent.
 */
export async function geocodeNominatim(query: string): Promise<GeocodeResult | null> {
  const q = query?.trim();
  if (!q) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': NOMINATIM_UA },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ lat: string; lon: string }>;
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (err) {
    console.warn('[geocode] Nominatim error:', err);
    return null;
  }
}

export interface GeocodeSearchInput {
  locationLine?: string;
  address1?: string;
  city?: string;
  /** US state abbreviation (2 letters) preferred */
  state?: string;
  zip?: string;
}

/**
 * Resolve lat/lng for comps-v2: try Google first (when key present), then Nominatim.
 * Supports freeform line, structured address, or city + state alone.
 */
export async function resolveGeocodeForCompsSearch(input: GeocodeSearchInput): Promise<GeocodeResult | null> {
  const line = input.locationLine?.trim();
  const address1 = input.address1?.trim() ?? '';
  const city = input.city?.trim() ?? '';
  const zip = input.zip?.trim() ?? '';
  const stateRaw = input.state?.trim() ?? '';
  const stateCandidate = stateRaw.length >= 2 ? stateRaw.toUpperCase().slice(0, 2) : '';
  const stateAbbrInput = stateCandidate.length === 2 && US_STATE_2.has(stateCandidate) ? stateCandidate : '';

  const hints = { locationLine: line, bodyState: stateAbbrInput || undefined };

  if (line) {
    const g = await geocodePlaceLine(line);
    if (g) return enrichGeocodeState(g, hints);
    const n = await geocodeNominatim(line);
    if (n) return enrichGeocodeState(n, hints);
  }

  const hasStructured = !!(address1 || city || stateRaw || zip);
  if (hasStructured) {
    const g = await geocodeAddress(address1, city, stateAbbrInput || stateRaw, zip, 'USA');
    if (g) return enrichGeocodeState(g, hints);
    const nomQuery = [address1, city, stateAbbrInput || stateRaw, zip, 'United States'].filter(Boolean).join(', ');
    if (nomQuery) {
      const n = await geocodeNominatim(nomQuery);
      if (n) return enrichGeocodeState(n, hints);
    }
  }

  if (city && stateAbbrInput) {
    const g = await geocodeCityStateUsa(city, stateAbbrInput);
    if (g) return enrichGeocodeState({ ...g, stateAbbr: g.stateAbbr ?? stateAbbrInput }, hints);
    const n = await geocodeNominatim(`${city}, ${stateAbbrInput}, United States`);
    if (n) return enrichGeocodeState({ ...n, stateAbbr: n.stateAbbr ?? stateAbbrInput }, hints);
  }

  return null;
}

/** Resolve 2-letter US state for comps search: explicit body, then geocoder, then parsed freeform line. */
export function coalesceUsStateAbbrForComps(
  bodyStateRaw: string,
  coords: GeocodeResult,
  locationLine: string
): string {
  const body = bodyStateRaw.trim().toUpperCase().slice(0, 2);
  if (body.length === 2 && US_STATE_2.has(body)) return body;
  if (coords.stateAbbr && US_STATE_2.has(coords.stateAbbr)) return coords.stateAbbr;
  return inferUsStateAbbrFromText(locationLine) ?? '';
}
