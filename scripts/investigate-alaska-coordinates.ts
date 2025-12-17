/**
 * Investigate properties with coordinates outside current USA/Canada bounds
 * Focus on Alaska locations that may be incorrectly filtered
 * 
 * Run with: npx tsx scripts/investigate-alaska-coordinates.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseCoordinates, isInUSAOrCanada } from '../lib/types/sage';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

interface InvalidCoordinate {
  id: number;
  property_name: string | null;
  lat: number;
  lon: number;
  state: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  reason: string;
}

/**
 * Current bounds: -141°W to -50°W
 * Alaska extends to approximately -179°W (Aleutian Islands)
 * Hawaii is around -160°W to -154°W
 */
function analyzeCoordinate(lat: number, lon: number, state: string | null, country: string | null): {
  valid: boolean;
  reason: string;
  likelyLocation: string;
} {
  // Current bounds check
  const currentBoundsValid = lat >= 20 && lat <= 85 && lon >= -141 && lon <= -50;
  
  if (currentBoundsValid) {
    return { valid: true, reason: 'Within current bounds', likelyLocation: 'USA/Canada' };
  }

  // Check if it's a valid Alaska location
  // Alaska: approximately 51°N to 71°N, -179°W to -130°W
  const isAlaska = lat >= 51 && lat <= 71 && lon >= -179 && lon <= -130;
  
  // Check if it's a valid Hawaii location
  // Hawaii: approximately 18°N to 22°N, -160°W to -154°W
  const isHawaii = lat >= 18 && lat <= 22 && lon >= -160 && lon <= -154;
  
  // Check if it's a valid US territory (Puerto Rico, etc.)
  // Puerto Rico: approximately 17°N to 18°N, -68°W to -65°W
  const isPuertoRico = lat >= 17 && lat <= 18 && lon >= -68 && lon <= -65;
  
  // Check if it's valid Canada (including far north)
  // Canada extends to approximately 83°N, -141°W to -52°W (mainland)
  // But also includes islands that extend further west
  const isCanada = lat >= 41 && lat <= 83 && lon >= -141 && lon <= -52;
  
  // Check if it's in the Pacific (likely Alaska Aleutian Islands)
  const isAleutianIslands = lat >= 51 && lat <= 55 && lon < -141 && lon >= -179;
  
  // Check if it's in the Arctic (likely Alaska or Canada)
  const isArctic = lat > 66 && lat <= 85 && lon >= -180 && lon <= -50;
  
  let reason = '';
  let likelyLocation = 'Unknown';
  
  if (lat < 20 || lat > 85) {
    reason = `Latitude out of range: ${lat}° (valid: 20°N to 85°N)`;
  } else if (lon < -179 || lon > -50) {
    reason = `Longitude out of range: ${lon}° (current bounds: -141°W to -50°W)`;
  } else {
    reason = 'Outside current bounds but may be valid';
  }
  
  if (isAlaska || isAleutianIslands) {
    likelyLocation = 'Alaska (likely valid)';
    reason += ' - Alaska extends to -179°W';
  } else if (isHawaii) {
    likelyLocation = 'Hawaii (likely valid)';
    reason += ' - Hawaii is around -160°W to -154°W';
  } else if (isPuertoRico) {
    likelyLocation = 'Puerto Rico (likely valid)';
    reason += ' - Puerto Rico is around -68°W to -65°W';
  } else if (isArctic) {
    likelyLocation = 'Arctic region (Alaska/Canada, likely valid)';
    reason += ' - Arctic regions extend beyond -141°W';
  } else if (lat >= 20 && lat <= 85 && lon >= -180 && lon < -141) {
    likelyLocation = 'Western Alaska or Aleutian Islands (likely valid)';
    reason += ' - Alaska extends west of -141°W';
  } else if (lon > -50 && lon <= -66) {
    likelyLocation = 'Eastern US/Canada (likely valid)';
    reason += ' - Eastern US extends to -66°W';
  } else {
    likelyLocation = 'Invalid or outside USA/Canada';
  }
  
  return {
    valid: isAlaska || isHawaii || isPuertoRico || isArctic || isAleutianIslands || 
           (lat >= 20 && lat <= 85 && lon >= -180 && lon <= -66),
    reason,
    likelyLocation,
  };
}

