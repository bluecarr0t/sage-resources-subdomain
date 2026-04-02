import { geocodeAddress, geocodeNominatim } from '@/lib/geocode';

function isUnitedStatesHint(country: string): boolean {
  const c = country.trim();
  if (!c) return true;
  return /^united states$/i.test(c) || c === 'US' || c === 'USA';
}

async function geocodeZipSingleCountry(
  zip: string,
  countryHint: string
): Promise<{ lat: number; lng: number } | null> {
  const z = zip.trim();
  if (!z) return null;
  const country = countryHint?.trim() || 'United States';

  const r = await geocodeAddress('', '', '', z, country);
  if (r && Number.isFinite(r.lat) && Number.isFinite(r.lng)) {
    return { lat: r.lat, lng: r.lng };
  }

  const primary = await geocodeNominatim(`${z}, ${country}`);
  if (primary && Number.isFinite(primary.lat) && Number.isFinite(primary.lng)) {
    return { lat: primary.lat, lng: primary.lng };
  }

  if (isUnitedStatesHint(country)) {
    const us = await geocodeNominatim(`${z}, USA`);
    if (us && Number.isFinite(us.lat) && Number.isFinite(us.lng)) {
      return { lat: us.lat, lng: us.lng };
    }
  }

  return null;
}

/**
 * Geocode a US/CAN/MEX-style postal code + country context for radius filtering.
 * Tries Google Geocoding when configured, then OpenStreetMap Nominatim (no API key).
 * With multiple selected countries, uses a combined Nominatim query, then falls back per country.
 */
export async function geocodeZipForSitesExport(
  zip: string,
  countries: string[]
): Promise<{ lat: number; lng: number } | null> {
  const z = zip.trim();
  if (!z) return null;
  const trimmed = countries.map((c) => c.trim()).filter(Boolean);

  if (trimmed.length === 0) {
    return geocodeZipSingleCountry(z, 'United States');
  }
  if (trimmed.length === 1) {
    return geocodeZipSingleCountry(z, trimmed[0]!);
  }

  const multiQuery = `${z}, ${trimmed.join(', ')}`;
  const nomMulti = await geocodeNominatim(multiQuery);
  if (nomMulti && Number.isFinite(nomMulti.lat) && Number.isFinite(nomMulti.lng)) {
    return { lat: nomMulti.lat, lng: nomMulti.lng };
  }

  for (const country of trimmed) {
    const one = await geocodeZipSingleCountry(z, country);
    if (one) return one;
  }

  return null;
}
