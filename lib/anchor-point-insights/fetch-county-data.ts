/**
 * Fetch county population and GDP data for state-level enrichment
 * Uses county-population and county-gdp tables only (no fallback)
 * Uses geo_id/geofips for reliable state extraction when name parsing fails
 *
 * NOTE: Population/GDP are aggregated to state level. County-level enrichment
 * would be more precise but requires (lat, lon) → county lookup (e.g. reverse
 * geocoding or point-in-polygon). Property tables have state but not county.
 */

import { MAX_COUNTY_ROWS, STATE_FULL_TO_ABBR } from './constants';

export interface CountyLookups {
  statePopulationLookup: Record<string, { population_2020: number; population_2010: number }>;
  stateGDPLookup: Record<string, { gdp_2023: number; gdp_2022: number }>;
}

import type { SupabaseClient } from '@supabase/supabase-js';

/** State FIPS codes (2-digit) to state abbreviation - 50 states + DC */
const STATE_FIPS_TO_ABBR: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT',
  '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL',
  '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD',
  '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE',
  '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY',
};

function getStateFromName(name: string, lastPart: string): string | null {
  if (!lastPart) return null;
  if (lastPart.length === 2) return lastPart.toUpperCase();
  return STATE_FULL_TO_ABBR[lastPart.toLowerCase()] ?? null;
}

function getStateFromGeoId(geoId: string): string | null {
  if (!geoId || typeof geoId !== 'string') return null;
  const match = geoId.match(/US(\d+)$/);
  if (match) {
    const fips = match[1].padStart(5, '0').slice(0, 5);
    const stateFips = fips.slice(0, 2);
    return STATE_FIPS_TO_ABBR[stateFips] ?? null;
  }
  return null;
}

function getStateFromGeofips(geofips: string): string | null {
  if (!geofips || typeof geofips !== 'string') return null;
  const padded = String(geofips).padStart(5, '0');
  const stateFips = padded.slice(0, 2);
  return STATE_FIPS_TO_ABBR[stateFips] ?? null;
}

const BATCH_SIZE = 1000;

async function fetchAllCountyPop(
  supabase: SupabaseClient
): Promise<Array<{ geo_id: string; name: string; population_2010: number | null; population_2020: number | null }>> {
  const all: Array<{ geo_id: string; name: string; population_2010: number | null; population_2020: number | null }> = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('county-population')
      .select('geo_id, name, population_2010, population_2020')
      .range(offset, offset + BATCH_SIZE - 1)
      .order('geo_id', { ascending: true });
    if (!data?.length) break;
    all.push(...(data as typeof all));
    if (data.length < BATCH_SIZE) break;
    offset += data.length;
    if (all.length >= MAX_COUNTY_ROWS) break;
  }
  return all;
}

async function fetchAllCountyGdp(
  supabase: SupabaseClient
): Promise<Array<{ geofips: string; geoname: string; gdp_2022: number | null; gdp_2023: number | null }>> {
  const all: Array<{ geofips: string; geoname: string; gdp_2022: number | null; gdp_2023: number | null }> = [];
  let offset = 0;
  while (true) {
    const { data } = await supabase
      .from('county-gdp')
      .select('geofips, geoname, gdp_2022, gdp_2023')
      .range(offset, offset + BATCH_SIZE - 1)
      .order('geofips', { ascending: true });
    if (!data?.length) break;
    all.push(...(data as typeof all));
    if (data.length < BATCH_SIZE) break;
    offset += data.length;
    if (all.length >= MAX_COUNTY_ROWS) break;
  }
  return all;
}

export async function fetchCountyLookups(
  supabase: SupabaseClient
): Promise<CountyLookups> {
  const statePopulationLookup: Record<string, { population_2020: number; population_2010: number }> = {};
  const stateGDPLookup: Record<string, { gdp_2023: number; gdp_2022: number }> = {};

  const countyPopRows = await fetchAllCountyPop(supabase);

  for (const r of countyPopRows) {
    const name = String(r.name || '').trim();
    if (!name) continue;
    const parts = name.split(',').map((s: string) => s.trim());
    const statePart = parts[parts.length - 1]?.trim();
    let stateAbbr = getStateFromName(name, statePart);
    if (!stateAbbr) stateAbbr = getStateFromGeoId(String(r.geo_id || ''));
    if (!stateAbbr) continue;
    const pop2020 = r.population_2020 != null ? Number(r.population_2020) : 0;
    const pop2010 = r.population_2010 != null ? Number(r.population_2010) : 0;
    if (!statePopulationLookup[stateAbbr]) {
      statePopulationLookup[stateAbbr] = { population_2020: 0, population_2010: 0 };
    }
    statePopulationLookup[stateAbbr].population_2020 += pop2020;
    statePopulationLookup[stateAbbr].population_2010 += pop2010;
  }

  const countyGDPRows = await fetchAllCountyGdp(supabase);

  for (const r of countyGDPRows) {
    const geoname = String(r.geoname || '').trim();
    if (!geoname) continue;
    const parts = geoname.split(',').map((s: string) => s.trim());
    const statePart = parts[parts.length - 1]?.trim();
    let stateAbbr = getStateFromName(geoname, statePart);
    if (!stateAbbr) stateAbbr = getStateFromGeofips(String(r.geofips || ''));
    if (!stateAbbr) continue;
    const gdp2023 = r.gdp_2023 != null ? Number(r.gdp_2023) : 0;
    const gdp2022 = r.gdp_2022 != null ? Number(r.gdp_2022) : 0;
    if (!stateGDPLookup[stateAbbr]) {
      stateGDPLookup[stateAbbr] = { gdp_2023: 0, gdp_2022: 0 };
    }
    stateGDPLookup[stateAbbr].gdp_2023 += gdp2023;
    stateGDPLookup[stateAbbr].gdp_2022 += gdp2022;
  }

  return { statePopulationLookup, stateGDPLookup };
}
