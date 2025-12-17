#!/usr/bin/env npx tsx
/**
 * Fetch campgrounds from Oregon and Washington using OpenStreetMap Overpass API
 * 
 * This script:
 * - Queries OpenStreetMap Overpass API for all campgrounds in Oregon and Washington
 * - Excludes RV Parks and RV Resorts (those go to all_rv_properties table)
 * - Extracts campground data including name, location, coordinates, website, operator
 * - Stores in all_campgrounds table
 * - Handles all campground types (private, state, federal)
 * 
 * Usage:
 *   npx tsx scripts/fetch-oregon-washington-campgrounds-osm.ts
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

const TABLE_NAME = 'all_campgrounds';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// State regions with bounding boxes
interface StateRegion {
  name: string;
  state: string;
  south: number;
  west: number;
  north: number;
  east: number;
}

const STATE_REGIONS: StateRegion[] = [
  // Oregon - split into regions to avoid timeout
  { name: 'Northern Oregon', state: 'OR', south: 45.0, west: -124.8, north: 46.3, east: -116.5 },
  { name: 'Southern Oregon', state: 'OR', south: 41.9, west: -124.8, north: 45.0, east: -116.5 },
  // Washington - split into regions to avoid timeout
  { name: 'Western Washington', state: 'WA', south: 45.5, west: -125.0, north: 49.0, east: -119.5 },
  { name: 'Eastern Washington', state: 'WA', south: 45.5, west: -119.5, north: 49.0, east: -116.9 },
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
  updated: number;
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
 * Query OpenStreetMap Overpass API for campgrounds in a specific region
 */
