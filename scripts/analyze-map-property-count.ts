/**
 * Analyze why the map shows 460 properties instead of 604 unique property names
 * 
 * Run with: npx tsx scripts/analyze-map-property-count.ts
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
 * Normalize property name for consistent grouping
 */
function normalizePropertyName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().toLowerCase();
}

async function analyzeMapPropertyCount() {
  console.log('🔍 Analyzing why map shows 460 properties instead of 604...\n');

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

    // Analyze step by step (matching map logic)
    const stats = {
      totalRecords: allData.length,
      recordsWithPropertyName: 0,
      recordsWithoutPropertyName: 0,
      recordsWithValidCoords: 0,
      recordsWithoutValidCoords: 0,
      recordsWithUSACountry: 0,
      recordsWithCanadaCountry: 0,
      recordsWithOtherCountry: 0,
      recordsWithNullCountry: 0,
      uniquePropertyNames: new Set<string>(),
      uniquePropertyNamesWithValidCoords: new Set<string>(),
      uniquePropertyNamesUSA: new Set<string>(),
      uniquePropertyNamesCanada: new Set<string>(),
      uniquePropertyNamesUSAWithValidCoords: new Set<string>(),
      uniquePropertyNamesCanadaWithValidCoords: new Set<string>(),
      countryValues: new Map<string, number>(),
    };

    for (const record of allData) {
      const propertyName = record.property_name;
      
      // Count records with/without property name
      if (!propertyName || propertyName.trim() === '') {
        stats.recordsWithoutPropertyName++;
        continue;
      }
      stats.recordsWithPropertyName++;
      
      // Track unique property names
      const normalizedName = normalizePropertyName(propertyName);
      stats.uniquePropertyNames.add(normalizedName);
      
      // Check coordinates
      const coords = parseCoordinates(record.lat, record.lon);
      const hasValidCoords = coords !== null && isInUSAOrCanada(coords[0], coords[1]);
      
      if (hasValidCoords) {
        stats.recordsWithValidCoords++;
        stats.uniquePropertyNamesWithValidCoords.add(normalizedName);
      } else {
        stats.recordsWithoutValidCoords++;
      }
      
      // Check country field (matching map logic)
      const country = String(record.country || '').toUpperCase();
      
      // Track all country values
      const countryKey = record.country || '(null)';
      stats.countryValues.set(countryKey, (stats.countryValues.get(countryKey) || 0) + 1);
      
      if (!record.country || country === '') {
        stats.recordsWithNullCountry++;
      } else if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
        stats.recordsWithCanadaCountry++;
        stats.uniquePropertyNamesCanada.add(normalizedName);
        if (hasValidCoords) {
          stats.uniquePropertyNamesCanadaWithValidCoords.add(normalizedName);
        }
      } else if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
        stats.recordsWithUSACountry++;
        stats.uniquePropertyNamesUSA.add(normalizedName);
        if (hasValidCoords) {
          stats.uniquePropertyNamesUSAWithValidCoords.add(normalizedName);
        }
      } else {
        stats.recordsWithOtherCountry++;
      }
    }

    // Print results
    console.log('📊 Analysis Results:\n');
    console.log('=== Overall Statistics ===');
    console.log(`Total records: ${stats.totalRecords}`);
    console.log(`Records with property_name: ${stats.recordsWithPropertyName}`);
    console.log(`Records without property_name: ${stats.recordsWithoutPropertyName}`);
    console.log(`\nUnique property names (all): ${stats.uniquePropertyNames.size}`);
    
    console.log('\n=== Coordinate Validation ===');
    console.log(`Records with valid coordinates: ${stats.recordsWithValidCoords}`);
    console.log(`Records without valid coordinates: ${stats.recordsWithoutValidCoords}`);
    console.log(`Unique property names with valid coordinates: ${stats.uniquePropertyNamesWithValidCoords.size}`);
    
    console.log('\n=== Country Field Analysis ===');
    console.log(`Records with USA country: ${stats.recordsWithUSACountry}`);
    console.log(`Records with Canada country: ${stats.recordsWithCanadaCountry}`);
    console.log(`Records with other country: ${stats.recordsWithOtherCountry}`);
    console.log(`Records with null/empty country: ${stats.recordsWithNullCountry}`);
    
    console.log('\nUnique property names by country (all records):');
    console.log(`  USA: ${stats.uniquePropertyNamesUSA.size}`);
    console.log(`  Canada: ${stats.uniquePropertyNamesCanada.size}`);
    
    console.log('\n=== Map Count Logic (matching map component) ===');
    console.log('Properties counted on map must have:');
    console.log('  1. Valid coordinates');
    console.log('  2. Country field = USA or Canada');
    console.log('  3. Unique property names (grouped)');
    console.log(`\nUSA properties (with valid coords): ${stats.uniquePropertyNamesUSAWithValidCoords.size}`);
    console.log(`Canada properties (with valid coords): ${stats.uniquePropertyNamesCanadaWithValidCoords.size}`);
    console.log(`\nTOTAL (USA + Canada with valid coords): ${stats.uniquePropertyNamesUSAWithValidCoords.size + stats.uniquePropertyNamesCanadaWithValidCoords.size}`);
    
    console.log('\n=== Country Value Distribution ===');
    const sortedCountries = Array.from(stats.countryValues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    console.log('Top country values:');
    sortedCountries.forEach(([country, count]) => {
      console.log(`  "${country}": ${count} records`);
    });
    
    console.log('\n=== Missing Properties Breakdown ===');
    const totalUnique = stats.uniquePropertyNames.size;
    const mapCount = stats.uniquePropertyNamesUSAWithValidCoords.size + stats.uniquePropertyNamesCanadaWithValidCoords.size;
    const missing = totalUnique - mapCount;
    console.log(`Total unique properties: ${totalUnique}`);
    console.log(`Properties shown on map: ${mapCount}`);
    console.log(`Properties NOT shown on map: ${missing}`);
    console.log(`\nReasons properties might be missing:`);
    console.log(`  - No valid coordinates: ${stats.uniquePropertyNames.size - stats.uniquePropertyNamesWithValidCoords.size} unique properties`);
    console.log(`  - Country field not USA/Canada: ${stats.uniquePropertyNamesWithValidCoords.size - mapCount} unique properties with valid coords but wrong country`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the analysis
analyzeMapPropertyCount()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
