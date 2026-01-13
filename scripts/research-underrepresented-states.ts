#!/usr/bin/env npx tsx
/**
 * Research glamping properties in states/provinces with less than 5 properties
 * 
 * This script:
 * - Counts unique glamping properties by state/province in all_glamping_properties table
 * - Identifies states/provinces with less than 5 properties
 * - Uses OpenAI to research additional glamping properties in those states
 * - Creates a CSV file with the current date (12-23-2025) and saves it under csv/new-properties
 * 
 * Usage:
 *   npx tsx scripts/research-underrepresented-states.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';

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

const TABLE_NAME = 'all_glamping_properties';
const OUTPUT_DIR = 'csv/new-properties';
const OUTPUT_DATE = '12-23-2025';
const MIN_PROPERTIES_THRESHOLD = 5; // States with less than this will be researched
const CSV_FILE = `${OUTPUT_DIR}/underrepresented-states-glamping-properties-${OUTPUT_DATE}.csv`;

// State name mappings for better search queries
const STATE_NAMES: Record<string, string> = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  // Canadian Provinces
  'AB': 'Alberta',
  'BC': 'British Columbia',
  'MB': 'Manitoba',
  'NB': 'New Brunswick',
  'NL': 'Newfoundland and Labrador',
  'NS': 'Nova Scotia',
  'NT': 'Northwest Territories',
  'NU': 'Nunavut',
  'ON': 'Ontario',
  'PE': 'Prince Edward Island',
  'QC': 'Quebec',
  'SK': 'Saskatchewan',
  'YT': 'Yukon',
};

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
const DELAY_BETWEEN_SEARCHES = 3000; // 3 seconds between searches

interface PropertyData {
  property_name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  url?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  unit_type?: string;
  property_type?: string;
  phone_number?: string;
  site_name?: string;
  amenities?: string[];
  [key: string]: any;
}

interface StateCount {
  state: string;
  stateName: string;
  country: string;
  count: number;
  existingProperties: Array<{ property_name: string; city?: string }>;
}

/**
 * Sleep/delay function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get property counts by state/province
 */
async function getPropertyCountsByState(): Promise<StateCount[]> {
  console.log('📥 Fetching property counts by state/province...\n');

  const stateCounts = new Map<string, {
    state: string;
    stateName: string;
    country: string;
    propertyNames: Set<string>;
    properties: Array<{ property_name: string; city?: string }>;
  }>();

  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('property_name, state, country, city')
      .not('property_name', 'is', null)
      .not('state', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Error fetching from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    data.forEach((row: any) => {
      const state = row.state?.trim().toUpperCase();
      const propertyName = row.property_name?.trim();
      const country = row.country?.trim() || (isCanadianProvince(state) ? 'Canada' : 'USA');
      const city = row.city?.trim();

      if (state && propertyName) {
        const stateKey = `${state}_${country}`;
        
        if (!stateCounts.has(stateKey)) {
          stateCounts.set(stateKey, {
            state,
            stateName: STATE_NAMES[state] || state,
            country,
            propertyNames: new Set(),
            properties: [],
          });
        }

        const stateData = stateCounts.get(stateKey)!;
        
        // Only count unique property names
        if (!stateData.propertyNames.has(propertyName.toLowerCase())) {
          stateData.propertyNames.add(propertyName.toLowerCase());
          stateData.properties.push({
            property_name: propertyName,
            city: city || undefined,
          });
        }
      }
    });

    offset += batchSize;
    hasMore = data.length === batchSize;

    if (hasMore) {
      console.log(`  Processed ${offset} records...`);
    }
  }

  // Convert to array and calculate counts
  const result: StateCount[] = Array.from(stateCounts.values()).map(stateData => ({
    state: stateData.state,
    stateName: stateData.stateName,
    country: stateData.country,
    count: stateData.propertyNames.size,
    existingProperties: stateData.properties,
  }));

  // Sort by count (ascending)
  result.sort((a, b) => a.count - b.count);

  console.log(`✅ Found ${result.length} states/provinces with properties\n`);
  return result;
}

