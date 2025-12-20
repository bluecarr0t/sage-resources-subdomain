# Redis Production Debug Summary

**Date:** January 2025  
**Status:** Debugging tools deployed  
**Issue:** Redis cache not working in production, no logs visible

## Changes Deployed

### 1. Enhanced Logging ✅
- Added detailed Redis connection logging
- All logs prefixed with `[Redis]` or `[Cache]` for easy filtering
- Changed `console.log` to `console.warn` so logs appear in production
- Logs environment variable presence (without exposing values)
- Logs connection attempts and results
- Enhanced error logging with detailed information

### 2. Debug Endpoint ✅
- Created `/api/debug-redis` endpoint
- Shows environment variable configuration
- Tests Redis connection
- Tests cache read/write operations
- Returns connection status and metrics

### 3. Improved Cache Logging ✅
- Logs successful cache operations
- Logs cache failures with error details
- Shows cache key (truncated for security)

## Next Steps to Diagnose

### Step 1: Wait for Deployment (2-5 minutes)
The changes have been pushed and are deploying to production.

### Step 2: Check Debug Endpoint

Visit: `https://resources.sageoutdooradvisory.com/api/debug-redis`

**What to look for:**

✅ **Good signs:**
```json
{
  "redisConfig": {
    "hasRedisHost": true,
    "hasRedisPort": true,
    "hasRedisPassword": true
  },
  "connectionStatus": {
    "isConnected": true
  },
  "cacheTest": {
    "result": "success - cache read/write working"
  }
}
```

❌ **Problem signs:**
```json
{
  "redisConfig": {
    "hasRedisHost": false,  // Variables not being read
    "hasRedisPort": false
  },
  "connectionStatus": {
    "isConnected": false
  }
}
```

### Step 3: Check Vercel Logs

After deployment, make a request to:
```
https://resources.sageoutdooradvisory.com/api/properties?country=United+States&country=Canada&fields=id,property_name,lat,lon
```

Then check Vercel logs and filter for:
- `[Redis]` - Redis connection logs
- `[Cache]` - Cache operation logs

**Expected logs if working:**
```
[Redis] Environment check: { hasRedisHost: true, ... }
[Redis] Attempting to connect...
[Redis] Client connecting...
[Redis] Client ready - connection established
[Cache] Successfully cached properties with key: properties:...
```

**Expected logs if not working:**
```
[Redis] Environment check: { hasRedisHost: false, ... }
[Redis] Not configured - falling back to direct database queries
```

OR

```
[Redis] Failed to create Redis client: [error details]
```

### Step 4: Common Issues and Fixes

#### Issue 1: Environment Variables Not Being Read

**Symptom:** Debug endpoint shows `hasRedisHost: false`

**Fix:**
1. Vercel Dashboard → Settings → Environment Variables
2. Verify all variables are set for **Production** (not just Preview)
3. Check variable names for typos
4. Redeploy after adding/changing variables

#### Issue 2: Connection Failing

**Symptom:** Debug endpoint shows `isConnected: false` or connection errors in logs

**Possible causes:**
- Redis provider IP whitelist blocking Vercel
- Incorrect credentials
- Redis database inactive
- Network/firewall issues

**Fix:**
- Check Redis Cloud/Upstash dashboard
- Verify database is active
- Check IP whitelist (may need to allow all IPs or Vercel IP ranges)
- Verify credentials match exactly

#### Issue 3: Cache Set Failing

**Symptom:** Connection works but cache still shows MISS

**Check logs for:**
```
[Cache] Failed to cache properties: [error]
```

**Possible causes:**
- Redis write permissions
- Connection timing out during write
- Payload too large (shouldn't be with compression)

## Testing After Fix

Once you see logs indicating Redis is working:

1. **Test cache:**
   ```bash
   BASE_URL=https://resources.sageoutdooradvisory.com npx tsx scripts/test-redis-connection-production.ts
   ```

2. **Expected results:**
   - Request 1: MISS (populates cache)
   - Request 2: HIT ✅
   - Request 3: HIT ✅

## Important Notes

1. **Logs now visible:** Changed `console.log` to `console.warn` so they appear in Vercel production logs
2. **Debug endpoint:** Available at `/api/debug-redis` - use this to quickly check configuration
3. **Security:** Debug endpoint doesn't expose sensitive values (passwords, etc.)
4. **Remove debug endpoint:** Consider removing or protecting `/api/debug-redis` after debugging

## What to Share

After checking the debug endpoint and logs, share:
1. Debug endpoint JSON output
2. Any `[Redis]` or `[Cache]` log messages from Vercel
3. Whether environment variables show as present in debug endpoint

This will help identify the exact issue.
