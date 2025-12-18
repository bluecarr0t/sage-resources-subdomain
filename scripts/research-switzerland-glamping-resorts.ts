#!/usr/bin/env npx tsx
/**
 * Research glamping resorts in Switzerland using OpenAI API and save to CSV
 * 
 * This script:
 * - Uses OpenAI API to research glamping resorts in Switzerland
 * - Extracts comprehensive property data matching the sage-glamping-data schema
 * - Saves results to CSV file for later upload to database
 * 
 * Usage:
 *   npx tsx scripts/research-switzerland-glamping-resorts.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { OpenAI } from 'openai';
import * as fs from 'fs';
import { stringify } from 'csv-stringify/sync';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('❌ Missing OpenAI API key');
  console.error('Please ensure OPENAI_API_KEY is set in .env.local');
  process.exit(1);
}

const CSV_FILE = 'csv/glamping-properties/europe/switzerland-glamping-resorts.csv';

// Search queries to find glamping resorts in Switzerland
const SEARCH_QUERIES = [
  'best glamping resorts Switzerland 2024',
  'luxury glamping Schweiz',
  'glamping sites Swiss Alps Switzerland',
  'glamping sites Lake Geneva Switzerland',
  'glamping sites Interlaken Switzerland',
  'glamping sites Zermatt Switzerland',
  'glamping sites Grindelwald Switzerland',
  'glamping sites Lucerne Switzerland',
  'glamping sites Ticino Switzerland',
  'glamping sites Valais Switzerland',
  'treehouse glamping Switzerland',
  'yurt glamping Switzerland',
  'safari tent glamping Switzerland',
  'luxury camping Switzerland',
  'glamping retreats Switzerland',
  'eco glamping Switzerland',
  'glamping near Zurich Switzerland',
  'glamping near Bern Switzerland',
];

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: openaiApiKey });

// Configuration
const DELAY_BETWEEN_AI_CALLS = 2000; // 2 seconds between OpenAI API calls
const DELAY_BETWEEN_SEARCHES = 3000; // 3 seconds between searches

interface PropertyData {
  // Basic Information
  property_name: string;
  site_name?: string;
  unit_type?: string;
  property_type?: string;
  property__total_sites?: number;
  quantity_of_units?: number;
  unit_capacity?: string;
  year_site_opened?: number;
  operating_season__months_?: string;
  __of_locations?: number;
  
  // Location
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  lat?: number;
  lon?: number;
  
  // Contact & Web
  url?: string;
  phone_number?: string;
  description?: string;
  getting_there?: string;
  minimum_nights?: string;
  
  // Amenities (Yes/No/null)
  toilet?: string;
  hot_tub___sauna?: string;
  pool?: string;
  pets?: string;
  water?: string;
  shower?: string;
  trash?: string;
  cooking_equipment?: string;
  picnic_table?: string;
  wifi?: string;
  laundry?: string;
  campfires?: string;
  playground?: string;
  electricity?: string;
  private_bathroom?: string;
  kitchen?: string;
  patio?: string;
  general_store?: string;
  cable?: string;
  charcoal_grill?: string;
  sewer_hook_up?: string;
  electrical_hook_up?: string;
  generators_allowed?: string;
  water_hookup?: string;
  restaurant?: string;
  dog_park?: string;
  clubhouse?: string;
  waterpark?: string;
  alcohol_available?: string;
  golf_cart_rental?: string;
  canoeing___kayaking?: string;
  
  // RV Information
  rv___vehicle_length?: string;
  rv___parking?: string;
  rv___accommodates_slideout?: string;
  rv___surface_type?: string;
  rv___surface_level?: string;
  rv___vehicles__fifth_wheels?: string;
  rv___vehicles__class_a_rvs?: string;
  rv___vehicles__class_b_rvs?: string;
  rv___vehicles__class_c_rvs?: string;
  rv___vehicles__toy_hauler?: string;
  
  // Activities
  fishing?: string;
  surfing?: string;
  horseback_riding?: string;
  paddling?: string;
  climbing?: string;
  off_roading__ohv_?: string;
  boating?: string;
  swimming?: string;
  wind_sports?: string;
  snow_sports?: string;
  whitewater_paddling?: string;
  fall_fun?: string;
  hiking?: string;
  wildlife_watching?: string;
  biking?: string;
  
  // Location Features
  ranch?: string;
  beach?: string;
  coastal?: string;
  suburban?: string;
  forest?: string;
  field?: string;
  wetlands?: string;
  hot_spring?: string;
  desert?: string;
  canyon?: string;
  waterfall?: string;
  swimming_hole?: string;
  lake?: string;
  cave?: string;
  redwoods?: string;
  farm?: string;
  river__stream__or_creek?: string;
  mountainous?: string;
  waterfront?: string;
  
  // Additional
  sage___p__amenity__food_on_site?: string;
  
  // Pricing (optional - may not be available)
  occupancy_rate_2024?: number;
  avg__retail_daily_rate_2024?: number;
  high_rate_2024?: number;
  low_rate_2024?: number;
  retail_daily_rate__fees__2024?: number;
  revpar_2024?: number;
  
  // Metadata
  source?: string;
  date_added?: string;
  date_updated?: string;
  duplicatenote?: string;
  
  [key: string]: any;
}

/**
 * Sleep/delay function
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Research glamping properties in Switzerland using OpenAI
 */
