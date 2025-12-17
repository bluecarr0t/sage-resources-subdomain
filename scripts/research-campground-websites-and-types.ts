#!/usr/bin/env npx tsx
/**
 * Research campground websites and types using OpenAI
 * 
 * This script:
 * - Fetches all campground records from all_campgrounds table
 * - Uses OpenAI API to research each campground's website URL and campground_type
 * - Updates the database with the researched information
 * - Processes records in batches with rate limiting
 * 
 * Usage:
 *   npx tsx scripts/research-campground-websites-and-types.ts [--skip-existing] [--limit N]
 * 
 * Options:
 *   --skip-existing  Skip records that already have website and campground_type set
 *   --limit N        Only process first N records (useful for testing)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

if (!openaiApiKey) {
  console.error('❌ Missing OpenAI API key');
  console.error('Please ensure OPENAI_API_KEY is set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'all_campgrounds';

// Parse command line arguments
const args = process.argv.slice(2);
const skipExisting = args.includes('--skip-existing');
const unknownOnly = args.includes('--unknown-only'); // Only process records with website=null AND type='unknown'
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

// Initialize clients
const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const openai = new OpenAI({ apiKey: openaiApiKey });

// Configuration
const DELAY_BETWEEN_AI_CALLS = 2000; // 2 seconds between OpenAI API calls to avoid rate limits
const BATCH_SIZE = 10; // Number of records to update in parallel (database updates)
const MAX_RETRIES = 3; // Maximum retries for OpenAI API calls

interface CampgroundRecord {
  id: number;
  name: string;
  state: string | null;
  city: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  website: string | null;
  campground_type: string | null;
  osm_id: number | null;
  osm_type: string | null;
  osm_tags: Record<string, any> | null;
  operator: string | null;
}

interface ResearchResult {
  website: string | null;
  campground_type: 'private' | 'state' | 'federal' | 'unknown';
  source: 'osm_tags' | 'osm_api' | 'openai'; // Track where we got the info from
}

interface OSMData {
  website: string | null;
  operator: string | null;
  operator_type: string | null; // e.g., "National Park Service", "California State Parks"
  tags: Record<string, any> | null;
}

/**
 * Extract website and operator from existing OSM tags
 */
function extractFromOSMTags(campground: CampgroundRecord): { website: string | null; operator: string | null } {
  if (!campground.osm_tags) {
    return { website: null, operator: null };
  }

  const tags = campground.osm_tags;
  const website = tags.website || tags.url || tags['contact:website'] || null;
  const operator = tags.operator || tags['contact:operator'] || null;

  return { website, operator };
}

/**
 * Query OSM Nominatim API to get detailed information about a location
 */
