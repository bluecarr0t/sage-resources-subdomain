#!/usr/bin/env npx tsx
/**
 * Fetch RV Parks and RV Resorts from all Canadian provinces/territories using OpenStreetMap Overpass API
 * 
 * This script:
 * - Queries OpenStreetMap Overpass API for all campgrounds (tourism=camp_site) in all Canadian provinces/territories
 * - Filters for properties with "RV Park" or "RV Resort" in the name
 * - Extracts campground data including RV-specific features
 * - Stores in osm_rv_properties table with country='CAN'
 * 
 * Usage:
 *   npx tsx scripts/fetch-canada-rv-properties-osm.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'osm_rv_properties';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const COUNTRY = 'CAN';

// Canadian provinces and territories with bounding boxes
interface ProvinceRegion {
  name: string;
  province: string; // Province/territory code (AB, BC, MB, etc.)
  south: number;
  west: number;
  north: number;
  east: number;
}

// All Canadian provinces and territories with bounding boxes
const PROVINCE_REGIONS: ProvinceRegion[] = [
  // British Columbia - split into regions (large province)
  { name: 'Vancouver Island & Lower Mainland BC', province: 'BC', south: 48.0, west: -125.0, north: 50.0, east: -122.0 },
  { name: 'Central British Columbia', province: 'BC', south: 50.0, west: -125.0, north: 54.0, east: -120.0 },
  { name: 'Northern British Columbia', province: 'BC', south: 54.0, west: -130.0, north: 60.0, east: -120.0 },
  { name: 'Interior British Columbia', province: 'BC', south: 49.0, west: -120.0, north: 54.0, east: -114.0 },
  // Alberta - split into 2 regions
  { name: 'Southern Alberta', province: 'AB', south: 49.0, west: -120.0, north: 54.0, east: -110.0 },
  { name: 'Northern Alberta', province: 'AB', south: 54.0, west: -120.0, north: 60.0, east: -110.0 },
  // Saskatchewan - split into 2 regions
  { name: 'Southern Saskatchewan', province: 'SK', south: 49.0, west: -110.0, north: 54.0, east: -101.0 },
  { name: 'Northern Saskatchewan', province: 'SK', south: 54.0, west: -110.0, north: 60.0, east: -101.0 },
  // Manitoba - split into 2 regions
  { name: 'Southern Manitoba', province: 'MB', south: 49.0, west: -101.0, north: 52.0, east: -95.0 },
  { name: 'Northern Manitoba', province: 'MB', south: 52.0, west: -101.0, north: 60.0, east: -89.0 },
  // Ontario - split into multiple regions (very large province)
  { name: 'Southwestern Ontario', province: 'ON', south: 42.0, west: -83.0, north: 45.0, east: -79.0 },
  { name: 'Central Ontario', province: 'ON', south: 44.0, west: -85.0, north: 47.0, east: -76.0 },
  { name: 'Eastern Ontario', province: 'ON', south: 44.0, west: -79.0, north: 47.0, east: -74.0 },
  { name: 'Northern Ontario', province: 'ON', south: 47.0, west: -95.0, north: 52.0, east: -79.0 },
  { name: 'Far Northern Ontario', province: 'ON', south: 52.0, west: -95.0, north: 57.0, east: -79.0 },
  // Quebec - split into multiple regions (very large province)
  { name: 'Southern Quebec', province: 'QC', south: 45.0, west: -79.0, north: 48.0, east: -66.0 },
  { name: 'Central Quebec', province: 'QC', south: 48.0, west: -79.0, north: 51.0, east: -66.0 },
  { name: 'Northern Quebec', province: 'QC', south: 51.0, west: -79.0, north: 55.0, east: -66.0 },
  { name: 'Far Northern Quebec', province: 'QC', south: 55.0, west: -79.0, north: 62.0, east: -66.0 },
  // New Brunswick
  { name: 'New Brunswick', province: 'NB', south: 44.6, west: -69.0, north: 48.1, east: -63.7 },
  // Nova Scotia
  { name: 'Nova Scotia', province: 'NS', south: 43.4, west: -66.3, north: 47.0, east: -59.7 },
  // Prince Edward Island
  { name: 'Prince Edward Island', province: 'PE', south: 45.9, west: -64.4, north: 47.1, east: -61.9 },
  // Newfoundland and Labrador - split into 2 regions
  { name: 'Newfoundland', province: 'NL', south: 46.6, west: -60.0, north: 51.7, east: -52.6 },
  { name: 'Labrador', province: 'NL', south: 51.7, west: -67.0, north: 60.4, east: -52.6 },
  // Yukon Territory
  { name: 'Yukon Territory', province: 'YT', south: 60.0, west: -141.0, north: 70.0, east: -123.0 },
  // Northwest Territories - split into 2 regions
  { name: 'Southern Northwest Territories', province: 'NT', south: 60.0, west: -120.0, north: 66.0, east: -101.0 },
  { name: 'Northern Northwest Territories', province: 'NT', south: 66.0, west: -136.0, north: 70.0, east: -101.0 },
  // Nunavut - split into 3 regions (very large territory)
  { name: 'Eastern Nunavut', province: 'NU', south: 60.0, west: -85.0, north: 70.0, east: -61.0 },
  { name: 'Central Nunavut', province: 'NU', south: 60.0, west: -102.0, north: 70.0, east: -85.0 },
  { name: 'Western Nunavut', province: 'NU', south: 60.0, west: -120.0, north: 70.0, east: -102.0 },
];

interface OSMFeature {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
}

interface ProcessingStats {
  total: number;
  processed: number;
  inserted: number;
  skipped: number;
  failed: number;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Slugify a property name for URL-safe slug generation
 */
function slugifyPropertyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a place is an RV Park or RV Resort based on name
 * This is the core filtering logic for this script
 */
function isRVParkOrResort(feature: OSMFeature): boolean {
  const tags = feature.tags;
  const name = (tags.name || tags['name:en'] || tags['name:fr'] || '').toLowerCase();
  
  // Must be a camp_site
  if (tags.tourism !== 'camp_site') {
    return false;
  }
  
  // Check if name contains RV Park or RV Resort keywords
  const rvParkKeywords = ['rv park', 'rv resort'];
  const hasRVKeyword = rvParkKeywords.some(keyword => name.includes(keyword));
  
  return hasRVKeyword;
}

/**
 * Query OpenStreetMap Overpass API for campgrounds in a specific region
 */
async function queryOverpassAPIRegion(region: ProvinceRegion, retries = 3): Promise<OSMFeature[]> {
  console.log(`🌐 Querying OpenStreetMap Overpass API for ${region.name}...`);
  
  // Overpass QL query to find all campgrounds in region
  const query = `
[out:json][timeout:180];
(
  node["tourism"="camp_site"]
    (${region.south},${region.west},${region.north},${region.east});
  way["tourism"="camp_site"]
    (${region.south},${region.west},${region.north},${region.east});
  relation["tourism"="camp_site"]
    (${region.south},${region.west},${region.north},${region.east});
);
out center;
`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        if (response.status === 504 && attempt < retries) {
          console.log(`  ⚠️  Timeout on attempt ${attempt}, retrying...`);
          await sleep(5000); // Wait 5 seconds before retry
          continue;
        }
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.elements || !Array.isArray(data.elements)) {
        throw new Error('Invalid response from Overpass API');
      }

      // Filter for RV Park/Resort properties
      const rvFeatures = data.elements
        .map((element: any) => {
          const feature: OSMFeature = {
            type: element.type,
            id: element.id,
            tags: element.tags || {},
          };

          // Extract coordinates
          if (element.type === 'node') {
            feature.lat = element.lat;
            feature.lon = element.lon;
          } else if (element.center) {
            feature.center = { lat: element.center.lat, lon: element.center.lon };
          }

          return feature;
        })
        .filter(isRVParkOrResort);

      console.log(`  ✅ Found ${rvFeatures.length} RV Parks/Resorts in ${region.name} (out of ${data.elements.length} campgrounds)\n`);
      
      return rvFeatures;
    } catch (error) {
      if (attempt === retries) {
        if (error instanceof Error) {
          throw new Error(`Failed to query Overpass API for ${region.name}: ${error.message}`);
        }
        throw new Error(`Unknown error querying Overpass API for ${region.name}`);
      }
      console.log(`  ⚠️  Error on attempt ${attempt}, retrying...`);
      await sleep(5000);
    }
  }
  
  return [];
}

