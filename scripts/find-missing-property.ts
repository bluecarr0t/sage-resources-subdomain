/**
 * Find which property is missing from the map count (506 vs 507 expected)
 * 
 * Run with: npx tsx scripts/find-missing-property.ts
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

async function findMissingProperty() {
  console.log('🔍 Finding which property is missing from map count...\n');

  try {
    // Fetch all records with limit matching map component
    console.log('📥 Fetching records (matching map query with limit 5000)...');
    
    const { data: allData, error } = await supabase
      .from('sage-glamping-data')
      .select('*')
      .limit(5000);

    if (error) {
      console.error('❌ Error fetching data:', error);
      process.exit(1);
    }

    if (!allData) {
      console.error('❌ No data returned');
      process.exit(1);
    }

    console.log(`✅ Fetched ${allData.length} records\n`);

    // Transform data (matching map component)
    const transformedData = allData.map((item: any) => ({
      ...item,
      lat: item.lat ?? null,
      lon: item.lon ?? null,
    }));

    // Filter properties with valid coordinates
    const propertiesWithValidCoords = transformedData
      .map((prop: any) => {
        const coords = parseCoordinates(prop.lat, prop.lon);
        if (!coords) return null;
        
        if (!isInUSAOrCanada(coords[0], coords[1])) return null;
        
        return { ...prop, coordinates: coords };
      })
      .filter((prop: any) => prop !== null);

    console.log(`Properties with valid coordinates: ${propertiesWithValidCoords.length}`);

    // Group by property_name (matching map component logic exactly)
    const propertyMap = new Map<string, any>();
    
    propertiesWithValidCoords.forEach((item: any) => {
      const propertyName = item.property_name;
      if (!propertyName) return;
      
      const normalizedName = normalizePropertyName(propertyName);
      
      if (!propertyMap.has(normalizedName)) {
        propertyMap.set(normalizedName, item);
      } else {
        // Keep the one with coordinates if both have them
        const existing = propertyMap.get(normalizedName)!;
        if (item.coordinates && !existing.coordinates) {
          propertyMap.set(normalizedName, item);
        }
      }
    });

    const uniqueProperties = Array.from(propertyMap.values());
    console.log(`Unique properties (grouped by name): ${uniqueProperties.length}\n`);

    // Filter by country using ONLY country field (matching count calculation)
    const propertiesByCountry = {
      USA: new Set<string>(),
      Canada: new Set<string>(),
    };

    uniqueProperties.forEach((p: any) => {
      const propertyName = p.property_name;
      if (!propertyName) return;
      
      const normalizedName = normalizePropertyName(propertyName);
      
      // Use ONLY the country field - no coordinate-based detection
      const country = String(p.country || '').toUpperCase();
      
      // Check for Canada
      if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
        propertiesByCountry.Canada.add(normalizedName);
      }
      // Check for United States
      else if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
        propertiesByCountry.USA.add(normalizedName);
      }
    });

    const totalCount = propertiesByCountry.USA.size + propertiesByCountry.Canada.size;
    console.log('📊 Count using country field only:');
    console.log(`  USA: ${propertiesByCountry.USA.size}`);
    console.log(`  Canada: ${propertiesByCountry.Canada.size}`);
    console.log(`  TOTAL: ${totalCount}`);
    console.log(`\n  Expected: 507`);
    console.log(`  Actual (map shows): 506`);
    console.log(`  Difference: ${totalCount - 506}`);

    // Now check if there's a property that might be excluded
    // List all properties to see if we can identify the missing one
    console.log('\n🔍 Checking for properties that might be excluded...\n');
    
    // Properties that have valid coords but wrong country
    const validCoordsButWrongCountry = uniqueProperties.filter((p: any) => {
      const country = String(p.country || '').toUpperCase();
      const isUSA = country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA';
      const isCanada = country === 'CA' || country === 'CAN' || country === 'CANADA';
      return !isUSA && !isCanada;
    });
    
    if (validCoordsButWrongCountry.length > 0) {
      console.log(`Properties with valid coords but invalid country: ${validCoordsButWrongCountry.length}`);
      validCoordsButWrongCountry.slice(0, 5).forEach((p: any) => {
        console.log(`  - "${p.property_name}" (country: "${p.country || '(null)'}")`);
      });
    }

    // Check if query limit is the issue
    if (allData.length >= 5000) {
      console.log('\n⚠️  WARNING: Query hit the 5000 limit!');
      console.log('   The map component uses .limit(5000), which might exclude some records.');
      console.log('   Total records in database might be more than 5000.');
    } else {
      console.log(`\n✅ Query fetched ${allData.length} records (limit is 5000, so all records were fetched)`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the analysis
findMissingProperty()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
