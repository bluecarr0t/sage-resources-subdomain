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

    // Get cache metrics
    const metrics = getCacheMetrics();

    // Try to actually connect to Redis (this will initialize the client)
    let connectionTest = {
      attempted: false,
      connected: false,
      error: null as string | null,
    };
    
    // Try a simple cache operation to test connection
    // This is the real test - if this works, Redis is functional
    let cacheTestResult = 'not tested';
    try {
      const testKey = 'debug:test-connection';
      const { setCache, getCache, getRedisClient } = await import('@/lib/redis');
      
      // First, try to get the Redis client (this will attempt connection)
      const client = await getRedisClient();
      connectionTest.attempted = true;
      connectionTest.connected = client !== null;
      
      if (!client) {
        connectionTest.error = 'getRedisClient returned null';
        cacheTestResult = 'Redis client not available';
      } else {
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
      }
    } catch (error) {
      connectionTest.error = error instanceof Error ? error.message : String(error);
      cacheTestResult = `error: ${connectionTest.error}`;
    }
    
    // Check connection status after attempting connection
    const isConnected = isRedisConnected();

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
        message: isConnected ? 'Redis is connected' : 'Redis is not connected (state check)',
        connectionTest: {
          attempted: connectionTest.attempted,
          connected: connectionTest.connected,
          error: connectionTest.error,
        },
        note: 'In serverless, isConnected may be false until client is initialized. Cache test is the real indicator.',
      },
      cacheTest: {
        result: cacheTestResult,
        isWorking: cacheTestResult === 'success - cache read/write working',
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
