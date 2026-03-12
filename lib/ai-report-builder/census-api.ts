/**
 * Census Bureau API for fresh demographic data
 * Optional enrichment when include_census_api or include_web_research is true
 * Requires CENSUS_API_KEY (free at census.gov)
 */

/** State abbreviation to Census state FIPS code */
const STATE_ABBR_TO_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17',
  IN: '18', IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24',
  MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31',
  NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38',
  OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46',
  TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56',
};

export interface CensusApiResult {
  population: number | null;
  median_household_income: number | null;
}

/**
 * Fetch state-level demographics from Census ACS 5-Year API
 * Variables: B01003_001E (total pop), B19013_001E (median household income)
 */
export async function fetchCensusStateDemographics(
  stateAbbr: string
): Promise<CensusApiResult> {
  const apiKey = process.env.CENSUS_API_KEY?.trim();
  if (!apiKey) return { population: null, median_household_income: null };

  const stateFips = STATE_ABBR_TO_FIPS[stateAbbr?.toUpperCase().slice(0, 2)];
  if (!stateFips) return { population: null, median_household_income: null };

  const url = new URL('https://api.census.gov/data/2020/acs/acs5');
  url.searchParams.set('get', 'NAME,B01003_001E,B19013_001E');
  url.searchParams.set('for', `state:${stateFips}`);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return { population: null, median_household_income: null };
    const data = (await res.json()) as unknown[][];
    if (!Array.isArray(data) || data.length < 2) return { population: null, median_household_income: null };
    const row = data[1] as unknown[];
    const pop = typeof row[1] === 'number' ? row[1] : typeof row[1] === 'string' ? parseInt(row[1], 10) : null;
    const income = typeof row[2] === 'number' ? row[2] : typeof row[2] === 'string' ? parseInt(row[2], 10) : null;
    return {
      population: pop != null && !Number.isNaN(pop) ? pop : null,
      median_household_income: income != null && !Number.isNaN(income) ? income : null,
    };
  } catch {
    return { population: null, median_household_income: null };
  }
}
