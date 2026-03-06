/** Full state name → abbreviation for parsing overview location strings */
const STATE_FULL_TO_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};

/** State names sorted by length descending so "new york" matches before "york" */
const STATE_NAMES_BY_LENGTH = Object.keys(STATE_FULL_TO_ABBR).sort((a, b) => b.length - a.length);
const VALID_STATE_ABBR = new Set(Object.values(STATE_FULL_TO_ABBR));

/**
 * Extract state abbreviation from comparable overview (e.g. "Location: Montana. Unit types: ..." → "MT").
 * Prefers comparable's location over report state.
 * Handles regional names like "Texas Hill Country" by detecting contained state names.
 */
export function getStateFromComparableOverview(overview: string | null): string | null {
  if (!overview?.trim()) return null;
  const locMatch = overview.match(/Location:\s*([^.]+)/i);
  if (!locMatch) return null;
  const loc = locMatch[1].trim();
  if (!loc) return null;
  // "City, ST" or "City, State" or just "State"
  const cityStateMatch = loc.match(/,\s*([A-Za-z\s]+)$/);
  if (cityStateMatch) {
    const lastPart = cityStateMatch[1].trim();
    if (/^[A-Z]{2}$/i.test(lastPart)) return lastPart.toUpperCase();
    const abbr = STATE_FULL_TO_ABBR[lastPart.toLowerCase()];
    if (abbr) return abbr;
  }
  // Whole string is state name (e.g. "Montana")
  const abbr = STATE_FULL_TO_ABBR[loc.toLowerCase()];
  if (abbr) return abbr;
  if (/^[A-Z]{2}$/i.test(loc)) return loc.toUpperCase();
  // Regional names (e.g. "Texas Hill Country", "California Central Coast"): detect contained state name
  const locLower = loc.toLowerCase();
  for (const stateName of STATE_NAMES_BY_LENGTH) {
    const re = new RegExp(`\\b${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(locLower)) return STATE_FULL_TO_ABBR[stateName];
  }
  return null;
}

/**
 * Parse location text to extract city + state and return normalized "Location: City, ST" format.
 * Handles: "Austin, TX", "Austin, Texas", "Texas", "Texas Hill Country", "Wimberley, TX - cabins".
 * Returns { locationFormatted, state } when parseable, null otherwise.
 */
export function parseLocationAndState(text: string | null): { locationFormatted: string; state: string } | null {
  if (!text?.trim()) return null;
  const s = text.trim();
  // "City, ST" — two-letter state abbreviation
  const cityAbbrMatch = s.match(/^([^,]+),\s*([A-Z]{2})\b/i);
  if (cityAbbrMatch && VALID_STATE_ABBR.has(cityAbbrMatch[2].toUpperCase())) {
    const city = cityAbbrMatch[1].trim();
    const st = cityAbbrMatch[2].toUpperCase();
    return { locationFormatted: `${city}, ${st}`, state: st };
  }
  // "City, State" — full state name
  const cityStateMatch = s.match(/^([^,]+),\s*([A-Za-z\s]+?)(?:\s*[-–—|.]|$)/);
  if (cityStateMatch) {
    const city = cityStateMatch[1].trim();
    const statePart = cityStateMatch[2].trim();
    const abbr = STATE_FULL_TO_ABBR[statePart.toLowerCase()];
    if (abbr) return { locationFormatted: `${city}, ${abbr}`, state: abbr };
  }
  // Whole string is state name or abbreviation
  const abbr = STATE_FULL_TO_ABBR[s.toLowerCase()];
  if (abbr) return { locationFormatted: abbr, state: abbr };
  if (/^[A-Z]{2}$/i.test(s) && VALID_STATE_ABBR.has(s.toUpperCase())) {
    return { locationFormatted: s.toUpperCase(), state: s.toUpperCase() };
  }
  // Regional names: "Texas Hill Country" → TX
  const locLower = s.toLowerCase();
  for (const stateName of STATE_NAMES_BY_LENGTH) {
    const re = new RegExp(`\\b${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(locLower)) {
      const st = STATE_FULL_TO_ABBR[stateName];
      return { locationFormatted: st, state: st };
    }
  }
  return null;
}

/**
 * Extract state from any text by detecting contained state names (e.g. "Texas Hill Country Resort" → "TX").
 * Use as fallback when overview has no Location field but comp_name contains a state.
 */
export function getStateFromText(text: string | null): string | null {
  if (!text?.trim()) return null;
  const lower = text.toLowerCase();
  for (const stateName of STATE_NAMES_BY_LENGTH) {
    const re = new RegExp(`\\b${stateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(lower)) return STATE_FULL_TO_ABBR[stateName];
  }
  const abbrMatch = text.match(/\b([A-Z]{2})\b/);
  if (abbrMatch && VALID_STATE_ABBR.has(abbrMatch[1].toUpperCase())) return abbrMatch[1].toUpperCase();
  return null;
}

/**
 * Returns true if a comp unit has a valid displayable unit type and site count.
 * Filters out: num_units = 0, empty unit_type, "0", or unit_type that is only digits.
 */
export function isValidCompUnit<T extends { unit_type?: string | null; num_units?: number | null }>(
  unit: T
): boolean {
  const name = (unit.unit_type ?? '').trim();
  if (!name) return false;
  if (name === '0') return false;
  if (/^\d+$/.test(name)) return false;
  if (unit.num_units === 0) return false;
  return true;
}

/**
 * Filters comp units to exclude invalid/placeholder rows (0 sites, empty or numeric-only unit types).
 */
export function filterValidCompUnits<T extends { unit_type?: string | null; num_units?: number | null }>(
  units: T[]
): T[] {
  return (units || []).filter(isValidCompUnit);
}

/**
 * Normalizes a stored quality score to a 0–5 display scale.
 * DB may store 0–10 or 0–5; we always show 0–5.
 * If score > 5, treat as 0–10 and divide by 2.
 */
export function qualityScoreToDisplay(score: number | null): number | null {
  if (score === null || typeof score !== 'number' || Number.isNaN(score)) return null;
  if (score > 5) return Math.round(score / 2 * 10) / 10; // 0–10 → 0–5, 1 decimal
  return Math.round(score * 10) / 10; // already 0–5
}