/**
 * Query OpenStreetMap Overpass API for RV properties in all provinces/territories
 */
async function queryOverpassAPI(): Promise<Array<OSMFeature & { province: string }>> {
  console.log('🌐 Querying OpenStreetMap Overpass API for RV Parks and Resorts in all Canadian provinces/territories...\n');
  
  const allFeatures: Array<OSMFeature & { province: string }> = [];
  const seenIds = new Set<string>();
  
  // Query each region separately to avoid timeout
  for (let i = 0; i < PROVINCE_REGIONS.length; i++) {
    const region = PROVINCE_REGIONS[i];
    
    try {
      const features = await queryOverpassAPIRegion(region);
      
      // Deduplicate by OSM ID and add province
      for (const feature of features) {
        const key = `${feature.type}-${feature.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          allFeatures.push({ ...feature, province: region.province });
        }
      }
      
      // Small delay between regions to be respectful to OSM API
      if (i < PROVINCE_REGIONS.length - 1) {
        await sleep(2000);
      }
    } catch (error) {
      console.error(`  ❌ Error querying ${region.name} (${region.province}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue with other regions
    }
  }
  
  console.log(`✅ Total unique RV Parks/Resorts found: ${allFeatures.length}\n`);
  
  return allFeatures;
}

/**
 * Parse hookup information from OSM tags
 */
function parseHookups(tags: Record<string, string>): {
  full_hook_up: boolean | null;
  water_hookup: boolean | null;
  electrical_hook_up: boolean | null;
  sewer_hook_up: boolean | null;
} {
  // Check for explicit hookup tags
  const hasWater = tags['amenity:water'] === 'yes' || tags['water:hookup'] === 'yes' || 
                   tags.amenity === 'water' || tags.water === 'yes';
  const hasElectrical = tags['electricity:hookup'] === 'yes' || tags.electricity === 'yes' || 
                        tags['amenity:electricity'] === 'yes';
  const hasSewer = tags['sewer:hookup'] === 'yes' || tags.sewer === 'yes' || 
                   tags['amenity:sewer'] === 'yes';

  // Check for hookup descriptions
  const hookups = (tags.hookups || tags['camp_site:hookups'] || '').toLowerCase();
  const hasFullHookup = hookups.includes('full') || (hasWater && hasElectrical && hasSewer);

  return {
    full_hook_up: hasFullHookup ? true : (hasWater || hasElectrical || hasSewer ? false : null),
    water_hookup: hasWater ? true : null,
    electrical_hook_up: hasElectrical ? true : null,
    sewer_hook_up: hasSewer ? true : null,
  };
}

/**
 * Extract RV-specific data from OSM feature
 */
function extractRVData(feature: OSMFeature): {
  name: string | null;
  operator: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  county: string | null;
  postal_code: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  max_rv_length: number | null;
  hookups: ReturnType<typeof parseHookups>;
  generators_allowed: boolean | null;
  pull_through_sites: boolean | null;
  back_in_sites: boolean | null;
  osm_tags: Record<string, any>;
} {
  const tags = feature.tags;
  
  // Get coordinates
  let latitude: number | null = null;
  let longitude: number | null = null;
  
  if (feature.type === 'node' && feature.lat && feature.lon) {
    latitude = feature.lat;
    longitude = feature.lon;
  } else if (feature.center) {
    latitude = feature.center.lat;
    longitude = feature.center.lon;
  }

  // Build address from OSM tags
  const addressParts: string[] = [];
  if (tags['addr:housenumber']) addressParts.push(tags['addr:housenumber']);
  if (tags['addr:street']) addressParts.push(tags['addr:street']);
  const address = addressParts.length > 0 ? addressParts.join(' ') : null;

  // Parse max RV length (may be in meters, convert to feet if needed)
  let max_rv_length: number | null = null;
  const maxLengthStr = tags['maxlength'] || tags['rv:maxlength'] || tags['max_length'];
  if (maxLengthStr) {
    const parsed = parseFloat(maxLengthStr);
    if (!isNaN(parsed)) {
      // If value seems like meters (>20), convert to feet, otherwise assume feet
      max_rv_length = parsed > 20 ? Math.round(parsed * 3.28084) : Math.round(parsed);
    }
  }

  // Check generators
  const generators_allowed = tags.generators === 'yes' ? true : 
                            tags.generators === 'no' ? false : null;

  // Check site types
  const pull_through_sites = tags['rv:pull_through'] === 'yes' ? true : null;
  const back_in_sites = tags['rv:back_in'] === 'yes' ? true : null;

  const hookups = parseHookups(tags);

  return {
    name: tags.name || tags['name:en'] || tags['name:fr'] || null,
    operator: tags.operator || null,
    latitude,
    longitude,
    address,
    city: tags['addr:city'] || tags.place || null,
    county: tags['addr:county'] || null,
    postal_code: tags['addr:postcode'] || null,
    website: tags.website || tags.url || null,
    phone: tags.phone || tags['contact:phone'] || null,
    email: tags.email || tags['contact:email'] || null,
    max_rv_length,
    hookups,
    generators_allowed,
    pull_through_sites,
    back_in_sites,
    osm_tags: tags,
  };
}

/**
 * Generate slug for RV property
 */
function generateSlug(name: string, city: string | null, province: string): string {
  let baseSlug = slugifyPropertyName(name);
  
  // If we have a city, append it to make slug more unique
  if (city) {
    const citySlug = slugifyPropertyName(city);
    baseSlug = `${baseSlug}-${citySlug}`;
  }
  
  // Append province for uniqueness
  baseSlug = `${baseSlug}-${province.toLowerCase()}`;
  
  return baseSlug;
}

/**
 * Check if RV property already exists in database
 */
async function rvPropertyExists(
  supabase: ReturnType<typeof createClient>,
  osmId: number,
  osmType: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id')
    .eq('osm_id', osmId)
    .eq('osm_type', osmType)
    .limit(1);

  if (error) {
    console.warn(`⚠️  Error checking existence: ${error.message}`);
    return false;
  }

  return (data && data.length > 0) || false;
}

/**
 * Insert RV property into database
 */
async function insertRVProperty(
  supabase: ReturnType<typeof createClient>,
  feature: OSMFeature & { province?: string },
  extractedData: ReturnType<typeof extractRVData>,
  province: string
): Promise<{ success: boolean; error?: string }> {
  if (!extractedData.name) {
    return { success: false, error: 'Missing name' };
  }

  if (!extractedData.latitude || !extractedData.longitude) {
    return { success: false, error: 'Missing coordinates' };
  }

  // Check if already exists
  const exists = await rvPropertyExists(supabase, feature.id, feature.type);
  if (exists) {
    return { success: false, error: 'Already exists' };
  }

  const slug = generateSlug(extractedData.name, extractedData.city, province);

  const insertData = {
    osm_id: feature.id,
    osm_type: feature.type,
    name: extractedData.name,
    state: province, // Using state field for province code
    country: COUNTRY,
    slug,
    operator: extractedData.operator,
    latitude: extractedData.latitude,
    longitude: extractedData.longitude,
    address: extractedData.address,
    city: extractedData.city,
    county: extractedData.county,
    postal_code: extractedData.postal_code,
    website: extractedData.website,
    phone: extractedData.phone,
    email: extractedData.email,
    max_rv_length: extractedData.max_rv_length,
    full_hook_up: extractedData.hookups.full_hook_up,
    water_hookup: extractedData.hookups.water_hookup,
    electrical_hook_up: extractedData.hookups.electrical_hook_up,
    sewer_hook_up: extractedData.hookups.sewer_hook_up,
    generators_allowed: extractedData.generators_allowed,
    pull_through_sites: extractedData.pull_through_sites,
    back_in_sites: extractedData.back_in_sites,
    osm_tags: extractedData.osm_tags,
  };

  const { error } = await supabase
    .from(TABLE_NAME)
    .insert(insertData);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(80));
  console.log('🚀 Starting Canada RV Parks and Resorts Discovery from OpenStreetMap');
  console.log('='.repeat(80));
  console.log();
  console.log('📋 Scope: All Canadian Provinces and Territories');
  console.log('🔍 Filter: Properties with "RV Park" or "RV Resort" in name');
  console.log('📊 Target Table: osm_rv_properties');
  console.log();
  
  const stats: ProcessingStats = {
    total: 0,
    processed: 0,
    inserted: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Query Overpass API
    const features = await queryOverpassAPI();
    stats.total = features.length;

    if (features.length === 0) {
      console.log('No RV Parks/Resorts found. Exiting.');
      return;
    }

    console.log(`📊 Processing ${features.length} RV Parks/Resorts...\n`);

    // Process each feature
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      stats.processed++;

      const extractedData = extractRVData(feature);

      // Skip if no name
      if (!extractedData.name) {
        console.log(`[${i + 1}/${stats.total}] Skipping - no name (OSM ID: ${feature.id})`);
        stats.skipped++;
        continue;
      }

      // Skip if no coordinates
      if (!extractedData.latitude || !extractedData.longitude) {
        console.log(`[${i + 1}/${stats.total}] Skipping - no coordinates: ${extractedData.name}`);
        stats.skipped++;
        continue;
      }

      console.log(`[${i + 1}/${stats.total}] Processing: ${extractedData.name} (${feature.province})`);
      if (extractedData.city) {
        console.log(`  📍 Location: ${extractedData.city}, ${feature.province}`);
      }
      if (extractedData.hookups.full_hook_up) {
        console.log(`  ✅ Full hookup available`);
      }

      // Insert into database
      const result = await insertRVProperty(supabase, feature, extractedData, feature.province);

      if (result.success) {
        console.log(`  ✅ Inserted successfully\n`);
        stats.inserted++;
      } else {
        if (result.error === 'Already exists') {
          console.log(`  ⏭️  Already exists, skipping\n`);
          stats.skipped++;
        } else {
          console.error(`  ❌ Error: ${result.error}\n`);
          stats.failed++;
        }
      }

      // Rate limiting - be respectful to database
      if (i < features.length - 1) {
        await sleep(100); // Small delay between inserts
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Processing Summary');
    console.log('='.repeat(80));
    console.log(`Total RV Parks/Resorts found:  ${stats.total}`);
    console.log(`Processed:                      ${stats.processed}`);
    console.log(`Inserted:                       ${stats.inserted}`);
    console.log(`Skipped:                        ${stats.skipped}`);
    console.log(`Failed:                         ${stats.failed}`);
    console.log('='.repeat(80));

    if (stats.inserted > 0) {
      console.log(`\n✅ Successfully discovered and inserted ${stats.inserted} Canadian RV Parks/Resorts!`);
    }

    if (stats.failed > 0) {
      console.log(`\n⚠️  ${stats.failed} RV properties failed to insert. Check the error messages above.`);
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

