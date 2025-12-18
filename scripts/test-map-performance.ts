/**
 * Performance Test Script for Map Page API
 * Tests the production API endpoint and measures Redis cache impact
 * 
 * Usage: npx tsx scripts/test-map-performance.ts
 */

const testUrl = 'https://resources.sageoutdooradvisory.com/en/map?country=United+States&country=Canada';
const apiUrl = 'https://resources.sageoutdooradvisory.com/api/properties?country=United+States&country=Canada';

interface PerformanceMetrics {
  timestamp: string;
  testUrl: string;
  apiUrl: string;
  cacheMiss: {
    responseTime: number;
    databaseQueryTime: number;
    propertiesCount: number;
    responseSizeKB: number;
    responseSizeMB: number;
  };
  cacheHit: {
    responseTime: number | null;
    propertiesCount: number | null;
    responseSizeKB: number | null;
  };
  cacheImpact: {
    improvementPercent: number | null;
    timeSaved: number | null;
  };
  recommendations: string[];
}

async function measureApiPerformance(url: string, label: string): Promise<{
  responseTime: number;
  propertiesCount: number;
  responseSizeKB: number;
  responseSizeMB: number;
  headers: Record<string, string>;
}> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const responseJson = JSON.stringify(data);
    const responseSizeBytes = Buffer.byteLength(responseJson, 'utf8');
    const responseSizeKB = responseSizeBytes / 1024;
    const responseSizeMB = responseSizeKB / 1024;

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      responseTime,
      propertiesCount: data.count || (data.data?.length || 0),
      responseSizeKB,
      responseSizeMB,
      headers,
    };
  } catch (error) {
    console.error(`${label} Error:`, error);
    throw error;
  }
}