async function researchGlampingProperties(searchQuery: string): Promise<PropertyData[]> {
  console.log(`🔍 Researching: "${searchQuery}"\n`);

  const prompt = `Research glamping resorts and retreats in Switzerland based on this search query: "${searchQuery}"

Find glamping properties (luxury camping resorts, tent accommodations, yurts, treehouses, safari tents, etc.) located in Switzerland.

For each unique glamping property you find, provide:
- property_name (required): The exact name of the property/resort
- city (optional): City where it's located
- state (optional): Swiss canton name (e.g., "Valais", "Bern", "Graubünden", "Ticino", "Zurich")
- country: "Switzerland"
- url (optional): Official website URL if you can find it
- description (optional): Brief description of what makes it special
- unit_type (optional): Types of accommodations (e.g., "tents", "yurts", "treehouses", "safari tents", "cabins", "pods")
- property_type (optional): Type of property (e.g., "Glamping Resort", "Luxury Campground", "Boutique Camping")
- address (optional): Full street address if available
- zip_code (optional): Postal code if available
- phone_number (optional): Phone number if available (with country code +41)
- lat (optional): Latitude coordinate if known (number)
- lon (optional): Longitude coordinate if known (number)

Return a JSON object with a "properties" array. Be thorough but focus on quality glamping properties. Avoid duplicates and properties that are just regular campgrounds.

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "property_name": "Example Glamping Resort",
      "city": "City Name",
      "state": "Valais",
      "country": "Switzerland",
      "url": "https://example.com",
      "description": "Brief description...",
      "unit_type": "tents, yurts",
      "property_type": "Glamping Resort",
      "address": "Street Address",
      "zip_code": "1234",
      "phone_number": "+41 12 345 67 89",
      "lat": 46.5197,
      "lon": 6.6323
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
        state: p.state?.trim() || undefined,
        country: p.country?.trim() || 'Switzerland',
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
 * Enrich property data using OpenAI with comprehensive schema fields
 */
async function enrichPropertyData(property: PropertyData): Promise<PropertyData> {
  console.log(`  🤖 Enriching data for: ${property.property_name}`);

  const prompt = `Research and provide comprehensive detailed information about this glamping property in Switzerland:

Property Name: ${property.property_name}
City: ${property.city || 'Unknown'}
State: ${property.state || 'Unknown'}
Country: ${property.country || 'Switzerland'}
URL: ${property.url || 'Unknown'}

Provide a JSON object with as much detail as possible. For each field, use "Yes" for true, "No" for false, or null/omit if unknown.

Return a JSON object with these fields:
{
  "property_name": "Keep the original name",
  "site_name": "Site or location name if different",
  "city": "City name",
  "state": "Swiss canton name (e.g., Valais, Bern, Graubünden, Ticino, Zurich)",
  "country": "Switzerland",
  "address": "Full street address if available",
  "zip_code": "Postal code if available",
  "url": "Official website URL",
  "phone_number": "Phone number with country code (+41)",
  "description": "3-5 sentence description of the property, amenities, location, and what makes it special",
  "getting_there": "How to get to the property (directions, nearest airport, train station, etc.)",
  "minimum_nights": "Minimum stay requirement if known (e.g., '2 nights')",
  "unit_type": "Types of accommodations (comma-separated, e.g., 'safari tents, yurts, treehouses, pods')",
  "property_type": "Type of property (e.g., 'Glamping Resort', 'Luxury Campground', 'Boutique Camping')",
  "property__total_sites": "Total number of sites/units (number)",
  "quantity_of_units": "Number of glamping units (number)",
  "unit_capacity": "Guest capacity per unit (e.g., '2-4 guests')",
  "year_site_opened": "Year the property opened (number)",
  "operating_season__months_": "Operating months (e.g., 'May-October' or 'Year-round')",
  "lat": "Latitude coordinate (number)",
  "lon": "Longitude coordinate (number)",
  
  "amenities": {
    "toilet": "Yes/No/null",
    "hot_tub___sauna": "Yes/No/null",
    "pool": "Yes/No/null",
    "pets": "Yes/No/null",
    "water": "Yes/No/null",
    "shower": "Yes/No/null",
    "trash": "Yes/No/null",
    "cooking_equipment": "Yes/No/null",
    "picnic_table": "Yes/No/null",
    "wifi": "Yes/No/null",
    "laundry": "Yes/No/null",
    "campfires": "Yes/No/null",
    "playground": "Yes/No/null",
    "electricity": "Yes/No/null",
    "private_bathroom": "Yes/No/null",
    "kitchen": "Yes/No/null",
    "patio": "Yes/No/null",
    "general_store": "Yes/No/null",
    "cable": "Yes/No/null",
    "charcoal_grill": "Yes/No/null",
    "sewer_hook_up": "Yes/No/null",
    "electrical_hook_up": "Yes/No/null",
    "generators_allowed": "Yes/No/null",
    "water_hookup": "Yes/No/null",
    "restaurant": "Yes/No/null",
    "dog_park": "Yes/No/null",
    "clubhouse": "Yes/No/null",
    "waterpark": "Yes/No/null",
    "alcohol_available": "Yes/No/null",
    "golf_cart_rental": "Yes/No/null",
    "canoeing___kayaking": "Yes/No/null"
  },
  
  "activities": {
    "fishing": "Yes/No/null",
    "surfing": "Yes/No/null",
    "horseback_riding": "Yes/No/null",
    "paddling": "Yes/No/null",
    "climbing": "Yes/No/null",
    "off_roading__ohv_": "Yes/No/null",
    "boating": "Yes/No/null",
    "swimming": "Yes/No/null",
    "wind_sports": "Yes/No/null",
    "snow_sports": "Yes/No/null",
    "whitewater_paddling": "Yes/No/null",
    "fall_fun": "Yes/No/null",
    "hiking": "Yes/No/null",
    "wildlife_watching": "Yes/No/null",
    "biking": "Yes/No/null"
  },
  
  "location_features": {
    "ranch": "Yes/No/null",
    "beach": "Yes/No/null",
    "coastal": "Yes/No/null",
    "suburban": "Yes/No/null",
    "forest": "Yes/No/null",
    "field": "Yes/No/null",
    "wetlands": "Yes/No/null",
    "hot_spring": "Yes/No/null",
    "desert": "Yes/No/null",
    "canyon": "Yes/No/null",
    "waterfall": "Yes/No/null",
    "swimming_hole": "Yes/No/null",
    "lake": "Yes/No/null",
    "cave": "Yes/No/null",
    "redwoods": "Yes/No/null",
    "farm": "Yes/No/null",
    "river__stream__or_creek": "Yes/No/null",
    "mountainous": "Yes/No/null",
    "waterfront": "Yes/No/null"
  },
  
  "rv_info": {
    "rv___vehicle_length": "Maximum RV length if applicable",
    "rv___parking": "Yes/No/null",
    "rv___accommodates_slideout": "Yes/No/null",
    "rv___surface_type": "Surface type (e.g., 'gravel', 'paved', 'grass')",
    "rv___surface_level": "Yes/No/null",
    "rv___vehicles__fifth_wheels": "Yes/No/null",
    "rv___vehicles__class_a_rvs": "Yes/No/null",
    "rv___vehicles__class_b_rvs": "Yes/No/null",
    "rv___vehicles__class_c_rvs": "Yes/No/null",
    "rv___vehicles__toy_hauler": "Yes/No/null"
  }
}

Focus on Swiss glamping properties. If you cannot find specific information, use null or omit the field. Be thorough and accurate.

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
      max_tokens: 3000,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      console.log(`    ⚠️  No enriched data returned, using original data`);
      return property;
    }

    const enriched = JSON.parse(content);
    
    // Merge amenities, activities, location_features, and rv_info into main object
    const merged: PropertyData = {
      ...enriched,
      property_name: property.property_name || enriched.property_name,
      country: 'Switzerland',
      source: property.source || 'OpenAI Research',
      date_added: new Date().toISOString().split('T')[0],
    };

    // Flatten nested objects
    if (enriched.amenities) {
      Object.assign(merged, enriched.amenities);
      delete merged.amenities;
    }
    if (enriched.activities) {
      Object.assign(merged, enriched.activities);
      delete merged.activities;
    }
    if (enriched.location_features) {
      Object.assign(merged, enriched.location_features);
      delete merged.location_features;
    }
    if (enriched.rv_info) {
      Object.assign(merged, enriched.rv_info);
      delete merged.rv_info;
    }

    // Merge with original property data (original takes precedence for name)
    const final: PropertyData = {
      ...merged,
      ...property,
      property_name: property.property_name || merged.property_name,
    };

    console.log(`    ✅ Enriched with ${Object.keys(final).length} fields`);
    return final;
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
 * Convert PropertyData to CSV row format matching schema
 */
