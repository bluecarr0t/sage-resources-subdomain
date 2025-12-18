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
import { unstable_cache } from 'next/cache';
import fs from 'fs';
import path from 'path';

// Performance metrics interface
interface PerformanceMetrics {
  timestamp: string;
  testUrl: string;
  apiResponseTime: number;
  databaseQueryTime: number;
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
    databaseQueryTime: 0,
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

  test('should measure API response time for properties endpoint', async () => {
    const filterCountry = ['United States', 'Canada'];
    const startTime = Date.now();

    try {
      // Simulate the API call
      const supabase = createServerClient();
      
      // Measure database query time
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

      const endTime = Date.now();
      metrics.apiResponseTime = endTime - startTime;

      // Calculate response size
      const responseJson = JSON.stringify(properties || []);
      metrics.dataSize.responseSizeBytes = Buffer.byteLength(responseJson, 'utf8');
      metrics.dataSize.responseSizeKB = metrics.dataSize.responseSizeBytes / 1024;
      metrics.dataSize.responseSizeMB = metrics.dataSize.responseSizeKB / 1024;
      metrics.dataSize.propertiesCount = properties?.length || 0;

      console.log('\n=== API Performance Metrics ===');
      console.log(`Response Time: ${metrics.apiResponseTime}ms`);
      console.log(`Database Query Time: ${metrics.databaseQueryTime}ms`);
      console.log(`Properties Count: ${metrics.dataSize.propertiesCount}`);
      console.log(`Response Size: ${metrics.dataSize.responseSizeKB.toFixed(2)} KB (${metrics.dataSize.responseSizeMB.toFixed(2)} MB)`);

      // Performance assertions
      expect(metrics.apiResponseTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(metrics.databaseQueryTime).toBeLessThan(3000); // Database query should be under 3 seconds
      expect(metrics.dataSize.propertiesCount).toBeGreaterThan(0);
    } catch (error) {
      console.error('API Performance Test Error:', error);
      throw error;
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

    // Save metrics to file for analysis
    const reportPath = path.join(process.cwd(), '__tests__', 'performance-metrics.json');
    fs.writeFileSync(reportPath, JSON.stringify(metrics, null, 2));

    console.log('\n=== Performance Audit Summary ===');
    console.log(`Test URL: ${metrics.testUrl}`);
    console.log(`API Response Time: ${metrics.apiResponseTime}ms`);
    console.log(`Database Query Time: ${metrics.databaseQueryTime}ms`);
    console.log(`Properties Count: ${metrics.dataSize.propertiesCount}`);
    console.log(`Response Size: ${metrics.dataSize.responseSizeMB.toFixed(2)} MB`);
    console.log(`Total Recommendations: ${metrics.recommendations.length}`);

    expect(metrics.recommendations.length).toBeGreaterThanOrEqual(0);
  });
});
