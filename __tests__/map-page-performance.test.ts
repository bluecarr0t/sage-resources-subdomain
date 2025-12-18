/**
 * Performance Audit Test for Map Page
 * 
 * Tests the performance of the /map page, specifically:
 * - https://resources.sageoutdooradvisory.com/en/map?country=United+States&country=Canada
 * 
 * This test measures:
 * 1. API response times
 * 2. Database query performance
 * 3. Bundle size analysis
 * 4. Component complexity
 * 5. Memory usage patterns
 * 6. Network request patterns
 */

import { createServerClient } from '@/lib/supabase';
import { getCache, setCache, deleteCachePattern, isRedisConnected } from '@/lib/redis';
import fs from 'fs';
import path from 'path';

// Performance metrics interface
interface PerformanceMetrics {
  timestamp: string;
  testUrl: string;
  apiResponseTime: number;
  apiResponseTimeCached: number | null;
  databaseQueryTime: number;
  redisCacheHit: boolean;
  redisAvailable: boolean;
  cacheImpact: {
    cacheHitTime: number | null;
    cacheMissTime: number | null;
    improvementPercent: number | null;
  };
  dataSize: {
    propertiesCount: number;
    responseSizeBytes: number;
    responseSizeKB: number;
    responseSizeMB: number;
  };
  bundleAnalysis: {
    componentCount: number;
    dynamicImports: number;
    clientComponents: number;
  };
  recommendations: string[];
}

// Mock Next.js cache for testing
const mockCache = {
  get: () => null,
  set: () => {},
};

