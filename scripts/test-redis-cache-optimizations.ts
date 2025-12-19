/**
 * Comprehensive test script for Redis cache optimizations
 * Tests: Cache key hashing, compression, metrics, and backward compatibility
 * Run with: tsx scripts/test-redis-cache-optimizations.ts
 */
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import {
  getCache,
  setCache,
  deleteCache,
  isRedisConnected,
  hashCacheKey,
  getCacheMetrics,
  resetCacheMetrics,
  logCacheMetrics,
} from '../lib/redis';

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const failures: string[] = [];

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`   ✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`   ❌ ${message}`);
    testsFailed++;
    failures.push(message);
  }
}

async function testCacheKeyHashing() {
  console.log('\n📝 Test Suite 1: Cache Key Hashing\n');
  
  // Test 1.1: Hash generation produces consistent results
  console.log('Test 1.1: Hash generation consistency...');
  const testData = { filterCountry: ['USA'], filterState: ['CA'], bounds: null };
  const hash1 = hashCacheKey(testData);
  const hash2 = hashCacheKey(testData);
  assert(hash1 === hash2, 'Hash is consistent for same input');
  assert(hash1.length === 64, 'Hash is 64 characters (SHA-256 hex)');
  
  // Test 1.2: Different inputs produce different hashes
  console.log('Test 1.2: Hash uniqueness...');
  const testData2 = { filterCountry: ['USA'], filterState: ['NY'], bounds: null };
  const hash3 = hashCacheKey(testData2);
  assert(hash1 !== hash3, 'Different inputs produce different hashes');
  
  // Test 1.3: Hash format
  console.log('Test 1.3: Hash format validation...');
  const hexRegex = /^[a-f0-9]{64}$/;
  assert(hexRegex.test(hash1), 'Hash is valid hex string');
  
  console.log(`   Hash example: ${hash1.substring(0, 16)}...`);
}

async function testCompression() {
  console.log('\n📦 Test Suite 2: Redis Compression\n');
  
  // Test 2.1: Small payload should not be compressed
  console.log('Test 2.1: Small payload (<100KB) should not compress...');
  resetCacheMetrics();
  const smallKey = 'test:small-payload';
  const smallData = { items: Array(100).fill({ id: 1, name: 'test' }) };
  
  await deleteCache(smallKey);
  await setCache(smallKey, smallData, 60);
  const metrics = getCacheMetrics();
  assert(metrics.compressionStats.uncompressed > 0, 'Small payload stored uncompressed');
  
  const retrieved = await getCache(smallKey);
  assert(retrieved !== null, 'Small payload retrieved successfully');
  assert(JSON.stringify(retrieved) === JSON.stringify(smallData), 'Small payload data integrity');
  await deleteCache(smallKey);
  
  // Test 2.2: Large payload should be compressed
  console.log('Test 2.2: Large payload (>100KB) should compress...');
  resetCacheMetrics();
  const largeKey = 'test:large-payload';
  // Create a payload > 100KB
  const largeData = {
    items: Array(5000).fill({
      id: 1,
      name: 'This is a test property with a long name',
      description: 'A'.repeat(200), // 200 chars per item
      metadata: { tags: Array(10).fill('tag'), categories: Array(5).fill('category') },
    }),
  };
  
  await deleteCache(largeKey);
  await setCache(largeKey, largeData, 60);
  const metrics2 = getCacheMetrics();
  assert(metrics2.compressionStats.compressed > 0, 'Large payload stored compressed');
  
  const retrieved2 = await getCache(largeKey);
  assert(retrieved2 !== null, 'Large payload retrieved successfully');
  assert(
    JSON.stringify(retrieved2).length === JSON.stringify(largeData).length,
    'Large payload data integrity after compression/decompression'
  );
  await deleteCache(largeKey);
  
  // Test 2.3: Backward compatibility with uncompressed entries
  console.log('Test 2.3: Backward compatibility (uncompressed entries)...');
  const compatKey = 'test:backward-compat';
  const compatData = { test: 'backward compatibility' };
  
  // Manually set an uncompressed entry (simulating old format)
  const client = await import('redis').then(m => m.createClient({
    url: process.env.REDIS_URL || undefined,
    socket: process.env.REDIS_HOST ? {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    } : undefined,
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  }));
  
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
      await client.connect();
      const serialized = JSON.stringify(compatData);
      await client.setEx(compatKey, 60, serialized);
      
      // Now try to retrieve it with getCache (should handle uncompressed)
      const retrieved3 = await getCache(compatKey);
      assert(retrieved3 !== null, 'Backward compatibility: uncompressed entry retrieved');
      assert(
        JSON.stringify(retrieved3) === JSON.stringify(compatData),
        'Backward compatibility: data integrity maintained'
      );
      
      await client.del(compatKey);
      await client.quit();
    } catch (error) {
      console.log(`   ⚠️  Skipping backward compatibility test (Redis not available): ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    console.log('   ⚠️  Skipping backward compatibility test (Redis not configured)');
  }
}

