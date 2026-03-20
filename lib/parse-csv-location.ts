/**
 * Parse Sage "Website MAP" CSV location strings for geocoding.
 * State is always the last meaningful segment; city is the segment before state,
 * or everything before the last segment when there are only two parts.
 */

import { resolveUsStateAbbr } from './us-state-centers';

export type ParsedLocation = { city: string; stateRaw: string };

/**
 * Parse "City, ST", "City, ST, USA", or "…, City, ST" (3+ parts → city = penultimate, state = last).
 */
export function parseLocationStringField(location: string): ParsedLocation | null {
  const loc = location.trim();
  if (!loc) return null;

  const segments = loc.split(',').map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) return null;

  let parts = [...segments];
  const lastUpper = parts[parts.length - 1].toUpperCase();
  if (lastUpper === 'USA' || lastUpper === 'US' || lastUpper === 'UNITED STATES') {
    parts.pop();
  }
  if (parts.length < 2) return null;

  const lastSeg = parts[parts.length - 1];
  if (parts.length >= 3 && resolveUsStateAbbr(lastSeg)) {
    const cityName = parts[parts.length - 2];
    if (cityName) return { city: cityName, stateRaw: lastSeg };
  }

  const stateRaw = parts[parts.length - 1];
  const city = parts.slice(0, -1).join(', ');
  if (!city || !stateRaw) return null;
  return { city, stateRaw };
}

/**
 * CSV row: Location column + State column → city + 2-letter state for "City, ST, USA" geocode.
 * Falls back to State column when the location’s second segment is not a real state (legacy bug fix).
 */
export function csvLocationToGeocodeParts(
  locationField: string,
  stateColumn: string
): { city: string; stateAbbr: string | null } {
  const colAbbr = resolveUsStateAbbr(stateColumn.trim());
  const loc = locationField.trim();

  if (!loc) {
    return { city: '', stateAbbr: colAbbr };
  }

  const parsed = parseLocationStringField(loc);
  if (parsed) {
    const fromLoc = resolveUsStateAbbr(parsed.stateRaw);
    if (fromLoc) {
      return { city: parsed.city, stateAbbr: fromLoc };
    }
    if (colAbbr) {
      return { city: parsed.city, stateAbbr: colAbbr };
    }
  }

  if (!loc.includes(',')) {
    return { city: loc, stateAbbr: colAbbr };
  }

  return { city: loc.split(',')[0]?.trim() || loc, stateAbbr: colAbbr };
}

/** True when stored city looks like a street / area fragment, not a municipality (common bad parse). */
function cityLooksLikeAddressFragment(city: string): boolean {
  const t = city.trim();
  if (!t || t.length > 80) return true;
  return (
    /\b(north|south|east|west)\s+of\b/i.test(t) ||
    /^\d+\s/.test(t) ||
    /\b(highway|hwy|mile\s+marker)\b/i.test(t)
  );
}

/**
 * Best city + USPS state for geocoding a report row (DB may have legacy bad `city` from old CSV import).
 */
export function bestCityStateForReportGeocode(row: {
  city: string | null;
  state: string | null;
  location: string | null;
}): { city: string; abbr: string | null } | null {
  const parsed = parseLocationStringField((row.location || '').trim());
  let city = (row.city || '').trim();
  let stateRaw = (row.state || '').trim();

  if (parsed && resolveUsStateAbbr(parsed.stateRaw)) {
    const pAbbr = resolveUsStateAbbr(parsed.stateRaw)!;
    const colAbbr = resolveUsStateAbbr(stateRaw);
    if (!colAbbr || colAbbr === pAbbr) {
      if (!city || cityLooksLikeAddressFragment(city)) {
        city = parsed.city;
      }
      stateRaw = parsed.stateRaw;
    }
  }

  if (!city || !stateRaw) {
    if (parsed) {
      if (!city) city = parsed.city;
      if (!stateRaw) stateRaw = parsed.stateRaw;
    }
  }

  const abbr = resolveUsStateAbbr(stateRaw);
  if (!city || !abbr) return null;
  return { city, abbr };
}