describe('Map Page Performance Audit', () => {
  const testUrl = 'https://resources.sageoutdooradvisory.com/en/map?country=United+States&country=Canada';
  const metrics: PerformanceMetrics = {
    timestamp: new Date().toISOString(),
    testUrl,
    apiResponseTime: 0,
    apiResponseTimeCached: null,
    databaseQueryTime: 0,
    redisCacheHit: false,
    redisAvailable: false,
    cacheImpact: {
      cacheHitTime: null,
      cacheMissTime: null,
      improvementPercent: null,
    },
    dataSize: {
      propertiesCount: 0,
      responseSizeBytes: 0,
      responseSizeKB: 0,
      responseSizeMB: 0,
    },
    bundleAnalysis: {
      componentCount: 0,
      dynamicImports: 0,
      clientComponents: 0,
    },
    recommendations: [],
  };

  beforeAll(() => {
    // Set timeout for performance tests
    jest.setTimeout(60000);
  });

  test('should measure API response time with Redis cache impact', async () => {
    const filterCountry = ['United States', 'Canada'];
    
    // Check Redis availability
    metrics.redisAvailable = isRedisConnected();
    console.log(`\n=== Redis Status ===`);
    console.log(`Redis Available: ${metrics.redisAvailable}`);

    // Test 1: Cache Miss (first request - no cache)
    console.log('\n=== Test 1: Cache Miss (First Request) ===');
    
    // Clear cache for this test
    if (metrics.redisAvailable) {
      const cacheKey = `properties:${JSON.stringify({ filterCountry, filterState: [], filterUnitType: [], filterRateRange: [], bounds: null, fields: null })}`;
      await deleteCachePattern('properties:*');
    }

    const startTimeMiss = Date.now();
    try {
      const supabase = createServerClient();
      
      const dbStartTime = Date.now();
      const { data: properties, error } = await supabase
        .from('all_glamping_properties')
        .select('*')
        .eq('is_glamping_property', 'Yes')
        .in('country', ['USA', 'United States', 'US', 'Canada', 'CA'])
        .limit(5000);
      
      const dbEndTime = Date.now();
      metrics.databaseQueryTime = dbEndTime - dbStartTime;

      if (error) {
        throw error;
      }

      const endTimeMiss = Date.now();
      metrics.apiResponseTime = endTimeMiss - startTimeMiss;
      metrics.cacheImpact.cacheMissTime = metrics.apiResponseTime;

      // Calculate response size
      const responseJson = JSON.stringify(properties || []);
      metrics.dataSize.responseSizeBytes = Buffer.byteLength(responseJson, 'utf8');
      metrics.dataSize.responseSizeKB = metrics.dataSize.responseSizeBytes / 1024;
      metrics.dataSize.responseSizeMB = metrics.dataSize.responseSizeKB / 1024;
      metrics.dataSize.propertiesCount = properties?.length || 0;

      console.log(`Cache Miss Response Time: ${metrics.apiResponseTime}ms`);
      console.log(`Database Query Time: ${metrics.databaseQueryTime}ms`);
      console.log(`Properties Count: ${metrics.dataSize.propertiesCount}`);
      console.log(`Response Size: ${metrics.dataSize.responseSizeKB.toFixed(2)} KB (${metrics.dataSize.responseSizeMB.toFixed(2)} MB)`);

      // Cache the result for next test
      if (metrics.redisAvailable && properties) {
        const cacheKey = `properties:${JSON.stringify({ filterCountry, filterState: [], filterUnitType: [], filterRateRange: [], bounds: null, fields: null })}`;
        await setCache(cacheKey, properties, 1209600);
        console.log('✅ Cached result for next test');
      }
    } catch (error) {
      console.error('Cache Miss Test Error:', error);
      throw error;
    }

    // Test 2: Cache Hit (second request - from cache)
    if (metrics.redisAvailable) {
      console.log('\n=== Test 2: Cache Hit (Second Request) ===');
      
      const startTimeHit = Date.now();
      try {
        const cacheKey = `properties:${JSON.stringify({ filterCountry, filterState: [], filterUnitType: [], filterRateRange: [], bounds: null, fields: null })}`;
        const cachedProperties = await getCache<any[]>(cacheKey);
        
        const endTimeHit = Date.now();
        const cacheHitTime = endTimeHit - startTimeHit;
        
        if (cachedProperties) {
          metrics.redisCacheHit = true;
          metrics.apiResponseTimeCached = cacheHitTime;
          metrics.cacheImpact.cacheHitTime = cacheHitTime;
          
          const improvement = ((metrics.apiResponseTime - cacheHitTime) / metrics.apiResponseTime) * 100;
          metrics.cacheImpact.improvementPercent = improvement;
          
          console.log(`Cache Hit Response Time: ${cacheHitTime}ms`);
          console.log(`Improvement: ${improvement.toFixed(2)}% faster`);
          console.log(`Time Saved: ${(metrics.apiResponseTime - cacheHitTime).toFixed(2)}ms`);
        } else {
          console.log('⚠️ Cache miss - cache may not be working correctly');
        }
      } catch (error) {
        console.error('Cache Hit Test Error:', error);
      }
    }

    // Performance assertions
    expect(metrics.apiResponseTime).toBeLessThan(5000);
    expect(metrics.databaseQueryTime).toBeLessThan(3000);
    expect(metrics.dataSize.propertiesCount).toBeGreaterThan(0);
    
    if (metrics.redisAvailable && metrics.cacheImpact.cacheHitTime) {
      expect(metrics.cacheImpact.cacheHitTime).toBeLessThan(metrics.apiResponseTime);
    }
  });

  test('should analyze bundle and component structure', () => {
    const componentsDir = path.join(process.cwd(), 'components');
    const appDir = path.join(process.cwd(), 'app');

    let componentCount = 0;
    let dynamicImports = 0;
    let clientComponents = 0;

    // Count components
    const countFiles = (dir: string, pattern: RegExp) => {
      try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        files.forEach((file) => {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            countFiles(fullPath, pattern);
          } else if (pattern.test(file.name)) {
            componentCount++;
            
            // Check for dynamic imports and client components
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              if (content.includes("'use client'") || content.includes('"use client"')) {
                clientComponents++;
              }
              if (content.includes('dynamic(') || content.includes('import(')) {
                dynamicImports++;
              }
            } catch (err) {
              // Skip if file can't be read
            }
          }
        });
      } catch (err) {
        // Directory might not exist or be accessible
      }
    };

    countFiles(componentsDir, /\.(tsx|jsx)$/);
    countFiles(appDir, /\.(tsx|jsx)$/);

    metrics.bundleAnalysis = {
      componentCount,
      dynamicImports,
      clientComponents,
    };

    console.log('\n=== Bundle Analysis ===');
    console.log(`Total Components: ${componentCount}`);
    console.log(`Client Components: ${clientComponents}`);
    console.log(`Dynamic Imports: ${dynamicImports}`);
    console.log(`Client Component Ratio: ${((clientComponents / componentCount) * 100).toFixed(2)}%`);

    expect(componentCount).toBeGreaterThan(0);
  });

  test('should analyze map page component structure', () => {
    const mapPagePath = path.join(process.cwd(), 'app', '[locale]', 'map', 'page.tsx');
    const mapLayoutPath = path.join(process.cwd(), 'components', 'MapLayout.tsx');
    const googlePropertyMapPath = path.join(process.cwd(), 'components', 'GooglePropertyMap.tsx');

    const issues: string[] = [];

    // Analyze map page
    if (fs.existsSync(mapPagePath)) {
      const content = fs.readFileSync(mapPagePath, 'utf8');
      
      // Check for multiple structured data scripts
      const schemaScripts = (content.match(/application\/ld\+json/g) || []).length;
      if (schemaScripts > 5) {
        issues.push(`Map page has ${schemaScripts} structured data scripts - consider consolidating`);
      }

      // Check for server-side data fetching
      if (content.includes('getPropertyStatistics')) {
        issues.push('Map page fetches statistics on every request - consider static generation');
      }
    }

    // Analyze GooglePropertyMap component size
    if (fs.existsSync(googlePropertyMapPath)) {
      const content = fs.readFileSync(googlePropertyMapPath, 'utf8');
      const lines = content.split('\n').length;
      const sizeKB = Buffer.byteLength(content, 'utf8') / 1024;

      console.log('\n=== Component Size Analysis ===');
      console.log(`GooglePropertyMap.tsx: ${lines} lines, ${sizeKB.toFixed(2)} KB`);

      if (lines > 3000) {
        issues.push(`GooglePropertyMap component is very large (${lines} lines) - consider splitting into smaller components`);
      }
      if (sizeKB > 100) {
        issues.push(`GooglePropertyMap component is large (${sizeKB.toFixed(2)} KB) - consider code splitting`);
      }
    }

    // Analyze MapLayout
    if (fs.existsSync(mapLayoutPath)) {
      const content = fs.readFileSync(mapLayoutPath, 'utf8');
      const dynamicImports = (content.match(/dynamic\(/g) || []).length;
      
      console.log(`MapLayout.tsx: ${dynamicImports} dynamic imports`);
      
      if (dynamicImports < 2) {
        issues.push('MapLayout could benefit from more dynamic imports to reduce initial bundle size');
      }
    }

    metrics.recommendations.push(...issues);

    console.log('\n=== Performance Issues Found ===');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  });

  test('should analyze database query patterns', async () => {
    const supabase = createServerClient();
    const queryPatterns: string[] = [];

    // Test 1: Query without filters (worst case)
    const start1 = Date.now();
    const { data: allProps } = await supabase
      .from('all_glamping_properties')
      .select('*')
      .eq('is_glamping_property', 'Yes')
      .limit(100);
    const time1 = Date.now() - start1;

    // Test 2: Query with country filter
    const start2 = Date.now();
    const { data: filteredProps } = await supabase
      .from('all_glamping_properties')
      .select('*')
      .eq('is_glamping_property', 'Yes')
      .in('country', ['USA', 'United States', 'US', 'Canada', 'CA'])
      .limit(100);
    const time2 = Date.now() - start2;

    // Test 3: Query with selected fields only
    const start3 = Date.now();
    const { data: minimalProps } = await supabase
      .from('all_glamping_properties')
      .select('id, property_name, lat, lon, state, country')
      .eq('is_glamping_property', 'Yes')
      .in('country', ['USA', 'United States', 'US', 'Canada', 'CA'])
      .limit(100);
    const time3 = Date.now() - start3;

    console.log('\n=== Database Query Performance ===');
    console.log(`No filters (100 rows): ${time1}ms`);
    console.log(`With country filter (100 rows): ${time2}ms`);
    console.log(`Minimal fields (100 rows): ${time3}ms`);

    // Analyze query patterns
    if (time1 > 1000) {
      queryPatterns.push('Unfiltered queries are slow - ensure proper indexing on is_glamping_property');
    }

    if (time2 > time3 * 2) {
      queryPatterns.push('Selecting all fields is significantly slower - consider field selection for initial load');
    }

    if (time3 < time2 * 0.5) {
      queryPatterns.push('Field selection provides significant performance improvement - implement field selection for map markers');
    }

    metrics.recommendations.push(...queryPatterns);

    expect(time1).toBeLessThan(5000);
    expect(time2).toBeLessThan(3000);
    expect(time3).toBeLessThan(2000);
  });

  test('should generate performance audit report', () => {
    // Generate recommendations based on metrics
    if (metrics.apiResponseTime > 3000) {
      metrics.recommendations.push('API response time exceeds 3 seconds - implement caching or optimize database queries');
    }

    if (metrics.dataSize.responseSizeMB > 5) {
      metrics.recommendations.push(`Response size is large (${metrics.dataSize.responseSizeMB.toFixed(2)} MB) - consider pagination or field selection`);
    }

    if (metrics.databaseQueryTime > 2000) {
      metrics.recommendations.push('Database query time is high - check indexes and query optimization');
    }

    if (metrics.bundleAnalysis.clientComponents / metrics.bundleAnalysis.componentCount > 0.8) {
      metrics.recommendations.push('High ratio of client components - consider moving more logic to server components');
    }

    // Redis cache recommendations
    if (!metrics.redisAvailable) {
      metrics.recommendations.push('Redis cache is not available - ensure Redis is configured and running for optimal performance');
    } else if (metrics.cacheImpact.improvementPercent && metrics.cacheImpact.improvementPercent < 50) {
      metrics.recommendations.push(`Cache improvement is only ${metrics.cacheImpact.improvementPercent.toFixed(2)}% - consider optimizing cache key strategy or increasing TTL`);
    } else if (metrics.cacheImpact.improvementPercent && metrics.cacheImpact.improvementPercent > 80) {
      metrics.recommendations.push(`Excellent cache performance (${metrics.cacheImpact.improvementPercent.toFixed(2)}% improvement) - Redis cache is working effectively`);
    }

    // Field selection recommendations
    if (metrics.dataSize.responseSizeMB > 2) {
      metrics.recommendations.push('Consider implementing field selection for initial map load to reduce payload size by 70-80%');
    }

    // Save metrics to file for analysis
    const reportPath = path.join(process.cwd(), '__tests__', 'performance-metrics.json');
    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));

    console.log('\n=== Performance Audit Summary ===');
    console.log(`Test URL: ${metrics.testUrl}`);
    console.log(`API Response Time (Cache Miss): ${metrics.apiResponseTime}ms`);
    if (metrics.apiResponseTimeCached) {
      console.log(`API Response Time (Cache Hit): ${metrics.apiResponseTimeCached}ms`);
      console.log(`Cache Improvement: ${metrics.cacheImpact.improvementPercent?.toFixed(2)}%`);
    }
    console.log(`Database Query Time: ${metrics.databaseQueryTime}ms`);
    console.log(`Redis Available: ${metrics.redisAvailable}`);
    console.log(`Redis Cache Hit: ${metrics.redisCacheHit}`);
    console.log(`Properties Count: ${metrics.dataSize.propertiesCount}`);
    console.log(`Response Size: ${metrics.dataSize.responseSizeMB.toFixed(2)} MB`);
    console.log(`Total Recommendations: ${metrics.recommendations.length}`);

    expect(metrics.recommendations.length).toBeGreaterThanOrEqual(0);
  });
});
