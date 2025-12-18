/**
 * Test script to verify Redis caching is working
 * Run with: tsx scripts/test-redis-cache.ts
 */
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { getCache, setCache, deleteCache, isRedisConnected } from '../lib/redis';

async function testRedisCache() {
  console.log('🧪 Testing Redis Cache Connection...\n');

  // Test 1: Check if Redis is connected
  console.log('Test 1: Checking Redis connection status...');
  const isConnected = isRedisConnected();
  console.log(`   Redis connected: ${isConnected ? '✅ Yes' : '❌ No'}\n`);

  // Test 2: Try to set a test value
  console.log('Test 2: Setting a test cache value...');
  const testKey = 'test:redis-connection';
  const testValue = { message: 'Hello from Redis!', timestamp: new Date().toISOString() };
  
  try {
    const setResult = await setCache(testKey, testValue, 60); // 60 second TTL
    console.log(`   Set cache result: ${setResult ? '✅ Success' : '❌ Failed'}\n`);
  } catch (error) {
    console.log(`   Set cache error: ❌ ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test 3: Try to get the test value
  console.log('Test 3: Retrieving test cache value...');
  try {
    const cachedValue = await getCache<typeof testValue>(testKey);
    if (cachedValue) {
      console.log(`   ✅ Cache hit! Retrieved: ${JSON.stringify(cachedValue)}\n`);
    } else {
      console.log(`   ❌ Cache miss - value not found\n`);
    }
  } catch (error) {
    console.log(`   Get cache error: ❌ ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test 4: Test property statistics cache
  console.log('Test 4: Testing property-statistics cache key...');
  try {
    const statsCache = await getCache('property-statistics');
    if (statsCache) {
      console.log(`   ✅ Found cached statistics:`, statsCache);
    } else {
      console.log(`   ℹ️  No cached statistics found (this is normal on first run)\n`);
    }
  } catch (error) {
    console.log(`   Error checking statistics cache: ❌ ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test 5: Clean up test key
  console.log('Test 5: Cleaning up test key...');
  try {
    await deleteCache(testKey);
    console.log(`   ✅ Test key deleted\n`);
  } catch (error) {
    console.log(`   Error deleting test key: ❌ ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  console.log('✨ Redis cache test complete!');
  console.log('\n💡 Note: If Redis is not configured, the app will gracefully fall back to direct database queries.');
}

testRedisCache().catch(console.error);
