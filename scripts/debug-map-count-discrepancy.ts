/**
 * Debug why map shows 506 properties instead of expected 578
 * 
 * Run with: npx tsx scripts/debug-map-count-discrepancy.ts
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

async function debugMapCount() {
  console.log('🔍 Debugging map count discrepancy...\n');

  try {
    // Fetch all records (matching what the map does)
    console.log('📥 Fetching all records from all_glamping_properties...');
    
    let allData: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data, error, count } = await supabase
        .from('all_glamping_properties')
        .select('*', { count: 'exact' })
        .range(offset, offset + batchSize - 1);
      
      if (error) {
        console.error('❌ Error fetching data:', error);
        process.exit(1);
      }
      
      if (!data) {
        break;
      }
      
      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
      
      console.log(`  Fetched ${allData.length} / ${count || '?'} records...`);
    }
    
    const error = null; // No error if we got here

    if (error) {
      console.error('❌ Error fetching data:', error);
      process.exit(1);
    }

    if (!allData) {
      console.error('❌ No data returned');
      process.exit(1);
    }

    console.log(`✅ Fetched ${allData.length} total records\n`);

    // Transform data (matching map component logic)
    const transformedData = allData.map((item: any) => ({
      ...item,
      lat: item.lat ?? null,
      lon: item.lon ?? null,
    }));

    // Filter properties with valid coordinates (matching filterPropertiesWithCoordinates)
    const propertiesWithValidCoords = transformedData
      .map((prop: any) => {
        const coords = parseCoordinates(prop.lat, prop.lon);
        if (!coords) return null;
        
        if (!isInUSAOrCanada(coords[0], coords[1])) return null;
        
        return { ...prop, coordinates: coords };
      })
      .filter((prop: any) => prop !== null);

    console.log(`Properties with valid coordinates: ${propertiesWithValidCoords.length}`);

    // Group by property_name (matching map component logic)
    const propertyMap = new Map<string, any>();
    
    propertiesWithValidCoords.forEach((item: any) => {
      const propertyName = item.property_name;
      if (!propertyName) return;
      
      const normalizedName = normalizePropertyName(propertyName);
      
      // Use the same logic as the map component for grouping
      if (!propertyMap.has(normalizedName)) {
        propertyMap.set(normalizedName, item);
      } else {
        const existing = propertyMap.get(normalizedName)!;
        // Keep the one with coordinates if both have them
        if (item.coordinates && !existing.coordinates) {
          propertyMap.set(normalizedName, item);
        }
      }
    });

    const uniqueProperties = Array.from(propertyMap.values());
    console.log(`Unique properties (grouped by name): ${uniqueProperties.length}\n`);

    // Filter by country (matching map component logic)
    const propertiesByCountry = {
      USA: new Set<string>(),
      Canada: new Set<string>(),
      other: new Set<string>(),
    };

    uniqueProperties.forEach((p: any) => {
      const propertyName = p.property_name;
      if (!propertyName) return;
      
      const normalizedName = normalizePropertyName(propertyName);
      
      // Use ONLY the country field - no coordinate-based detection
      const country = String(p.country || '').toUpperCase();
      let normalizedCountry: string | null = null;
      
      // Check for Canada
      if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
        normalizedCountry = 'Canada';
      }
      // Check for United States
      else if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
        normalizedCountry = 'United States';
      }
      // Skip properties that are not USA or Canada
      else {
        propertiesByCountry.other.add(normalizedName);
        return;
      }
      
      if (normalizedCountry === 'Canada') {
        propertiesByCountry.Canada.add(normalizedName);
      } else if (normalizedCountry === 'United States') {
        propertiesByCountry.USA.add(normalizedName);
      }
    });

    console.log('📊 Results:\n');
    console.log(`USA properties: ${propertiesByCountry.USA.size}`);
    console.log(`Canada properties: ${propertiesByCountry.Canada.size}`);
    console.log(`Other countries: ${propertiesByCountry.other.size}`);
    console.log(`\nTOTAL (USA + Canada): ${propertiesByCountry.USA.size + propertiesByCountry.Canada.size}`);

    // Show properties that are in "other" category
    if (propertiesByCountry.other.size > 0) {
      console.log('\n⚠️  Properties with invalid country values:');
      const otherProps = Array.from(propertiesByCountry.other);
      otherProps.slice(0, 10).forEach((name, idx) => {
        const prop = uniqueProperties.find((p: any) => normalizePropertyName(p.property_name) === name);
        console.log(`  ${idx + 1}. "${prop?.property_name || name}" - country: "${prop?.country || '(null)'}"`);
      });
      if (otherProps.length > 10) {
        console.log(`  ... and ${otherProps.length - 10} more`);
      }
    }

    // Check for properties that might be excluded due to other reasons
    console.log('\n🔍 Additional checks:\n');
    
    // Check for properties without property_name
    const withoutName = propertiesWithValidCoords.filter((p: any) => !p.property_name || p.property_name.trim() === '');
    console.log(`Properties without property_name: ${withoutName.length}`);
    
    // Check for duplicate property names with different coordinates
    const nameToCoords = new Map<string, Array<[number, number]>>();
    propertiesWithValidCoords.forEach((p: any) => {
      const name = normalizePropertyName(p.property_name);
      if (!name) return;
      if (!nameToCoords.has(name)) {
        nameToCoords.set(name, []);
      }
      if (p.coordinates) {
        nameToCoords.get(name)!.push(p.coordinates);
      }
    });
    
    const duplicates = Array.from(nameToCoords.entries()).filter(([_, coords]) => coords.length > 1);
    console.log(`Properties with duplicate names (multiple records): ${duplicates.length}`);
    if (duplicates.length > 0) {
      console.log('  Sample duplicates:');
      duplicates.slice(0, 5).forEach(([name, coords]) => {
        const prop = propertiesWithValidCoords.find((p: any) => normalizePropertyName(p.property_name) === name);
        console.log(`    "${prop?.property_name || name}": ${coords.length} records`);
      });
    }

    // Expected vs actual
    const expected = propertiesByCountry.USA.size + propertiesByCountry.Canada.size;
    const actual = 506; // What user is seeing
    const difference = expected - actual;
    
    console.log(`\n📈 Comparison:`);
    console.log(`  Expected (based on analysis): ${expected}`);
    console.log(`  Actual (what map shows): ${actual}`);
    console.log(`  Difference: ${difference} properties`);
    
    if (difference > 0) {
      console.log(`\n⚠️  ${difference} properties are being excluded. Possible reasons:`);
      console.log(`  1. Additional filters active (unit type, rate range, state)`);
      console.log(`  2. Properties filtered out during client-side processing`);
      console.log(`  3. Properties excluded due to map bounds/viewport`);
      console.log(`  4. Properties with invalid data that pass initial checks but fail later`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the debug
debugMapCount()
  .then(() => {
    console.log('\n✅ Debug complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
