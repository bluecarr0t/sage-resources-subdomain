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
