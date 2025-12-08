/**
 * Parse population CSV files and extract county population data
 */

export interface CountyPopulationData {
  geoId: string;
  name: string;
  population2010: number | null;
  population2020: number | null;
}

export interface PopulationLookup {
  [key: string]: {
    2010: number | null;
    2020: number | null;
  };
}

/**
 * Normalize county name for consistent matching
 * Examples:
 * - "Autauga County, Alabama" -> "autauga county alabama"
 * - "St. Louis County, Missouri" -> "st louis county missouri"
 */
export function normalizeCountyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,]/g, '') // Remove periods and commas
    .replace(/\b(st\.|saint)\b/gi, 'st') // Normalize "St." or "Saint" to "st"
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Parse a single CSV row for 2020 census data
 */
function parse2020Row(row: Record<string, string>): { geoId: string; name: string; population: number | null } | null {
  const geoId = row.GEO_ID?.trim();
  const name = row.NAME?.trim();
  const populationStr = row.P1_001N?.trim(); // Total population column for 2020

  if (!geoId || !name || name === 'Geography' || name === 'Geographic Area Name') {
    return null; // Skip header rows
  }

  const population = populationStr ? parseInt(populationStr, 10) : null;
  if (population !== null && isNaN(population)) {
    return null;
  }

  return { geoId, name, population };
}

/**
 * Parse a single CSV row for 2010 census data
 */
function parse2010Row(row: Record<string, string>): { geoId: string; name: string; population: number | null } | null {
  const geoId = row.GEO_ID?.trim();
  const name = row.NAME?.trim();
  const populationStr = row.P001001?.trim(); // Total population column for 2010

  if (!geoId || !name || name === 'Geography' || name === 'Geographic Area Name') {
    return null; // Skip header rows
  }

  const population = populationStr ? parseInt(populationStr, 10) : null;
  if (population !== null && isNaN(population)) {
    return null;
  }

  return { geoId, name, population };
}

/**
 * Parse 2020 census CSV data
 */
export async function parse2020CensusCSV(csvContent: string): Promise<Map<string, { geoId: string; name: string; population: number | null }>> {
  const { parse } = await import('csv-parse/sync');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const dataMap = new Map<string, { geoId: string; name: string; population: number | null }>();

  for (const row of records) {
    const parsed = parse2020Row(row);
    if (parsed) {
      const normalizedName = normalizeCountyName(parsed.name);
      dataMap.set(normalizedName, parsed);
    }
  }

  return dataMap;
}

/**
 * Parse 2010 census CSV data
 */
export async function parse2010CensusCSV(csvContent: string): Promise<Map<string, { geoId: string; name: string; population: number | null }>> {
  const { parse } = await import('csv-parse/sync');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const dataMap = new Map<string, { geoId: string; name: string; population: number | null }>();

  for (const row of records) {
    const parsed = parse2010Row(row);
    if (parsed) {
      const normalizedName = normalizeCountyName(parsed.name);
      dataMap.set(normalizedName, parsed);
    }
  }

  return dataMap;
}

/**
 * Combine 2010 and 2020 census data into a unified lookup map
 */
export async function combineCensusData(
  csv2010: string,
  csv2020: string
): Promise<{
  lookup: PopulationLookup;
  counties: CountyPopulationData[];
}> {
  const [data2010, data2020] = await Promise.all([
    parse2010CensusCSV(csv2010),
    parse2020CensusCSV(csv2020),
  ]);

  const lookup: PopulationLookup = {};
  const counties: CountyPopulationData[] = [];
  const processedKeys = new Set<string>();

  // Process all keys from both datasets
  const allKeys = new Set([...data2010.keys(), ...data2020.keys()]);

  for (const key of allKeys) {
    const data2010Entry = data2010.get(key);
    const data2020Entry = data2020.get(key);

    const countyData: CountyPopulationData = {
      geoId: data2020Entry?.geoId || data2010Entry?.geoId || '',
      name: data2020Entry?.name || data2010Entry?.name || '',
      population2010: data2010Entry?.population ?? null,
      population2020: data2020Entry?.population ?? null,
    };

    lookup[key] = {
      2010: countyData.population2010,
      2020: countyData.population2020,
    };

    counties.push(countyData);
    processedKeys.add(key);
  }

  return { lookup, counties };
}

/**
 * Load and parse CSV files from file paths (server-side only)
 */
export async function loadCensusCSVFiles(
  path2010: string,
  path2020: string
): Promise<{
  lookup: PopulationLookup;
  counties: CountyPopulationData[];
}> {
  if (typeof window !== 'undefined') {
    throw new Error('loadCensusCSVFiles can only be used server-side');
  }

  const { readFileSync } = await import('fs');
  const csv2010 = readFileSync(path2010, 'utf-8');
  const csv2020 = readFileSync(path2020, 'utf-8');

  return combineCensusData(csv2010, csv2020);
}
