#!/usr/bin/env npx tsx
/**
 * Research RV Parks and RV Resorts using OpenAI ChatGPT and add to all_rv_properties table
 * 
 * This script:
 * - Uses OpenAI to research RV Parks and RV Resorts by state
 * - Checks against existing database for duplicates
 * - Uses OpenAI to enrich property data with RV-specific details
 * - Inserts new unique properties directly into all_rv_properties table
 * 
 * Usage:
 *   # Process all states
 *   npx tsx scripts/research-rv-parks-resorts-ai.ts
 * 
 *   # Process specific states (comma-separated)
 *   npx tsx scripts/research-rv-parks-resorts-ai.ts --states CA,TX,FL
 * 
 *   # Process single state
 *   npx tsx scripts/research-rv-parks-resorts-ai.ts --states CA
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

const TABLE_NAME = 'all_rv_properties';

// All US states
const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Initialize clients
const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const openai = new OpenAI({ apiKey: openaiApiKey });

// Configuration
const DELAY_BETWEEN_AI_CALLS = 2000; // 2 seconds between OpenAI API calls
const DELAY_BETWEEN_STATES = 5000; // 5 seconds between states

interface RVPropertyData {
  name: string;
  city?: string;
  state?: string;
  address?: string;
  postal_code?: string;
  url?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  // RV-specific fields
  max_rv_length?: number;
  full_hook_up?: boolean;
  water_hookup?: boolean;
  electrical_hook_up?: boolean;
  sewer_hook_up?: boolean;
  pull_through_sites?: boolean;
  back_in_sites?: boolean;
  generators_allowed?: boolean;
  rv_vehicles_fifth_wheels?: boolean;
  rv_vehicles_class_a_rvs?: boolean;
  rv_vehicles_class_b_rvs?: boolean;
  rv_vehicles_class_c_rvs?: boolean;
  rv_vehicles_toy_hauler?: boolean;
  total_sites?: number;
  rv_sites?: number;
  nightly_rate_min?: number;
  nightly_rate_max?: number;
  pool?: boolean;
  wifi_available?: boolean;
  wifi_free?: boolean;
  laundry?: boolean;
  dump_station?: boolean;
  restrooms?: boolean;
  showers?: boolean;
  store?: boolean;
  [key: string]: any;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate slug from name and city
 */
function generateSlug(name: string, city?: string): string {
  let slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  if (city) {
    const citySlug = city
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    slug = `${slug}-${citySlug}`;
  }
  
  return slug;
}

/**
 * Research RV Parks and Resorts for a specific state using OpenAI
 */
