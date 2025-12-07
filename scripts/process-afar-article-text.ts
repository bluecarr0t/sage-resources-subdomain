#!/usr/bin/env npx tsx
/**
 * Process AFAR article text to extract and add glamping properties
 * 
 * This script:
 * - Extracts glamping properties from provided AFAR article text
 * - Compares against existing CSV file
 * - Checks against sage-glamping-data database for duplicates
 * - Uses OpenAI to enrich property data with detailed information
 * - Appends new unique properties to CSV file
 * 
 * Usage:
 *   npx tsx scripts/process-afar-article-text.ts
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
const TABLE_NAME = 'sage-glamping-data';

// AFAR article text (provided by user)
// Note: The full article text will be passed via command line or environment variable
// For now, we'll read from a file if it exists, or use embedded text
let AFAR_ARTICLE_TEXT = `AFAR Logo - Main

Destinations



Trip Ideas



Tips + News



Hotels



Journeys

Podcasts



Subscribe



Travel InspirationHotelsHotels We Love

By Jennifer Flowers   •  July 10, 2023

The World's 15 Best Glamping Retreats

These 15 glamping retreats are the best in the world at delivering the finer things under canvas.

CopyLink copied

Facebook

Pinterest

Twitter

Print

View from inside tent to surrounding forest at Shinta Mani Wild in Cambodia 

Shinta Mani Wild in Cambodia is a standard setter in glamping in Southeast Asia.Courtesy of Shinta Mani Wild

Not too long ago, the word "camping" for most people meant going without running water and en suite bathrooms in exchange for the thrill of sleeping in the great outdoors. Yet over the past decade, a number of high-end tented camps has changed what it means to sleep in the wild. In the past five years, a surge of outdoor recreation lodging under canvas during the pandemic has fueled this trend even further, inspiring more lodging companies to up the ante on comfort in the wild.



These days, the term "glamping"—a portmanteau of glamour and camping—features on most travelers' radar. (It even joined the Merriam-Webster dictionary in 2018.) It refers to nature escapes imbued with the finer things—not just running water and electricity but also king-size beds, fine linens, and in some cases, chandeliers, spas, and world-class dining.



You could argue that Genghis Khan, the ruler of the Mongolian empire, was an early glamper. He had his yurt mounted on a wheeled cart, and it was pulled by 22 oxen wherever he went. In 19th-century Africa, colonists paired lion sightings with porcelain and other niceties under canvas. In the early 1980s, glamping caught on in the United States: Notably, the Resort at Paws Up in Greenough, Montana, launched luxury tents on its 37,000-acre working cattle ranch—all with en suite bathrooms. Some of the most sought-after luxury hotel brands have evolved their offerings into glamping, with such standouts as Camp Sarika by Amangiri in Utah and Naviva, a Four Seasons Resort in Punta Mita, Mexico.



For AFAR's Hotels We Love series, we've surveyed the glamping scene to deliver 15 of the finest examples of luxury under canvas around the world, connecting guests to nature while also keeping things very comfortable. (Wondering why African safari camps aren't included? They're getting their very own Hotels We Love list later this month.) Read on for our picks of the world's 15 best glamping resorts, in no particular order.





View from deck of a Clayoquot Wilderness Resort's suite with two Adirondack chairs overlooking a scenic estuary  

Several of Clayoquot's suites face a scenic estuary.Courtesy of Clayoquot Wilderness Lodge

1. Clayoquot Wilderness Resort

Location: Vancouver Island, British Columbia

Book now

In a remote spot off Vancouver Island in British Columbia, surrounded by rain forest, mountains, and beaches, Clayoquot Wilderness Lodge first opened in 1998 as an overnight floating resort experience. Since then, it has grown into a luxury retreat with 25 tented accommodations along the banks of Clayoquot Sound. In 2021, it relaunched as part of the collection of Baillie Lodges, known for such iconic Australian retreats as Southern Ocean Lodge on Kangaroo Island and Longitude 131 in the Red Centre.



While the camp has a rugged atmosphere, with huge stone fireplaces and a long wooden cookhouse, it's an outpost with such luxuries as white linen tablecloths, polished silverware, soft comforters, and high-thread-count bedding. The tents, built on raised platforms a little way from the main camp, feature cozy Adirondack-style beds, wood-burning stoves, and contemporary-feeling furnishings in neutral hues that complement the natural surroundings. They also have in-floor heating and en suite bathrooms with indoor/outdoor showers. Guests spend their days whale-watching, shooting clay pigeons, and exploring the retreat's 600-acre reserve on foot or on horseback.



A patio with chairs and a plunge pool near a rock formation. 

Camp Sarika is an all-weather, year-round tented camp.Courtesy of Camp Sarika



2. Aman Camp Sarika

Location: Canyon Point, Utah

Book now

Set within a secluded canyon adjacent to Grand Staircase–Escalante National Monument, Aman Camp Sarika is a collection of 10 low-slung canvas pavilions that blend with their surroundings. It launched in 2020 as the new tented extension of Amangiri, which opened in 2009 and whose guests have included the likes of Brad Pitt and Tom Hanks. Each one- or two-bedroom dwelling (1,882 and 2,825-square-feet, respectively) features a spacious lounge, bar, and dining area. Bathrooms have deep soaking tubs and indoor and outdoor showers that face natural rock escarpments estimated to be 164 million years old. Terraces features plunge pools, telescopes, and cozy firepits.



Surrounding the resort are five national parks and the Navajo Nation Reservation, the largest Native American reservation in the United States. Activities include horseback riding and guided hikes into nearby Zion and Bryce Canyon national parks, as well as hoop dancing and storytelling experiences led by Navajo practitioners. Some Navajo traditions like smudging find their way into Amangiri's 25,000-square-foot spa, a largely open-air facility where guests can sip greenthread leaf–based Navajo tea and soak up the desertscape between treatments.



Interior of an Under Canvas lobby tent 

Each of Under Canvas's lobby tents houses a restaurant that serves breakfast, latte drinks, and dinner. Photo by Bailey Made

3. Under Canvas Bryce Canyon

Location: Bryce Canyon, Utah

Book now

Founded in 2012 by Sarah and Jacob Dusek in Bozeman, Montana, Under Canvas offers upscale safari-style tents in 12 different locations across the United States, all next to popular national parks. Debuted in 2022, Under Canvas Bryce Canyon puts visitors within an easy 15-minute drive of the entrance to Utah's Bryce Canyon National Park, which has the highest concentration of otherworldly hoodoos on Earth.





The camp's 50 tents are set on 700 acres of rolling grasslands ringed by craggy mountains. Amid the canvas-topped, wooden-framed tents, pronghorn and white-tailed deer regularly make appearances. Accommodations range from a Deluxe (which sleeps two) to a Suite (which sleeps four). All tents, which are fully solar powered, feature West Elm furnishings, en suite bathrooms with low-flow toilets and hot water, king-size beds, and wood-fired stoves for chilly nights.



As with its other camps, there's no electricity (though there are battery packs for charging electronics and lanterns), and there isn't a television or Wi-Fi signal. In the main "lobby"—a large, billowing tent at the edge of camp—a kitchen serves frittata breakfast sandwiches and hot dinners like roasted trout. Grab-n-go options are available in the afternoon when the kitchen is closed, and free s'mores kits are on hand every night for those who'd like to enjoy something sweet by the campfire. Complimentary programming includes yoga classes, live music, and astrology readings (something that is unique to the Bryce Canyon location).



Interior of tent at the Resort at Paws Up with freestanding bathtub, bed, and ceiling fan.

The Resort at Paws Up is widely considered the first glamping experience in the United States.Courtesy of the Resort at Paws Up

4. The Resort at Paws Up

Location: Greenough, Montana

Book now

One of the most luxurious Western guest ranches since it opened in 2005, the Resort at Paws Up in Greenough, Montana, sprawls over 37,000 acres of rocky peaks, meadows where elk roam, and ponderosa pines in the Blackfoot Valley, with the river of the same name running through it all. While the retreat's accommodations range from luxury homes with verandas to design-driven, adults-only Green O, the glamping tents are among the most sought-after spots; they are bookable in the warmer months between mid-May and mid-October.





Located in such picturesque areas as the Blackfoot River and Elk Creek, the glamping sites are organized into six separate camps that take anywhere between two and six guests each. Canvas suites feature private baths, large beds with wooden frames, and even chandeliers, while a communal dining pavilion features a fireplace and firepit that's managed by a private camp chef. Butlers are at the ready to organize guest activities, including on-site fly-fishing and horseback riding on 100 miles of private trails. Adults and kids 12 and up can help move small herds of Black Angus cattle on sample stock drives.



Exterior of white tent and deck surrounded by evergreens at Dunton River Camp

Mountain bike, fish, or simply feed the horses at Dunton River Camp in Colorado.Courtesy of Dunton Destinations

5. Dunton River Camp

Location: Dolores, Colorado

Book now

Less than two hours from Colorado's Mesa Verde National Park, the 500-acre Dunton River Camp features eight luxury tents with showstopping views of the San Juan Mountains or the west fork of the Dolores River. Each tent sleeps two people. When you're not off exploring the ancient pueblo cliff dwellings of Mesa Verde, steam in a streamside sauna, explore the area on a complimentary mountain bike, or visit the only active geyser in Colorado, which is on-site at the Dunton River Camp. Interested in hiking, fly-fishing, or horseback riding? Each day, an included guided tour sets off from the camp. À la carte activities such as rock climbing, rafting, and photography instruction can be booked as well. Back in your tent, unwind in the six-foot soaker tub. No need to worry about chills: A towel-warmer stands nearby.



Exterior of  two tents at Collective Retreats Governors Island 

Collective Retreats Governors Island is the first overnight accommodation to open on the tiny island in New York Harbor since the Coast Guard left in 1996.Photo by Lyndsey Matthews



6. Collective Retreats Governors Island

Location: Governors Island, New York

Book now

Eight minutes by ferry from downtown Manhattan, Governors Island is a tiny 172-acre island and public park enjoyed by locals and visitors alike. And since 2018, people have been able to spend the night there at Collective Retreats Governors Island. Better known for opening luxury camping sites in such remote locations as Yellowstone and Texas Hill Country, Collective Retreats makes its urban debut with its Governors Island location, where views of the Manhattan skyline and the Statue of Liberty are on offer outside of each luxury canvas tent.



There are 27 "Journey" tents or 10 "Summit" tents, both featuring real beds and mattresses, fully functional electricity, and French press coffee bars. The Journey tents offer a slightly cozier option and shared bathrooms within a two-minute walk of each campsite. For those wanting a truly over-the-top camping experience, Summit tents each come with a private en suite bathroom with rain shower, spacious deck with Adirondack chairs, and other amenities like Yeti coolers. Breakfast is also included in the Summit tent rates and can be delivered directly to your bed for an extra fee. For those who prefer more cabin-like structures, the Outlook Shelter and Outlook Liberty Suite are temperature controlled, come with private bathrooms, and have proper doors and windows instead of tent flaps.



Interior of white tent at Mendocino Grove, with bed, chairs, and small table.

At Mendocino Grove, families can spend nights in comfy safari tents and days hiking nearby trails.Courtesy of Mendocino Grove

7. Mendocino Grove

Location: Mendocino, California

Book now

We'll never say no to a camping trip in California—especially if it involves staying in a comfortable safari-style tent in a secluded forest by the ocean. This is exactly what guests can expect at Mendocino Grove, a 37-acre property on a rocky cliffside just south of the quiet town of Mendocino on Northern California's coast. Each of the 60 tents has a bed equipped with a heated mattress pad, a campfire pit (which a staff member can light for you if needed), a private deck, and a picnic table. Tents are well spaced out to maximize privacy, while shared bathrooms are stocked with lavender-scented amenities.





Nab one of the hammocks in a tree-shaded meadow for your morning coffee routine. Listen to live music around a communal campfire. Or put in a few "work from the woods" hours on the camp's reliable Wi-Fi. Luxurious new on-site services in 2023 include a cedar-wood sauna, massages, an espresso bar, and chef-cooked dinners on Fridays and Saturdays.`;

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
 * Extract glamping properties from article text using OpenAI
 */
