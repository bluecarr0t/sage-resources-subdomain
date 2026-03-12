# Vercel Redis Setup Checklist

**Date:** January 2025  
**Status:** Environment variables added to Vercel

## Environment Variables Added

✅ `REDIS_HOST` - Redis hostname  
✅ `REDIS_PORT` - Redis port  
✅ `REDIS_PASSWORD` - Redis password  
⚠️ `REDIS_USERNAME` - Optional (defaults to 'default' if not set)

## Important: Redeploy Required

**After adding environment variables in Vercel, you MUST redeploy for them to take effect.**

### How to Redeploy:

1. **Automatic Redeploy (Recommended):**
   - Make a small change to trigger a new deployment
   - Or use Vercel's "Redeploy" button

2. **Manual Redeploy:**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click the "..." menu on the latest deployment
   - Select "Redeploy"

3. **Trigger via Git:**
   - Make any commit and push to trigger automatic deployment

## Verification Steps

### Step 1: Verify Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Verify these are set for **Production** environment:
   - `REDIS_HOST` ✅
   - `REDIS_PORT` ✅
   - `REDIS_PASSWORD` ✅
   - `REDIS_USERNAME` (optional, defaults to 'default')

### Step 2: Check Vercel Logs

After redeploying, check Vercel logs for:

**Success indicators:**
```
Redis client connecting...
Redis client ready
```

**Error indicators:**
```
Redis not configured - falling back to direct database queries
Failed to create Redis client: [error]
Redis client error: [error]
```

### Step 3: Test Cache

Run the performance test:
```bash
BASE_URL=https://resources.sageoutdooradvisory.com npx tsx scripts/test-redis-connection-production.ts
```

**Expected after fix:**
- Request 1: MISS (populates cache)
- Request 2: HIT (serves from cache)
- Request 3: HIT (serves from cache)

## Common Issues

### Issue 1: Variables Not Applied

**Symptom:** Still seeing cache MISS after redeploy

**Solution:**
- Verify variables are set for **Production** environment (not just Preview/Development)
- Ensure you clicked "Save" after adding variables
- Redeploy after adding variables

### Issue 2: REDIS_USERNAME Needed

**Symptom:** Connection fails even with HOST, PORT, PASSWORD

**Solution:**
- Add `REDIS_USERNAME=default` to Vercel environment variables
- Most Redis Cloud instances use 'default' as username
- Redeploy after adding

### Issue 3: IP Whitelist

**Symptom:** Connection timeout or refused

**Solution:**
- Check Redis Cloud/Upstash dashboard
- Add Vercel IP ranges to whitelist (if required by your Redis provider)
- Some providers allow all IPs by default

### Issue 4: Connection String Format

**Alternative:** Use `REDIS_URL` instead of separate variables:
```
REDIS_URL=redis://default:password@host:port
```

## Next Steps

1. ✅ **Redeploy** - Trigger a new deployment in Vercel
2. ✅ **Check Logs** - Verify Redis connection in Vercel logs
3. ✅ **Test Cache** - Run performance test to verify cache hits
4. ✅ **Monitor** - Watch for cache HIT responses

## Expected Results After Fix

Once Redis is working:

- **Cache Hit Rate:** >80% after warmup
- **Response Times:**
  - Cache MISS: ~30-40ms (current)
  - Cache HIT: <20ms (expected improvement)
- **Cache Headers:** `X-Cache-Status: HIT` on cached requests

## Quick Test

After redeploying, run:
```bash
BASE_URL=https://resources.sageoutdooradvisory.com npx tsx scripts/test-redis-connection-production.ts
```

This will show if cache is working (should see HIT on request 2 or 3).
