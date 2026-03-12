# Redis Debug Instructions

**Date:** January 2025  
**Issue:** Redis cache not working in production, no logs visible in Vercel

## Debug Endpoint Created

A new debug endpoint has been added to help diagnose Redis issues:

**URL:** `https://resources.sageoutdooradvisory.com/api/debug-redis`

## How to Use

### Step 1: Access Debug Endpoint

After the deployment completes, visit:
```
https://resources.sageoutdooradvisory.com/api/debug-redis
```

This will show:
- Environment variable presence (without exposing values)
- Redis connection status
- Cache test results
- Current cache metrics

### Step 2: Check Vercel Logs

After making a request to the properties API, check Vercel logs for:

**Look for these log messages (all prefixed with [Redis] or [Cache]):**

1. **Environment Check:**
   ```
   [Redis] Environment check: { hasRedisHost: true, hasRedisPort: true, ... }
   ```

2. **Connection Attempt:**
   ```
   [Redis] Attempting to connect...
   [Redis] Client connecting...
   [Redis] Client ready - connection established
   ```

3. **Cache Operations:**
   ```
   [Cache] Successfully cached properties with key: properties:...
   ```

4. **Errors (if any):**
   ```
   [Redis] Failed to create Redis client: [error]
   [Cache] Failed to cache properties: [error]
   ```

### Step 3: Interpret Results

#### If you see "Redis not configured":
- Environment variables are not being read
- Check Vercel → Settings → Environment Variables
- Verify variables are set for **Production** environment
- Ensure deployment completed after adding variables

#### If you see connection errors:
- Check Redis provider (Redis Cloud/Upstash) dashboard
- Verify database is active
- Check IP whitelist settings
- Verify credentials are correct

#### If you see "Client ready" but cache still MISS:
- Cache set operation might be failing
- Check for "[Cache] Failed to cache properties" errors
- Verify Redis write permissions

## Enhanced Logging

All Redis-related logs now have prefixes:
- `[Redis]` - Redis client operations
- `[Cache]` - Cache set/get operations

This makes it easier to filter logs in Vercel.

## Next Steps

1. **Deploy the changes** (just pushed)
2. **Wait for deployment** to complete (2-5 minutes)
3. **Visit debug endpoint:** `https://resources.sageoutdooradvisory.com/api/debug-redis`
4. **Make a test API request:** `https://resources.sageoutdooradvisory.com/api/properties?country=United+States&country=Canada&fields=id,property_name,lat,lon`
5. **Check Vercel logs** for `[Redis]` and `[Cache]` messages
6. **Share the debug endpoint output** and any relevant logs

## Expected Debug Endpoint Output

**If Redis is working:**
```json
{
  "success": true,
  "redisConfig": {
    "hasRedisHost": true,
    "hasRedisPort": true,
    "hasRedisPassword": true,
    ...
  },
  "connectionStatus": {
    "isConnected": true,
    "message": "Redis is connected"
  },
  "cacheTest": {
    "result": "success - cache read/write working"
  }
}
```

**If Redis is not working:**
```json
{
  "connectionStatus": {
    "isConnected": false,
    "message": "Redis is not connected"
  },
  "cacheTest": {
    "result": "set failed - Redis not available"
  }
}
```

## Security Note

The debug endpoint shows:
- ✅ Environment variable presence (safe)
- ✅ Connection status (safe)
- ❌ Does NOT show actual passwords or sensitive values
- ⚠️ Consider removing or protecting this endpoint after debugging