async function investigateInvalidCoordinates() {
  console.log('🔍 Investigating invalid coordinates...\n');

  try {
    // Fetch all records
    console.log('📥 Fetching all records...');
    let allData: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore) {
      const { data, error, count } = await supabase
        .from('all_glamping_properties')
        .select('id, property_name, lat, lon, state, country, city, address')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('❌ Error:', error);
        process.exit(1);
      }

      if (!data) break;

      if (count !== null && totalCount === 0) {
        totalCount = count;
      }

      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
    }

    console.log(`✅ Fetched ${allData.length} records\n`);

    // Find invalid coordinates
    const invalidCoords: InvalidCoordinate[] = [];

    for (const record of allData) {
      const coords = parseCoordinates(record.lat, record.lon);
      
      if (!coords) continue; // Skip records without coordinates
      
      const [lat, lon] = coords;
      
      // Check current bounds using the updated function
      const currentBoundsValid = isInUSAOrCanada(lat, lon);
      
      if (!currentBoundsValid) {
        const analysis = analyzeCoordinate(lat, lon, record.state, record.country);
        
        invalidCoords.push({
          id: record.id,
          property_name: record.property_name,
          lat,
          lon,
          state: record.state,
          country: record.country,
          city: record.city,
          address: record.address,
          reason: analysis.reason,
        });
      }
    }

    console.log('='.repeat(80));
    console.log('📊 INVALID COORDINATES ANALYSIS');
    console.log('='.repeat(80));
    console.log(`\nTotal records with invalid coordinates: ${invalidCoords.length}\n`);

    // Group by reason/location
    const byLocation = new Map<string, InvalidCoordinate[]>();
    invalidCoords.forEach(coord => {
      const analysis = analyzeCoordinate(coord.lat, coord.lon, coord.state, coord.country);
      const key = analysis.likelyLocation;
      if (!byLocation.has(key)) {
        byLocation.set(key, []);
      }
      byLocation.get(key)!.push(coord);
    });

    console.log('📍 GROUPED BY LIKELY LOCATION:\n');
    byLocation.forEach((coords, location) => {
      console.log(`  ${location}: ${coords.length} properties`);
    });
    console.log('');

    // Show details for each group
    console.log('='.repeat(80));
    console.log('📋 DETAILED BREAKDOWN\n');
    
    byLocation.forEach((coords, location) => {
      console.log(`\n📍 ${location} (${coords.length} properties):`);
      console.log('-'.repeat(80));
      
      coords.forEach((coord, index) => {
        console.log(`\n  ${index + 1}. ${coord.property_name || `ID: ${coord.id}`}`);
        console.log(`     State: ${coord.state || 'N/A'}`);
        console.log(`     Country: ${coord.country || 'N/A'}`);
        console.log(`     City: ${coord.city || 'N/A'}`);
        console.log(`     Coordinates: ${coord.lat.toFixed(6)}, ${coord.lon.toFixed(6)}`);
        console.log(`     Reason: ${coord.reason}`);
      });
    });

    // Statistics
    const validAlaska = invalidCoords.filter(c => {
      const analysis = analyzeCoordinate(c.lat, c.lon, c.state, c.country);
      return analysis.likelyLocation.includes('Alaska') || analysis.likelyLocation.includes('Aleutian');
    }).length;

    const validHawaii = invalidCoords.filter(c => {
      const analysis = analyzeCoordinate(c.lat, c.lon, c.state, c.country);
      return analysis.likelyLocation.includes('Hawaii');
    }).length;

    const validOther = invalidCoords.filter(c => {
      const analysis = analyzeCoordinate(c.lat, c.lon, c.state, c.country);
      return analysis.valid && !analysis.likelyLocation.includes('Alaska') && 
             !analysis.likelyLocation.includes('Hawaii');
    }).length;

    const trulyInvalid = invalidCoords.length - validAlaska - validHawaii - validOther;

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY STATISTICS');
    console.log('='.repeat(80));
    console.log(`\nTotal invalid coordinates: ${invalidCoords.length}`);
    console.log(`  ✅ Likely valid Alaska locations: ${validAlaska}`);
    console.log(`  ✅ Likely valid Hawaii locations: ${validHawaii}`);
    console.log(`  ✅ Likely valid other locations: ${validOther}`);
    console.log(`  ❌ Truly invalid coordinates: ${trulyInvalid}`);
    console.log('');

    // Current bounds
    console.log('='.repeat(80));
    console.log('🗺️  CURRENT BOUNDS ANALYSIS');
    console.log('='.repeat(80));
    console.log('\nCurrent bounds in code:');
    console.log('  Latitude: 20°N to 85°N');
    console.log('  Longitude: -141°W to -50°W');
    console.log('\nActual USA/Canada geographic bounds:');
    console.log('  USA (mainland): 24°N to 49°N, -125°W to -66°W');
    console.log('  Alaska: 51°N to 71°N, -179°W to -130°W');
    console.log('  Hawaii: 18°N to 22°N, -160°W to -154°W');
    console.log('  Canada: 41°N to 83°N, -141°W to -52°W (mainland)');
    console.log('  Canada (islands): extends further west');
    console.log('');

    // Recommendations
    console.log('='.repeat(80));
    console.log('💡 RECOMMENDATIONS');
    console.log('='.repeat(80));
    console.log('\n1. EXPAND LONGITUDE BOUNDS:');
    console.log('   Current: -141°W to -50°W');
    console.log('   Recommended: -179°W to -50°W (to include all of Alaska)');
    console.log('   This would include:');
    console.log('     - All of Alaska including Aleutian Islands');
    console.log('     - All of Hawaii');
    console.log('     - All of mainland USA and Canada');
    console.log('');
    console.log('2. ALTERNATIVE: Use state-based validation');
    console.log('   - Check state field for "AK" or "Alaska" and allow wider longitude range');
    console.log('   - More precise but requires state data to be accurate');
    console.log('');
    console.log('3. VERIFY COORDINATES:');
    console.log(`   - ${trulyInvalid} coordinates appear to be truly invalid`);
    console.log('   - These should be geocoded or corrected');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

investigateInvalidCoordinates()
  .then(() => {
    console.log('\n✅ Investigation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

