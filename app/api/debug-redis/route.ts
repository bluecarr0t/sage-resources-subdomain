/**
 * Debug endpoint to check Redis configuration and connection
 * This endpoint helps diagnose Redis setup issues in production
 * 
 * Access: GET /api/debug-redis
 * 
 * Note: Remove or protect this endpoint in production after debugging
 */

import { NextResponse } from 'next/server';
import { isRedisConnected, getCacheMetrics } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check environment variables (without exposing sensitive values)
    const envCheck = {
      hasRedisUrl: !!process.env.REDIS_URL,
      hasRedisHost: !!process.env.REDIS_HOST,
      hasRedisPort: !!process.env.REDIS_PORT,
      hasRedisPassword: !!process.env.REDIS_PASSWORD,
      hasRedisUsername: !!process.env.REDIS_USERNAME,
      redisHost: process.env.REDIS_HOST ? `${process.env.REDIS_HOST.substring(0, 10)}...` : 'not set',
      redisPort: process.env.REDIS_PORT || 'not set',
      redisUsername: process.env.REDIS_USERNAME || 'default (fallback)',
      environment: process.env.NODE_ENV,
    };

    // Check Redis connection status
    const isConnected = isRedisConnected();

    // Get cache metrics
    const metrics = getCacheMetrics();

    // Try a simple cache operation to test connection
    let cacheTestResult = 'not tested';
    try {
      const testKey = 'debug:test-connection';
      const { setCache, getCache } = await import('@/lib/redis');
      
      // Try to set a test value
      const setResult = await setCache(testKey, { test: true, timestamp: Date.now() }, 10);
      if (setResult) {
        // Try to get it back
        const getResult = await getCache(testKey);
        if (getResult) {
          cacheTestResult = 'success - cache read/write working';
        } else {
          cacheTestResult = 'set succeeded but get failed';
        }
      } else {
        cacheTestResult = 'set failed - Redis not available';
      }
    } catch (error) {
      cacheTestResult = `error: ${error instanceof Error ? error.message : String(error)}`;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      },
      redisConfig: envCheck,
      connectionStatus: {
        isConnected,
        message: isConnected ? 'Redis is connected' : 'Redis is not connected',
      },
      cacheTest: {
        result: cacheTestResult,
      },
      metrics: {
        totalRequests: metrics.totalRequests,
        hits: metrics.hits,
        misses: metrics.misses,
        hitRate: metrics.hitRate,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