async function extractPropertiesFromArticle(articleText: string): Promise<PropertyData[]> {
  console.log('🤖 Using OpenAI to extract glamping properties from AFAR article...\n');

  const prompt = `Extract all glamping resort/campground/property information from the following AFAR article about "The World's 15 Best Glamping Retreats".

Focus ONLY on properties located in North America (United States and Canada). Ignore properties in other countries.

Return a JSON object with a "properties" array containing one object for each North American glamping property mentioned in the article. Each property object should have:
- property_name (required): The exact name of the property/resort as mentioned in the article
- city (optional): City where it's located
- state (optional): State/province abbreviation (2 letters for US, full for Canadian provinces)
- country (optional): "USA" or "Canada"
- address (optional): Full street address if mentioned
- url (optional): Website URL if mentioned
- description (optional): Brief description of the property from the article
- unit_type (optional): Types of accommodations (e.g., "tents", "yurts", "cabins", "pavilions")
- property_type (optional): Type of property (e.g., "Glamping Resort", "Luxury Campground")
- year_opened (optional): Year the property opened if mentioned
- number_of_units (optional): Number of accommodations if mentioned

Be VERY thorough - extract ALL North American properties mentioned. The article mentions properties numbered 1-15, but only include the ones in USA or Canada.

Return ONLY valid JSON in this format:
{
  "properties": [
    {
      "property_name": "Example Glamping Resort",
      "city": "City Name",
      "state": "ST",
      "country": "USA",
      "url": "https://example.com",
      "description": "Brief description from article...",
      "unit_type": "tents",
      "property_type": "Glamping Resort",
      "year_opened": 2020,
      "number_of_units": 10
    }
  ]
}

Article text:
${articleText.substring(0, 50000)}`;

  try {
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

    console.log(`✅ Extracted ${properties.length} North American properties from article\n`);
    return properties;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw new Error('Unknown error from OpenAI API');
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
  if (headers.includes('Quantity of Units')) row['Quantity of Units'] = (property as any).number_of_units?.toString() || '';
  if (headers.includes('Year Site Opened')) row['Year Site Opened'] = (property as any).year_opened?.toString() || '';
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
  console.log('Process AFAR Article Text - Extract Glamping Properties');
  console.log('='.repeat(70));
  console.log();

  try {
    // Step 1: Extract properties from article text
    console.log('📄 Processing AFAR article text...\n');
    const extractedProperties = await extractPropertiesFromArticle(AFAR_ARTICLE_TEXT);
    
    if (extractedProperties.length === 0) {
      console.log('⚠️  No properties extracted from article');
      return;
    }

    console.log(`Found ${extractedProperties.length} North American properties in article:\n`);
    extractedProperties.forEach((prop, i) => {
      console.log(`  ${i + 1}. ${prop.property_name} (${prop.city || 'Unknown'}, ${prop.state || 'Unknown'})`);
    });
    console.log();

    // Step 2: Read existing CSV and database properties
    console.log('📋 Checking for existing properties...\n');
    const csvRows = readCSVFile(CSV_FILE);
    const csvPropertyNames = new Set(
      csvRows
        .map(row => row['Property Name']?.trim())
        .filter((name): name is string => !!name)
    );
    
    const dbPropertyNames = await getDatabasePropertyNames();

    // Step 3: Filter out existing properties
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
      console.log('✅ All properties already exist in CSV or database!');
      return;
    }

    // Step 4: Enrich property data using OpenAI
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
        console.log(`  ⚠️  Error, using original data: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        enrichedProperties.push(property);
      }
    }

    // Step 5: Append to CSV
    if (enrichedProperties.length > 0) {
      appendToCSV(enrichedProperties, 'AFAR');
      console.log('✅ Process complete!');
      console.log(`   Added ${enrichedProperties.length} new properties to CSV`);
    } else {
      console.log('⚠️  No properties to add');
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
