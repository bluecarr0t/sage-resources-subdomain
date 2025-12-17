#!/usr/bin/env npx tsx
/**
 * Research glamping resorts and retreats from Google search and add to CSV
 * 
 * This script:
 * - Uses web search to find glamping resorts and retreats in North America
 * - Compares against existing CSV file
 * - Checks against all_glamping_properties database for duplicates
 * - Uses OpenAI to extract and enrich property data
 * - Appends new unique properties to CSV file
 * 
 * Usage:
 *   npx tsx scripts/research-google-glamping-resorts.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
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

const CSV_FILE = 'csv/glamping-com-north-america-missing-properties.csv';
const TABLE_NAME = 'all_glamping_properties';

// Search queries to find glamping resorts
const SEARCH_QUERIES = [
  'best glamping resorts USA 2024',
  'luxury glamping retreats North America',
  'glamping resorts California',
  'glamping resorts Colorado',
  'glamping resorts Utah',
  'glamping resorts Montana',
  'glamping resorts Arizona',
  'glamping resorts Texas',
  'glamping resorts Oregon',
  'glamping resorts Washington',
  'glamping resorts New York',
  'glamping resorts Canada',
  'glamping retreats USA',
  'tent glamping resorts',
  'yurt glamping resorts',
  'treehouse glamping resorts',
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

interface CSVRow {
  [key: string]: string;
}

/**
 * Sleep/delay function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract glamping properties from search results using OpenAI
 */
async function extractPropertiesFromSearchResults(
  searchQuery: string,
  searchResults: string
): Promise<PropertyData[]> {
  console.log(`🤖 Using OpenAI to extract glamping properties from search results...\n`);

  const prompt = `Extract all glamping resort/retreat/campground information from the following Google search results.

Search Query: "${searchQuery}"

Focus ONLY on properties located in North America (United States and Canada). Ignore properties in other countries.

Return a JSON object with a "properties" array containing one object for each unique glamping property mentioned. Each property object should have:
- property_name (required): The exact name of the property/resort
- city (optional): City where it's located
- state (optional): State/province abbreviation (2 letters for US)
- country (optional): "USA" or "Canada"
- url (optional): Website URL if mentioned
- description (optional): Brief description of the property

Be thorough but avoid duplicates. Only extract properties that are clearly glamping resorts/retreats (luxury camping, tent accommodations, yurts, etc.).

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "property_name": "Example Glamping Resort",
      "city": "City Name",
      "state": "ST",
      "country": "USA",
      "url": "https://example.com",
      "description": "Brief description..."
    }
  ]
}

Search results:
${searchResults.substring(0, 30000)}`;

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
      temperature: 0.3,
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
      .map(p => ({
        ...p,
        property_name: p.property_name.trim(),
        city: p.city?.trim() || undefined,
        state: p.state?.trim()?.toUpperCase() || undefined,
        country: p.country?.trim() || (p.state ? 'USA' : undefined),
      }));

    console.log(`✅ Extracted ${properties.length} properties from search results\n`);
    return properties;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error from OpenAI API');
  }
}

/**
 * Use OpenAI to research glamping properties based on search query
 */