/**
 * Check if a state code is a Canadian province
 */
function isCanadianProvince(state: string): boolean {
  const canadianProvinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
  return canadianProvinces.includes(state.toUpperCase());
}

/**
 * Get states with less than threshold properties
 */
function getUnderrepresentedStates(stateCounts: StateCount[]): StateCount[] {
  return stateCounts.filter(state => state.count < MIN_PROPERTIES_THRESHOLD);
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
 * Check if property exists in existing properties for a state
 */
function propertyExistsInState(
  property: PropertyData,
  existingProperties: Array<{ property_name: string; city?: string }>
): boolean {
  const normalizedName = normalizePropertyName(property.property_name);
  
  for (const existing of existingProperties) {
    const existingNormalized = normalizePropertyName(existing.property_name);
    
    // Exact match
    if (existingNormalized === normalizedName) {
      return true;
    }
    
    // Partial match for longer names
    if (normalizedName.length > 5 && (
      existingNormalized.includes(normalizedName) || 
      normalizedName.includes(existingNormalized)
    )) {
      // Also check city if available
      if (property.city && existing.city) {
        const existingCity = existing.city.toLowerCase().trim();
        const newCity = property.city.toLowerCase().trim();
        if (existingCity === newCity) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Use OpenAI to research glamping properties in a specific state
 */
async function researchGlampingPropertiesInState(
  stateCount: StateCount
): Promise<PropertyData[]> {
  const stateName = stateCount.stateName;
  const stateCode = stateCount.state;
  const country = stateCount.country;
  
  console.log(`🔍 Researching glamping properties in ${stateName} (${stateCode}), ${country}...\n`);

  // Create a summary of existing properties for the prompt
  const existingSummary = stateCount.existingProperties
    .map(p => {
      const location = p.city ? ` (${p.city})` : '';
      return `- ${p.property_name}${location}`;
    })
    .join('\n');

  const prompt = `Research glamping resorts and retreats in ${stateName}, ${country} (state code: ${stateCode}).

IMPORTANT: Focus ONLY on properties located in ${stateName}, ${country}. 

Find glamping properties (luxury camping resorts, tent accommodations, yurts, treehouses, domes, safari tents, etc.) that are NOT already in our database.

Here are the existing properties we already have for ${stateName} (DO NOT include these or similar properties):
${existingSummary.length > 0 ? existingSummary : 'None listed yet'}

${stateName} currently has only ${stateCount.count} glamping property/properties. We need to find more glamping properties in this state.

For each unique glamping property you find that is NOT in the list above, provide:
- property_name (required): The exact name of the property/resort
- city (optional): City where it's located
- state (required): "${stateCode}"
- country (required): "${country}"
- url (optional): Official website URL if you can find it
- description (optional): Brief description of what makes it special
- unit_type (optional): Types of accommodations (e.g., "Safari Tent", "Yurt", "Dome", "Treehouse", "Cabin")
- property_type (optional): Type of property (e.g., "Glamping Resort", "Luxury Campground")
- address (optional): Full street address if available
- zip_code (optional): ZIP/postal code if available
- phone_number (optional): Phone number if available
- latitude (optional): Latitude coordinate if known (number)
- longitude (optional): Longitude coordinate if known (number)

Be thorough and find as many glamping properties as possible in ${stateName}. Focus on quality glamping properties. Avoid duplicates and properties that are just regular campgrounds. Only include properties that are clearly glamping resorts/retreats.

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "property_name": "Example Glamping Resort",
      "city": "City Name",
      "state": "${stateCode}",
      "country": "${country}",
      "url": "https://example.com",
      "description": "Brief description...",
      "unit_type": "Safari Tent",
      "property_type": "Glamping Resort",
      "address": "Street Address",
      "zip_code": "12345",
      "phone_number": "+1 123-456-7890",
      "latitude": 40.7128,
      "longitude": -74.0060
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
    let properties: PropertyData[] = [];
    
    if (parsed.properties && Array.isArray(parsed.properties)) {
      properties = parsed.properties;
    } else if (Array.isArray(parsed)) {
      properties = parsed;
    }

    properties = properties
      .filter(p => p && p.property_name && p.property_name.trim().length > 0)
      .filter(p => {
        // Ensure it's for the correct state
        const propertyState = p.state?.trim().toUpperCase();
        return propertyState === stateCode;
      })
      .map(p => ({
        ...p,
        property_name: p.property_name.trim(),
        city: p.city?.trim() || undefined,
        state: stateCode, // Ensure correct state code
        country: country, // Ensure correct country
      }));

    console.log(`✅ Found ${properties.length} properties for ${stateName}\n`);
    return properties;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error researching ${stateName}: ${error.message}`);
      return [];
    }
    return [];
  }
}

/**
 * Enrich property data using OpenAI
 */
async function enrichPropertyData(property: PropertyData): Promise<PropertyData> {
  console.log(`  🤖 Enriching data for: ${property.property_name}`);

  const prompt = `Research and provide detailed information about this glamping property:

Property Name: ${property.property_name}
City: ${property.city || 'Unknown'}
State: ${property.state || 'Unknown'}
Country: ${property.country || 'Unknown'}

Provide a JSON object with as much detail as possible:
- property_name: Keep the original name
- city: City name
- state: State/province abbreviation (keep as "${property.state}")
- country: Country name (keep as "${property.country}")
- address: Full street address if you can find it
- zip_code: ZIP/postal code if available
- url: Official website URL
- description: 3-5 sentence description of the property, amenities, and what makes it special
- unit_type: Types of accommodations (comma-separated, e.g., "Safari Tent, Yurt, Cabin")
- property_type: Type of property (e.g., "Glamping Resort", "Luxury Campground")
- phone_number: Phone number if available
- latitude: Approximate latitude if known (number)
- longitude: Approximate longitude if known (number)
- amenities: Array of key amenities (e.g., ["wifi", "hot tub", "fire pit", "bathroom", "kitchen", "spa"])

Focus on North American properties (USA and Canada). If you cannot find specific information, use null or omit the field.

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
      temperature: 0.5,
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      console.log(`    ⚠️  No enriched data returned, using original data`);
      return property;
    }

    const enriched = JSON.parse(content);
    
    // Merge with original property data (preserve state and country)
    const merged: PropertyData = {
      ...enriched,
      property_name: property.property_name || enriched.property_name,
      state: property.state, // Preserve original state
      country: property.country, // Preserve original country
    };

    console.log(`    ✅ Enriched with ${Object.keys(merged).length} fields`);
    return merged;
  } catch (error) {
    console.log(`    ⚠️  Error enriching data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return property;
  }
}

/**
 * Convert PropertyData to CSV row format
 */
function propertyToCSVRow(property: PropertyData, source: string): Record<string, string> {
  const today = OUTPUT_DATE;
  
  // Define CSV headers based on the existing CSV structure
  const row: Record<string, string> = {
    'Source': source,
    'Property Name': property.property_name || '',
    'Site Name': property.site_name || '',
    'Unit Type': property.unit_type || '',
    'Property Type': property.property_type || '',
    'Property: Total Sites': '',
    'Quantity of Units': '',
    'Unit Guest Capacity': '',
    'Year Site Opened': '',
    'Operating Season (months)': '',
    '# of Locations': '1',
    'Address': property.address || '',
    'City': property.city || '',
    'State': property.state || '',
    'Zip Code': property.zip_code || '',
    'Country': property.country || 'USA',
    'Occupancy rate 2023': '',
    'Retail Daily Rate 2024': '',
    'Retail Daily Rate(+fees) 2024': '',
    'Occupancy rate 2024': '',
    'RavPAR 2024': '',
    '2024 - Fall Weekday': '',
    '2024 - Fall Weekend': '',
    '2025 - Winter Weekday': '',
    '2025 - Winter Weekend': '',
    '2025 - Spring Weekday': '',
    '2025 - Spring Weekend': '',
    '2025 - Summer Weekday': '',
    '2025 - Summer Weekend': '',
    'INTERNAL NOTES ONLY,': '',
    'Url': property.url || '',
    'Description': property.description || '',
    'Getting there': '',
    'Latitude': property.latitude?.toString() || '',
    'Longitude': property.longitude?.toString() || '',
    'Campfires': '',
    'Toilet': '',
    'Pets': '',
    'Water': '',
    'Shower': '',
    'Trash': '',
    'Cooking equipment': '',
    'Picnic Table': '',
    'Wifi': '',
    'Laundry': '',
    'Hot Tub': '',
    'Playground': '',
    'RV - Vehicle Length': '',
    'RV - Parking': '',
    'RV - Accommodates Slideout': '',
    'RV - Surface Type': '',
    'RV - Surface level': '',
    'RV - Vehicles: Fifth Wheels': '',
    'RV - Vehicles: Class A RVs': '',
    'RV - Vehicles: Class B RVs': '',
    'RV - Vehicles: Class C RVs': '',
    'RV - Vehicles: Toy Hauler': '',
    'Date Added': today,
    'Date Updated': '',
  };
  
  // Map amenities if available
  if (property.amenities && Array.isArray(property.amenities)) {
    const amenityMap: { [key: string]: string } = {
      'wifi': 'Wifi',
      'campfire': 'Campfires',
      'fire pit': 'Campfires',
      'toilet': 'Toilet',
      'bathroom': 'Toilet',
      'shower': 'Shower',
      'pets': 'Pets',
      'pet friendly': 'Pets',
      'water': 'Water',
      'kitchen': 'Cooking equipment',
      'hot tub': 'Hot Tub',
      'sauna': 'Hot Tub',
      'picnic table': 'Picnic Table',
      'spa': 'Hot Tub',
    };
    
    property.amenities.forEach(amenity => {
      const lowerAmenity = amenity.toLowerCase();
      for (const [key, column] of Object.entries(amenityMap)) {
        if (lowerAmenity.includes(key) && row.hasOwnProperty(column)) {
          row[column] = 'Yes';
        }
      }
    });
  }
  
  return row;
}

/**
 * Write properties to CSV file
 */
function writeToCSV(properties: PropertyData[], source: string): void {
  console.log(`\n📝 Writing ${properties.length} properties to CSV file...\n`);
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Convert properties to CSV rows
  const rows = properties.map(property => propertyToCSVRow(property, source));
  
  // Get headers from first row
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  
  // Write to CSV file
  const csvContent = stringify(rows, {
    header: true,
    columns: headers,
  });
  
  fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
  
  console.log(`✅ Successfully wrote ${properties.length} properties to ${CSV_FILE}`);
  console.log(`   File saved: ${CSV_FILE}\n`);
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Research Glamping Properties in Underrepresented States');
  console.log('='.repeat(70));
  console.log(`Threshold: States/Provinces with less than ${MIN_PROPERTIES_THRESHOLD} properties\n`);

  try {
    // Step 1: Get property counts by state
    const stateCounts = await getPropertyCountsByState();
    
    // Display summary
    console.log('\n📊 Property Count Summary by State/Province:');
    console.log('-'.repeat(70));
    stateCounts.forEach(state => {
      console.log(`  ${state.stateName} (${state.state}): ${state.count} properties`);
    });
    console.log('-'.repeat(70));
    
    // Step 2: Identify underrepresented states
    const underrepresentedStates = getUnderrepresentedStates(stateCounts);
    
    console.log(`\n🎯 Found ${underrepresentedStates.length} states/provinces with less than ${MIN_PROPERTIES_THRESHOLD} properties:\n`);
    underrepresentedStates.forEach(state => {
      console.log(`  - ${state.stateName} (${state.state}), ${state.country}: ${state.count} properties`);
    });
    
    if (underrepresentedStates.length === 0) {
      console.log('\n✅ All states/provinces have at least 5 properties!');
      return;
    }

    // Step 3: Research properties in each underrepresented state
    console.log(`\n🔍 Researching properties in ${underrepresentedStates.length} underrepresented states/provinces...\n`);
    
    const allNewProperties: Array<{ property: PropertyData; source: string }> = [];
    const allFoundProperties = new Set<string>(); // Track all properties found to avoid duplicates
    
    for (let i = 0; i < underrepresentedStates.length; i++) {
      const stateCount = underrepresentedStates[i];
      console.log(`\n[State ${i + 1}/${underrepresentedStates.length}] ${stateCount.stateName} (${stateCount.state})`);
      console.log(`   Current count: ${stateCount.count} properties`);
      
      const foundProperties = await researchGlampingPropertiesInState(stateCount);
      
      // Filter out existing properties and duplicates
      const newProperties: PropertyData[] = [];
      
      for (const property of foundProperties) {
        const normalizedName = normalizePropertyName(property.property_name);
        
        // Check if we've already found this property in a previous state search
        if (allFoundProperties.has(normalizedName)) {
          continue;
        }
        allFoundProperties.add(normalizedName);
        
        // Check if it exists in this state's existing properties
        if (propertyExistsInState(property, stateCount.existingProperties)) {
          console.log(`  ✗ SKIP: ${property.property_name} (exists in database)`);
        } else {
          console.log(`  ✓ NEW: ${property.property_name}`);
          newProperties.push(property);
          allNewProperties.push({ 
            property, 
            source: `Underrepresented State Research: ${stateCount.stateName} (${stateCount.state})` 
          });
        }
      }

      console.log(`\n📊 From ${stateCount.stateName}: Found ${newProperties.length} new properties out of ${foundProperties.length} total\n`);

      // Delay between states
      if (i < underrepresentedStates.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_SEARCHES / 1000} seconds before next state...\n`);
        await sleep(DELAY_BETWEEN_SEARCHES);
      }
    }

    // Step 4: Enrich all new properties
    if (allNewProperties.length === 0) {
      console.log('\n✅ No new properties found across all underrepresented states!');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log(`Found ${allNewProperties.length} total new properties across all underrepresented states`);
    console.log('='.repeat(70));
    console.log('\n🔍 Enriching property data with OpenAI...\n');
    
    const enrichedProperties: PropertyData[] = [];
    const sourcesMap = new Map<number, string>();
    
    for (let i = 0; i < allNewProperties.length; i++) {
      const { property, source } = allNewProperties[i];
      console.log(`[${i + 1}/${allNewProperties.length}] ${property.property_name} (${property.state})`);
      
      try {
        const enriched = await enrichPropertyData(property);
        enrichedProperties.push(enriched);
        sourcesMap.set(enrichedProperties.length - 1, source);
        console.log();
      } catch (error) {
        console.log(`  ⚠️  Error, using original data: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        enrichedProperties.push(property);
        sourcesMap.set(enrichedProperties.length - 1, source);
      }
    }

    // Step 5: Write all properties to CSV
    const allProperties: PropertyData[] = [];
    enrichedProperties.forEach((prop, index) => {
      allProperties.push(prop);
    });

    // Write all properties to CSV
    writeToCSV(allProperties, `Underrepresented States Research - ${OUTPUT_DATE}`);

    console.log('='.repeat(70));
    console.log('✅ Process complete!');
    console.log(`   Total new properties found: ${enrichedProperties.length}`);
    console.log(`   States researched: ${underrepresentedStates.length}`);
    console.log(`   CSV file: ${CSV_FILE}`);
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



