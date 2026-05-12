import {
  getPropertyCoordinates,
  isInNorthAmerica,
  isLikelyCanadaByCoords,
} from '@/components/map/utils/coordinateUtils';
import { CANADIAN_PROVINCES } from '@/components/map/utils/stateUtils';

const CANADIAN_PROVINCE_CODES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

function explicitUnitedStatesCountry(country: string): boolean {
  const u = country.toUpperCase().trim();
  return u === 'US' || u === 'USA' || u === 'UNITED STATES' || u === 'UNITED STATES OF AMERICA';
}

function explicitCanadaCountry(country: string): boolean {
  const u = country.toUpperCase().trim();
  return u === 'CA' || u === 'CAN' || u === 'CANADA';
}

function isCanadianProperty(property: { country?: string | null; state?: string | null }): boolean {
  const country = String(property.country || '').toUpperCase();
  const state = String(property.state || '').toUpperCase();

  // Never let coordinate heuristics override an explicit United States country value
  if (explicitUnitedStatesCountry(country)) return false;

  if (explicitCanadaCountry(country)) return true;
  if (CANADIAN_PROVINCE_CODES.includes(state)) return true;
  if (CANADIAN_PROVINCES.some((province) => province.toUpperCase() === state)) return true;

  const coords = getPropertyCoordinates(property);
  if (coords && isLikelyCanadaByCoords(coords.lat, coords.lon)) return true;

  return false;
}

function isUSProperty(property: { country?: string | null; state?: string | null }): boolean {
  const country = String(property.country || '').toUpperCase();
  const state = String(property.state || '').toUpperCase();

  // Never let coordinate heuristics override an explicit Canada country value
  if (explicitCanadaCountry(country)) return false;

  if (explicitUnitedStatesCountry(country)) {
    return true;
  }

  const isCanadianProvince =
    CANADIAN_PROVINCE_CODES.includes(state) ||
    CANADIAN_PROVINCES.some((province) => province.toUpperCase() === state);

  if ((!country || country === '' || country === 'NULL') && !isCanadianProvince && state && state.length === 2) {
    return true;
  }
  if (country && (country.includes('US') || country.includes('UNITED STATES'))) return true;

  const coords = getPropertyCoordinates(property);
  if (coords) {
    if (isInNorthAmerica(coords.lat, coords.lon) && !isLikelyCanadaByCoords(coords.lat, coords.lon)) {
      return true;
    }
  }

  return false;
}

function titleCaseCountry(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/**
 * Canonical country label for map filters and sidebar (matches MultiSelect values).
 */
export function getMapCountryFilterKey(property: { country?: string | null; state?: string | null }): string | null {
  const raw = String(property.country || '').trim();
  const upper = raw.toUpperCase();

  // Explicit country always wins over province/coordinate inference
  if (explicitUnitedStatesCountry(upper)) return 'United States';
  if (explicitCanadaCountry(upper)) return 'Canada';

  if (isCanadianProperty(property)) return 'Canada';
  if (isUSProperty(property)) return 'United States';

  if (!raw || upper === 'NULL') return null;

  return titleCaseCountry(raw);
}

/**
 * Client-side country filter for map markers.
 * - `filterCountry.length === 0` means every country in the loaded dataset.
 * - Single-country filters use the same canonical key as {@link getMapCountryFilterKey} so counts,
 *   markers, and sidebar labels stay aligned.
 */
export function propertyMatchesCountryFilters(property: { country?: string | null; state?: string | null }, filterCountry: string[]): boolean {
  if (filterCountry.length === 0) return true;

  if (filterCountry.length === 1 && filterCountry[0] === 'United States') {
    return getMapCountryFilterKey(property) === 'United States';
  }

  if (filterCountry.length === 1 && filterCountry[0] === 'Canada') {
    return getMapCountryFilterKey(property) === 'Canada';
  }

  const key = getMapCountryFilterKey(property);
  if (!key) return false;

  return filterCountry.some((f) => {
    if (f === 'Canada') return isCanadianProperty(property);
    if (f === 'United States') return isUSProperty(property) && !isCanadianProperty(property);
    return key === f;
  });
}
