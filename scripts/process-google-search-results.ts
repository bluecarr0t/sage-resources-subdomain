#!/usr/bin/env npx tsx
/**
 * Process Google search results for glamping resorts and add new ones to CSV
 * 
 * This script processes web search results to find glamping properties
 * and adds any new ones to the CSV file.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !secretKey || !openaiApiKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const CSV_FILE = 'csv/glamping-com-north-america-missing-properties.csv';
const TABLE_NAME = 'all_glamping_properties';

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const openai = new OpenAI({ apiKey: openaiApiKey });

const DELAY_BETWEEN_AI_CALLS = 2000;

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
  amenities?: string[];
  [key: string]: any;
}

interface CSVRow {
  [key: string]: string;
}

// Search results from multiple Google web searches (comprehensive compilation)
const SEARCH_RESULTS_TEXT = `
Glamping Resorts Found in Google Search Results:

SOUTHWEST USA:
1. Under Canvas Grand Canyon - Near Valle, AZ - Luxury safari-style tents with plush bedding and wood-burning stoves, 25 minutes from Grand Canyon South Rim
2. Shash Dine' EcoRetreat - Near Page, AZ - Indigenous-owned retreat with traditional Navajo hogans, bell tents, and sheepherder wagons
3. Clear Sky Resorts - Williams, AZ - Unique bubble domes with panoramic views of night sky
4. Backland Luxury Camping - Near Williams, AZ - Eco-resort with insulated, energy-efficient tents with en-suite bathrooms, surrounded by Ponderosa pines
5. KitFox - Santa Fe, NM - Safari tents with minimalist decor in high desert, access to hiking trails

WYOMING:
6. French Creek, Brush Creek Ranch - Saratoga, WY - Secluded property with stylish cabins and luxury yurt with wood-burning stove and outdoor shower

EAST COAST / NEW ENGLAND:
7. Terramor Outdoor Resort - Bar Harbor, ME - Designer wood-frame canvas tents with king-sized beds, lodge with restaurant and bar
8. Under Canvas Acadia - Surry, ME - Safari-inspired tents with king-size beds, wood-burning stoves, ensuite bathrooms, 100 acres waterfront property
9. Sandy Pines Campground - Kennebunkport, ME - Safari tents, cottages, Airstream trailers, and Conestoga wagons, heated saltwater pool
10. Moose Meadow Lodge - Waterbury, VT - Luxury log cabins and treehouse, bohemian backwoods glamping experience
11. Yurt in Putney - Putney, VT - Modern yurt with electricity, hot running water, wood stove, fire pit, deck, kitchen
12. Lumen Nature Retreat - Woodstock, NH - 35 Nordic cabins and A-frame tents, private saunas, near Franconia State Park
13. Hub North - Gorham, NH - Yurts, tents, and full lodge, near ski resorts

MIDWEST:
14. Alpen Bluffs Outdoor Resort - Gaylord, MI - Glamping yurts and log cabins, aquatic waterpark, mini golf, indoor golf simulators
15. Butter & Grahams - Drummond Island, MI - Luxury tents along Lake Huron shores, kayaking, paddleboarding, beachside fire pits
16. The Woods Luxury Camping - Between Saugatuck, Holland, and South Haven, MI - Adults-only retreat with cabins with skylights for stargazing
17. Lost Woods - Near Boyne Mountain Resort, Northern MI - Bell tents, A-frames, and geodesic dome, each with fire pits
18. Treetop Villas at Mirror Lake - Wisconsin Dells, WI - Luxury treehouses perched over sandstone cliffs, scenic lake views

CANADA:
19. Siwash Lake Wilderness Resort - Between Canadian Rockies and Vancouver, BC - Family-owned resort, 80,000 acres, safari-style canvas tents
20. Rockwater Secret Cove Resort - Sunshine Coast, BC - Oceanview tenthouse suites with hydrotherapy tubs, rain forest showers
21. Glamping Resorts Ltd. at Castle Provincial Park - Beaver Mines Lake, AB - Big Oak tents, Cozy Family Domes, Waterfront Cabins, Lodges
22. Elk Island National Park - Near Edmonton, AB - Sandy Beach Campground with teepee accommodations on wooden platforms
23. Muskoka Dome - Bracebridge, ON - Eco-luxurious four-season retreat, climate-controlled dome with heated floors
24. Birchwood Luxury Camping - Port Perry, ON - Geodesic domes for private couples' getaways, massages, yoga packages

ORIGINAL SEARCH RESULTS:
25. Loving Heart Retreats - 8209 Co Rd 340, Burnet, TX 78611 - 2024 Glampy Award, safari tents and geodesic domes
26. Safari West - 3115 Porter Creek Rd, Santa Rosa, CA 95404 - No. 1 Best Glamping Spot USA Today 2025, African safari experience
27. AutoCamp Asheville - 125 Amberglow Rd, Asheville, NC 28804 - Airstream accommodations
28. Shelter Cove Resort & Marina - 27600 W Odell Lake Road, Crescent, OR 97733 - Lakeside cabins
29. Dunton River Camp - Dolores, CO - Eight spacious tents
30. Ventana Big Sur - Big Sur, CA - Safari-style tents
31. The Ranch at Rock Creek - Philipsburg, MT - Canvas tents with clawfoot bathtubs
32. Under Canvas Moab - Moab, UT - Upscale tents near Arches National Park
33. Paint Rock Farm - Hot Springs, NC - Glamping cabins
34. Twin Lakes Camp Resort - DeFuniak Springs, FL - Lakeside glamping tents
35. Little Arrow Outdoor Resort - Townsend, TN - Two-story tents near Great Smoky Mountains
36. AutoCamp Yosemite - Near Yosemite National Park, CA - Airstreams and canvas tents
37. Treebones Resort - Big Sur, CA - Glamping yurts overlooking Pacific Ocean
38. Collective Vail - Vail Valley, CO - Elegant tents with alpine views
39. Ulum Moab - Moab, UT - Safari-inspired suite tents
`;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractPropertiesFromSearchResults(searchText: string): Promise<PropertyData[]> {
  console.log('🤖 Extracting properties from search results using OpenAI...\n');

  const prompt = `Extract all glamping resort/retreat information from the following search results.

Focus ONLY on properties in North America (United States and Canada).

Return a JSON object with a "properties" array. Each property should have:
- property_name (required): Exact name
- city (optional): City name
- state (optional): State abbreviation (2 letters)
- country (optional): "USA" or "Canada"
- address (optional): Full street address if mentioned
- url (optional): Website URL if you can find it
- description (optional): Brief description
- unit_type (optional): Types of accommodations (e.g., "tents", "yurts", "Airstreams")
- property_type (optional): Type of property

Return ONLY valid JSON:
{
  "properties": [
    {
      "property_name": "Example Resort",
      "city": "City",
      "state": "ST",
      "country": "USA",
      "address": "123 Main St",
      "description": "Description..."
    }
  ]
}

Search results:
${searchText}`;

  try {
    await sleep(DELAY_BETWEEN_AI_CALLS);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('No response from OpenAI');

    const parsed = JSON.parse(content);
    let properties: PropertyData[] = parsed.properties || (Array.isArray(parsed) ? parsed : []);

    properties = properties
      .filter(p => p?.property_name?.trim())
      .map(p => ({
        ...p,
        property_name: p.property_name.trim(),
        city: p.city?.trim(),
        state: p.state?.trim()?.toUpperCase(),
        country: p.country?.trim() || (p.state ? 'USA' : undefined),
      }));

    console.log(`✅ Extracted ${properties.length} properties\n`);
    return properties;
  } catch (error) {
    throw new Error(`OpenAI error: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

async function enrichPropertyData(property: PropertyData): Promise<PropertyData> {
  console.log(`  🤖 Enriching: ${property.property_name}`);

  const prompt = `Research this glamping property and provide detailed information:

Property: ${property.property_name}
City: ${property.city || 'Unknown'}
State: ${property.state || 'Unknown'}
Country: ${property.country || 'Unknown'}

Provide JSON with:
- property_name: Keep original
- city, state, country: Location details
- address: Full street address if available
- zip_code: ZIP if available
- url: Official website
- description: 3-5 sentences about the property
- unit_type: Accommodation types
- property_type: Property type
- latitude, longitude: Coordinates if known
- amenities: Array of amenities

Return ONLY valid JSON object.`;

  try {
    await sleep(DELAY_BETWEEN_AI_CALLS);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return property;

    const enriched = JSON.parse(content);
    return { ...enriched, property_name: property.property_name || enriched.property_name };
  } catch (error) {
    console.log(`    ⚠️  Error enriching: ${error instanceof Error ? error.message : 'Unknown'}`);
    return property;
  }
}

function readCSVFile(filePath: string): CSVRow[] {
  if (!fs.existsSync(filePath)) return [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch {
    return [];
  }
}

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

    if (error) throw new Error(`Database error: ${error.message}`);
    if (!data?.length) break;

    data.forEach((row: any) => {
      const name = row.property_name?.trim();
      if (name) propertyNames.add(name.toLowerCase());
    });

    offset += batchSize;
    hasMore = data.length === batchSize;
    if (hasMore) console.log(`  Fetched ${propertyNames.size} property names so far...`);
  }

  console.log(`✅ Found ${propertyNames.size} unique property names in database\n`);
  return propertyNames;
}

function normalizePropertyName(name: string): string {
  return name.toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function propertyExists(
  property: PropertyData,
  csvProperties: Set<string>,
  dbProperties: Set<string>
): { exists: boolean; location: 'csv' | 'database' | null } {
  const normalizedName = normalizePropertyName(property.property_name);

  for (const csvName of csvProperties) {
    if (normalizePropertyName(csvName) === normalizedName) {
      return { exists: true, location: 'csv' };
    }
    if (normalizedName.length > 5 && (
      csvName.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(csvName.toLowerCase())
    )) {
      return { exists: true, location: 'csv' };
    }
  }

  if (dbProperties.has(normalizedName)) {
    return { exists: true, location: 'database' };
  }

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

function propertyToCSVRow(property: PropertyData, source: string, headers: string[]): CSVRow {
  const today = new Date().toISOString().split('T')[0];
  const row: CSVRow = {};
  headers.forEach(header => { row[header] = ''; });

  if (headers.includes('Source')) row['Source'] = source;
  if (headers.includes('Property Name')) row['Property Name'] = property.property_name || '';
  if (headers.includes('Address')) row['Address'] = property.address || '';
  if (headers.includes('City')) row['City'] = property.city || '';
  if (headers.includes('State')) row['State'] = property.state || '';
  if (headers.includes('Zip Code')) row['Zip Code'] = property.zip_code || '';
  if (headers.includes('Country')) row['Country'] = property.country || 'USA';
  if (headers.includes('Url')) row['Url'] = property.url || '';
  if (headers.includes('Description')) row['Description'] = property.description || '';
  if (headers.includes('Unit Type')) row['Unit Type'] = property.unit_type || '';
  if (headers.includes('Property Type')) row['Property Type'] = property.property_type || '';
  if (headers.includes('Latitude')) row['Latitude'] = property.latitude?.toString() || '';
  if (headers.includes('Longitude')) row['Longitude'] = property.longitude?.toString() || '';
  if (headers.includes('Date Added')) row['Date Added'] = today;

  if (property.amenities?.length) {
    const amenityMap: { [key: string]: string } = {
      'wifi': 'Wifi', 'campfire': 'Campfires', 'fire pit': 'Campfires',
      'toilet': 'Toilet', 'bathroom': 'Toilet', 'shower': 'Shower',
      'pets': 'Pets', 'pet friendly': 'Pets', 'water': 'Water',
      'kitchen': 'Cooking equipment', 'hot tub': 'Hot Tub', 'sauna': 'Hot Tub',
      'picnic table': 'Picnic Table', 'spa': 'Hot Tub',
    };

    property.amenities.forEach(amenity => {
      const lower = amenity.toLowerCase();
      for (const [key, column] of Object.entries(amenityMap)) {
        if (lower.includes(key) && headers.includes(column)) {
          row[column] = 'Yes';
        }
      }
    });
  }

  return row;
}

function appendToCSV(properties: PropertyData[], source: string): void {
  console.log(`\n📝 Appending ${properties.length} properties to CSV...\n`);

  const existingRows = readCSVFile(CSV_FILE);
  const headers = existingRows.length > 0 ? Object.keys(existingRows[0]) : [
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

  const newRows = properties.map(p => propertyToCSVRow(p, source, headers));
  const allRows = [...existingRows, ...newRows];

  const csvContent = stringify(allRows, { header: true, columns: headers });
  fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');

  console.log(`✅ Appended ${properties.length} properties to ${CSV_FILE}`);
  console.log(`   Total properties in CSV: ${allRows.length}\n`);
}

async function main() {
  console.log('='.repeat(70));
  console.log('Process Google Search Results - Glamping Resorts');
  console.log('='.repeat(70));
  console.log();

  try {
    const extractedProperties = await extractPropertiesFromSearchResults(SEARCH_RESULTS_TEXT);

    if (extractedProperties.length === 0) {
      console.log('⚠️  No properties extracted');
      return;
    }

    console.log(`Found ${extractedProperties.length} properties:\n`);
    extractedProperties.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.property_name} (${p.city || 'Unknown'}, ${p.state || 'Unknown'})`);
    });
    console.log();

    console.log('📋 Checking for existing properties...\n');
    const csvRows = readCSVFile(CSV_FILE);
    const csvPropertyNames = new Set(
      csvRows
        .map(row => row['Property Name']?.trim())
        .filter((name): name is string => !!name)
    );
    const dbPropertyNames = await getDatabasePropertyNames();

    console.log('🔍 Filtering out existing properties...\n');
    const newProperties: PropertyData[] = [];

    for (const property of extractedProperties) {
      const exists = propertyExists(property, csvPropertyNames, dbPropertyNames);
      if (exists.exists) {
        console.log(`  ✗ SKIP: ${property.property_name} (exists in ${exists.location})`);
      } else {
        console.log(`  ✓ NEW: ${property.property_name}`);
        newProperties.push(property);
      }
    }

    console.log(`\n📊 Found ${newProperties.length} new properties out of ${extractedProperties.length} total\n`);

    if (newProperties.length === 0) {
      console.log('✅ All properties already exist!');
      return;
    }

    console.log('🔍 Enriching property data with OpenAI...\n');
    const enrichedProperties: PropertyData[] = [];

    for (let i = 0; i < newProperties.length; i++) {
      const property = newProperties[i];
      console.log(`[${i + 1}/${newProperties.length}] ${property.property_name}`);
      try {
        const enriched = await enrichPropertyData(property);
        enrichedProperties.push(enriched);
        console.log();
      } catch (error) {
        console.log(`  ⚠️  Error, using original data\n`);
        enrichedProperties.push(property);
      }
    }

    if (enrichedProperties.length > 0) {
      appendToCSV(enrichedProperties, 'Google Search');
      console.log('✅ Process complete!');
      console.log(`   Added ${enrichedProperties.length} new properties to CSV`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
