/**
 * Fix records with null/empty country field and the record with country='78620'
 * 
 * Run with: npx tsx scripts/fix-country-field.ts [--dry-run]
 * 
 * Options:
 *   --dry-run    Show what would be updated without making changes
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Canadian provinces
const CANADIAN_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Nova Scotia', 'Northwest Territories',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
  'Saskatchewan', 'Yukon'
];

const CANADIAN_PROVINCE_CODES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

/**
 * Parse coordinates from lat/lon fields
 */
function parseCoordinates(
  lat: string | number | null,
  lon: string | number | null
): [number, number] | null {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return null;

  const latitude = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const longitude = typeof lon === 'number' ? lon : parseFloat(String(lon));

  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return [latitude, longitude];
}

/**
 * Check if coordinates are within USA or Canada bounds
 */
function isInUSAOrCanada(lat: number, lon: number): boolean {
  if (lat < 18 || lat > 85) return false;
  if (lon < -179 || lon > -50) return false;
  return true;
}

/**
 * Check if coordinates are likely in Canada
 */
function isLikelyCanadaByCoords(lat: number, lon: number): boolean {
  // Check if within overall Canada bounds
  if (lat < 41.7 || lat >= 85 || lon < -141 || lon > -52) {
    return false;
  }
  
  // Northern territories (above 60°N) - definitely Canada
  if (lat >= 60) {
    return true;
  }
  
  // Eastern Canada (Ontario, Quebec, Maritimes) - 41.7°N to 60°N, -95°W to -52°W
  if (lat >= 41.7 && lat < 60 && lon >= -95 && lon <= -52) {
    return true;
  }
  
  // Western provinces (BC, Alberta, Saskatchewan, Manitoba) - 48°N to 60°N, -139°W to -89°W
  if (lat >= 48 && lat < 60 && lon >= -139 && lon <= -89) {
    return true;
  }
  
  // Border region (49°N to 60°N) - check more carefully
  if (lat >= 49 && lat < 60) {
    if (lon < -100) {
      return true;
    }
    if (lon >= -100 && lon <= -89 && lat >= 50) {
      return true;
    }
    if (lon >= -95 && lon <= -89 && lat >= 49) {
      return true;
    }
  }
  
  // Border region near US-Canada border (45°N to 49°N)
  if (lat >= 45 && lat < 49) {
    if (lon >= -75 && lon <= -52) {
      return true;
    }
    if (lon >= -95 && lon < -75) {
      if (lat >= 46) {
        return true;
      }
      if (lon >= -80) {
        return true;
      }
    }
  }
  
  // Additional check: 41.7°N to 45°N - could be southern Ontario
  if (lat >= 41.7 && lat < 45 && lon >= -95.2 && lon <= -74.3) {
    return true;
  }
  
  return false;
}

/**
 * Determine country based on state/province field
 */
function getCountryFromState(state: string | null): 'USA' | 'Canada' | null {
  if (!state) return null;
  
  const stateUpper = String(state).toUpperCase();
  
  // Check if it's a Canadian province code
  if (CANADIAN_PROVINCE_CODES.includes(stateUpper)) {
    return 'Canada';
  }
  
  // Check if it's a Canadian province full name
  if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === stateUpper)) {
    return 'Canada';
  }
  
  // If it's a US state (not a Canadian province), assume USA
  // We'll use a simple heuristic: if it's not a known Canadian province, assume USA
  // This is safe because we're only dealing with North American properties
  return 'USA';
}

/**
 * Determine country for a property
 */
function determineCountry(record: {
  country: string | null;
  state: string | null;
  lat: string | number | null;
  lon: string | number | null;
}): 'USA' | 'Canada' | null {
  // First check if country is already set correctly
  const country = String(record.country || '').toUpperCase();
  if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
    return 'USA';
  }
  if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
    return 'Canada';
  }
  
  // If country is null/empty or invalid, try to determine from state
  const countryFromState = getCountryFromState(record.state);
  if (countryFromState) {
    return countryFromState;
  }
  
  // If state doesn't help, try coordinates
  const coords = parseCoordinates(record.lat, record.lon);
  if (coords && isInUSAOrCanada(coords[0], coords[1])) {
    if (isLikelyCanadaByCoords(coords[0], coords[1])) {
      return 'Canada';
    } else {
      // If it's in USA/Canada bounds but not Canada, assume USA
      return 'USA';
    }
  }
  
  return null;
}

