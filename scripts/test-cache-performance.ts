import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { getCache, setCache, deleteCache } from '../lib/redis';

async function testCachePerformance() {
  console.log('🚀 Testing Redis Cache Performance\n');

  const testKey = 'test:performance';
  const testData = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Property ${i}`,
    data: 'x'.repeat(100) // Simulate some data
  }));

  // Test 1: Set cache
  console.log('Test 1: Setting cache with 1000 items...');
  const setStart = Date.now();
  await setCache(testKey, testData, 60);
  const setTime = Date.now() - setStart;
  console.log(`   ✅ Set completed in ${setTime}ms\n`);

  // Test 2: Get from cache (should be fast)
  console.log('Test 2: Getting from cache...');
  const getStart = Date.now();
  const cached = await getCache<typeof testData>(testKey);
  const getTime = Date.now() - getStart;
  console.log(`   ✅ Retrieved ${cached?.length || 0} items in ${getTime}ms\n`);

  // Test 3: Check actual properties cache
  console.log('Test 3: Checking actual properties cache...');
  const propertiesKey = 'properties:' + JSON.stringify({
    filterCountry: ['United States', 'Canada'],
    filterState: [],
    filterUnitType: [],
    filterRateRange: [],
    bounds: null,
    fields: null
  });
  
  const getPropsStart = Date.now();
  const properties = await getCache(propertiesKey);
  const getPropsTime = Date.now() - getPropsStart;
  
  if (properties && Array.isArray(properties)) {
    console.log(`   ✅ Found ${properties.length} cached properties in ${getPropsTime}ms`);
    console.log(`   📊 Cache is working! Response time: ${getPropsTime}ms\n`);
  } else {
    console.log(`   ℹ️  No cached properties found\n`);
  }

  // Test 4: Check statistics cache
  console.log('Test 4: Checking property statistics cache...');
  const statsStart = Date.now();
  const stats = await getCache('property-statistics');
  const statsTime = Date.now() - statsStart;
  
  if (stats) {
    console.log(`   ✅ Found cached statistics in ${statsTime}ms`);
    console.log(`   Stats:`, stats);
  } else {
    console.log(`   ℹ️  No cached statistics (make a request to /map to populate it)`);
  }

  // Cleanup
  await deleteCache(testKey);
  console.log('\n✨ Performance test complete!');
}

testCachePerformance().catch(console.error);
