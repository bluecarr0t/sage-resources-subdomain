# Redis Cache Troubleshooting Guide

**Date:** January 2025  
**Issue:** Cache showing MISS on all requests after Redis environment variables added to Vercel

## Current Status

- ✅ Redis environment variables added to Vercel
- ✅ Application redeployed
- ❌ Cache still showing MISS on all requests
- ✅ API performance excellent (32-41ms) even without cache

## Diagnostic Test Results

```
Test 1 (MISS): 127ms - Expected
Test 2 (after 2s wait): 45ms - MISS (should be HIT)
Test 3 (immediately after): 29ms - MISS (should be HIT)
```

**Conclusion:** Redis cache is not working despite environment variables being set.

## Possible Issues

### 1. Environment Variables Not Set Correctly

**Check in Vercel:**
- Go to Project Settings → Environment Variables
- Verify these variables are set for **Production** environment:
  - `REDIS_URL` (if using connection string)
  - OR `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_USERNAME`

**Common Issues:**
- Variables set only for Preview/Development, not Production
- Variable names have typos (e.g., `REDIS_URL` vs `REDIS_URI`)
- Variables not saved/committed properly

### 2. Redis Connection Failing Silently

The Redis client has graceful fallback - if connection fails, it returns `null` and logs a warning. Check Vercel logs for:

```
Redis not configured - falling back to direct database queries
Failed to create Redis client: [error message]
Redis client error: [error message]
```

**How to Check:**
1. Go to Vercel Dashboard → Your Project → Logs
2. Filter for "Redis" or "cache"
3. Look for connection errors or warnings

### 3. Cache Set Operation Failing

The cache is set asynchronously (non-blocking):
```typescript
setCache(cacheKey, properties, ttlSeconds).catch((err) => {
  console.error('Failed to cache properties:', err);
});
```

**Possible Issues:**
- Redis connection not established when `setCache` is called
- Cache set operation timing out
- Redis write permissions issue

**Check Vercel Logs For:**
```
Failed to cache properties: [error message]
```

### 4. Cache Key Mismatch

Unlikely but possible - verify the cache key is consistent:
- Key format: `properties:${hash}`
- Hash is SHA-256 of filter parameters
- Should be consistent for same parameters

## Recommended Fixes

### Fix 1: Make Cache Set Blocking (Temporary Debug)

To verify if cache is being set, temporarily make it blocking:

```typescript
// In app/api/properties/route.ts
// Change from:
setCache(cacheKey, properties, ttlSeconds).catch((err) => {
  console.error('Failed to cache properties:', err);
});

// To:
try {
  await setCache(cacheKey, properties, ttlSeconds);
  console.log('Cache set successfully for key:', cacheKey);
} catch (err) {
  console.error('Failed to cache properties:', err);
}
```

**Note:** This will slow down responses slightly but helps debug.

### Fix 2: Add Better Logging

Add logging to verify Redis connection:

```typescript
// In lib/redis.ts getRedisClient()
console.log('Redis config check:', {
  hasRedisUrl: !!process.env.REDIS_URL,
  hasRedisHost: !!process.env.REDIS_HOST,
  hasRedisPort: !!process.env.REDIS_PORT,
  hasRedisPassword: !!process.env.REDIS_PASSWORD,
});
```

### Fix 3: Verify Environment Variables

Create a test endpoint to check environment variables (remove after debugging):

```typescript
// app/api/debug-redis/route.ts (temporary)
export async function GET() {
  return NextResponse.json({
    hasRedisUrl: !!process.env.REDIS_URL,
    hasRedisHost: !!process.env.REDIS_HOST,
    hasRedisPort: !!process.env.REDIS_PORT,
    hasRedisPassword: !!process.env.REDIS_PASSWORD,
    redisUrlLength: process.env.REDIS_URL?.length || 0,
    redisHost: process.env.REDIS_HOST || 'not set',
  });
}
```

### Fix 4: Check Redis Provider

If using Redis Cloud or Upstash:
- Verify the database is active
- Check IP whitelist (Vercel IPs might need to be allowed)
- Verify credentials are correct
- Check database memory/connection limits

## Verification Steps

1. **Check Vercel Environment Variables**
   - Project Settings → Environment Variables
   - Verify Production environment has Redis variables
   - Check for typos in variable names

2. **Check Vercel Logs**
   - Look for Redis connection messages
   - Check for errors during cache operations
   - Verify environment variables are being read

3. **Test Redis Connection**
   - Use the test script: `npx tsx scripts/test-redis-cache-optimizations.ts`
   - Check if Redis client connects successfully
   - Verify cache operations work

4. **Verify Redis Provider**
   - Check Redis Cloud/Upstash dashboard
   - Verify database is active
   - Check connection limits
   - Verify IP whitelist settings

## Expected Behavior Once Fixed

Once Redis is working correctly:

1. **First Request:** MISS (populates cache)
2. **Subsequent Requests:** HIT (serves from cache)
3. **Response Times:**
   - Cache MISS: ~30-40ms (current)
   - Cache HIT: <20ms (expected improvement)

4. **Cache Headers:**
   - `X-Cache-Status: HIT` on cached requests
   - `X-Cache-Status: MISS` on first request

## Current Performance

Even without Redis cache, performance is excellent:
- ✅ Average response time: 32-41ms
- ✅ Payload size: 205KB (98.2% reduction)
- ✅ 100% success rate

Redis cache would provide:
- Additional 30-50% response time improvement
- Reduced database load
- Better scalability

## Next Steps

1. Check Vercel logs for Redis connection errors
2. Verify environment variables are set correctly
3. Test Redis connection from local environment (if possible)
4. Consider making cache set blocking temporarily for debugging
5. Check Redis provider dashboard for connection issues

## Support

If issues persist:
1. Check Vercel function logs for detailed error messages
2. Verify Redis provider (Redis Cloud/Upstash) is accessible
3. Test Redis connection using a simple test script
4. Consider using Vercel's built-in KV store as alternative