async function queryOSMNominatim(
  latitude: number,
  longitude: number,
  name: string
): Promise<OSMData> {
  try {
    // Use Nominatim reverse geocoding to find the feature at these coordinates
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&extratags=1&namedetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CampgroundResearch/1.0 (research script)', // Required by Nominatim
      },
    });

    if (!response.ok) {
      return { website: null, operator: null, operator_type: null, tags: null };
    }

    const data = await response.json();
    const tags = data.extratags || {};
    const address = data.address || {};

    // Extract website from OSM tags
    const website = tags.website || tags.url || null;

    // Extract operator
    const operator = tags.operator || null;

    // Try to determine operator type from address/type
    let operator_type: string | null = null;
    if (tags.tourism === 'camp_site' || tags.amenity === 'camp_site') {
      // Check if it's a state or federal facility
      if (tags['operator:type'] === 'government' || operator?.toLowerCase().includes('state') || 
          operator?.toLowerCase().includes('parks') || operator?.toLowerCase().includes('forest')) {
        // Could be state or federal - need more context
        operator_type = operator || null;
      }
    }

    // Rate limiting - Nominatim requires 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1100));

    return {
      website,
      operator,
      operator_type,
      tags: { ...tags, ...address }, // Combine tags with address info
    };
  } catch (error) {
    console.log(`    ⚠️  OSM Nominatim query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { website: null, operator: null, operator_type: null, tags: null };
  }
}

/**
 * Query OSM Overpass API to find campgrounds near coordinates
 * Searches within a radius and matches by name similarity
 */
async function queryOSMOverpass(
  latitude: number,
  longitude: number,
  name: string,
  searchRadius: number = 500 // meters
): Promise<OSMData | null> {
  try {
    // Normalize name for matching
    const normalizeName = (n: string): string => {
      return n.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    const normalizedTargetName = normalizeName(name);

    // Build Overpass query to find camp_site features within radius
    // Search for both tourism=camp_site and amenity=camp_site
    const query = `
[out:json][timeout:25];
(
  node(around:${searchRadius},${latitude},${longitude})["tourism"="camp_site"];
  node(around:${searchRadius},${latitude},${longitude})["amenity"="camp_site"];
  way(around:${searchRadius},${latitude},${longitude})["tourism"="camp_site"];
  way(around:${searchRadius},${latitude},${longitude})["amenity"="camp_site"];
  relation(around:${searchRadius},${latitude},${longitude})["tourism"="camp_site"];
  relation(around:${searchRadius},${latitude},${longitude})["amenity"="camp_site"];
);
out body;
>;
out skel qt;
`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const elements = data.elements || [];

    if (elements.length === 0) {
      return null;
    }

    // Find the best matching element by name similarity
    let bestMatch: any = null;
    let bestScore = 0;

    for (const element of elements) {
      if (!element.tags || !element.tags.name) continue;

      const elementName = normalizeName(element.tags.name);
      
      // Calculate similarity score
      let score = 0;
      
      // Exact match
      if (elementName === normalizedTargetName) {
        score = 100;
      }
      // Partial match - contains target name or vice versa
      else if (elementName.includes(normalizedTargetName) || normalizedTargetName.includes(elementName)) {
        score = 50 + Math.min(elementName.length, normalizedTargetName.length) / Math.max(elementName.length, normalizedTargetName.length) * 50;
      }
      // Word overlap
      else {
        const targetWords = normalizedTargetName.split(' ');
        const elementWords = elementName.split(' ');
        const commonWords = targetWords.filter(word => elementWords.includes(word)).length;
        score = (commonWords / Math.max(targetWords.length, elementWords.length)) * 50;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = element;
      }
    }

    // Only accept matches with reasonable similarity (at least 30% match)
    if (bestMatch && bestScore >= 30) {
      const tags = bestMatch.tags || {};
      
      const website = tags.website || tags.url || tags['contact:website'] || null;
      const operator = tags.operator || tags['contact:operator'] || null;
      
      let operator_type: string | null = null;
      if (tags['operator:type']) {
        operator_type = tags['operator:type'];
      } else if (operator) {
        operator_type = operator;
      }

      // Rate limiting - Overpass API allows more requests than Nominatim, but be respectful
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        website,
        operator,
        operator_type,
        tags,
      };
    }

    return null;
  } catch (error) {
    console.log(`    ⚠️  OSM Overpass query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}

/**
 * Determine campground type from operator information
 */
function determineTypeFromOperator(operator: string | null, osmTags: Record<string, any> | null): 'private' | 'state' | 'federal' | 'unknown' {
  if (!operator && !osmTags) return 'unknown';

  const operatorLower = operator?.toLowerCase() || '';
  const tags = osmTags || {};

  // Federal indicators
  const federalKeywords = [
    'national park', 'national forest', 'us forest service', 'usfs', 'blm', 'bureau of land management',
    'army corps', 'usace', 'bureau of reclamation', 'national wildlife refuge', 'fish and wildlife',
    'department of defense', 'national monument', 'national recreation area'
  ];
  
  if (federalKeywords.some(kw => operatorLower.includes(kw))) {
    return 'federal';
  }

  // State indicators
  const stateKeywords = [
    'state park', 'state forest', 'state recreation', 'department of parks', 'state parks',
    'county park', 'regional park', 'park district', 'parks and recreation'
  ];
  
  if (stateKeywords.some(kw => operatorLower.includes(kw))) {
    return 'state';
  }

  // Check OSM tags for clues
  if (tags['operator:type'] === 'government') {
    // Could be state or federal - check operator string
    if (operatorLower.includes('national') || operatorLower.includes('federal') || operatorLower.includes('us ')) {
      return 'federal';
    }
    return 'state';
  }

  // Check for private commercial indicators
  if (tags['operator:type'] === 'business' || tags['operator:type'] === 'private' ||
      operatorLower.includes('koa') || operatorLower.includes('rv park') || 
      operatorLower.includes('campground') || operatorLower.includes('resort')) {
    return 'private';
  }

  // If we have an operator but can't determine, default to unknown
  return operator ? 'unknown' : 'unknown';
}

/**
 * Research campground website and type using multiple methods
 */
async function researchCampground(
  campground: CampgroundRecord,
  retryCount: number = 0
): Promise<ResearchResult> {
  // Step 1: Check existing OSM tags first
  const osmTagData = extractFromOSMTags(campground);
  if (osmTagData.website) {
    const type = determineTypeFromOperator(
      osmTagData.operator || campground.operator,
      campground.osm_tags
    );
    console.log(`    ✅ Found website in OSM tags: ${osmTagData.website}`);
    return {
      website: osmTagData.website,
      campground_type: type,
      source: 'osm_tags',
    };
  }

  // Step 2: Query OSM Nominatim API if we have coordinates
  let osmApiData: OSMData | null = null;
  if (campground.latitude && campground.longitude) {
    console.log(`    🔍 Querying OSM Nominatim API...`);
    osmApiData = await queryOSMNominatim(
      campground.latitude,
      campground.longitude,
      campground.name
    );

    if (osmApiData.website) {
      const type = determineTypeFromOperator(
        osmApiData.operator || campground.operator,
        osmApiData.tags || campground.osm_tags
      );
      console.log(`    ✅ Found website via OSM Nominatim: ${osmApiData.website}`);
      return {
        website: osmApiData.website,
        campground_type: type,
        source: 'osm_api',
      };
    }

    // If we got operator from OSM but no website, we can still determine type
    if (osmApiData.operator) {
      const type = determineTypeFromOperator(osmApiData.operator, osmApiData.tags);
      console.log(`    ✅ Found operator via OSM Nominatim: ${osmApiData.operator} (type: ${type})`);
      // Continue to Overpass API or OpenAI to find website
    }
  }

  // Step 2b: Query OSM Overpass API for deeper search within radius
  if (campground.latitude && campground.longitude && !osmApiData?.website) {
    console.log(`    🔍 Querying OSM Overpass API (500m radius)...`);
    const overpassData = await queryOSMOverpass(
      campground.latitude,
      campground.longitude,
      campground.name,
      500 // 500 meter radius
    );

    if (overpassData?.website) {
      const type = determineTypeFromOperator(
        overpassData.operator || campground.operator || osmApiData?.operator,
        overpassData.tags || campground.osm_tags || osmApiData?.tags
      );
      console.log(`    ✅ Found website via OSM Overpass: ${overpassData.website}`);
      return {
        website: overpassData.website,
        campground_type: type,
        source: 'osm_api',
      };
    }

    // Merge Overpass data with Nominatim data if available
    if (overpassData) {
      osmApiData = {
        website: overpassData.website || osmApiData?.website || null,
        operator: overpassData.operator || osmApiData?.operator || null,
        operator_type: overpassData.operator_type || osmApiData?.operator_type || null,
        tags: { ...(osmApiData?.tags || {}), ...(overpassData.tags || {}) },
      };

      if (overpassData.operator) {
        const type = determineTypeFromOperator(overpassData.operator, overpassData.tags);
        console.log(`    ✅ Found operator via OSM Overpass: ${overpassData.operator} (type: ${type})`);
      }
    }
  }

  // Step 3: Use OpenAI as fallback, enriched with OSM data
  // Build location context
  const locationParts: string[] = [];
  if (campground.city) locationParts.push(campground.city);
  if (campground.county) locationParts.push(`${campground.county} County`);
  if (campground.state) locationParts.push(campground.state);
  const location = locationParts.length > 0 ? locationParts.join(', ') : campground.state || 'Unknown location';

  // Build enriched context from OSM data
  const osmContext = osmApiData?.operator 
    ? `\n\nOSM Data Found:
- Operator: ${osmApiData.operator}
${osmApiData.operator_type ? `- Operator Type: ${osmApiData.operator_type}` : ''}
${osmApiData.tags ? `- Additional context: ${JSON.stringify(Object.keys(osmApiData.tags).slice(0, 10).join(', '))}` : ''}`
    : '';

  const prompt = `You are researching a campground that was previously not found. Use ALL your knowledge and search capabilities to find information. Be EXTREMELY thorough and creative in your search approach.

Campground Name: ${campground.name}
Location: ${location}
${campground.address ? `Address: ${campground.address}` : ''}
${campground.latitude && campground.longitude ? `Coordinates: ${campground.latitude}, ${campground.longitude}` : ''}${osmContext}

AGGRESSIVE SEARCH STRATEGY FOR FINDING THE WEBSITE:
1. Try exact name searches: "${campground.name}" + "${location}"
2. Try partial name searches if the exact name fails
3. Search for the campground on ALL relevant agency websites:
   - FEDERAL: recreation.gov, nps.gov, fs.usda.gov, blm.gov, usace.army.mil, usbr.gov
   - STATE: state park websites, state forest websites, state recreation area websites
     * California: parks.ca.gov, reservecalifornia.com
     * Other states: [state]stateparks.org, [state]parks.gov, etc.
   - COUNTY/LOCAL: county park websites, regional park district websites (e.g., ebparks.org, mprpd.org)
   - PRIVATE: Try variations of the name, check if it's a KOA, Good Sam, or other commercial network
4. Search for related terms:
   - "${campground.name} camping"
   - "${campground.name} campground"
   - "${campground.name} ${location} camping"
   - If it's a "group camp" or "youth camp", search for the managing agency
5. Check if it might be part of a larger recreation area or park - find the parent facility's website
6. Look for:
   - Direct campground pages
   - Reservation system pages (recreation.gov, reservecalifornia.com, etc.)
   - Park/facility pages that list this campground
   - PDFs or documents that might contain links
7. Try common variations: remove numbers, remove parenthetical info, try alternative spellings
8. ONLY return null if you have exhausted ALL search strategies and truly cannot find ANY official page

CAMPGROUND TYPE - DETERMINE CAREFULLY:
- "private" = commercial/privately owned (RV parks, private campgrounds, KOA, Good Sam parks, family-owned)
- "state" = State government owned (state parks, state forests, state beaches, state recreation areas, state wildlife areas)
- "federal" = Federal government owned (national parks, national forests, BLM, Army Corps, Bureau of Reclamation, national wildlife refuges, etc.)
- "unknown" = ONLY if you truly cannot determine ownership after exhaustive research

IMPORTANT NOTES FOR HARD-TO-FIND SITES:
- "Yellow Post" sites, "dispersed camping", and primitive sites might be on BLM or Forest Service websites
- Group camps and youth camps (like "Girls Camp", "Youth Camp") are often managed by park districts, counties, or state agencies
- Sites with generic names ("East Bay Sites", "Sunrise Sites") might be part of a larger park system - search for the park name
- Very small primitive sites might only be listed on district/agency camping overview pages, not individual pages
- Check for camping directories, camping guides, or "all campgrounds" pages on agency websites
- Some sites might be discontinued or historical - still try to find the managing agency's website
- If you find the managing agency (park district, forest, etc.), provide their main camping page URL
- Coordinates can help verify if you find a similar-named campground in the same area

Return ONLY valid JSON in this exact format:
{
  "website": "https://example.com/campground-page" or null,
  "campground_type": "private" or "state" or "federal" or "unknown"
}

REMEMBER: This record was previously not found. Use creative thinking, try multiple search strategies, and explore alternative names or related facilities.`;

  try {
    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_AI_CALLS));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.9, // Very high temperature for maximum creative/exploratory research
      response_format: { type: 'json_object' },
      max_tokens: 800, // More tokens for thorough research
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e}`);
    }

    // Validate and normalize campground_type
    const campgroundType = parsed.campground_type?.toLowerCase();
    if (!['private', 'state', 'federal', 'unknown'].includes(campgroundType)) {
      console.log(`    ⚠️  Invalid campground_type "${campgroundType}", defaulting to "unknown"`);
      parsed.campground_type = 'unknown';
    }

    // Validate website URL format
    let website = parsed.website;
    if (website && typeof website === 'string' && website.trim()) {
      website = website.trim();
      // Add protocol if missing
      if (!website.startsWith('http://') && !website.startsWith('https://')) {
        website = `https://${website}`;
      }
      // Validate it's a URL
      try {
        new URL(website);
      } catch {
        console.log(`    ⚠️  Invalid website URL format "${website}", setting to null`);
        website = null;
      }
    } else {
      website = null;
    }

    // Prefer OSM-derived type if we have operator info from OSM
    let finalType = parsed.campground_type || 'unknown';
    if (osmApiData?.operator && finalType === 'unknown') {
      const osmType = determineTypeFromOperator(osmApiData.operator, osmApiData.tags);
      if (osmType !== 'unknown') {
        finalType = osmType;
        console.log(`    ✅ Using OSM-derived type: ${finalType}`);
      }
    }

    return {
      website,
      campground_type: finalType as 'private' | 'state' | 'federal' | 'unknown',
      source: 'openai',
    };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`    ⚠️  Error (attempt ${retryCount + 1}/${MAX_RETRIES}), retrying...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_AI_CALLS * 2));
      return researchCampground(campground, retryCount + 1);
    }
    
    console.log(`    ❌ Error after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Try to use OSM data if available even on error
    if (osmApiData?.operator) {
      const type = determineTypeFromOperator(osmApiData.operator, osmApiData.tags);
      return {
        website: null,
        campground_type: type,
        source: 'osm_api',
      };
    }
    
    return {
      website: null,
      campground_type: 'unknown',
      source: 'openai',
    };
  }
}

