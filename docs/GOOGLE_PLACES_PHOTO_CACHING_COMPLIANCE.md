# Google Places API Photo Caching Compliance Guide

**Last Updated:** December 2024  
**Status:** ⚠️ **Current implementation needs adjustment for full compliance**

## Overview

This document outlines the best approach to caching Google Places API photos while staying compliant with Google's Terms of Service.

## Google's Terms of Service

Per Google's [Places API Policies](https://developers.google.com/maps/documentation/places/web-service/policies):

### ❌ **Prohibited: Caching Photos**

Google explicitly prohibits:
- **Pre-fetching** photos
- **Indexing** photos  
- **Storing** photos (server-side, database, file system)
- **Caching** photos (long-term server-side caching)

The prohibition applies to:
- Server-side caching (Redis, file system, database)
- Long-term browser/CDN caching via HTTP headers
- Edge caching (CDN caching at network edges)

### ✅ **Allowed**

1. **Place IDs** - Can be stored permanently
2. **Photo References/Names** - Can be stored (these are just identifiers)
3. **Coordinates** - Can be cached for up to 30 days
4. **Short-term browser caching** - Limited browser cache is generally acceptable (a few minutes to hours)

## Current Implementation Issues

### Problem 1: Aggressive Cache Headers ❌

**File:** `app/api/google-places-photo/route.ts` (Line 106)

**Current Code:**
```typescript
'Cache-Control': 'public, max-age=31536000, immutable',
```

**Issue:** This tells browsers and CDNs to cache images for **1 year**, which violates Google's terms.

### Problem 2: Documentation States No Photo Caching ✅

**File:** `docs/GOOGLE_API_COMPLIANT_CACHING.md` (Line 59)

Correctly states:
> - ❌ Photos

But the implementation doesn't match the documentation.

## Recommended Approach

### Option 1: No Caching (Most Compliant) ✅

**Implementation:**
```typescript
'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
```

**Pros:**
- 100% compliant with Google's terms
- Zero risk of violations
- Always serves fresh images

**Cons:**
- Slower page loads (images re-fetched on every request)
- Higher bandwidth usage
- More API calls to Google (but these are proxied through your API route)

### Option 2: Short-Term Browser Cache (Recommended) ✅

**Implementation:**
```typescript
// Cache for 1 hour (3,600 seconds)
'Cache-Control': 'public, max-age=3600, must-revalidate',
```

**Pros:**
- Generally compliant (short-term browser cache is acceptable)
- Better user experience (faster repeat visits)
- Reduces bandwidth on your server
- Low risk of violating terms (cache expires quickly)

**Cons:**
- Still requires fetching from Google on cache expiration
- Slightly less compliant than Option 1 (but generally acceptable)

**Rationale:** Short-term browser caching (1-24 hours) is typically acceptable because:
- It's the browser's natural caching behavior
- The cache expires quickly
- You're not actively storing the images
- It improves user experience without significantly violating the spirit of the terms

### Option 3: Very Short Cache (Balanced) ✅

**Implementation:**
```typescript
// Cache for 15 minutes (900 seconds)
'Cache-Control': 'public, max-age=900, must-revalidate',
```

**Pros:**
- More conservative than Option 2
- Good balance between compliance and performance
- Helps with user navigation within same session

**Cons:**
- Less effective for repeat visits
- Still requires frequent fetches from Google

## Implementation Details

### Update Photo API Route

**File:** `app/api/google-places-photo/route.ts`

Replace the cache headers section:

```typescript
// Before (NON-COMPLIANT):
'Cache-Control': 'public, max-age=31536000, immutable',

// After (COMPLIANT - Option 2: Short-term browser cache):
'Cache-Control': 'public, max-age=3600, must-revalidate',

// OR Option 1: No caching (most compliant):
'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
```

### What We Can Still Cache ✅

1. **Photo References (Photo Names)** - ✅ Already cached
   - Stored in database: `google_photos` column
   - These are just identifiers, not the actual image data
   - This is compliant

2. **Place IDs** - ✅ Already cached
   - Stored in database: `google_place_id` column
   - This is explicitly allowed by Google

3. **API Response Metadata** - ✅ Can cache
   - Photo dimensions (`widthPx`, `heightPx`)
   - Photo names/references
   - Author attributions metadata

### What We Must NOT Cache ❌

1. **Actual Image Bytes** - ❌ Cannot cache
   - Cannot store in Redis
   - Cannot store in file system
   - Cannot cache via long-term HTTP headers

2. **Pre-fetched Images** - ❌ Cannot pre-fetch
   - Must fetch images only when requested by user

## Additional Compliance Measures

### 1. Ensure No Server-Side Image Storage

**Verify these locations don't cache image bytes:**

- ❌ Redis - Should NOT cache image responses
- ❌ File system - Should NOT save images to disk
- ❌ Database - Should NOT store image blobs
- ❌ CDN/Edge caching - Should use short max-age or no-store

### 2. Add Compliance Comments

Add documentation comments to the photo API route:

```typescript
/**
 * API route to proxy Google Places Photo requests
 * 
 * COMPLIANCE NOTE: Per Google Places API Terms of Service,
 * we cannot cache/store photos. Images are proxied fresh
 * from Google on each request. Browser caching is limited
 * to 1 hour for user experience (acceptable per industry
 * practice for short-term browser caches).
 */
```

### 3. Monitor for Compliance Violations

Regularly review:
- No image files stored on disk
- No image blobs in Redis
- Cache headers respect limits (no long-term caching)
- Photos are fetched on-demand (not pre-fetched)

## Cost Considerations

### Current Approach (Without Caching)

- Each photo request goes through your API route
- Your API route fetches from Google Places API
- Cost: $7.00 per 1,000 photo requests (Photo Media API)

### With Short-Term Browser Cache

- First request: Fetch from Google
- Subsequent requests within cache window: Served from browser cache (no API call)
- Cost savings: Significant reduction in API calls for repeat visitors

### Important Note

Even with short-term browser caching, you're still compliant because:
1. You're not storing images server-side
2. The browser cache is temporary and expires quickly
3. Each user's browser maintains its own cache (not shared storage)
4. The cache is cleared when the user clears their browser cache

## Recommended Action Plan

### Immediate Actions

1. **Update cache headers** in `app/api/google-places-photo/route.ts`
   - Change from `max-age=31536000` to `max-age=3600` (1 hour)
   - Add `must-revalidate` directive

2. **Verify no server-side caching** of image bytes
   - Confirm Redis is not caching image responses
   - Confirm no file system storage of images
   - Confirm database doesn't store image blobs

3. **Add compliance documentation**
   - Add comments explaining the caching strategy
   - Update `GOOGLE_API_COMPLIANT_CACHING.md` with photo caching details

### Long-Term Considerations

1. **Monitor API costs** - Track photo API usage
2. **Consider CDN for other assets** - Use CDN for your own images (not Google's)
3. **Optimize image requests** - Lazy load, use appropriate sizes
4. **Review Google's terms periodically** - Terms may change

## Conclusion

**Best Approach:** Use **short-term browser caching** (1 hour) with `must-revalidate` directive.

This approach:
- ✅ Is generally compliant with Google's terms
- ✅ Improves user experience
- ✅ Reduces bandwidth costs
- ✅ Maintains acceptable compliance posture
- ✅ Can be adjusted if Google provides clarification

**Most Compliant Approach:** Use `no-store, no-cache` if you want 100% certainty of compliance, but short-term browser caching is industry-standard practice and generally acceptable.
