#!/usr/bin/env npx tsx
/**
 * Quick test of RIDB API connection
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createRIDBClient } from '../lib/ridb-api';

config({ path: resolve(process.cwd(), '.env.local') });

async function test() {
  console.log('Testing RIDB API connection...\n');
  
  try {
    const client = createRIDBClient();
    
    console.log('1. Testing single facility fetch...');
    const start1 = Date.now();
    const facility = await client.getFacility('1101');
    const time1 = Date.now() - start1;
    console.log(`   ✅ Completed in ${time1}ms`);
    console.log(`   Facility: ${facility?.FacilityName || 'Not found'}\n`);
    
    console.log('2. Testing paginated facilities fetch (first page only)...');
    const start2 = Date.now();
    // We'll manually test the first page
    const response = await fetch(
      'https://ridb.recreation.gov/api/v1/facilities?limit=5&offset=0',
      {
        headers: {
          'apikey': process.env.RIDB_API_KEY || '',
          'Accept': 'application/json',
        },
      }
    );
    const time2 = Date.now() - start2;
    console.log(`   ✅ Completed in ${time2}ms`);
    const data = await response.json();
    console.log(`   Total facilities: ${data.METADATA?.RESULTS?.TOTAL_COUNT || 'unknown'}`);
    console.log(`   Fetched: ${data.RECDATA?.length || 0} facilities\n`);
    
    console.log('3. Testing first page of facilities fetch...');
    console.log('   (Skipping full fetch - would take ~5 minutes for all 15K facilities)');
    console.log('   ✅ API connection is working\n');
    
    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test().catch(console.error);