/**
 * Fetch all campground records from database
 */
async function fetchCampgroundRecords(): Promise<CampgroundRecord[]> {
  console.log('📥 Fetching campground records from database...\n');

  let allRecords: CampgroundRecord[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(TABLE_NAME)
      .select('id, name, state, city, county, latitude, longitude, address, website, campground_type, osm_id, osm_type, osm_tags, operator')
      .order('id', { ascending: true })
      .range(offset, offset + batchSize - 1);

    // Filter based on mode
    if (unknownOnly) {
      // Only get records where website is null AND campground_type is 'unknown'
      query = query.is('website', null).eq('campground_type', 'unknown');
    } else if (skipExisting) {
      // Get records missing website or campground_type
      query = query.or('website.is.null,campground_type.is.null');
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error fetching from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    allRecords = [...allRecords, ...data];

    offset += batchSize;
    hasMore = data.length === batchSize;

    if (hasMore) {
      console.log(`  Fetched ${allRecords.length} records so far...`);
    }
  }

  // Apply limit if specified
  if (limit && limit > 0) {
    allRecords = allRecords.slice(0, limit);
  }

  console.log(`✅ Found ${allRecords.length} campground records to process\n`);
  return allRecords;
}

/**
 * Update campground record in database
 */
async function updateCampgroundRecord(
  id: number,
  website: string | null,
  campground_type: string
): Promise<boolean> {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      website,
      campground_type,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error(`    ❌ Database error: ${error.message}`);
    return false;
  }
  return true;
}

