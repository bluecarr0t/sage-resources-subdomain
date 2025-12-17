#!/usr/bin/env npx tsx
/**
 * Fetch RV Parks and RV Resorts from Western US states using OpenStreetMap Overpass API
 * 
 * This script:
 * - Queries OpenStreetMap Overpass API for RV parks and resorts in:
 *   California, Oregon, Washington, Idaho, Nevada, Arizona, New Mexico
 * - Filters for places with "RV" in the name or RV-related tags
 * - Extracts campground data including RV-specific features
 * - Stores in all_rv_properties table
 * 
 * Usage:
 *   npx tsx scripts/fetch-california-rv-properties-osm.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { slugifyPropertyName } from '@/lib/properties';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'all_rv_properties';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// State regions with bounding boxes split to avoid timeout
interface StateRegion {
  name: string;
  state: string;
  south: number;
  west: number;
  north: number;
  east: number;
}

const STATE_REGIONS: StateRegion[] = [
  // California
  { name: 'Northern California', state: 'CA', south: 38.0, west: -124.5, north: 42.0, east: -120.0 },
  { name: 'Central California', state: 'CA', south: 35.0, west: -121.5, north: 38.0, east: -118.0 },
  { name: 'Southern California', state: 'CA', south: 32.5, west: -121.0, north: 35.0, east: -114.0 },
  // Oregon
  { name: 'Northern Oregon', state: 'OR', south: 45.0, west: -124.8, north: 46.3, east: -116.5 },
  { name: 'Southern Oregon', state: 'OR', south: 41.9, west: -124.8, north: 45.0, east: -116.5 },
  // Washington
  { name: 'Western Washington', state: 'WA', south: 45.5, west: -125.0, north: 49.0, east: -119.5 },
  { name: 'Eastern Washington', state: 'WA', south: 45.5, west: -119.5, north: 49.0, east: -116.9 },
  // Idaho
  { name: 'Northern Idaho', state: 'ID', south: 44.0, west: -117.5, north: 49.0, east: -110.7 },
  { name: 'Southern Idaho', state: 'ID', south: 42.0, west: -117.5, north: 44.0, east: -110.7 },
  // Nevada
  { name: 'Northern Nevada', state: 'NV', south: 37.0, west: -120.0, north: 42.0, east: -114.0 },
  { name: 'Southern Nevada', state: 'NV', south: 35.0, west: -120.0, north: 37.0, east: -114.0 },
  // Arizona
  { name: 'Northern Arizona', state: 'AZ', south: 31.3, west: -114.8, north: 37.0, east: -109.0 },
  { name: 'Southern Arizona', state: 'AZ', south: 31.3, west: -114.8, north: 34.5, east: -109.0 },
  // New Mexico
  { name: 'Northern New Mexico', state: 'NM', south: 31.3, west: -109.0, north: 37.0, east: -103.0 },
  { name: 'Southern New Mexico', state: 'NM', south: 31.3, west: -109.0, north: 34.0, east: -103.0 },
  // Montana
  { name: 'Western Montana', state: 'MT', south: 44.4, west: -116.1, north: 49.0, east: -104.0 },
  { name: 'Eastern Montana', state: 'MT', south: 44.4, west: -104.0, north: 49.0, east: -104.0 },
  // Wyoming
  { name: 'Wyoming', state: 'WY', south: 41.0, west: -111.1, north: 45.0, east: -104.1 },
  // Utah
  { name: 'Northern Utah', state: 'UT', south: 37.0, west: -114.1, north: 42.0, east: -109.0 },
  { name: 'Southern Utah', state: 'UT', south: 37.0, west: -114.1, north: 39.0, east: -109.0 },
  // Colorado
  { name: 'Western Colorado', state: 'CO', south: 37.0, west: -109.1, north: 41.0, east: -102.0 },
  { name: 'Eastern Colorado', state: 'CO', south: 37.0, west: -102.0, north: 41.0, east: -102.0 },
  // Texas (split into regions due to size)
  { name: 'Western Texas', state: 'TX', south: 25.8, west: -106.7, north: 32.0, east: -100.0 },
  { name: 'Central Texas', state: 'TX', south: 25.8, west: -100.0, north: 32.0, east: -96.0 },
  { name: 'Eastern Texas', state: 'TX', south: 25.8, west: -96.0, north: 36.5, east: -93.5 },
  { name: 'Northern Texas', state: 'TX', south: 32.0, west: -106.7, north: 36.5, east: -93.5 },
  // Oklahoma
  { name: 'Oklahoma', state: 'OK', south: 33.6, west: -103.0, north: 37.0, east: -94.4 },
  // Kansas
  { name: 'Kansas', state: 'KS', south: 37.0, west: -102.1, north: 40.0, east: -94.6 },
  // Nebraska
  { name: 'Nebraska', state: 'NE', south: 40.0, west: -104.1, north: 43.0, east: -95.3 },
  // South Dakota
  { name: 'South Dakota', state: 'SD', south: 42.5, west: -104.1, north: 45.9, east: -96.4 },
  // North Dakota
  { name: 'North Dakota', state: 'ND', south: 45.9, west: -104.1, north: 49.0, east: -96.6 },
  // Minnesota
  { name: 'Minnesota', state: 'MN', south: 43.5, west: -97.2, north: 49.4, east: -89.5 },
  // Iowa
  { name: 'Iowa', state: 'IA', south: 40.4, west: -96.6, north: 43.5, east: -90.1 },
  // Missouri
  { name: 'Missouri', state: 'MO', south: 36.0, west: -95.8, north: 40.6, east: -89.1 },
  // Arkansas
  { name: 'Arkansas', state: 'AR', south: 33.0, west: -94.6, north: 36.5, east: -89.6 },
  // Louisiana
  { name: 'Louisiana', state: 'LA', south: 29.0, west: -94.0, north: 33.0, east: -88.8 },
  // Mississippi
  { name: 'Mississippi', state: 'MS', south: 30.1, west: -91.7, north: 34.9, east: -88.1 },
  // Alabama
  { name: 'Alabama', state: 'AL', south: 30.1, west: -88.5, north: 35.0, east: -84.9 },
  // Georgia
  { name: 'Northern Georgia', state: 'GA', south: 30.4, west: -85.6, north: 35.0, east: -80.8 },
  { name: 'Southern Georgia', state: 'GA', south: 30.4, west: -85.6, north: 32.7, east: -80.8 },
  // Florida
  { name: 'Northern Florida', state: 'FL', south: 24.5, west: -87.6, north: 31.0, east: -80.0 },
  { name: 'Central Florida', state: 'FL', south: 24.5, west: -87.6, north: 28.5, east: -80.0 },
  { name: 'Southern Florida', state: 'FL', south: 24.5, west: -87.6, north: 28.5, east: -79.8 },
  // South Carolina
  { name: 'South Carolina', state: 'SC', south: 32.0, west: -83.4, north: 35.2, east: -78.5 },
  // North Carolina
  { name: 'North Carolina', state: 'NC', south: 33.8, west: -84.3, north: 36.6, east: -75.5 },
  // Tennessee
  { name: 'Tennessee', state: 'TN', south: 35.0, west: -90.3, north: 36.7, east: -81.6 },
  // Kentucky
  { name: 'Kentucky', state: 'KY', south: 36.5, west: -89.6, north: 39.1, east: -81.9 },
  // West Virginia
  { name: 'West Virginia', state: 'WV', south: 37.2, west: -82.6, north: 40.6, east: -77.7 },
  // Virginia
  { name: 'Virginia', state: 'VA', south: 36.5, west: -83.7, north: 39.5, east: -75.2 },
  // Maryland
  { name: 'Maryland', state: 'MD', south: 37.9, west: -79.5, north: 39.7, east: -75.0 },
  // Delaware
  { name: 'Delaware', state: 'DE', south: 38.4, west: -75.8, north: 39.7, east: -74.9 },
  // New Jersey
  { name: 'New Jersey', state: 'NJ', south: 38.9, west: -75.6, north: 41.4, east: -73.9 },
  // Pennsylvania
  { name: 'Western Pennsylvania', state: 'PA', south: 39.7, west: -80.5, north: 42.3, east: -74.7 },
  { name: 'Eastern Pennsylvania', state: 'PA', south: 39.7, west: -80.5, north: 42.3, east: -74.7 },
  // New York
  { name: 'Western New York', state: 'NY', south: 40.5, west: -79.8, north: 45.0, east: -73.2 },
  { name: 'Eastern New York', state: 'NY', south: 40.5, west: -79.8, north: 45.0, east: -71.8 },
  // Connecticut
  { name: 'Connecticut', state: 'CT', south: 40.9, west: -73.7, north: 42.1, east: -71.8 },
  // Rhode Island
  { name: 'Rhode Island', state: 'RI', south: 41.1, west: -71.9, north: 42.0, east: -71.1 },
  // Massachusetts
  { name: 'Massachusetts', state: 'MA', south: 41.2, west: -73.5, north: 42.9, east: -69.9 },
  // Vermont
  { name: 'Vermont', state: 'VT', south: 42.7, west: -73.4, north: 45.0, east: -71.5 },
  // New Hampshire
  { name: 'New Hampshire', state: 'NH', south: 42.7, west: -72.6, north: 45.3, east: -70.6 },
  // Maine
  { name: 'Maine', state: 'ME', south: 43.1, west: -71.1, north: 47.5, east: -66.9 },
  // Ohio
  { name: 'Ohio', state: 'OH', south: 38.4, west: -84.8, north: 42.0, east: -80.5 },
  // Indiana
  { name: 'Indiana', state: 'IN', south: 37.8, west: -88.1, north: 41.8, east: -84.8 },
  // Illinois
  { name: 'Illinois', state: 'IL', south: 37.0, west: -91.5, north: 42.5, east: -87.0 },
  // Michigan
  { name: 'Lower Peninsula Michigan', state: 'MI', south: 41.7, west: -90.4, north: 46.0, east: -82.1 },
  { name: 'Upper Peninsula Michigan', state: 'MI', south: 45.0, west: -90.4, north: 48.3, east: -82.1 },
  // Wisconsin
  { name: 'Wisconsin', state: 'WI', south: 42.5, west: -92.9, north: 47.1, east: -86.2 },
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
 * Check if a place is an RV park/resort based on name or tags
 */
