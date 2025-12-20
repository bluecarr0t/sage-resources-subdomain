/**
 * Test script to verify Redis cache is working in the properties API
 * Makes multiple requests to check for cache hits
 */

const BASE_URL = process.env.BASE_URL || 'https://resources.sageoutdooradvisory.com';

async function testPropertiesCache() {
  console.log('Testing Properties API Cache...\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const testParams = 'country=United+States&country=Canada&fields=id,property_name,lat,lon';
  const url = `${BASE_URL}/api/properties?${testParams}`;

  console.log(`Test URL: ${url}\n`);

  // Test 1: First request (should be MISS)
  console.log('=== Test 1: First Request (Expected: MISS) ===');
  const start1 = Date.now();
  const response1 = await fetch(url);
  const time1 = Date.now() - start1;
  const cacheStatus1 = response1.headers.get('X-Cache-Status');
  const data1 = await response1.json();
  console.log(`Response time: ${time1}ms`);
  console.log(`Cache Status: ${cacheStatus1}`);
  console.log(`Properties count: ${data1.count || data1.data?.length || 0}`);
  console.log('');

  // Wait 2 seconds
  console.log('Waiting 2 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Second request (should be HIT)
  console.log('=== Test 2: Second Request (Expected: HIT) ===');
  const start2 = Date.now();
  const response2 = await fetch(url);
  const time2 = Date.now() - start2;
  const cacheStatus2 = response2.headers.get('X-Cache-Status');
  const data2 = await response2.json();
  console.log(`Response time: ${time2}ms`);
  console.log(`Cache Status: ${cacheStatus2}`);
  console.log(`Properties count: ${data2.count || data2.data?.length || 0}`);
  console.log('');

  // Test 3: Third request immediately (should be HIT)
  console.log('=== Test 3: Third Request Immediately (Expected: HIT) ===');
  const start3 = Date.now();
  const response3 = await fetch(url);
  const time3 = Date.now() - start3;
  const cacheStatus3 = response3.headers.get('X-Cache-Status');
  const data3 = await response3.json();
  console.log(`Response time: ${time3}ms`);
  console.log(`Cache Status: ${cacheStatus3}`);
  console.log(`Properties count: ${data3.count || data3.data?.length || 0}`);
  console.log('');

  // Summary
  console.log('=== Summary ===');
  console.log(`Request 1: ${cacheStatus1} (${time1}ms)`);
  console.log(`Request 2: ${cacheStatus2} (${time2}ms)`);
  console.log(`Request 3: ${cacheStatus3} (${time3}ms)`);
  console.log('');

  const hits = [cacheStatus1, cacheStatus2, cacheStatus3].filter(s => s === 'HIT').length;
  const misses = [cacheStatus1, cacheStatus2, cacheStatus3].filter(s => s === 'MISS').length;

  if (hits >= 2) {
    console.log('✅ SUCCESS: Cache is working!');
    console.log(`   Hits: ${hits}, Misses: ${misses}`);
  } else {
    console.log('❌ ISSUE: Cache is not working as expected');
    console.log(`   Hits: ${hits}, Misses: ${misses}`);
    console.log('');
    console.log('Possible issues:');
    console.log('1. Redis connection not established');
    console.log('2. Cache set operation failing silently');
    console.log('3. Cache key mismatch between requests');
    console.log('4. Check Vercel logs for [Redis] or [Cache] messages');
  }
}

testPropertiesCache().catch(console.error);
