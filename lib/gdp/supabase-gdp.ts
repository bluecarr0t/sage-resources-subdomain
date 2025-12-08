/**
 * Utility functions to fetch county GDP data from Supabase
 */

import { supabase } from '@/lib/supabase';
import { normalizeCountyName } from '../population/parse-population-csv';

interface SupabaseCountyGDP {
  county_name: string;
  state_name: string;
  gdp_2020: number | null;
  gdp_2021: number | null;
  gdp_2022: number | null;
  gdp_2023: number | null;
  change_2021: number | null;
  change_2022: number | null;
  change_2023: number | null;
  rank_2023: number | null;
  rank_change_2023: number | null;
  fips_code: string | null;
}

export interface GDPDataByFIPS {
  [fips: string]: {
    gdp_2022: number | null;
    gdp_2023: number | null;
    change_2023: number | null;
    name: string;
    countyName: string;
    stateName: string;
  };
}

export interface GDPLookup {
  [key: string]: {
    gdp_2022: number | null;
    gdp_2023: number | null;
    change_2023: number | null;
  };
}

/**
 * Fetch all county GDP data from Supabase and convert to multiple formats
 */
export async function fetchGDPDataFromSupabase(): Promise<{
  lookup: GDPLookup;
  fipsLookup: GDPDataByFIPS;
}> {
  try {
    const { data, error } = await supabase
      .from('usa-gdp')
      .select('county_name, state_name, gdp_2022, gdp_2023, change_2023, fips_code');

    if (error) {
      console.error('Error fetching GDP data from Supabase:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('No GDP data found in Supabase');
      return { lookup: {}, fipsLookup: {} };
    }

    // Convert to both GDPLookup format (by name) and FIPS lookup (by FIPS code)
    const lookup: GDPLookup = {};
    const fipsLookup: GDPDataByFIPS = {};

    for (const row of data as SupabaseCountyGDP[]) {
      // Create lookup by normalized county name
      if (row.county_name && row.state_name) {
        const fullName = `${row.county_name} County, ${row.state_name}`;
        const normalizedName = normalizeCountyName(fullName);
        lookup[normalizedName] = {
          gdp_2022: row.gdp_2022,
          gdp_2023: row.gdp_2023,
          change_2023: row.change_2023,
        };
      }
      
      // Also create FIPS-based lookup for more reliable matching
      if (row.fips_code) {
        fipsLookup[row.fips_code] = {
          gdp_2022: row.gdp_2022,
          gdp_2023: row.gdp_2023,
          change_2023: row.change_2023,
          name: `${row.county_name} County, ${row.state_name}`,
          countyName: row.county_name,
          stateName: row.state_name,
        };
      }
    }

    console.log(`✅ Loaded GDP data for ${Object.keys(lookup).length} counties from Supabase`);
    console.log(`✅ Created FIPS lookup for ${Object.keys(fipsLookup).length} counties`);
    return { lookup, fipsLookup };
  } catch (error) {
    console.error('Error in fetchGDPDataFromSupabase:', error);
    throw error;
  }
}