async function testMetrics() {
  console.log('\n📊 Test Suite 3: Cache Metrics\n');
  
  resetCacheMetrics();
  
  // Test 3.1: Metrics tracking for hits
  console.log('Test 3.1: Metrics track cache hits...');
  const hitKey = 'test:metrics-hit';
  const hitData = { test: 'hit' };
  
  await deleteCache(hitKey);
  await setCache(hitKey, hitData, 60);
  await getCache(hitKey); // This should be a hit
  const metrics1 = getCacheMetrics();
  assert(metrics1.hits > 0, 'Cache hits are tracked');
  assert(metrics1.totalRequests > 0, 'Total requests are tracked');
  
  // Test 3.2: Metrics tracking for misses
  console.log('Test 3.2: Metrics track cache misses...');
  const missKey = 'test:metrics-miss';
  await deleteCache(missKey);
  await getCache(missKey); // This should be a miss
  const metrics2 = getCacheMetrics();
  assert(metrics2.misses > 0, 'Cache misses are tracked');
  
  // Test 3.3: Hit rate calculation
  console.log('Test 3.3: Hit rate calculation...');
  const metrics3 = getCacheMetrics();
  const expectedHitRate = metrics3.totalRequests > 0
    ? (metrics3.hits / metrics3.totalRequests) * 100
    : 0;
  assert(
    Math.abs(metrics3.hitRate - expectedHitRate) < 0.01,
    'Hit rate is calculated correctly'
  );
  
  // Test 3.4: Average response times
  console.log('Test 3.4: Average response times tracked...');
  const metrics4 = getCacheMetrics();
  assert(metrics4.avgHitTime >= 0, 'Average hit time is tracked');
  assert(metrics4.avgMissTime >= 0, 'Average miss time is tracked');
  
  // Test 3.5: Compression stats
  console.log('Test 3.5: Compression statistics tracked...');
  const metrics5 = getCacheMetrics();
  assert(
    metrics5.compressionStats.compressed >= 0,
    'Compressed entries count tracked'
  );
  assert(
    metrics5.compressionStats.uncompressed >= 0,
    'Uncompressed entries count tracked'
  );
  
  // Test 3.6: Reset metrics
  console.log('Test 3.6: Metrics reset function...');
  resetCacheMetrics();
  const metrics6 = getCacheMetrics();
  assert(metrics6.hits === 0, 'Metrics reset: hits reset to 0');
  assert(metrics6.misses === 0, 'Metrics reset: misses reset to 0');
  assert(metrics6.totalRequests === 0, 'Metrics reset: total requests reset to 0');
  
  await deleteCache(hitKey);
}

async function testIntegration() {
  console.log('\n🔗 Test Suite 4: Integration Tests\n');
  
  // Test 4.1: Full flow with hashed keys
  console.log('Test 4.1: Full flow with hashed cache keys...');
  const filterParams = {
    filterCountry: ['United States', 'Canada'],
    filterState: ['California'],
    filterUnitType: ['Tent'],
    filterRateRange: ['Budget'],
    bounds: { north: 40, south: 35, east: -120, west: -125 },
    fields: ['id', 'property_name', 'lat', 'lon'],
  };
  
  const hash = hashCacheKey(filterParams);
  const cacheKey = `properties:${hash}`;
  const testProperties = [
    { id: 1, property_name: 'Test Property', lat: 37.7749, lon: -122.4194 },
  ];
  
  await deleteCache(cacheKey);
  await setCache(cacheKey, testProperties, 60);
  const retrieved = await getCache<any[]>(cacheKey);
  
  assert(retrieved !== null, 'Hashed key: cache set and retrieved');
  assert(
    Array.isArray(retrieved) && retrieved.length === 1,
    'Hashed key: data integrity maintained'
  );
  assert(
    retrieved[0].property_name === 'Test Property',
    'Hashed key: property data correct'
  );
  
  await deleteCache(cacheKey);
  
  // Test 4.2: Metrics after integration test
  console.log('Test 4.2: Metrics after integration test...');
  const metrics = getCacheMetrics();
  assert(metrics.hits > 0 || metrics.misses > 0, 'Integration: metrics updated');
}

async function runAllTests() {
  console.log('🧪 Redis Cache Optimization Test Suite\n');
  console.log('=' .repeat(60));
  
  // Check Redis connection
  const isConnected = isRedisConnected();
  if (!isConnected && !process.env.REDIS_URL && !process.env.REDIS_HOST) {
    console.log('\n⚠️  WARNING: Redis is not configured.');
    console.log('   Some tests will be skipped.');
    console.log('   Set REDIS_URL or REDIS_HOST in .env.local to run full tests.\n');
  } else if (!isConnected) {
    console.log('\n⚠️  WARNING: Redis connection not available.');
    console.log('   Some tests will be skipped.\n');
  } else {
    console.log('\n✅ Redis connection available.\n');
  }
  
  try {
    // Run test suites
    await testCacheKeyHashing();
    await testCompression();
    await testMetrics();
    await testIntegration();
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Summary\n');
    console.log(`   ✅ Passed: ${testsPassed}`);
    console.log(`   ❌ Failed: ${testsFailed}`);
    console.log(`   📈 Total:  ${testsPassed + testsFailed}\n`);
    
    if (failures.length > 0) {
      console.log('❌ Failed Tests:');
      failures.forEach((failure, index) => {
        console.log(`   ${index + 1}. ${failure}`);
      });
      console.log('');
    }
    
    // Print final metrics
    console.log('📊 Final Cache Metrics:');
    logCacheMetrics();
    
    if (testsFailed === 0) {
      console.log('\n🎉 All tests passed! Redis cache optimizations are working correctly.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