function propertyToCSVRow(property: PropertyData): Record<string, string> {
  const today = new Date().toISOString().split('T')[0];
  
  // Define all columns from the schema
  const row: Record<string, string> = {
    'duplicatenote': property.duplicatenote || '',
    'source': property.source || 'OpenAI Research',
    'date_added': property.date_added || today,
    'date_updated': property.date_updated || '',
    'property_name': property.property_name || '',
    'site_name': property.site_name || '',
    'unit_type': property.unit_type || '',
    'property_type': property.property_type || '',
    'property__total_sites': property.property__total_sites?.toString() || '',
    'quantity_of_units': property.quantity_of_units?.toString() || '',
    'unit_capacity': property.unit_capacity || '',
    'year_site_opened': property.year_site_opened?.toString() || '',
    'operating_season__months_': property.operating_season__months_ || '',
    '__of_locations': property.__of_locations?.toString() || '',
    'address': property.address || '',
    'city': property.city || '',
    'state': property.state || '',
    'zip_code': property.zip_code || '',
    'country': property.country || 'Switzerland',
    'occupancy_rate_2024': property.occupancy_rate_2024?.toString() || '',
    'avg__retail_daily_rate_2024': property.avg__retail_daily_rate_2024?.toString() || '',
    'high_rate_2024': property.high_rate_2024?.toString() || '',
    'low_rate_2024': property.low_rate_2024?.toString() || '',
    'retail_daily_rate__fees__2024': property.retail_daily_rate__fees__2024?.toString() || '',
    'revpar_2024': property.revpar_2024?.toString() || '',
    'occupancy_rate_2025': '',
    'retail_daily_rate_ytd': '',
    'retail_daily_rate__fees__ytd': '',
    'high_rate_2025': '',
    'low_rate_2025': '',
    'revpar_2025': '',
    'high_month_2025': '',
    'high_avg__occupancy_2025': '',
    'low_month_2025': '',
    'low_avg__occupancy_2025': '',
    'operating_season__excel_format_': '',
    'avg__rate__next_12_months_': '',
    'high_rate__next_12_months_': '',
    'low_rate__next_12_months_': '',
    'winter_weekday': '',
    'winter_weekend': '',
    'spring_weekday': '',
    'spring_weekend': '',
    'summer_weekday': '',
    'summer_weekend': '',
    'fall_weekday': '',
    'fall_weekend': '',
    'url': property.url || '',
    'description': property.description || '',
    'minimum_nights': property.minimum_nights || '',
    'getting_there': property.getting_there || '',
    'lon': property.lon?.toString() || '',
    'lat': property.lat?.toString() || '',
    'toilet': property.toilet || '',
    'hot_tub___sauna': property.hot_tub___sauna || '',
    'pool': property.pool || '',
    'pets': property.pets || '',
    'water': property.water || '',
    'shower': property.shower || '',
    'trash': property.trash || '',
    'cooking_equipment': property.cooking_equipment || '',
    'picnic_table': property.picnic_table || '',
    'wifi': property.wifi || '',
    'laundry': property.laundry || '',
    'campfires': property.campfires || '',
    'playground': property.playground || '',
    'rv___vehicle_length': property.rv___vehicle_length || '',
    'rv___parking': property.rv___parking || '',
    'rv___accommodates_slideout': property.rv___accommodates_slideout || '',
    'rv___surface_type': property.rv___surface_type || '',
    'rv___surface_level': property.rv___surface_level || '',
    'rv___vehicles__fifth_wheels': property.rv___vehicles__fifth_wheels || '',
    'rv___vehicles__class_a_rvs': property.rv___vehicles__class_a_rvs || '',
    'rv___vehicles__class_b_rvs': property.rv___vehicles__class_b_rvs || '',
    'rv___vehicles__class_c_rvs': property.rv___vehicles__class_c_rvs || '',
    'rv___vehicles__toy_hauler': property.rv___vehicles__toy_hauler || '',
    'fishing': property.fishing || '',
    'surfing': property.surfing || '',
    'horseback_riding': property.horseback_riding || '',
    'paddling': property.paddling || '',
    'climbing': property.climbing || '',
    'off_roading__ohv_': property.off_roading__ohv_ || '',
    'boating': property.boating || '',
    'swimming': property.swimming || '',
    'wind_sports': property.wind_sports || '',
    'snow_sports': property.snow_sports || '',
    'whitewater_paddling': property.whitewater_paddling || '',
    'fall_fun': property.fall_fun || '',
    'hiking': property.hiking || '',
    'wildlife_watching': property.wildlife_watching || '',
    'biking': property.biking || '',
    'ranch': property.ranch || '',
    'beach': property.beach || '',
    'coastal': property.coastal || '',
    'suburban': property.suburban || '',
    'forest': property.forest || '',
    'field': property.field || '',
    'wetlands': property.wetlands || '',
    'hot_spring': property.hot_spring || '',
    'desert': property.desert || '',
    'canyon': property.canyon || '',
    'waterfall': property.waterfall || '',
    'swimming_hole': property.swimming_hole || '',
    'lake': property.lake || '',
    'cave': property.cave || '',
    'redwoods': property.redwoods || '',
    'farm': property.farm || '',
    'river__stream__or_creek': property.river__stream__or_creek || '',
    'mountainous': property.mountainous || '',
    'sage___p__amenity__food_on_site': property.sage___p__amenity__food_on_site || '',
    'waterfront': property.waterfront || '',
    'restaurant': property.restaurant || '',
    'dog_park': property.dog_park || '',
    'clubhouse': property.clubhouse || '',
    'canoeing___kayaking': property.canoeing___kayaking || '',
    'alcohol_available': property.alcohol_available || '',
    'golf_cart_rental': property.golf_cart_rental || '',
    'private_bathroom': property.private_bathroom || '',
    'waterpark': property.waterpark || '',
    'kitchen': property.kitchen || '',
    'patio': property.patio || '',
    'electricity': property.electricity || '',
    'general_store': property.general_store || '',
    'cable': property.cable || '',
    'charcoal_grill': property.charcoal_grill || '',
    'sewer_hook_up': property.sewer_hook_up || '',
    'electrical_hook_up': property.electrical_hook_up || '',
    'generators_allowed': property.generators_allowed || '',
    'water_hookup': property.water_hookup || '',
    'phone_number': property.phone_number || '',
    'google_website_uri': '',
    'google_dine_in': '',
    'google_takeout': '',
    'google_delivery': '',
    'google_serves_breakfast': '',
    'google_serves_lunch': '',
    'google_serves_dinner': '',
    'google_serves_brunch': '',
    'google_outdoor_seating': '',
    'google_live_music': '',
    'google_menu_uri': '',
    'google_place_types': '',
    'google_primary_type': '',
    'google_primary_type_display_name': '',
    'google_photos': '',
    'google_icon_uri': '',
    'google_icon_background_color': '',
    'google_reservable': '',
    'google_rating': '',
    'google_user_rating_total': '',
    'google_business_status': '',
    'google_opening_hours': '',
    'google_current_opening_hours': '',
    'google_parking_options': '',
    'google_price_level': '',
    'google_payment_options': '',
    'google_wheelchair_accessible_parking': '',
    'google_wheelchair_accessible_entrance': '',
    'google_wheelchair_accessible_restroom': '',
    'google_wheelchair_accessible_seating': '',
    'google_allows_dogs': '',
    'slug': '',
    'quality_score': '',
    'google_place_id': '',
    'is_glamping_property': 'Yes',
  };
  
  return row;
}

