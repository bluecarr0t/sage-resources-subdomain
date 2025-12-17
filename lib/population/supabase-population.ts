/**
 * Utility functions to fetch county population data from Supabase
 */

import { PopulationLookup, normalizeCountyName } from './parse-population-csv';

// Lazy import Supabase to avoid initialization during build time
async function getSupabaseClient() {
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}

interface SupabaseCountyPopulation {
  geo_id: string;
  name: string;
  population_2010: number | null;
  population_2020: number | null;
  change: number | null;
}

export interface PopulationDataByFIPS {
  [fips: string]: {
    2010: number | null;
    2020: number | null;
    change: number | null;
    name: string;
    geoId: string;
  };
}

/**
 * Extract FIPS code from GEO_ID (e.g., "0500000US01001" -> "01001")
 * Handles various formats and ensures 5-digit FIPS code
 */
function extractFIPSCode(geoId: string): string | null {
  if (!geoId || typeof geoId !== 'string') {
    return null;
  }
  
  // GEO_ID format: "0500000US01001" where "01001" is the FIPS code
  // Try to match "US" followed by digits at the end
  const match = geoId.match(/US(\d+)$/);
  if (match) {
    let fips = match[1];
    // Ensure it's exactly 5 digits (pad with leading zeros if needed)
    if (fips.length < 5) {
      fips = fips.padStart(5, '0');
    } else if (fips.length > 5) {
      // Take last 5 digits if longer
      fips = fips.slice(-5);
    }
    return fips;
  }
  
  // Fallback: if GEO_ID is already a 5-digit number, return it
  if (/^\d{5}$/.test(geoId.trim())) {
    return geoId.trim();
  }
  
  return null;
}

/**
 * Fetch all county population data from Supabase and convert to multiple formats
 */
