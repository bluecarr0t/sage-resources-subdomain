/**
 * Count unique property names in Canada from sage-glamping-data table
 * Uses the same logic as the map component to identify Canadian properties
 * 
 * Run with: npx tsx scripts/count-canadian-properties.ts
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

// Canadian provinces (matching the code in GooglePropertyMap.tsx)
const CANADIAN_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Nova Scotia', 'Northwest Territories',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
  'Saskatchewan', 'Yukon'
];

const CANADIAN_PROVINCE_CODES = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

/**
 * Check if a property is Canadian based on country/state fields
 * Matches the logic in GooglePropertyMap.tsx
 */
function isCanadianProperty(property: {
  country: string | null;
  state: string | null;
  lat: string | number | null;
  lon: string | number | null;
}): boolean {
  const country = String(property.country || '').toUpperCase();
  const state = String(property.state || '').toUpperCase();
  
  // Check country field
  if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
    return true;
  }
  
  // Check if state is a Canadian province code
  if (CANADIAN_PROVINCE_CODES.includes(state)) {
    return true;
  }
  
  // Check if state is a Canadian province full name
  if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) {
    return true;
  }
  
  return false;
}

/**
 * Check if coordinates are likely in Canada
 * Matches the logic in GooglePropertyMap.tsx
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
 * Normalize property name for consistent grouping
 */
function normalizePropertyName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().toLowerCase();
}

/**
 * Parse coordinates from lat/lon fields
 * Matches the logic in lib/types/sage.ts
 */
function parseCoordinates(
  lat: string | number | null,
  lon: string | number | null
): [number, number] | null {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return null;

  // Handle both string and number types
  const latitude = typeof lat === 'number' ? lat : parseFloat(String(lat));
  const longitude = typeof lon === 'number' ? lon : parseFloat(String(lon));

  // Validate coordinates
  if (isNaN(latitude) || isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return [latitude, longitude];
}

/**
 * Check if coordinates are within USA or Canada bounds
 * Matches the logic in lib/types/sage.ts
 */
function isInUSAOrCanada(lat: number, lon: number): boolean {
  // Latitude bounds (18°N to 85°N) - includes Hawaii (starts at ~18°N)
  if (lat < 18 || lat > 85) return false;
  
  // Longitude bounds (-179°W to -50°W) - includes all of Alaska (extends to -179°W)
  if (lon < -179 || lon > -50) return false;
  
  return true;
}

async function countCanadianProperties() {
  console.log('🔍 Counting unique Canadian properties in sage-glamping-data...\n');

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

    // Identify Canadian properties using the same logic as the map component
    // Only count properties with valid coordinates (matching what's shown on the map)
    const canadianPropertyNames = new Set<string>();
    const canadianPropertyNamesWithValidCoords = new Set<string>();
    const canadianPropertiesByMethod = {
      byCountryField: 0,
      byStateField: 0,
      byCoordinates: 0,
      byBoth: 0,
    };

    for (const record of allData) {
      const propertyName = record.property_name;
      if (!propertyName) continue;

      const normalizedName = normalizePropertyName(propertyName);
      
      // Parse and validate coordinates (matching filterPropertiesWithCoordinates logic)
      const coords = parseCoordinates(record.lat, record.lon);
      const hasValidCoords = coords !== null && isInUSAOrCanada(coords[0], coords[1]);
      
      // Check if it's Canadian by country/state fields
      const isCanadianByFields = isCanadianProperty(record);
      
      // Check if it's Canadian by coordinates
      let isCanadianByCoords = false;
      if (coords) {
        isCanadianByCoords = isLikelyCanadaByCoords(coords[0], coords[1]);
      }
      
      // Use coordinate-based detection if available, otherwise fall back to country/state fields
      // This matches the logic in GooglePropertyMap.tsx
      let isCanadian = false;
      if (isCanadianByCoords) {
        isCanadian = true;
        canadianPropertiesByMethod.byCoordinates++;
        if (isCanadianByFields) {
          canadianPropertiesByMethod.byBoth++;
        }
      } else if (isCanadianByFields) {
        isCanadian = true;
        canadianPropertiesByMethod.byCountryField++;
      }
      
      if (isCanadian) {
        canadianPropertyNames.add(normalizedName);
        
        // Only count properties with valid coordinates (matching map display logic)
        if (hasValidCoords) {
          canadianPropertyNamesWithValidCoords.add(normalizedName);
        }
      }
    }

    console.log('📊 Results:\n');
    console.log(`✅ Unique Canadian property names (all): ${canadianPropertyNames.size}`);
    console.log(`✅ Unique Canadian property names (with valid coordinates): ${canadianPropertyNamesWithValidCoords.size}`);
    console.log(`\n📈 Breakdown by detection method:`);
    console.log(`   - By country/state fields only: ${canadianPropertiesByMethod.byCountryField}`);
    console.log(`   - By coordinates only: ${canadianPropertiesByMethod.byCoordinates}`);
    console.log(`   - By both methods: ${canadianPropertiesByMethod.byBoth}`);
    console.log(`\n💡 Note:`);
    console.log(`   - "All" includes properties without valid coordinates`);
    console.log(`   - "With valid coordinates" matches what's displayed on the map`);
    console.log(`   - Properties are counted once even if detected by multiple methods.`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the analysis
countCanadianProperties()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