/**
 * Write properties to CSV file
 */
function writeToCSV(properties: PropertyData[]): void {
  console.log(`\n📝 Writing ${properties.length} properties to CSV file...\n`);
  
  // Convert properties to CSV rows
  const rows = properties.map(property => propertyToCSVRow(property));
  
  // Get headers from first row
  const headers = Object.keys(rows[0] || {});
  
  // Write to CSV file
  const csvContent = stringify(rows, {
    header: true,
    columns: headers,
  });
  
  // Ensure directory exists
  const dir = CSV_FILE.substring(0, CSV_FILE.lastIndexOf('/'));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
  
  console.log(`✅ Successfully wrote ${properties.length} properties to ${CSV_FILE}`);
  console.log(`   File location: ${CSV_FILE}\n`);
}

/**
 * Main function
 */
async function main() {
  console.log('='.repeat(70));
  console.log('Research Glamping Resorts in Switzerland');
  console.log('='.repeat(70));
  console.log(`Processing ${SEARCH_QUERIES.length} search queries...\n`);

  try {
    // Step 1: Process each search query
    const allFoundProperties: PropertyData[] = [];
    const allFoundPropertyNames = new Set<string>(); // Track all properties found to avoid duplicates
    
    for (let i = 0; i < SEARCH_QUERIES.length; i++) {
      const query = SEARCH_QUERIES[i];
      console.log(`\n[Search ${i + 1}/${SEARCH_QUERIES.length}]`);
      
      const foundProperties = await researchGlampingProperties(query);
      
      // Filter out duplicates
      const newProperties: PropertyData[] = [];
      
      for (const property of foundProperties) {
        const normalizedName = normalizePropertyName(property.property_name);
        
        // Check if we've already found this property in a previous search
        if (allFoundPropertyNames.has(normalizedName)) {
          console.log(`  ✗ SKIP (duplicate): ${property.property_name}`);
          continue;
        }
        allFoundPropertyNames.add(normalizedName);
        
        console.log(`  ✓ NEW: ${property.property_name}`);
        property.source = `OpenAI Research: ${query}`;
        newProperties.push(property);
        allFoundProperties.push(property);
      }

      console.log(`\n📊 From "${query}": Found ${newProperties.length} new properties out of ${foundProperties.length} total\n`);

      // Delay between searches
      if (i < SEARCH_QUERIES.length - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_SEARCHES / 1000} seconds before next search...\n`);
        await sleep(DELAY_BETWEEN_SEARCHES);
      }
    }

    // Step 2: Enrich all found properties
    if (allFoundProperties.length === 0) {
      console.log('\n✅ No properties found across all searches!');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log(`Found ${allFoundProperties.length} total unique properties across all searches`);
    console.log('='.repeat(70));
    console.log('\n🔍 Enriching property data with OpenAI...\n');
    
    const enrichedProperties: PropertyData[] = [];
    
    for (let i = 0; i < allFoundProperties.length; i++) {
      const property = allFoundProperties[i];
      console.log(`[${i + 1}/${allFoundProperties.length}] ${property.property_name}`);
      
      try {
        const enriched = await enrichPropertyData(property);
        enrichedProperties.push(enriched);
        console.log();
      } catch (error) {
        console.log(`  ⚠️  Error, using original data: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        enrichedProperties.push(property);
      }
    }

    // Step 3: Write to CSV
    if (enrichedProperties.length > 0) {
      writeToCSV(enrichedProperties);
      console.log('='.repeat(70));
      console.log('✅ Process complete!');
      console.log(`   Total properties saved: ${enrichedProperties.length}`);
      console.log(`   CSV file: ${CSV_FILE}`);
      console.log('='.repeat(70));
    } else {
      console.log('⚠️  No properties to save');
    }

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
