/**
 * State abbreviation to full name mapping
 */
export const STATE_ABBREVIATIONS: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia',
  // Canadian provinces
  'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick',
  'NL': 'Newfoundland and Labrador', 'NS': 'Nova Scotia', 'NT': 'Northwest Territories',
  'NU': 'Nunavut', 'ON': 'Ontario', 'PE': 'Prince Edward Island', 'QC': 'Quebec',
  'SK': 'Saskatchewan', 'YT': 'Yukon'
};

/** Lowercase full name → USPS / province code (built from `STATE_ABBREVIATIONS`). */
const FULL_NAME_TO_ABBREV: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const [abbr, full] of Object.entries(STATE_ABBREVIATIONS)) {
    m[full.toLowerCase()] = abbr;
  }
  return m;
})();

/**
 * Display a state/province as a 2-letter abbreviation when it matches
 * `STATE_ABBREVIATIONS` (US, DC, Canadian provinces). Handles full names
 * ("Texas" → "TX"), existing codes ("tx" → "TX"), and comma/semicolon lists.
 * Unknown values are returned trimmed (uppercased if very short).
 */
export function formatStateAbbreviation(state: string | null | undefined): string {
  if (state == null) return '-';
  const raw = String(state).trim();
  if (!raw) return '-';

  const sep = raw.includes(',') ? ',' : raw.includes(';') ? ';' : null;
  if (sep) {
    const parts = raw.split(sep).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return '-';
    return parts.map((p) => formatSingleStateAbbreviation(p)).join(', ');
  }

  return formatSingleStateAbbreviation(raw);
}

function formatSingleStateAbbreviation(s: string): string {
  const upper = s.toUpperCase();
  if (STATE_ABBREVIATIONS[upper]) {
    return upper;
  }
  const fromFull = FULL_NAME_TO_ABBREV[s.toLowerCase()];
  if (fromFull) {
    return fromFull;
  }
  if (s.length <= 4) {
    return upper;
  }
  return s;
}

/**
 * Map a raw `state` value from the DB (e.g. "AL", "Alabama", "ALABAMA") to a
 * single canonical 2-letter code when it matches `STATE_ABBREVIATIONS`.
 * Returns null when no match (pass through as unknown in facets / filters).
 */
export function normalizeStateToCanonicalAbbrev(state: string | null | undefined): string | null {
  if (state == null || !String(state).trim()) return null;
  const s = String(state).trim();
  const upper = s.toUpperCase();
  if (STATE_ABBREVIATIONS[upper]) {
    return upper;
  }
  const fromFull = FULL_NAME_TO_ABBREV[s.toLowerCase()];
  if (fromFull) {
    return fromFull;
  }
  return null;
}

/**
 * Expand canonical state filter values (abbreviations from the UI) to every
 * string variant we store in `unified_comps.state`, so PostgREST `.in('state', …)`
 * matches rows regardless of casing or full-name vs abbreviation.
 */
export function expandStateValuesForInQuery(selected: string[]): string[] {
  const out = new Set<string>();
  for (const raw of selected) {
    const t = raw.trim();
    if (!t) continue;
    const abbr = normalizeStateToCanonicalAbbrev(t);
    if (abbr) {
      const full = STATE_ABBREVIATIONS[abbr];
      if (full) {
        out.add(abbr);
        out.add(full);
        out.add(full.toUpperCase());
        out.add(full.toLowerCase());
        const title = full
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        out.add(title);
      } else {
        out.add(abbr);
      }
    } else {
      out.add(t);
    }
  }
  return [...out];
}

/**
 * Canadian provinces to exclude from state filter
 */
export const CANADIAN_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Nova Scotia', 'Northwest Territories',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
  'Saskatchewan', 'Yukon'
];

/**
 * Convert state abbreviation(s) to full state name(s)
 * Handles multiple states separated by commas, and preserves full names
 */
export function getFullStateName(state: string | null): string | null {
  if (!state) return null;
  
  // Handle multiple states separated by commas or semicolons
  const stateSeparator = state.includes(',') ? ',' : (state.includes(';') ? ';' : null);
  
  if (stateSeparator) {
    const states = state.split(stateSeparator).map(s => s.trim()).filter(Boolean);
    const fullNames = states.map(s => {
      const upperState = s.toUpperCase();
      return STATE_ABBREVIATIONS[upperState] || s;
    });
    return fullNames.join(', ');
  }
  
  // Single state - check if it's an abbreviation
  const upperState = state.toUpperCase();
  return STATE_ABBREVIATIONS[upperState] || state;
}

/**
 * Create a set of all state variations for filtering
 * Includes abbreviations, full names, and case variations
 */
export function createStateFilterSet(filterState: string[]): Set<string> {
  const filterStateSet = new Set<string>();
  
  if (filterState.length === 0) {
    return filterStateSet;
  }
  
  filterState.forEach((state) => {
    filterStateSet.add(state);
    filterStateSet.add(state.toUpperCase());
    filterStateSet.add(state.toLowerCase());
    filterStateSet.add(state.charAt(0).toUpperCase() + state.slice(1).toLowerCase());
    
    // Add abbreviation if it's a full name
    const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
      ([_, fullName]) => fullName.toLowerCase() === state.toLowerCase()
    );
    if (abbreviation) {
      filterStateSet.add(abbreviation[0]);
      filterStateSet.add(abbreviation[0].toUpperCase());
    }
    
    // Add full name if it's an abbreviation
    if (STATE_ABBREVIATIONS[state.toUpperCase()]) {
      const fullName = STATE_ABBREVIATIONS[state.toUpperCase()];
      filterStateSet.add(fullName);
      filterStateSet.add(fullName.toUpperCase());
      filterStateSet.add(fullName.toLowerCase());
    }
  });
  
  return filterStateSet;
}

/**
 * Check if a state matches the filter
 */
export function stateMatchesFilter(state: string | null, filterStateSet: Set<string>): boolean {
  if (!state) return false;
  if (filterStateSet.size === 0) return true; // No filter = all match
  
  const stateStr = String(state);
  return filterStateSet.has(stateStr) || 
         filterStateSet.has(stateStr.toUpperCase()) ||
         filterStateSet.has(stateStr.toLowerCase()) ||
         filterStateSet.has(stateStr.charAt(0).toUpperCase() + stateStr.slice(1).toLowerCase());
}