async function researchRVPropertiesForState(state: string): Promise<RVPropertyData[]> {
  console.log(`\n🔍 Researching RV Parks and Resorts in ${state}...\n`);

  const prompt = `Research RV Parks and RV Resorts located in ${state} (${getStateName(state)}).

Find RV parks, RV resorts, and RV campgrounds. Focus on properties that specifically cater to RVs with hookups and RV-specific amenities.

For each unique RV property you find, provide:
- name (required): The exact name of the RV park/resort
- city (optional): City where it's located
- state: "${state}"
- address (optional): Full street address if available
- postal_code (optional): ZIP code if available
- url (optional): Official website URL
- phone (optional): Phone number if available
- description (optional): Brief description of the property and what makes it special

Return a JSON object with a "properties" array. Be thorough but focus on quality RV properties. Avoid duplicates and properties that are just regular campgrounds without RV facilities.

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "name": "Example RV Park",
      "city": "City Name",
      "state": "${state}",
      "address": "123 Main St",
      "postal_code": "12345",
      "url": "https://example.com",
      "phone": "(555) 123-4567",
      "description": "Brief description..."
    }
  ]
}`;

  try {
    await sleep(DELAY_BETWEEN_AI_CALLS);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    let properties: RVPropertyData[] = [];
    
    if (parsed.properties && Array.isArray(parsed.properties)) {
      properties = parsed.properties;
    } else if (Array.isArray(parsed)) {
      properties = parsed;
    }

    properties = properties
      .filter(p => p && p.name && p.name.trim().length > 0)
      .map(p => ({
        ...p,
        name: p.name.trim(),
        city: p.city?.trim() || undefined,
        state: state,
        address: p.address?.trim() || undefined,
        postal_code: p.postal_code?.trim() || undefined,
      }));

    console.log(`✅ Found ${properties.length} properties for ${state}\n`);
    return properties;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error researching ${state}: ${error.message}`);
      return [];
    }
    return [];
  }
}

/**
 * Get full state name from abbreviation
 */
function getStateName(abbrev: string): string {
  const stateNames: { [key: string]: string } = {
    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
    'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
    'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
    'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
    'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
    'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
    'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
    'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
    'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
    'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
    'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
    'WI': 'Wisconsin', 'WY': 'Wyoming'
  };
  return stateNames[abbrev.toUpperCase()] || abbrev;
}

/**
 * Enrich RV property data using OpenAI with RV-specific fields
 */
async function enrichRVPropertyData(property: RVPropertyData): Promise<RVPropertyData> {
  console.log(`  🤖 Enriching data for: ${property.name}`);

  const prompt = `Research and provide detailed information about this RV Park or RV Resort:

Name: ${property.name}
City: ${property.city || 'Unknown'}
State: ${property.state || 'Unknown'}
Address: ${property.address || 'Unknown'}

Provide a comprehensive JSON object with as much detail as possible. Focus on RV-specific features and amenities:

Required fields:
- name: Keep the original name
- city: City name
- state: State abbreviation (2 letters)
- address: Full street address if available
- postal_code: ZIP code if available
- url: Official website URL
- description: 3-5 sentence description of the property, amenities, and what makes it special
- phone: Phone number if available

RV-Specific Fields (important for RV parks):
- max_rv_length: Maximum RV length accommodated in feet (number, e.g., 40, 45, 50)
- full_hook_up: Boolean - whether full hookups (water, sewer, electric) are available
- water_hookup: Boolean - whether water hookup is available
- electrical_hook_up: Boolean - whether electrical hookup is available
- sewer_hook_up: Boolean - whether sewer hookup is available
- pull_through_sites: Boolean - whether pull-through sites are available
- back_in_sites: Boolean - whether back-in sites are available
- generators_allowed: Boolean - whether generators are allowed
- rv_vehicles_fifth_wheels: Boolean - whether fifth wheels are accommodated
- rv_vehicles_class_a_rvs: Boolean - whether Class A motorhomes are accommodated
- rv_vehicles_class_b_rvs: Boolean - whether Class B motorhomes (camper vans) are accommodated
- rv_vehicles_class_c_rvs: Boolean - whether Class C motorhomes are accommodated
- rv_vehicles_toy_hauler: Boolean - whether toy haulers are accommodated

Size & Capacity:
- total_sites: Total number of sites (integer)
- rv_sites: Number of RV sites (integer)

Pricing:
- nightly_rate_min: Minimum nightly rate in USD (number, e.g., 35.00)
- nightly_rate_max: Maximum nightly rate in USD (number, e.g., 75.00)

Amenities (boolean):
- pool: Whether pool is available
- wifi_available: Whether WiFi is available
- wifi_free: Whether WiFi is free (if wifi_available is true)
- laundry: Whether laundry facilities are available
- dump_station: Whether dump station is available
- restrooms: Whether restrooms are available
- showers: Whether showers are available
- store: Whether store/gift shop is available

Location (if not provided):
- latitude: Approximate latitude if known (number)
- longitude: Approximate longitude if known (number)

If you cannot find specific information, use null or omit the field. Focus on RV parks and resorts in the United States.

Return ONLY valid JSON object, no other text.`;

  try {
    await sleep(DELAY_BETWEEN_AI_CALLS);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more factual/research-based responses
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      console.log(`    ⚠️  No enriched data returned, using original data`);
      return property;
    }

    const enriched = JSON.parse(content);
    
    // Merge with original property data (original takes precedence for name)
    const merged: RVPropertyData = {
      ...enriched,
      name: property.name || enriched.name,
      state: property.state || enriched.state,
    };

    console.log(`    ✅ Enriched with ${Object.keys(merged).length} fields`);
    return merged;
  } catch (error) {
    console.log(`    ⚠️  Error enriching data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return property;
  }
}