async function researchGlampingProperties(searchQuery: string): Promise<PropertyData[]> {
  console.log(`🔍 Researching: "${searchQuery}"\n`);

  const prompt = `Research glamping resorts and retreats in North America based on this search query: "${searchQuery}"

Find glamping properties (luxury camping resorts, tent accommodations, yurts, treehouses, etc.) in the United States or Canada that match this query.

For each unique glamping property you find, provide:
- property_name (required): The exact name of the property/resort
- city (optional): City where it's located
- state (optional): State/province abbreviation (2 letters for US)
- country (optional): "USA" or "Canada"
- url (optional): Official website URL if you can find it
- description (optional): Brief description of what makes it special

Return a JSON object with a "properties" array. Be thorough but focus on quality glamping properties. Avoid duplicates and properties that are just regular campgrounds.

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "property_name": "Example Glamping Resort",
      "city": "City Name",
      "state": "ST",
      "country": "USA",
      "url": "https://example.com",
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
    let properties: PropertyData[] = [];
    
    if (parsed.properties && Array.isArray(parsed.properties)) {
      properties = parsed.properties;
    } else if (Array.isArray(parsed)) {
      properties = parsed;
    }

    properties = properties
      .filter(p => p && p.property_name && p.property_name.trim().length > 0)
      .map(p => ({
        ...p,
        property_name: p.property_name.trim(),
        city: p.city?.trim() || undefined,
        state: p.state?.trim()?.toUpperCase() || undefined,
        country: p.country?.trim() || (p.state ? 'USA' : undefined),
      }));

    console.log(`✅ Found ${properties.length} properties for this search\n`);
    return properties;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error researching: ${error.message}`);
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
- state: State/province abbreviation
- country: Country name (USA or Canada)
- address: Full street address if you can find it
- zip_code: ZIP/postal code if available
- url: Official website URL
- description: 3-5 sentence description of the property, amenities, and what makes it special
- unit_type: Types of accommodations (comma-separated, e.g., "tents, yurts, cabins")
- property_type: Type of property (e.g., "Glamping Resort", "Luxury Campground")
- phone_number: Phone number if available
- latitude: Approximate latitude if known (number)
- longitude: Approximate longitude if known (number)
- amenities: Array of key amenities (e.g., ["wifi", "hot tub", "fire pit", "bathroom", "kitchen", "spa"])