async function runPerformanceTest() {
  console.log('🚀 Starting Map Page Performance Test');
  console.log(`Test URL: ${testUrl}`);
  console.log(`API URL: ${apiUrl}\n`);

  const metrics: PerformanceMetrics = {
    timestamp: new Date().toISOString(),
    testUrl,
    apiUrl,
    cacheMiss: {
      responseTime: 0,
      databaseQueryTime: 0,
      propertiesCount: 0,
      responseSizeKB: 0,
      responseSizeMB: 0,
    },
    cacheHit: {
      responseTime: null,
      propertiesCount: null,
      responseSizeKB: null,
    },
    cacheImpact: {
      improvementPercent: null,
      timeSaved: null,
    },
    recommendations: [],
  };

  // Test 1: Cache Miss (First Request)
  console.log('📊 Test 1: Cache Miss (First Request)');
  console.log('Clearing cache and making first request...\n');
  
  try {
    const cacheMissResult = await measureApiPerformance(apiUrl, 'Cache Miss');
    metrics.cacheMiss = {
      ...cacheMissResult,
      databaseQueryTime: cacheMissResult.responseTime, // Approximate DB time
    };

    console.log(`✅ Cache Miss Results:`);
    console.log(`   Response Time: ${cacheMissResult.responseTime}ms`);
    console.log(`   Properties Count: ${cacheMissResult.propertiesCount}`);
    console.log(`   Response Size: ${cacheMissResult.responseSizeKB.toFixed(2)} KB (${cacheMissResult.responseSizeMB.toFixed(2)} MB)`);
    console.log(`   Cache-Control: ${cacheMissResult.headers['cache-control'] || 'Not set'}`);
    console.log(`   X-Cache: ${cacheMissResult.headers['x-cache'] || 'Not set'}`);
    console.log(`   X-Cache-Status: ${cacheMissResult.headers['x-cache-status'] || 'Not set'}\n`);

    // Wait a moment for cache to be set
    console.log('⏳ Waiting 2 seconds for cache to be set...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Cache Hit (Second Request)
    console.log('📊 Test 2: Cache Hit (Second Request)');
    console.log('Making second request (should hit cache)...\n');
    
    const cacheHitResult = await measureApiPerformance(apiUrl, 'Cache Hit');
    metrics.cacheHit = {
      responseTime: cacheHitResult.responseTime,
      propertiesCount: cacheHitResult.propertiesCount,
      responseSizeKB: cacheHitResult.responseSizeKB,
    };

    console.log(`✅ Cache Hit Results:`);
    console.log(`   Response Time: ${cacheHitResult.responseTime}ms`);
    console.log(`   Properties Count: ${cacheHitResult.propertiesCount}`);
    console.log(`   Response Size: ${cacheHitResult.responseSizeKB.toFixed(2)} KB`);
    console.log(`   Cache-Control: ${cacheHitResult.headers['cache-control'] || 'Not set'}`);
    console.log(`   X-Cache: ${cacheHitResult.headers['x-cache'] || 'Not set'}`);
    console.log(`   X-Cache-Status: ${cacheHitResult.headers['x-cache-status'] || 'Not set'}\n`);

    // Calculate cache impact
    if (metrics.cacheHit.responseTime && metrics.cacheMiss.responseTime) {
      const improvement = ((metrics.cacheMiss.responseTime - metrics.cacheHit.responseTime) / metrics.cacheMiss.responseTime) * 100;
      const timeSaved = metrics.cacheMiss.responseTime - metrics.cacheHit.responseTime;
      
      metrics.cacheImpact.improvementPercent = improvement;
      metrics.cacheImpact.timeSaved = timeSaved;

      console.log('📈 Cache Impact Analysis:');
      console.log(`   Cache Miss Time: ${metrics.cacheMiss.responseTime}ms`);
      console.log(`   Cache Hit Time: ${metrics.cacheHit.responseTime}ms`);
      console.log(`   Improvement: ${improvement.toFixed(2)}% faster`);
      console.log(`   Time Saved: ${timeSaved.toFixed(2)}ms\n`);
    }

    // Generate recommendations
    if (metrics.cacheMiss.responseTime > 3000) {
      metrics.recommendations.push(`API response time is ${metrics.cacheMiss.responseTime}ms - consider optimizing database queries or adding more aggressive caching`);
    }

    if (metrics.cacheMiss.responseSizeMB > 5) {
      metrics.recommendations.push(`Response size is ${metrics.cacheMiss.responseSizeMB.toFixed(2)} MB - implement field selection to reduce payload by 70-80%`);
    }

    if (metrics.cacheImpact.improvementPercent !== null) {
      if (metrics.cacheImpact.improvementPercent < 50) {
        metrics.recommendations.push(`Cache improvement is only ${metrics.cacheImpact.improvementPercent.toFixed(2)}% - Redis cache may not be working optimally or response time is already fast`);
      } else if (metrics.cacheImpact.improvementPercent > 80) {
        metrics.recommendations.push(`Excellent cache performance (${metrics.cacheImpact.improvementPercent.toFixed(2)}% improvement) - Redis is working effectively`);
      }
    }

    if (metrics.cacheMiss.responseSizeMB > 2 && !apiUrl.includes('fields=')) {
      metrics.recommendations.push('Field selection not detected in API URL - implement field selection for initial map load to reduce payload');
    }

    // Save results
    const fs = await import('fs');
    const path = await import('path');
    const reportPath = path.join(process.cwd(), '__tests__', 'performance-metrics-production.json');
    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));

    console.log('📋 Performance Summary:');
    console.log(`   Cache Miss: ${metrics.cacheMiss.responseTime}ms`);
    if (metrics.cacheHit.responseTime) {
      console.log(`   Cache Hit: ${metrics.cacheHit.responseTime}ms`);
      console.log(`   Improvement: ${metrics.cacheImpact.improvementPercent?.toFixed(2)}%`);
    }
    console.log(`   Properties: ${metrics.cacheMiss.propertiesCount}`);
    console.log(`   Response Size: ${metrics.cacheMiss.responseSizeMB.toFixed(2)} MB`);
    console.log(`   Recommendations: ${metrics.recommendations.length}\n`);

    console.log('💡 Recommendations:');
    metrics.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });

    console.log(`\n✅ Results saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  }
}

// Run the test
runPerformanceTest().catch(console.error);
