/**
 * Geocode an address using Google Maps Geocoding API
 * Returns lat/lng or null if geocoding fails
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
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

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn('[geocode] No Google Maps API key; skipping geocoding');
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results?.[0]) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (err) {
    console.error('[geocode] Error:', err);
    return null;
  }
}