async function queryOverpassAPIRegion(region: StateRegion, retries = 3): Promise<OSMFeature[]> {
  console.log(`🌐 Querying OpenStreetMap Overpass API for ${region.name} (${region.state})...`);
  
  // Overpass QL query to find all campgrounds in region
  // Search for both tourism=camp_site and amenity=camp_site
  const query = `
[out:json][timeout:180];
(
  node["tourism"="camp_site"](${region.south},${region.west},${region.north},${region.east});
  way["tourism"="camp_site"](${region.south},${region.west},${region.north},${region.east});
  relation["tourism"="camp_site"](${region.south},${region.west},${region.north},${region.east});
  node["amenity"="camp_site"](${region.south},${region.west},${region.north},${region.east});
  way["amenity"="camp_site"](${region.south},${region.west},${region.north},${region.east});
  relation["amenity"="camp_site"](${region.south},${region.west},${region.north},${region.east});
);
out center;
`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: query,
      });

      if (!response.ok) {
        if (response.status === 504 && attempt < retries) {
          console.log(`  ⚠️  Timeout on attempt ${attempt}, retrying...`);
          await sleep(10000); // Wait 10 seconds before retry
          continue;
        }
        throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.elements || !Array.isArray(data.elements)) {
        throw new Error('Invalid response from Overpass API');
      }

      console.log(`  ✅ Found ${data.elements.length} campground features in ${region.name}\n`);
      
      return data.elements.map((element: any) => {
        const feature: OSMFeature = {
          type: element.type,
          id: element.id,
          tags: element.tags || {},
        };

        // Get coordinates based on element type
        if (element.type === 'node') {
          feature.lat = element.lat;
          feature.lon = element.lon;
        } else if (element.center) {
          feature.center = { lat: element.center.lat, lon: element.center.lon };
        } else if (element.lat && element.lon) {
          feature.lat = element.lat;
          feature.lon = element.lon;
        }

        return feature;
      });
    } catch (error) {
      if (attempt < retries) {
        console.log(`  ⚠️  Error on attempt ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log(`  Retrying in 5 seconds...`);
        await sleep(5000);
        continue;
      }
      throw error;
    }
  }

  return [];
}

/**
 * Check if a place is an RV park/resort (should be excluded)
 */
function isRVProperty(feature: OSMFeature): boolean {
  const tags = feature.tags;
  const name = (tags.name || tags['name:en'] || '').toLowerCase();
  
  // Check if name contains RV-related keywords
  const rvKeywords = [
    'rv park', 'rv resort', 'rv campground', 'rv camping', 
    'rv park &', 'rv park and', 'rv sites', 'rv only',
    'recreational vehicle park', 'recreational vehicle resort'
  ];
  const hasRVKeyword = rvKeywords.some(keyword => name.includes(keyword));
  
  // Check for RV-specific tags
  const hasRVTags = tags.rv === 'yes' || 
                    tags.rv === 'designated' || 
                    tags.camp_site === 'rv' ||
                    tags['camp_site:rv'] === 'yes';
  
  // Exclude if it's primarily an RV facility
  return hasRVKeyword || hasRVTags;
}

/**
 * Extract data from OSM feature
 */
function extractCampgroundData(feature: OSMFeature, state: string): {
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
  osm_id: number;
  osm_type: string;
  osm_tags: Record<string, any>;
  campground_type: 'private' | 'state' | 'federal' | 'unknown' | null;
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

  // Determine campground type from operator
  const operator = tags.operator || tags['contact:operator'] || null;
  let campground_type: 'private' | 'state' | 'federal' | 'unknown' | null = null;

  if (operator) {
    const operatorLower = operator.toLowerCase();
    
    // Federal indicators
    const federalKeywords = [
      'national park', 'national forest', 'us forest service', 'usfs', 'blm', 'bureau of land management',
      'army corps', 'usace', 'bureau of reclamation', 'national wildlife refuge', 'fish and wildlife',
      'department of defense', 'national monument', 'national recreation area'
    ];
    
    if (federalKeywords.some(kw => operatorLower.includes(kw))) {
      campground_type = 'federal';
    }
    // State indicators
    else if (operatorLower.includes('state park') || operatorLower.includes('state forest') || 
             operatorLower.includes('state recreation') || operatorLower.includes('department of parks') ||
             operatorLower.includes('state parks') || operatorLower.includes('parks and recreation') ||
             (state === 'OR' && operatorLower.includes('oregon')) ||
             (state === 'WA' && operatorLower.includes('washington'))) {
      campground_type = 'state';
    }
    // Private indicators
    else if (tags['operator:type'] === 'business' || tags['operator:type'] === 'private' ||
             operatorLower.includes('koa') || operatorLower.includes('rv park') || 
             operatorLower.includes('campground') || operatorLower.includes('resort')) {
      campground_type = 'private';
    } else {
      campground_type = 'unknown';
    }
  } else if (tags['operator:type'] === 'government') {
    // Government but no operator specified - could be state or federal
    campground_type = 'unknown';
  }

  return {
    name: tags.name || tags['name:en'] || null,
    operator,
    latitude,
    longitude,
    address,
    city: tags['addr:city'] || tags.place || null,
    county: tags['addr:county'] || null,
    postal_code: tags['addr:postcode'] || null,
    website: tags.website || tags.url || tags['contact:website'] || null,
    phone: tags.phone || tags['contact:phone'] || null,
    email: tags.email || tags['contact:email'] || null,
    osm_id: feature.id,
    osm_type: feature.type,
    osm_tags: tags,
    campground_type,
  };
}

/**
 * Check if campground already exists in database
 */
async function campgroundExists(
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
    console.error(`  ❌ Error checking existence: ${error.message}`);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Insert or update campground in database
 */
async function upsertCampground(
  supabase: ReturnType<typeof createClient>,
  data: ReturnType<typeof extractCampgroundData>,
  state: string
): Promise<'inserted' | 'updated' | 'skipped' | 'failed'> {
  try {
    // Skip if no name
    if (!data.name) {
      return 'skipped';
    }

    // Check if exists
    const exists = await campgroundExists(supabase, data.osm_id, data.osm_type);

    const record = {
      name: data.name,
      state,
      operator: data.operator,
      latitude: data.latitude,
      longitude: data.longitude,
      county: data.county,
      city: data.city,
      address: data.address,
      postal_code: data.postal_code,
      website: data.website,
      phone: data.phone,
      email: data.email,
      osm_id: data.osm_id,
      osm_type: data.osm_type,
      osm_tags: data.osm_tags,
      campground_type: data.campground_type,
      updated_at: new Date().toISOString(),
    };

    if (exists) {
      // Update existing record
      const { error } = await supabase
        .from(TABLE_NAME)
        .update(record)
        .eq('osm_id', data.osm_id)
        .eq('osm_type', data.osm_type);

      if (error) {
        console.error(`  ❌ Error updating ${data.name}: ${error.message}`);
        return 'failed';
      }
      return 'updated';
    } else {
      // Insert new record
      const { error } = await supabase
        .from(TABLE_NAME)
        .insert({
          ...record,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error(`  ❌ Error inserting ${data.name}: ${error.message}`);
        return 'failed';
      }
      return 'inserted';
    }
  } catch (error) {
    console.error(`  ❌ Error processing ${data.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return 'failed';
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Fetch Oregon and Washington Campgrounds from OSM');
  console.log('='.repeat(70));
  console.log();

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const stats: ProcessingStats = {
    total: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    // Process each region
    for (const region of STATE_REGIONS) {
      console.log(`\n📍 Processing ${region.name} (${region.state})...`);
      console.log('-'.repeat(70));

      // Query OSM for this region
      const features = await queryOverpassAPIRegion(region);
      stats.total += features.length;

      // Process each feature
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        
        // Skip RV parks and RV resorts
        if (isRVProperty(feature)) {
          stats.skipped++;
          stats.processed++;
          continue;
        }
        
        try {
          const campgroundData = extractCampgroundData(feature, region.state);
          const result = await upsertCampground(supabase, campgroundData, region.state);

          stats.processed++;
          if (result === 'inserted') stats.inserted++;
          else if (result === 'updated') stats.updated++;
          else if (result === 'skipped') stats.skipped++;
          else if (result === 'failed') stats.failed++;

          // Progress update every 10 records
          if ((i + 1) % 10 === 0 || i + 1 === features.length) {
            console.log(`  Processed ${i + 1}/${features.length} campgrounds...`);
          }

          // Small delay to avoid overwhelming the database
          await sleep(100);
        } catch (error) {
          console.error(`  ❌ Error processing feature ${feature.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          stats.failed++;
          stats.processed++;
        }
      }

      console.log(`\n✅ Completed ${region.name}: ${features.length} features processed`);
      
      // Delay between regions to be respectful to OSM API
      if (region !== STATE_REGIONS[STATE_REGIONS.length - 1]) {
        console.log('⏳ Waiting 5 seconds before next region...\n');
        await sleep(5000);
      }
    }

    // Print final statistics
    console.log('\n' + '='.repeat(70));
    console.log('Final Statistics');
    console.log('='.repeat(70));
    console.log(`Total features found: ${stats.total}`);
    console.log(`Processed: ${stats.processed}`);
    console.log(`Inserted: ${stats.inserted}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Failed: ${stats.failed}`);
    console.log();

    console.log('✅ Process complete!');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the script
main();