function isRVProperty(feature: OSMFeature): boolean {
  const tags = feature.tags;
  const name = (tags.name || tags['name:en'] || '').toLowerCase();
  
  // Check if name contains RV-related keywords
  const rvKeywords = ['rv park', 'rv resort', 'rv campground', 'rv camping', 'rv park &', 'rv park and'];
  const hasRVKeyword = rvKeywords.some(keyword => name.includes(keyword));
  
  // Check for RV-specific tags
  const hasRVTags = tags.rv === 'yes' || tags.rv === 'designated';
  
  // Must be a camp_site and have RV indication
  return tags.tourism === 'camp_site' && (hasRVKeyword || hasRVTags);
}

/**
 * Query OpenStreetMap Overpass API for RV properties in a specific region
 */
async function queryOverpassAPIRegion(region: StateRegion, retries = 3): Promise<OSMFeature[]> {
  console.log(`🌐 Querying OpenStreetMap Overpass API for ${region.name}...`);
  
  // Overpass QL query to find campgrounds in region
  // We'll filter for RV-specific ones in post-processing
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

      // Filter for RV properties
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
        .filter(isRVProperty);

      console.log(`  ✅ Found ${rvFeatures.length} RV properties in ${region.name} (out of ${data.elements.length} campgrounds)\n`);
      
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
 * Query OpenStreetMap Overpass API for RV properties in all states (all regions)
 */
async function queryOverpassAPI(): Promise<Array<OSMFeature & { state: string }>> {
  console.log('🌐 Querying OpenStreetMap Overpass API for RV parks and resorts in all US states...\n');
  
  const allFeatures: Array<OSMFeature & { state: string }> = [];
  const seenIds = new Set<string>();
  
  // Query each region separately to avoid timeout
  for (let i = 0; i < STATE_REGIONS.length; i++) {
    const region = STATE_REGIONS[i];
    
    try {
      const features = await queryOverpassAPIRegion(region);
      
      // Deduplicate by OSM ID and add state
      for (const feature of features) {
        const key = `${feature.type}-${feature.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          allFeatures.push({ ...feature, state: region.state });
        }
      }
      
      // Small delay between regions
      if (i < STATE_REGIONS.length - 1) {
        await sleep(2000);
      }
    } catch (error) {
      console.error(`  ❌ Error querying ${region.name} (${region.state}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue with other regions
    }
  }
  
  console.log(`✅ Total unique RV properties found: ${allFeatures.length}\n`);
  
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
  max_rv_length: number | null;
  rv_camping_available: boolean;
  hookups: ReturnType<typeof parseHookups>;
  generators_allowed: boolean | null;
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

  // Parse max RV length
  let max_rv_length: number | null = null;
  const maxLengthStr = tags['maxlength'] || tags['rv:maxlength'] || tags['max_length'];
  if (maxLengthStr) {
    const parsed = parseInt(maxLengthStr, 10);
    if (!isNaN(parsed)) max_rv_length = parsed;
  }

  // Check generators
  const generators_allowed = tags.generators === 'yes' ? true : 
                            tags.generators === 'no' ? false : null;

  const hookups = parseHookups(tags);

  return {
    name: tags.name || tags['name:en'] || null,
    operator: tags.operator || null,
    latitude,
    longitude,
    address,
    city: tags['addr:city'] || tags.place || null,
    county: tags['addr:county'] || null,
    postal_code: tags['addr:postcode'] || null,
    website: tags.website || tags.url || null,
    phone: tags.phone || tags['contact:phone'] || null,
    max_rv_length,
    rv_camping_available: true, // All entries in this query are RV properties
    hookups,
    generators_allowed,
    osm_tags: tags,
  };
}

/**
 * Generate slug for RV property
 */
function generateSlug(name: string, city: string | null): string {
  let baseSlug = slugifyPropertyName(name);
  
  // If we have a city, append it to make slug more unique
  if (city) {
    const citySlug = slugifyPropertyName(city);
    baseSlug = `${baseSlug}-${citySlug}`;
  }
  
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
  feature: OSMFeature & { state?: string },
  extractedData: ReturnType<typeof extractRVData>,
  state: string
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

  const slug = generateSlug(extractedData.name, extractedData.city);

  const insertData = {
    name: extractedData.name,
    state: state,
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
    max_rv_length: extractedData.max_rv_length,
    rv_camping_available: extractedData.rv_camping_available,
    full_hook_up: extractedData.hookups.full_hook_up,
    water_hookup: extractedData.hookups.water_hookup,
    electrical_hook_up: extractedData.hookups.electrical_hook_up,
    sewer_hook_up: extractedData.hookups.sewer_hook_up,
    generators_allowed: extractedData.generators_allowed,
    osm_id: feature.id,
    osm_type: feature.type,
    osm_tags: extractedData.osm_tags,
    campground_type: 'private', // Most RV parks are private, can be updated later
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
  console.log('🚀 Starting Western US RV properties discovery from OpenStreetMap...\n');
  console.log('States: CA, OR, WA, ID, NV, AZ, NM\n');
  
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
      console.log('No RV properties found. Exiting.');
      return;
    }

    console.log(`📊 Processing ${features.length} RV properties...\n`);

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

      console.log(`[${i + 1}/${stats.total}] Processing: ${extractedData.name} (${feature.state})`);
      if (extractedData.city) {
        console.log(`  Location: ${extractedData.city}, ${feature.state}`);
      }
      if (extractedData.hookups.full_hook_up) {
        console.log(`  ✅ Full hookup available`);
      }

      // Insert into database
      const result = await insertRVProperty(supabase, feature, extractedData, feature.state);

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

      // Rate limiting - be respectful to Overpass API
      if (i < features.length - 1) {
        await sleep(100); // Small delay between inserts
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Processing Summary');
    console.log('='.repeat(60));
    console.log(`Total RV properties found:  ${stats.total}`);
    console.log(`Processed:                  ${stats.processed}`);
    console.log(`Inserted:                   ${stats.inserted}`);
    console.log(`Skipped:                    ${stats.skipped}`);
    console.log(`Failed:                     ${stats.failed}`);
    console.log('='.repeat(60));

    if (stats.inserted > 0) {
      console.log(`\n✅ Successfully discovered and inserted ${stats.inserted} RV properties!`);
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
