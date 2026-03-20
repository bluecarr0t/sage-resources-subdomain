/**
 * Geocode an address using Google Maps Geocoding API
 * Returns lat/lng or null if geocoding fails
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
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
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };

    if (data.status === 'OK' && data.results?.[0]) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
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
      results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
    };

    if (data.status === 'OK' && data.results?.[0]) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
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
