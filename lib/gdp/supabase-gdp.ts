/**
 * Utility functions to fetch county GDP data from Supabase
 */

import { supabase } from '@/lib/supabase';

interface SupabaseCountyGDP {
  geofips: string;
  geoname: string;
  gdp_2001: number | null;
  gdp_2002: number | null;
  gdp_2003: number | null;
  gdp_2004: number | null;
  gdp_2005: number | null;
  gdp_2006: number | null;
  gdp_2007: number | null;
  gdp_2008: number | null;
  gdp_2009: number | null;
  gdp_2010: number | null;
  gdp_2012: number | null;
  gdp_2013: number | null;
  gdp_2014: number | null;
  gdp_2015: number | null;
  gdp_2016: number | null;
  gdp_2017: number | null;
  gdp_2018: number | null;
  gdp_2019: number | null;
  gdp_2020: number | null;
  gdp_2021: number | null;
  gdp_2022: number | null;
  gdp_2023: number | null;
  'moving-annual-average': number | null;
}

export interface GDPDataByFIPS {
  [fips: string]: {
    movingAnnualAverage: number | null;
    gdp2023: number | null;
    gdp2022: number | null;
    gdp2021: number | null;
    gdp2020: number | null;
    gdp2019: number | null;
    geoname: string;
  };
}

/**
 * Fetch all county GDP data from Supabase
 */
export async function fetchGDPDataFromSupabase(): Promise<GDPDataByFIPS> {
  try {
    // Fetch all records using pagination
    let allData: SupabaseCountyGDP[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    console.log('📥 Fetching county GDP data from Supabase...');

    while (hasMore) {
      const { data, error } = await supabase
        .from('county-gdp')
        .select('geofips, geoname, gdp_2020, gdp_2021, gdp_2022, gdp_2023, gdp_2019, moving-annual-average')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching GDP data from Supabase:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allData = allData.concat(data as unknown as SupabaseCountyGDP[]);
      offset += batchSize;
      hasMore = data.length === batchSize;

      if (hasMore) {
        console.log(`   Fetched ${allData.length} records so far...`);
      }
    }

    console.log(`✅ Successfully fetched all ${allData.length} GDP records from database`);

    if (allData.length === 0) {
      console.warn('No GDP data found in Supabase');
      return {};
    }

    // Convert to FIPS lookup
    const fipsLookup: GDPDataByFIPS = {};

    for (const row of allData as SupabaseCountyGDP[]) {
      if (row.geofips) {
        // Ensure FIPS is 5 digits
        const fips = String(row.geofips).padStart(5, '0');
        
        fipsLookup[fips] = {
          movingAnnualAverage: row['moving-annual-average'],
          gdp2023: row.gdp_2023,
          gdp2022: row.gdp_2022,
          gdp2021: row.gdp_2021,
          gdp2020: row.gdp_2020,
          gdp2019: row.gdp_2019,
          geoname: row.geoname || '',
        };
      }
    }

    console.log(`✅ Created GDP FIPS lookup for ${Object.keys(fipsLookup).length} counties`);
    
    return fipsLookup;
  } catch (error) {
    console.error('Error in fetchGDPDataFromSupabase:', error);
    throw error;
  }
}
