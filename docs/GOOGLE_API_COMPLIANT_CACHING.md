# Google Places API Compliant Caching Implementation

**Date:** December 2025  
**Status:** ✅ Complete

## Overview

This implementation ensures full compliance with Google Places API Terms of Service while optimizing API usage and costs.

## Google Terms of Service Compliance

Per Google's Terms of Service:

### ✅ Allowed to Cache:

1. **Place IDs** - Can be stored permanently
   - Place IDs are unique identifiers returned in API responses
   - Can be stored in database indefinitely

2. **Coordinates (lat/lng)** - Can be cached for up to 30 consecutive calendar days
   - Coordinates obtained from Places API can be temporarily cached
   - Must delete after 30 days
   - Note: We already store coordinates in database from other sources, so this is handled separately

### ❌ NOT Allowed to Cache:

- Business names
- Addresses  
- Phone numbers
- Ratings and review counts
- Reviews
- Descriptions/summaries
- Website URLs

These must be fetched fresh from the API each time.

## Implementation Details

### 1. Database Schema Changes

**New Column Added:**
- `google_place_id` (TEXT) - Stores Place ID permanently (allowed by Google Terms)

**SQL Migration:**
- See: `scripts/add-google-place-id-column.sql`

### 2. Caching Strategy

**File:** `lib/google-places-cache.ts`

**What's Cached:**
- ✅ Place IDs only (permanent - no expiration)
  - Checked in database first
  - Cached in memory for faster lookups
  - No expiration (permanent storage allowed)

**What's NOT Cached:**
- ❌ Ratings, review counts
- ❌ Photos
- ❌ Descriptions
- ❌ Website URIs
- ❌ Phone numbers

All of these are fetched fresh from the API each time.

### 3. Fetch Flow

```
1. Check database for stored placeId → If found, use it
2. Check memory cache for placeId → If found, use it
3. If no placeId: Make Text Search API call to get placeId
4. Cache placeId (permanent - allowed)
5. ALWAYS fetch fresh Place Details (ratings, photos, etc.) - never cache
```

### 4. API Call Optimization

**Before (Non-Compliant):**
- Each property page: 2 API calls (Search + Details)
- Cached entire response for 24 hours ❌ (violates Google Terms)

**After (Compliant):**
- First time: 2 API calls (Search + Details)
- Subsequent times: 1 API call (Details only - skips Search if placeId cached)
- All data fetched fresh ✅ (compliant with Google Terms)

**Benefits:**
- ✅ 50% reduction in API calls (when placeId is cached)
- ✅ Full compliance with Google Terms
- ✅ Always fresh data (ratings, photos, etc.)

## Files Modified

1. **`scripts/add-google-place-id-column.sql`** - NEW
   - Adds `google_place_id` column to database

2. **`lib/types/sage.ts`**
   - Added `google_place_id: string | null` field

3. **`lib/google-places.ts`**
   - Updated `fetchGooglePlacesData()` to accept optional `placeId` parameter
   - Updated `getPlaceDetails()` to include rating/userRatingCount in response
   - If placeId provided, skips Text Search call

4. **`lib/google-places-cache.ts`** - REFACTORED
   - Only caches placeId (permanent)
   - Checks database for placeId first
   - Always fetches fresh Place Details
   - Removed caching of restricted data

## Usage

The implementation is transparent - existing code continues to work:

```typescript
// Property page automatically uses compliant caching
const googlePlacesData = await fetchGooglePlacesDataCached(
  propertyName,
  city,
  state,
  address
);
```

The function:
1. Checks database for stored placeId
2. Uses cached placeId if available (saves 1 API call)
3. Always fetches fresh data for ratings, photos, etc.

## Next Steps (Optional Enhancements)

1. **Populate google_place_id Column:**
   - Create a script to fetch and store placeIds for all properties
   - This would maximize the caching benefit

2. **Store placeId When Found:**
   - Update the cache to automatically store placeId in database
   - Requires property ID/identifier to update correct record

## Compliance Verification

✅ Place IDs cached permanently (allowed)  
✅ All other data fetched fresh (compliant)  
✅ No caching of restricted data (ratings, reviews, etc.)  
✅ Coordinates already stored in database (separate from API)

## Cost Impact

- **Immediate:** 50% reduction in API calls (when placeId cached)
- **Long-term:** Significant savings as more placeIds are stored
- **Compliance:** Zero risk of violating Google Terms

## Testing

To verify compliance:
1. Check that only placeIds are cached (no ratings, photos, etc.)
2. Verify Place Details are always fetched fresh
3. Confirm database lookup works correctly
