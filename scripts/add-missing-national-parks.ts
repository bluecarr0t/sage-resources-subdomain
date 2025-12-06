/**
 * Script to add missing National Parks to the database with coordinates
 * 
 * Missing parks:
 * 1. American Samoa National Park
 * 2. Virgin Islands National Park
 * 3. White Sands National Park
 * 4. Indiana Dunes National Park
 * 5. New River Gorge National Park
 * 
 * Usage:
 *   npx tsx scripts/add-missing-national-parks.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'national-parks';

interface MissingPark {
  name: string;
  date_established: string;
  area_2021: string;
  recreation_visitors_2021: string;
  description: string;
  park_code: string | null;
  state: string | null;
  acres: number | null;
  latitude: number;
  longitude: number;
}

/**
 * Missing parks with coordinates
 * Coordinates sourced from official NPS locations
 */
const missingParks: MissingPark[] = [
  {
    name: 'American Samoa',
    date_established: 'October 31, 1988',
    area_2021: '8,256.67 acres (33.4 km2)',
    recreation_visitors_2021: '8495',
    description: 'The southernmost national park is on three Samoan islands in the South Pacific. It protects coral reefs, rainforests, volcanic mountains, and white beaches. The area is also home to flying foxes, brown boobies, sea turtles, and 900 species of fish.',
    park_code: 'NPSA',
    state: 'AS',
    acres: 8257,
    latitude: -14.2583,
    longitude: -170.6861,
  },
  {
    name: 'Virgin Islands',
    date_established: 'August 2, 1956',
    area_2021: '15,052.33 acres (60.9 km2)',
    recreation_visitors_2021: '323999',
    description: "This island park on Saint John preserves pristine beaches surrounded by mangrove forests, seagrass beds, and coral reefs. It also has Taíno archaeological sites and the ruins of sugar plantations from Columbus's time.",
    park_code: 'VIIS',
    state: 'VI',
    acres: 15052,
    latitude: 18.3381,
    longitude: -64.7231,
  },
  {
    name: 'White Sands',
    date_established: 'December 20, 2019',
    area_2021: '146,344.31 acres (592.2 km2)',
    recreation_visitors_2021: '782469',
    description: 'Located in the mountain-ringed Tularosa Basin, White Sands consists of the southern part of a 275-square-mile (710 km2) field of white sand dunes composed of gypsum crystals—the world\'s largest gypsum dunefield. The park is completely within the White Sands Missile Range and is subject to closure when tests are conducted.',
    park_code: 'WHSA',
    state: 'NM',
    acres: 146344,
    latitude: 32.7797,
    longitude: -106.1717,
  },
  {
    name: 'Indiana Dunes',
    date_established: 'February 15, 2019',
    area_2021: '15,349.08 acres (62.1 km2)',
    recreation_visitors_2021: '3177210',
    description: 'Previously designated a national lakeshore, parts of this 20-mile (32 km) stretch of the southern shore of Lake Michigan have sandy beaches and tall dunes. The park includes grassy prairies, peat bogs, and marsh wetlands home to over 2,000 species.',
    park_code: 'INDU',
    state: 'IN',
    acres: 15349,
    latitude: 41.6531,
    longitude: -87.0525,
  },
  {
    name: 'New River Gorge',
    date_established: 'December 27, 2020',
    area_2021: '7,021 acres (28.4 km2)',
    recreation_visitors_2021: '1682720',
    description: 'The New River Gorge is the deepest river gorge east of the Mississippi River. The park primarily covers the lower gorge area around the New River Gorge Bridge, which features some of the country\'s best whitewater rafting. Smaller noncontiguous sections showcase the ghost town of Thurmond, the scenic Grandview vista, and Sandstone Falls. The other 65,165 acres (263.71 km2) of the redesignated national river is now a national preserve, spanning 53 mi (85 km) of the New River.',
    park_code: 'NERI',
    state: 'WV',
    acres: 7021,
    latitude: 38.0721,
    longitude: -81.0814,
  },
];

/**
 * Main function
 */
async function main() {
  try {
    console.log('➕ Adding Missing National Parks to Database\n');

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, secretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Check which parks already exist
    console.log('📊 Checking existing parks...');
    const { data: existingParks, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('name');

    if (fetchError) {
      console.error('❌ Error fetching existing parks:', fetchError.message);
      process.exit(1);
    }

    const existingNames = new Set((existingParks || []).map((p) => p.name));
    const parksToAdd = missingParks.filter((park) => !existingNames.has(park.name));

    if (parksToAdd.length === 0) {
      console.log('✅ All parks already exist in the database!');
      return;
    }

    console.log(`Found ${parksToAdd.length} parks to add:\n`);
    parksToAdd.forEach((park) => {
      console.log(`  • ${park.name} (${park.state}): (${park.latitude}, ${park.longitude})`);
    });

    // Insert parks
    console.log('\n🔄 Inserting parks into database...');
    const { data: insertedParks, error: insertError } = await supabase
      .from(TABLE_NAME)
      .insert(parksToAdd)
      .select();

    if (insertError) {
      console.error('❌ Error inserting parks:', insertError.message);
      process.exit(1);
    }

    console.log(`\n✅ Successfully added ${insertedParks?.length || 0} parks!\n`);

    // Show summary
    console.log('📋 Added Parks:');
    console.log('─────────────────────────────────────────────────────────────');
    insertedParks?.forEach((park) => {
      console.log(
        `  ✅ ${park.name} (${park.state || 'N/A'}) - (${park.latitude}, ${park.longitude})`
      );
    });
    console.log();

    // Verify total count
    const { count } = await supabase.from(TABLE_NAME).select('*', { count: 'exact', head: true });
    console.log(`📊 Total parks in database: ${count}`);
    console.log('\n🎉 Complete! All missing parks have been added.\n');
  } catch (error) {
    console.error('\n❌ Failed to add parks:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