/**
 * Update records in batches
 */
async function updateRecords(
  updates: Array<{ id: number; website: string | null; campground_type: string }>
): Promise<void> {
  console.log(`\n📤 Updating ${updates.length} records in database...`);

  let updated = 0;
  let errorCount = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);

    // Update each record concurrently using Promise.all
    const updatePromises = batch.map(async (update) => {
      const success = await updateCampgroundRecord(
        update.id,
        update.website,
        update.campground_type
      );
      return { success };
    });

    const results = await Promise.all(updatePromises);

    const batchSuccess = results.filter(r => r.success).length;
    updated += batchSuccess;
    errorCount += results.length - batchSuccess;

    if ((i + BATCH_SIZE) % 100 === 0 || i + BATCH_SIZE >= updates.length) {
      console.log(`  ✅ Updated ${updated}/${updates.length} records...`);
    }
  }

  console.log(`\n✅ Successfully updated ${updated} records`);
  if (errorCount > 0) {
    console.warn(`⚠️  ${errorCount} records failed to update`);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Research Campground Websites and Types');
  console.log('='.repeat(70));
  console.log();

  if (unknownOnly) {
    console.log('📌 Mode: Only processing records with website=null AND type=unknown');
  } else if (skipExisting) {
    console.log('📌 Mode: Skipping records with existing website and campground_type');
  }
  if (limit) {
    console.log(`📌 Limit: Processing only first ${limit} records`);
  }
  console.log(`📌 Temperature: 0.9 (very high for maximum exploratory research)`);
  console.log();

  try {
    // Step 1: Fetch all campground records
    const campgrounds = await fetchCampgroundRecords();

    if (campgrounds.length === 0) {
      console.log('✅ No campgrounds to process!');
      return;
    }

    // Step 2: Research each campground
    console.log('🔍 Researching campgrounds using OSM data and OpenAI...\n');
    const updates: Array<{ id: number; website: string | null; campground_type: string }> = [];
      const stats = {
      foundWebsite: 0,
      foundType: 0,
      sources: {
        osm_tags: 0,
        osm_api: 0,
        openai: 0,
      },
      types: {
        private: 0,
        state: 0,
        federal: 0,
        unknown: 0,
      },
    };

    for (let i = 0; i < campgrounds.length; i++) {
      const campground = campgrounds[i];
      console.log(`[${i + 1}/${campgrounds.length}] ${campground.name}`);
      if (campground.city && campground.state) {
        console.log(`     Location: ${campground.city}, ${campground.state}`);
      } else if (campground.state) {
        console.log(`     Location: ${campground.state}`);
      }

      try {
        const result = await researchCampground(campground);

        // Update statistics
        if (result.website) {
          stats.foundWebsite++;
          console.log(`     ✅ Website: ${result.website} (source: ${result.source})`);
        } else {
          console.log(`     ⚠️  Website: Not found`);
        }

        console.log(`     ✅ Type: ${result.campground_type} (source: ${result.source})`);
        stats.foundType++;
        stats.types[result.campground_type as keyof typeof stats.types]++;
        stats.sources[result.source]++;

        updates.push({
          id: campground.id,
          website: result.website,
          campground_type: result.campground_type,
        });
      } catch (error) {
        console.log(`     ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Add update with unknown type on error
        updates.push({
          id: campground.id,
          website: null,
          campground_type: 'unknown',
        });
      }

      console.log();
    }

    // Step 3: Update database
    if (updates.length > 0) {
      await updateRecords(updates);

      // Step 4: Print summary statistics
      console.log('\n' + '='.repeat(70));
      console.log('Summary Statistics');
      console.log('='.repeat(70));
      console.log(`Total records processed: ${campgrounds.length}`);
      console.log(`Websites found: ${stats.foundWebsite} (${((stats.foundWebsite / campgrounds.length) * 100).toFixed(1)}%)`);
      console.log(`Campground types determined: ${stats.foundType} (${((stats.foundType / campgrounds.length) * 100).toFixed(1)}%)`);
      console.log('\nCampground type distribution:');
      console.log(`  Private: ${stats.types.private}`);
      console.log(`  State: ${stats.types.state}`);
      console.log(`  Federal: ${stats.types.federal}`);
      console.log(`  Unknown: ${stats.types.unknown}`);
      console.log('\nData sources:');
      console.log(`  OSM Tags: ${stats.sources.osm_tags}`);
      console.log(`  OSM API: ${stats.sources.osm_api}`);
      console.log(`  OpenAI: ${stats.sources.openai}`);
      console.log();
    } else {
      console.log('⚠️  No updates to apply');
    }

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