export async function fetchPopulationDataFromSupabase(): Promise<{
  lookup: PopulationLookup;
  fipsLookup: PopulationDataByFIPS;
}> {
  try {
    // Fetch all records using pagination - Supabase has a default limit of 1000
    // We need to paginate to get all ~3225 county records
    let allData: SupabaseCountyPopulation[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    let totalCount: number | null = null;

    console.log('📥 Fetching county population data from Supabase...');

    const supabase = await getSupabaseClient();
    
    while (hasMore) {
      const { data, error, count } = await supabase
        .from('county-population')
        .select('geo_id, name, population_2010, population_2020, change', { count: 'exact' })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('Error fetching population data from Supabase:', error);
        throw error;
      }

      if (count !== null && totalCount === null) {
        totalCount = count;
        console.log(`   Total records in database: ${totalCount}`);
      }

      if (!data || data.length === 0) {
        hasMore = false;
        break;
      }

      allData = allData.concat(data as SupabaseCountyPopulation[]);
      offset += batchSize;
      hasMore = data.length === batchSize;

      if (hasMore) {
        console.log(`   Fetched ${allData.length} records so far...`);
      }
    }

    console.log(`✅ Successfully fetched all ${allData.length} records from database`);

    if (totalCount !== null && allData.length < totalCount) {
      console.error(`❌ WARNING: Fetched ${allData.length} records but database has ${totalCount} total records`);
    }

    if (allData.length === 0) {
      console.warn('No population data found in Supabase');
      return { lookup: {}, fipsLookup: {} };
    }

    const data = allData;

    // Convert to both PopulationLookup format (by name) and FIPS lookup (by FIPS code)
    const lookup: PopulationLookup = {};
    const fipsLookup: PopulationDataByFIPS = {};
    let fipsExtractionFailures = 0;
    const failedGeoIds: string[] = [];
    let duplicateFipsCount = 0;
    const duplicateFips: string[] = [];
    const sampleSuccessfulExtractions: Array<{ geo_id: string; fips: string; name: string }> = [];

    for (const row of data as SupabaseCountyPopulation[]) {
      if (row.name) {
        const normalizedName = normalizeCountyName(row.name);
        lookup[normalizedName] = {
          2010: row.population_2010,
          2020: row.population_2020,
        };
      }
      
      // Also create FIPS-based lookup for more reliable matching
      const fips = extractFIPSCode(row.geo_id);
      if (fips) {
        // Check for duplicates (shouldn't happen, but log if it does)
        if (fipsLookup[fips]) {
          duplicateFipsCount++;
          if (duplicateFips.length < 5) {
            duplicateFips.push(fips);
          }
        }
        
        fipsLookup[fips] = {
          2010: row.population_2010,
          2020: row.population_2020,
          change: row.change,
          name: row.name,
          geoId: row.geo_id,
        };
        
        // Collect sample successful extractions for debugging
        if (sampleSuccessfulExtractions.length < 10) {
          sampleSuccessfulExtractions.push({
            geo_id: row.geo_id,
            fips: fips,
            name: row.name,
          });
        }
      } else {
        fipsExtractionFailures++;
        if (failedGeoIds.length < 20) {
          failedGeoIds.push(row.geo_id || '(null or undefined)');
        }
      }
    }

    console.log(`✅ Loaded population data for ${Object.keys(lookup).length} counties from Supabase`);
    console.log(`✅ Created FIPS lookup for ${Object.keys(fipsLookup).length} counties`);
    
    // Detailed diagnostics
    if (typeof window !== 'undefined') {
      console.log(`📊 FIPS Extraction Statistics:`);
      console.log(`   - Total database records: ${data.length}`);
      console.log(`   - Successful FIPS extractions: ${Object.keys(fipsLookup).length}`);
      console.log(`   - Failed FIPS extractions: ${fipsExtractionFailures}`);
      console.log(`   - Duplicate FIPS codes: ${duplicateFipsCount}`);
      
      if (sampleSuccessfulExtractions.length > 0) {
        console.log(`   - Sample successful extractions:`, sampleSuccessfulExtractions);
      }
      
      if (failedGeoIds.length > 0) {
        console.warn(`   - Sample failed GEO_IDs:`, failedGeoIds);
      }
      
      if (duplicateFips.length > 0) {
        console.warn(`   - Sample duplicate FIPS codes:`, duplicateFips);
      }
      
      const sampleFips = Object.keys(fipsLookup).slice(0, 10);
      console.log(`   - Sample FIPS codes in lookup:`, sampleFips);
    }
    
    if (fipsExtractionFailures > 0) {
      console.warn(`⚠️ Failed to extract FIPS code for ${fipsExtractionFailures} counties (${((fipsExtractionFailures / data.length) * 100).toFixed(1)}% of records)`);
      console.warn(`   This means ${fipsExtractionFailures} counties will only be matchable by name, not FIPS code.`);
      console.warn(`   Sample failed GEO_IDs:`, failedGeoIds.slice(0, 10));
    }
    
    if (data.length >= 3000) {
      console.log(`✅ Database has ${data.length} county records (expected ~3222-3225)`);
      const extractionRate = (Object.keys(fipsLookup).length / data.length) * 100;
      if (extractionRate < 90) {
        console.error(`❌ CRITICAL: Only ${extractionRate.toFixed(1)}% of records have valid FIPS codes in lookup (${Object.keys(fipsLookup).length} out of ${data.length})`);
        console.error(`   This explains why only ${Object.keys(fipsLookup).length} counties can be matched!`);
        console.error(`   Check the failed GEO_IDs above to see what format issues exist.`);
      } else {
        console.log(`✅ Successfully extracted FIPS codes for ${extractionRate.toFixed(1)}% of records`);
      }
    } else {
      console.warn(`⚠️ Expected ~3222 counties but only found ${data.length} in database. Please run the upload script to populate all counties.`);
    }
    return { lookup, fipsLookup };
  } catch (error) {
    console.error('Error in fetchPopulationDataFromSupabase:', error);
    throw error;
  }
}