async function fixCountryField(dryRun: boolean = false) {
  console.log('🔍 Finding records with null/empty country field or country=\'78620\'...\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Fetch all records
    console.log('📥 Fetching all records from sage-glamping-data...');
    
    let allData: Array<{
      id: number;
      property_name: string | null;
      country: string | null;
      state: string | null;
      lat: string | number | null;
      lon: string | number | null;
    }> = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore) {
      const { data, error, count } = await supabase
        .from('sage-glamping-data')
        .select('id, property_name, country, state, lat, lon', { count: 'exact' })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('❌ Error fetching data:', error);
        process.exit(1);
      }

      if (!data) {
        break;
      }

      if (count !== null && totalCount === 0) {
        totalCount = count;
      }

      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
      
      console.log(`  Fetched ${allData.length} / ${totalCount || '?'} records...`);
    }

    console.log(`✅ Fetched ${allData.length} total records\n`);

    // Find records that need fixing
    const recordsToFix: Array<{
      id: number;
      property_name: string | null;
      current_country: string | null;
      new_country: 'USA' | 'Canada';
      method: 'state' | 'coordinates' | 'coordinates-canada';
    }> = [];

    for (const record of allData) {
      const country = String(record.country || '').trim();
      
      // Check if country is null, empty, or the invalid value '78620'
      if (!country || country === '' || country === '78620') {
        const determinedCountry = determineCountry(record);
        
        if (determinedCountry) {
          let method: 'state' | 'coordinates' | 'coordinates-canada' = 'state';
          if (!getCountryFromState(record.state)) {
            const coords = parseCoordinates(record.lat, record.lon);
            if (coords && isLikelyCanadaByCoords(coords[0], coords[1])) {
              method = 'coordinates-canada';
            } else {
              method = 'coordinates';
            }
          }
          
          recordsToFix.push({
            id: record.id,
            property_name: record.property_name,
            current_country: record.country,
            new_country: determinedCountry,
            method,
          });
        } else {
          console.warn(`⚠️  Could not determine country for record ${record.id} (${record.property_name || 'unnamed'})`);
        }
      }
    }

    console.log(`\n📊 Found ${recordsToFix.length} records to fix:\n`);
    
    // Group by country and method
    const byCountry = {
      USA: recordsToFix.filter(r => r.new_country === 'USA'),
      Canada: recordsToFix.filter(r => r.new_country === 'Canada'),
    };
    
    const byMethod = {
      state: recordsToFix.filter(r => r.method === 'state'),
      coordinates: recordsToFix.filter(r => r.method === 'coordinates'),
      'coordinates-canada': recordsToFix.filter(r => r.method === 'coordinates-canada'),
    };

    console.log('Breakdown by country:');
    console.log(`  USA: ${byCountry.USA.length} records`);
    console.log(`  Canada: ${byCountry.Canada.length} records`);
    console.log('\nBreakdown by detection method:');
    console.log(`  State field: ${byMethod.state.length} records`);
    console.log(`  Coordinates (USA): ${byMethod.coordinates.length} records`);
    console.log(`  Coordinates (Canada): ${byMethod['coordinates-canada'].length} records`);

    // Show sample records
    console.log('\n📋 Sample records to be updated:');
    recordsToFix.slice(0, 10).forEach((record, idx) => {
      console.log(`  ${idx + 1}. ID ${record.id}: "${record.property_name || 'unnamed'}"`);
      console.log(`     Current: "${record.current_country || '(null)'}" → New: "${record.new_country}" (${record.method})`);
    });
    if (recordsToFix.length > 10) {
      console.log(`  ... and ${recordsToFix.length - 10} more`);
    }

    if (dryRun) {
      console.log('\n✅ Dry run complete. Run without --dry-run to apply changes.');
      return;
    }

    // Update records
    console.log('\n📤 Updating records...\n');
    
    let updated = 0;
    let errors = 0;
    
    for (const record of recordsToFix) {
      const { error } = await supabase
        .from('sage-glamping-data')
        .update({ country: record.new_country })
        .eq('id', record.id);

      if (error) {
        console.error(`❌ Error updating record ${record.id}: ${error.message}`);
        errors++;
      } else {
        updated++;
        if (updated % 10 === 0) {
          console.log(`  Updated ${updated} / ${recordsToFix.length} records...`);
        }
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   Updated: ${updated} records`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} records`);
    }

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('sage-glamping-data')
      .select('id, country')
      .or('country.is.null,country.eq.,country.eq.78620');

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError);
    } else {
      const remaining = verifyData?.length || 0;
      if (remaining === 0) {
        console.log('✅ All records now have valid country values!');
      } else {
        console.log(`⚠️  ${remaining} records still have null/empty/invalid country values`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const dryRun = process.argv.includes('--dry-run');

// Run the fix
fixCountryField(dryRun)
  .then(() => {
    console.log('\n✅ Script complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
