/**
 * Performance test script for the map page API endpoint
 * Tests: https://resources.sageoutdooradvisory.com/en/map?country=United+States&country=Canada
 * 
 * Run with: tsx scripts/test-map-page-performance.ts
 * Or with custom URL: BASE_URL=https://resources.sageoutdooradvisory.com tsx scripts/test-map-page-performance.ts
 */

import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

interface PerformanceResult {
  responseTime: number;
  payloadSize: number;
  cacheStatus: string | null;
  statusCode: number;
  propertyCount: number;
  success: boolean;
  error?: string;
}

interface TestStats {
  total: number;
  successful: number;
  failed: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  responseTimes: number[];
  payloadSizes: number[];
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  avgPayloadSize: number;
  minPayloadSize: number;
  maxPayloadSize: number;
  totalPayloadSize: number;
}

function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

async function testApiEndpoint(
  baseUrl: string,
  testName: string,
  params: URLSearchParams
): Promise<PerformanceResult> {
  const startTime = Date.now();
  const url = `${baseUrl}/api/properties?${params.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const responseTime = Date.now() - startTime;
    const statusCode = response.status;
    const cacheStatus = response.headers.get('X-Cache-Status');
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        responseTime,
        payloadSize: 0,
        cacheStatus,
        statusCode,
        propertyCount: 0,
        success: false,
        error: `HTTP ${statusCode}: ${errorText.substring(0, 100)}`,
      };
    }
    
    const data = await response.json();
    const payloadSize = JSON.stringify(data).length;
    
    return {
      responseTime,
      payloadSize,
      cacheStatus,
      statusCode,
      propertyCount: data.count || (Array.isArray(data.data) ? data.data.length : 0),
      success: data.success === true,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      responseTime,
      payloadSize: 0,
      cacheStatus: null,
      statusCode: 0,
      propertyCount: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function calculateStats(results: PerformanceResult[]): TestStats {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const cacheHits = results.filter(r => r.cacheStatus === 'HIT').length;
  const cacheMisses = results.filter(r => r.cacheStatus === 'MISS').length;
  
  const responseTimes = successful.map(r => r.responseTime).sort((a, b) => a - b);
  const payloadSizes = successful.map(r => r.payloadSize).sort((a, b) => a - b);
  
  const totalPayloadSize = successful.reduce((sum, r) => sum + r.payloadSize, 0);
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    cacheHits,
    cacheMisses,
    hitRate: results.length > 0 ? (cacheHits / results.length) * 100 : 0,
    responseTimes,
    payloadSizes,
    avgResponseTime: responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0,
    minResponseTime: responseTimes.length > 0 ? responseTimes[0] : 0,
    maxResponseTime: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
    p50ResponseTime: calculatePercentile(responseTimes, 50),
    p95ResponseTime: calculatePercentile(responseTimes, 95),
    p99ResponseTime: calculatePercentile(responseTimes, 99),
    avgPayloadSize: payloadSizes.length > 0
      ? payloadSizes.reduce((a, b) => a + b, 0) / payloadSizes.length
      : 0,
    minPayloadSize: payloadSizes.length > 0 ? payloadSizes[0] : 0,
    maxPayloadSize: payloadSizes.length > 0 ? payloadSizes[payloadSizes.length - 1] : 0,
    totalPayloadSize,
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function runPerformanceTests() {
  const baseUrl = process.env.BASE_URL || 'https://resources.sageoutdooradvisory.com';
  const testIterations = parseInt(process.env.TEST_ITERATIONS || '10', 10);
  const warmupIterations = parseInt(process.env.WARMUP_ITERATIONS || '2', 10);
  
  console.log('🚀 Map Page Performance Test Suite\n');
  console.log('='.repeat(70));
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Test Iterations: ${testIterations}`);
  console.log(`Warmup Iterations: ${warmupIterations}`);
  console.log('='.repeat(70) + '\n');
  
  // Build query parameters matching the map page
  const params = new URLSearchParams();
  params.append('country', 'United States');
  params.append('country', 'Canada');
  params.append('fields', 'id,property_name,lat,lon,state,country,unit_type,rate_category');
  
  console.log('📋 Test Configuration:');
  console.log(`   Endpoint: /api/properties`);
  console.log(`   Parameters: ${params.toString()}`);
  console.log(`   Field Selection: Enabled (minimal fields for map markers)\n`);
  
  // Warmup requests (to populate cache)
  console.log('🔥 Warmup Phase (populating cache)...');
  const warmupResults: PerformanceResult[] = [];
  for (let i = 0; i < warmupIterations; i++) {
    process.stdout.write(`   Warmup ${i + 1}/${warmupIterations}... `);
    const result = await testApiEndpoint(baseUrl, `warmup-${i + 1}`, params);
    warmupResults.push(result);
    if (result.success) {
      console.log(`✅ ${formatTime(result.responseTime)} (${result.cacheStatus || 'N/A'})`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    // Small delay between warmup requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const warmupStats = calculateStats(warmupResults);
  console.log(`\n   Warmup Complete: ${warmupStats.cacheHits} hits, ${warmupStats.cacheMisses} misses\n`);
  
  // Main test phase
  console.log('📊 Main Test Phase...\n');
  const testResults: PerformanceResult[] = [];
  
  for (let i = 0; i < testIterations; i++) {
    process.stdout.write(`   Test ${i + 1}/${testIterations}... `);
    const result = await testApiEndpoint(baseUrl, `test-${i + 1}`, params);
    testResults.push(result);
    
    if (result.success) {
      const cacheIcon = result.cacheStatus === 'HIT' ? '✅' : '🔄';
      console.log(
        `${cacheIcon} ${formatTime(result.responseTime)} | ` +
        `${formatBytes(result.payloadSize)} | ` +
        `${result.propertyCount} properties | ` +
        `Cache: ${result.cacheStatus || 'N/A'}`
      );
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    
    // Small delay between requests
    if (i < testIterations - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  // Calculate statistics
  const stats = calculateStats(testResults);
  
  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('📈 Performance Statistics\n');
  
  console.log('Request Summary:');
  console.log(`   Total Requests: ${stats.total}`);
  console.log(`   Successful: ${stats.successful} ✅`);
  console.log(`   Failed: ${stats.failed} ${stats.failed > 0 ? '❌' : ''}`);
  console.log(`   Cache Hits: ${stats.cacheHits} ✅`);
  console.log(`   Cache Misses: ${stats.cacheMisses} 🔄`);
  console.log(`   Hit Rate: ${stats.hitRate.toFixed(2)}%\n`);
  
  if (stats.successful > 0) {
    console.log('Response Time Statistics:');
    console.log(`   Average: ${formatTime(stats.avgResponseTime)}`);
    console.log(`   Minimum: ${formatTime(stats.minResponseTime)}`);
    console.log(`   Maximum: ${formatTime(stats.maxResponseTime)}`);
    console.log(`   P50 (Median): ${formatTime(stats.p50ResponseTime)}`);
    console.log(`   P95: ${formatTime(stats.p95ResponseTime)}`);
    console.log(`   P99: ${formatTime(stats.p99ResponseTime)}\n`);
    
    // Cache hit vs miss comparison
    const hitResults = testResults.filter(r => r.success && r.cacheStatus === 'HIT');
    const missResults = testResults.filter(r => r.success && r.cacheStatus === 'MISS');
    
    if (hitResults.length > 0) {
      const hitTimes = hitResults.map(r => r.responseTime);
      const avgHitTime = hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length;
      console.log('Cache Hit Performance:');
      console.log(`   Average: ${formatTime(avgHitTime)}`);
      console.log(`   Count: ${hitResults.length}\n`);
    }
    
    if (missResults.length > 0) {
      const missTimes = missResults.map(r => r.responseTime);
      const avgMissTime = missTimes.reduce((a, b) => a + b, 0) / missTimes.length;
      console.log('Cache Miss Performance:');
      console.log(`   Average: ${formatTime(avgMissTime)}`);
      console.log(`   Count: ${missResults.length}\n`);
      
      if (hitResults.length > 0) {
        const improvement = ((avgMissTime - avgHitTime) / avgMissTime) * 100;
        console.log(`   Performance Improvement: ${improvement.toFixed(1)}% faster with cache ✅\n`);
      }
    }
    
    console.log('Payload Size Statistics:');
    console.log(`   Average: ${formatBytes(stats.avgPayloadSize)}`);
    console.log(`   Minimum: ${formatBytes(stats.minPayloadSize)}`);
    console.log(`   Maximum: ${formatBytes(stats.maxPayloadSize)}`);
    console.log(`   Total Transferred: ${formatBytes(stats.totalPayloadSize)}\n`);
    
    // Performance assessment
    console.log('Performance Assessment:');
    const isGood = stats.avgResponseTime < 500;
    const isExcellent = stats.avgResponseTime < 200;
    
    if (isExcellent) {
      console.log(`   ✅ Excellent: Average response time < 200ms`);
    } else if (isGood) {
      console.log(`   ✅ Good: Average response time < 500ms`);
    } else {
      console.log(`   ⚠️  Needs Improvement: Average response time > 500ms`);
    }
    
    if (stats.hitRate > 80) {
      console.log(`   ✅ Excellent: Cache hit rate > 80%`);
    } else if (stats.hitRate > 50) {
      console.log(`   ✅ Good: Cache hit rate > 50%`);
    } else {
      console.log(`   ⚠️  Low: Cache hit rate < 50%`);
    }
    
    const payloadMB = stats.avgPayloadSize / (1024 * 1024);
    if (payloadMB < 0.5) {
      console.log(`   ✅ Excellent: Payload size < 0.5 MB`);
    } else if (payloadMB < 2) {
      console.log(`   ✅ Good: Payload size < 2 MB`);
    } else {
      console.log(`   ⚠️  Large: Payload size > 2 MB`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (stats.failed === 0 && stats.successful > 0) {
    console.log('🎉 Performance test completed successfully!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Performance test completed with some failures.\n');
    process.exit(1);
  }
}

// Run tests
runPerformanceTests().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
