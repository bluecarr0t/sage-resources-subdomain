/**
 * Test Redis connection and cache operations in production
 * Run with: BASE_URL=https://resources.sageoutdooradvisory.com npx tsx scripts/test-redis-connection-production.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function testRedisCache() {
  const baseUrl = process.env.BASE_URL || 'https://resources.sageoutdooradvisory.com';
  const apiUrl = `${baseUrl}/api/properties?country=United+States&country=Canada&fields=id,property_name,lat,lon,state,country,unit_type,rate_category`;
  
  console.log('🔍 Testing Redis Cache in Production\n');
  console.log('='.repeat(70));
  console.log(`API URL: ${apiUrl}\n`);
  
  // Test 1: First request (should be MISS)
  console.log('Test 1: First request (cache MISS expected)...');
  const start1 = Date.now();
  const response1 = await fetch(apiUrl);
  const time1 = Date.now() - start1;
  const cacheStatus1 = response1.headers.get('X-Cache-Status');
  const data1 = await response1.json();
  
  console.log(`   Response Time: ${time1}ms`);
  console.log(`   Cache Status: ${cacheStatus1 || 'N/A'}`);
  console.log(`   Properties: ${data1.count || data1.data?.length || 0}`);
  console.log(`   Success: ${data1.success ? '✅' : '❌'}\n`);
  
  // Wait a bit for cache to be set (since it's async)
  console.log('⏳ Waiting 2 seconds for cache to be set...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Second request (should be HIT if Redis is working)
  console.log('Test 2: Second request (cache HIT expected if Redis working)...');
  const start2 = Date.now();
  const response2 = await fetch(apiUrl);
  const time2 = Date.now() - start2;
  const cacheStatus2 = response2.headers.get('X-Cache-Status');
  const data2 = await response2.json();
  
  console.log(`   Response Time: ${time2}ms`);
  console.log(`   Cache Status: ${cacheStatus2 || 'N/A'}`);
  console.log(`   Properties: ${data2.count || data2.data?.length || 0}`);
  console.log(`   Success: ${data2.success ? '✅' : '❌'}\n`);
  
  // Test 3: Third request immediately after (should be HIT)
  console.log('Test 3: Third request immediately after...');
  const start3 = Date.now();
  const response3 = await fetch(apiUrl);
  const time3 = Date.now() - start3;
  const cacheStatus3 = response3.headers.get('X-Cache-Status');
  const data3 = await response3.json();
  
  console.log(`   Response Time: ${time3}ms`);
  console.log(`   Cache Status: ${cacheStatus3 || 'N/A'}`);
  console.log(`   Properties: ${data3.count || data3.data?.length || 0}`);
  console.log(`   Success: ${data3.success ? '✅' : '❌'}\n`);
  
  // Analysis
  console.log('='.repeat(70));
  console.log('📊 Analysis\n');
  
  const isCacheWorking = cacheStatus2 === 'HIT' || cacheStatus3 === 'HIT';
  const performanceImprovement = time1 > 0 ? ((time1 - Math.min(time2, time3)) / time1 * 100).toFixed(1) : '0';
  
  if (isCacheWorking) {
    console.log('✅ Redis cache is WORKING!');
    console.log(`   Cache hit detected on request ${cacheStatus2 === 'HIT' ? '2' : '3'}`);
    if (cacheStatus2 === 'HIT') {
      console.log(`   Performance improvement: ${performanceImprovement}% faster with cache`);
      console.log(`   Cache hit time: ${time2}ms vs miss time: ${time1}ms`);
    }
  } else {
    console.log('⚠️  Redis cache appears to NOT be working');
    console.log('   All requests showing MISS');
    console.log('\n   Possible issues:');
    console.log('   1. Redis environment variables not set correctly in Vercel');
    console.log('   2. Redis connection failing silently');
    console.log('   3. Cache set operation failing (check server logs)');
    console.log('   4. Cache key mismatch');
    console.log('\n   Check Vercel logs for Redis connection errors');
  }
  
  console.log('\n' + '='.repeat(70));
  
  // Summary
  console.log('\n📋 Summary:');
  console.log(`   Request 1 (MISS): ${time1}ms - ${cacheStatus1 || 'N/A'}`);
  console.log(`   Request 2: ${time2}ms - ${cacheStatus2 || 'N/A'}`);
  console.log(`   Request 3: ${time3}ms - ${cacheStatus3 || 'N/A'}`);
  
  if (isCacheWorking) {
    console.log('\n🎉 Redis cache is operational!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Redis cache needs investigation');
    process.exit(1);
  }
}

testRedisCache().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
