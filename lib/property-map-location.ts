/**
 * Resolve map center / place query for property listing pages.
 */

import { geocodePlaceLine } from '@/lib/geocode';
import { parseCoordinates, type SageProperty } from '@/lib/types/sage';

export function buildPropertyMapQueryLabel(
  property: Pick<SageProperty, 'property_name' | 'address' | 'city' | 'state' | 'country'>
): string | null {
  const parts: string[] = [];
  if (property.property_name?.trim()) parts.push(property.property_name.trim());
  if (property.address?.trim()) parts.push(property.address.trim());

  const city = property.city?.trim();
  const state = property.state?.trim();
  const locality = [city, state].filter(Boolean).join(', ');
  if (locality) parts.push(locality);

  const country = property.country?.trim();
  if (country) {
    const haystack = parts.join(', ').toLowerCase();
    if (!haystack.includes(country.toLowerCase())) {
      parts.push(country);
    }
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

/** Prefer stored lat/lon; geocode city/state/name when missing (e.g. Hipcamp-only rows). */
export async function resolvePropertyMapCoordinates(
  property: Pick<SageProperty, 'lat' | 'lon' | 'property_name' | 'address' | 'city' | 'state' | 'country'>
): Promise<[number, number] | null> {
  const fromDb = parseCoordinates(property.lat, property.lon);
  if (fromDb) return fromDb;

  const query = buildPropertyMapQueryLabel(property);
  if (!query) return null;

  const geo = await geocodePlaceLine(query);
  if (!geo) return null;

  return [geo.lat, geo.lng];
}
