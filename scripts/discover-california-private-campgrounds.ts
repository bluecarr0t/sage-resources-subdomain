#!/usr/bin/env npx tsx
/**
 * Discover privately owned campgrounds in California using OpenStreetMap Overpass API
 * 
 * This script:
 * - Queries OpenStreetMap Overpass API for campgrounds in California
 * - Filters out public campgrounds (National Park Service, State Parks, BLM, etc.)
 * - Extracts campground data and stores in private_campgrounds table
 * - Generates slugs for each campground
 * 
 * Usage:
 *   npx tsx scripts/discover-california-private-campgrounds.ts
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

const TABLE_NAME = 'private_campgrounds';
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';

// California bounding box split into regions to avoid timeout
const CALIFORNIA_REGIONS = [
  { name: 'Northern California', south: 38.0, west: -124.5, north: 42.0, east: -120.0 },
  { name: 'Central California', south: 35.0, west: -121.5, north: 38.0, east: -118.0 },
  { name: 'Southern California', south: 32.5, west: -121.0, north: 35.0, east: -114.0 },
];

// Public operators to exclude
const PUBLIC_OPERATORS = [
  'National Park Service',
  'NPS',
  'State Parks',
  'California State Parks',
  'BLM',
  'Bureau of Land Management',
  'Forest Service',
  'USFS',
  'US Army Corps',
  'Army Corps of Engineers',
  'County',
  'City of',
  'Municipal',
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
 * Check if operator is public (should be excluded)
 */
function isPublicOperator(operator: string | undefined): boolean {
  if (!operator) return false;
  const operatorLower = operator.toLowerCase();
  return PUBLIC_OPERATORS.some(publicOp => 
    operatorLower.includes(publicOp.toLowerCase())
  );
}

/**
 * Query OpenStreetMap Overpass API for campgrounds in a specific region
 */
async function queryOverpassAPIRegion(region: typeof CALIFORNIA_REGIONS[0], retries = 3): Promise<OSMFeature[]> {
  console.log(`🌐 Querying OpenStreetMap Overpass API for ${region.name}...`);
  
  // Overpass QL query to find campgrounds in region
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

      console.log(`  ✅ Found ${data.elements.length} campground features in ${region.name}\n`);
      
      return data.elements.map((element: any) => {
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
      });
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
 * Query OpenStreetMap Overpass API for campgrounds in California (all regions)
 */
async function queryOverpassAPI(): Promise<OSMFeature[]> {
  console.log('🌐 Querying OpenStreetMap Overpass API for campgrounds in California...\n');
  
  const allFeatures: OSMFeature[] = [];
  const seenIds = new Set<string>();
  
  // Query each region separately to avoid timeout
  for (let i = 0; i < CALIFORNIA_REGIONS.length; i++) {
    const region = CALIFORNIA_REGIONS[i];
    
    try {
      const features = await queryOverpassAPIRegion(region);
      
      // Deduplicate by OSM ID
      for (const feature of features) {
        const key = `${feature.type}-${feature.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          allFeatures.push(feature);
        }
      }
      
      // Small delay between regions
      if (i < CALIFORNIA_REGIONS.length - 1) {
        await sleep(2000);
      }
    } catch (error) {
      console.error(`  ❌ Error querying ${region.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue with other regions
    }
  }
  
  console.log(`✅ Total unique campground features found: ${allFeatures.length}\n`);
  
  return allFeatures;
}

/**
 * Extract data from OSM feature
 */
function extractCampgroundData(feature: OSMFeature): {
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
    osm_tags: tags,
  };
}

/**
 * Generate slug for campground
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
    console.warn(`⚠️  Error checking existence: ${error.message}`);
    return false;
  }

  return (data && data.length > 0) || false;
}

/**
 * Insert campground into database
 */
async function insertCampground(
  supabase: ReturnType<typeof createClient>,
  feature: OSMFeature,
  extractedData: ReturnType<typeof extractCampgroundData>
): Promise<{ success: boolean; error?: string }> {
  if (!extractedData.name) {
    return { success: false, error: 'Missing name' };
  }

  if (!extractedData.latitude || !extractedData.longitude) {
    return { success: false, error: 'Missing coordinates' };
  }

  // Check if already exists
  const exists = await campgroundExists(supabase, feature.id, feature.type);
  if (exists) {
    return { success: false, error: 'Already exists' };
  }

  const slug = generateSlug(extractedData.name, extractedData.city);

  const insertData = {
    name: extractedData.name,
    state: 'CA',
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
    osm_id: feature.id,
    osm_type: feature.type,
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
  console.log('🚀 Starting California private campgrounds discovery...\n');
  
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
      console.log('No campgrounds found. Exiting.');
      return;
    }

    console.log(`📊 Processing ${features.length} campground features...\n`);

    // Process each feature
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      stats.processed++;

      const extractedData = extractCampgroundData(feature);

      // Skip if no name
      if (!extractedData.name) {
        console.log(`[${i + 1}/${stats.total}] Skipping - no name (OSM ID: ${feature.id})`);
        stats.skipped++;
        continue;
      }

      // Skip if public operator
      if (isPublicOperator(extractedData.operator)) {
        console.log(`[${i + 1}/${stats.total}] Skipping - public operator: ${extractedData.name} (${extractedData.operator})`);
        stats.skipped++;
        continue;
      }

      // Skip if no coordinates
      if (!extractedData.latitude || !extractedData.longitude) {
        console.log(`[${i + 1}/${stats.total}] Skipping - no coordinates: ${extractedData.name}`);
        stats.skipped++;
        continue;
      }

      console.log(`[${i + 1}/${stats.total}] Processing: ${extractedData.name}`);
      if (extractedData.city) {
        console.log(`  Location: ${extractedData.city}`);
      }

      // Insert into database
      const result = await insertCampground(supabase, feature, extractedData);

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
    console.log(`Total features found:     ${stats.total}`);
    console.log(`Processed:                ${stats.processed}`);
    console.log(`Inserted:                 ${stats.inserted}`);
    console.log(`Skipped:                  ${stats.skipped}`);
    console.log(`Failed:                   ${stats.failed}`);
    console.log('='.repeat(60));

    if (stats.inserted > 0) {
      console.log(`\n✅ Successfully discovered and inserted ${stats.inserted} private campgrounds!`);
    }

    if (stats.failed > 0) {
      console.log(`\n⚠️  ${stats.failed} campgrounds failed to insert. Check the error messages above.`);
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