Focus on North American properties. If you cannot find specific information, use null or omit the field.

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
    
    // Merge with original property data (original takes precedence for name)
    const merged: PropertyData = {
      ...enriched,
      property_name: property.property_name || enriched.property_name,
    };

    console.log(`    ✅ Enriched with ${Object.keys(merged).length} fields`);
    return merged;
  } catch (error) {
    console.log(`    ⚠️  Error enriching data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return property;
  }
}

/**
 * Read existing CSV file
 */
function readCSVFile(filePath: string): CSVRow[] {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  CSV file does not exist: ${filePath}`);
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows: CSVRow[] = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    return rows;
  } catch (error) {
    console.error(`❌ Error reading CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
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
      .select('property_name')
      .not('property_name', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Error fetching from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    data.forEach((row: any) => {
      const name = row.property_name?.trim();
      if (name) {
        propertyNames.add(name.toLowerCase());
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
 * Check if property exists in CSV or database
 */
function propertyExists(
  property: PropertyData,
  csvProperties: Set<string>,
  dbProperties: Set<string>
): { exists: boolean; location: 'csv' | 'database' | null } {
  const normalizedName = normalizePropertyName(property.property_name);
  
  // Check CSV
  for (const csvName of csvProperties) {
    if (normalizePropertyName(csvName) === normalizedName) {
      return { exists: true, location: 'csv' };
    }
    // Also check for partial matches
    if (normalizedName.length > 5 && (csvName.toLowerCase().includes(normalizedName) || 
        normalizedName.includes(csvName.toLowerCase()))) {
      return { exists: true, location: 'csv' };
    }
  }
  
  // Check database
  if (dbProperties.has(normalizedName)) {
    return { exists: true, location: 'database' };
  }
  
  // Check for partial matches in database
  for (const dbName of dbProperties) {
    if (normalizedName.length > 5 && (
      dbName.includes(normalizedName) || 
      normalizedName.includes(dbName)
    )) {
      return { exists: true, location: 'database' };
    }
  }
  
  return { exists: false, location: null };
}

/**
 * Convert PropertyData to CSV row format
 */
function propertyToCSVRow(property: PropertyData, source: string, headers: string[]): CSVRow {
  const today = new Date().toISOString().split('T')[0];
  
  // Create row with all columns, defaulting to empty string
  const row: CSVRow = {};
  headers.forEach(header => {
    row[header] = '';
  });
  
  // Map property data to CSV columns
  if (headers.includes('Source')) row['Source'] = source;
  if (headers.includes('Property Name')) row['Property Name'] = property.property_name || '';
  if (headers.includes('Site Name')) row['Site Name'] = property.site_name || '';
  if (headers.includes('Unit Type')) row['Unit Type'] = property.unit_type || '';
  if (headers.includes('Property Type')) row['Property Type'] = property.property_type || '';
  if (headers.includes('Address')) row['Address'] = property.address || '';
  if (headers.includes('City')) row['City'] = property.city || '';
  if (headers.includes('State')) row['State'] = property.state || '';
  if (headers.includes('Zip Code')) row['Zip Code'] = property.zip_code || '';
  if (headers.includes('Country')) row['Country'] = property.country || 'USA';
  if (headers.includes('Url')) row['Url'] = property.url || '';
  if (headers.includes('Description')) row['Description'] = property.description || '';
  if (headers.includes('Latitude')) row['Latitude'] = property.latitude?.toString() || '';
  if (headers.includes('Longitude')) row['Longitude'] = property.longitude?.toString() || '';
  if (headers.includes('Date Added')) row['Date Added'] = today;
  if (headers.includes('Date Updated')) row['Date Updated'] = '';
  
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
        if (lowerAmenity.includes(key) && headers.includes(column)) {
          row[column] = 'Yes';
        }
      }
    });
  }
  
  return row;
}

/**
 * Append properties to CSV file
 */
function appendToCSV(properties: PropertyData[], source: string): void {
  console.log(`\n📝 Appending ${properties.length} properties to CSV file...\n`);
  
  // Read existing CSV
  const existingRows = readCSVFile(CSV_FILE);
  
  // Get headers
  const headers = existingRows.length > 0 
    ? Object.keys(existingRows[0])
    : [
        'Source', 'Property Name', 'Site Name', 'Unit Type', 'Property Type',
        'Property: Total Sites', 'Quantity of Units', 'Unit Guest Capacity',
        'Year Site Opened', 'Operating Season (months)', '# of Locations',
        'Address', 'City', 'State', 'Zip Code', 'Country',
        'Occupancy rate 2023', 'Retail Daily Rate 2024', 'Retail Daily Rate(+fees) 2024',
        'Occupancy rate 2024', 'RavPAR 2024',
        '2024 - Fall Weekday', '2024 - Fall Weekend',
        '2025 - Winter Weekday', '2025 - Winter Weekend',
        '2025 - Spring Weekday', '2025 - Spring Weekend',
        '2025 - Summer Weekday', '2025 - Summer Weekend',
        'INTERNAL NOTES ONLY,', 'Url', 'Description', 'Getting there',
        'Latitude', 'Longitude',
        'Campfires', 'Toilet', 'Pets', 'Water', 'Shower', 'Trash',
        'Cooking equipment', 'Picnic Table', 'Wifi', 'Laundry', 'Hot Tub', 'Playground',
        'RV - Vehicle Length', 'RV - Parking', 'RV - Accommodates Slideout',
        'RV - Surface Type', 'RV - Surface level',
        'RV - Vehicles: Fifth Wheels', 'RV - Vehicles: Class A RVs',
        'RV - Vehicles: Class B RVs', 'RV - Vehicles: Class C RVs',
        'RV - Vehicles: Toy Hauler',
        'Date Added', 'Date Updated'
      ];
  
  // Convert properties to CSV rows
  const newRows: CSVRow[] = properties.map(property => propertyToCSVRow(property, source, headers));
  
  // Combine existing and new rows
  const allRows = [...existingRows, ...newRows];
  
  // Write to CSV file
  const csvContent = stringify(allRows, {
    header: true,
    columns: headers,
  });
  
  fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
  
  console.log(`✅ Successfully appended ${properties.length} properties to ${CSV_FILE}`);
  console.log(`   Total properties in CSV: ${allRows.length}\n`);
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Research Glamping Resorts from Google Search');
  console.log('='.repeat(70));
  console.log(`Processing ${SEARCH_QUERIES.length} search queries...\n`);

  try {
    // Step 1: Read existing CSV and database properties (once for all searches)
    console.log('📋 Loading existing properties...\n');
    const csvRows = readCSVFile(CSV_FILE);
    const csvPropertyNames = new Set(
      csvRows
        .map(row => row['Property Name']?.trim())
        .filter((name): name is string => !!name)
    );
    
    const dbPropertyNames = await getDatabasePropertyNames();

    // Step 2: Process each search query
    const allNewProperties: Array<{ property: PropertyData; source: string }> = [];
    const allFoundProperties = new Set<string>(); // Track all properties found to avoid duplicates
    
    for (let i = 0; i < SEARCH_QUERIES.length; i++) {
      const query = SEARCH_QUERIES[i];
      console.log(`\n[Search ${i + 1}/${SEARCH_QUERIES.length}]`);
      
      const foundProperties = await researchGlampingProperties(query);
      
      // Filter out existing properties and duplicates
      const newProperties: PropertyData[] = [];
      
      for (const property of foundProperties) {
        const normalizedName = normalizePropertyName(property.property_name);
        
        // Check if we've already found this property in a previous search
        if (allFoundProperties.has(normalizedName)) {
          continue;
        }
        allFoundProperties.add(normalizedName);
        
        // Check if it exists in CSV or database
        const exists = propertyExists(property, csvPropertyNames, dbPropertyNames);
        
        if (exists.exists) {
          console.log(`  ✗ SKIP: ${property.property_name} (exists in ${exists.location})`);
        } else {
          console.log(`  ✓ NEW: ${property.property_name}`);
          newProperties.push(property);
          allNewProperties.push({ property, source: `Google Search: ${query}` });
        }
      }

      console.log(`\n📊 From "${query}": Found ${newProperties.length} new properties out of ${foundProperties.length} total\n`);

      // Update CSV property names set to avoid duplicates across searches
      newProperties.forEach(prop => {
        csvPropertyNames.add(prop.property_name);
      });

      // Delay between searches
      if (i < SEARCH_QUERIES.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_SEARCHES / 1000} seconds before next search...\n`);
        await sleep(DELAY_BETWEEN_SEARCHES);
      }
    }

    // Step 3: Enrich all new properties
    if (allNewProperties.length === 0) {
      console.log('\n✅ No new properties found across all searches!');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log(`Found ${allNewProperties.length} total new properties across all searches`);
    console.log('='.repeat(70));
    console.log('\n🔍 Enriching property data with OpenAI...\n');
    
    const enrichedProperties: PropertyData[] = [];
    const sourcesMap = new Map<number, string>();
    
    for (let i = 0; i < allNewProperties.length; i++) {
      const { property, source } = allNewProperties[i];
      console.log(`[${i + 1}/${allNewProperties.length}] ${property.property_name}`);
      
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

    // Step 4: Group by source and append to CSV
    const propertiesBySource = new Map<string, PropertyData[]>();
    enrichedProperties.forEach((prop, index) => {
      const source = sourcesMap.get(index) || 'Google Search';
      if (!propertiesBySource.has(source)) {
        propertiesBySource.set(source, []);
      }
      propertiesBySource.get(source)!.push(prop);
    });

    // Append each source's properties separately
    for (const [source, properties] of propertiesBySource.entries()) {
      if (properties.length > 0) {
        appendToCSV(properties, source);
      }
    }

    console.log('='.repeat(70));
    console.log('✅ Process complete!');
    console.log(`   Total new properties added: ${enrichedProperties.length}`);
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