/**
 * Normalize property name for comparison
 */
function normalizePropertyName(name: string): string {
  if (!name) return '';
  
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(/-/g, ' ');
  normalized = normalized.replace(/\([^)]*\)/g, '');
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');
  
  return normalized.trim();
}

/**
 * Get all property names from database
 */
async function getDatabasePropertyNames(): Promise<Set<string>> {
  console.log('📥 Fetching property names from database...\n');

  const propertyNames = new Set<string>();
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('name')
      .not('name', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Error fetching from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    data.forEach((row: any) => {
      const name = row.name?.trim();
      if (name) {
        propertyNames.add(normalizePropertyName(name));
      }
    });

    offset += batchSize;
    hasMore = data.length === batchSize;

    if (hasMore) {
      console.log(`  Fetched ${propertyNames.size} property names so far...`);
    }
  }

  console.log(`✅ Found ${propertyNames.size} unique property names in database\n`);
  return propertyNames;
}

/**
 * Check if property exists in database
 */
function propertyExists(
  property: RVPropertyData,
  dbProperties: Set<string>
): boolean {
  const normalizedName = normalizePropertyName(property.name);
  
  if (dbProperties.has(normalizedName)) {
    return true;
  }
  
  // Check for partial matches
  for (const dbName of dbProperties) {
    if (normalizedName.length > 5 && (
      dbName.includes(normalizedName) || 
      normalizedName.includes(dbName)
    )) {
      return true;
    }
  }
  
  return false;
}

/**
 * Insert RV property into database
 */
async function insertRVProperty(property: RVPropertyData): Promise<{ success: boolean; error?: string }> {
  if (!property.name) {
    return { success: false, error: 'Missing name' };
  }

  if (!property.state) {
    return { success: false, error: 'Missing state' };
  }

  const slug = generateSlug(property.name, property.city);

  // Build insert data with only non-null values
  const insertData: any = {
    name: property.name,
    state: property.state,
    slug,
    description: property.description || null,
    address: property.address || null,
    city: property.city || null,
    postal_code: property.postal_code || null,
    website: property.url || null,
    phone: property.phone || null,
    latitude: property.latitude || null,
    longitude: property.longitude || null,
    // RV-specific fields
    max_rv_length: property.max_rv_length || null,
    full_hook_up: property.full_hook_up ?? null,
    water_hookup: property.water_hookup ?? null,
    electrical_hook_up: property.electrical_hook_up ?? null,
    sewer_hook_up: property.sewer_hook_up ?? null,
    pull_through_sites: property.pull_through_sites ?? null,
    back_in_sites: property.back_in_sites ?? null,
    generators_allowed: property.generators_allowed ?? null,
    rv_vehicles_fifth_wheels: property.rv_vehicles_fifth_wheels ?? null,
    rv_vehicles_class_a_rvs: property.rv_vehicles_class_a_rvs ?? null,
    rv_vehicles_class_b_rvs: property.rv_vehicles_class_b_rvs ?? null,
    rv_vehicles_class_c_rvs: property.rv_vehicles_class_c_rvs ?? null,
    rv_vehicles_toy_hauler: property.rv_vehicles_toy_hauler ?? null,
    total_sites: property.total_sites || null,
    rv_sites: property.rv_sites || null,
    nightly_rate_min: property.nightly_rate_min || null,
    nightly_rate_max: property.nightly_rate_max || null,
    // Amenities
    pool: property.pool ?? null,
    wifi_available: property.wifi_available ?? null,
    wifi_free: property.wifi_free ?? null,
    laundry: property.laundry ?? null,
    dump_station: property.dump_station ?? null,
    restrooms: property.restrooms ?? null,
    showers: property.showers ?? null,
    store: property.store ?? null,
    // Defaults
    rv_camping_available: true, // All properties in this table are RV-friendly
    campground_type: 'private', // Default, can be updated later
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
 * Parse command line arguments
 */
function parseArgs(): { states: string[] } {
  const args = process.argv.slice(2);
  const statesArg = args.find(arg => arg.startsWith('--states='))?.split('=')[1];
  
  if (statesArg) {
    const states = statesArg.split(',').map(s => s.trim().toUpperCase());
    // Validate states
    const validStates = states.filter(s => ALL_STATES.includes(s));
    if (validStates.length === 0) {
      console.error('❌ No valid states provided');
      process.exit(1);
    }
    return { states: validStates };
  }
  
  // Default: process all states
  return { states: ALL_STATES };
}

/**
 * Main function
 */
async function main() {
  const { states } = parseArgs();
  
  console.log('='.repeat(70));
  console.log('Research RV Parks and RV Resorts using OpenAI');
  console.log('='.repeat(70));
  console.log(`Processing ${states.length} state(s): ${states.join(', ')}\n`);

  try {
    // Step 1: Get existing property names from database
    console.log('📋 Loading existing properties from database...\n');
    const dbPropertyNames = await getDatabasePropertyNames();

    // Step 2: Process each state
    let totalNewProperties = 0;
    let totalEnriched = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      console.log(`\n${'='.repeat(70)}`);
      console.log(`[State ${i + 1}/${states.length}] Processing ${state} - ${getStateName(state)}`);
      console.log('='.repeat(70));

      // Research properties for this state
      const foundProperties = await researchRVPropertiesForState(state);
      
      if (foundProperties.length === 0) {
        console.log(`⚠️  No properties found for ${state}`);
        continue;
      }

      // Filter out existing properties
      const newProperties: RVPropertyData[] = [];
      
      for (const property of foundProperties) {
        const exists = propertyExists(property, dbPropertyNames);
        
        if (exists) {
          console.log(`  ✗ SKIP: ${property.name} (exists in database)`);
          totalSkipped++;
        } else {
          console.log(`  ✓ NEW: ${property.name}`);
          newProperties.push(property);
          totalNewProperties++;
          // Add to set to avoid duplicates within this run
          dbPropertyNames.add(normalizePropertyName(property.name));
        }
      }

      console.log(`\n📊 From ${state}: Found ${newProperties.length} new properties out of ${foundProperties.length} total`);

      if (newProperties.length === 0) {
        console.log(`⏭️  No new properties to process for ${state}\n`);
        continue;
      }

      // Enrich new properties
      console.log(`\n🔍 Enriching ${newProperties.length} properties with OpenAI...\n`);
      
      const enrichedProperties: RVPropertyData[] = [];
      
      for (let j = 0; j < newProperties.length; j++) {
        const property = newProperties[j];
        console.log(`[${j + 1}/${newProperties.length}] ${property.name}`);
        
        try {
          const enriched = await enrichRVPropertyData(property);
          enrichedProperties.push(enriched);
          totalEnriched++;
          console.log();
        } catch (error) {
          console.log(`  ⚠️  Error, using original data: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
          enrichedProperties.push(property);
          totalEnriched++;
        }
      }

      // Insert enriched properties into database
      console.log(`\n💾 Inserting ${enrichedProperties.length} properties into database...\n`);
      
      for (let j = 0; j < enrichedProperties.length; j++) {
        const property = enrichedProperties[j];
        console.log(`[${j + 1}/${enrichedProperties.length}] ${property.name}`);
        
        const result = await insertRVProperty(property);
        
        if (result.success) {
          console.log(`  ✅ Inserted successfully\n`);
          totalInserted++;
        } else {
          console.error(`  ❌ Error: ${result.error}\n`);
        }
      }

      // Delay between states (except last one)
      if (i < states.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_STATES / 1000} seconds before next state...\n`);
        await sleep(DELAY_BETWEEN_STATES);
      }
    }

    // Print final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 Final Summary');
    console.log('='.repeat(70));
    console.log(`States processed:           ${states.length}`);
    console.log(`New properties found:       ${totalNewProperties}`);
    console.log(`Properties enriched:        ${totalEnriched}`);
    console.log(`Properties inserted:        ${totalInserted}`);
    console.log(`Properties skipped:         ${totalSkipped}`);
    console.log('='.repeat(70));

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

