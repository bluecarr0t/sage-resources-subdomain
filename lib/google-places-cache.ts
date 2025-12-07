/**
 * Google Places API caching - Google Terms of Service Compliant
 * 
 * Per Google's Terms of Service:
 * - Place IDs can be stored permanently (allowed)
 * - Coordinates can be cached for up to 30 consecutive calendar days (allowed)
 * - Other data (ratings, reviews, descriptions, website URIs, phone numbers) 
 *   CANNOT be cached (must fetch fresh each time)
 * 
 * Strategy:
 * 1. Check database for stored placeId first (permanent storage - allowed)
 * 2. Cache placeId lookups in memory (permanent - no expiration)
 * 3. Always fetch fresh Place Details (ratings, photos, etc.) - never cache this response
 * 
 * This reduces API calls by reusing placeIds while ensuring all data is fresh.
 */

import { createServerClient } from './supabase';
import { fetchGooglePlacesData, type GooglePlacesData } from './google-places';

// In-memory cache for place ID lookups (property name -> placeId)
// Place IDs can be stored permanently per Google Terms (no expiration)
const placeIdCache = new Map<string, string | null>();

// Maximum cache size to prevent memory leaks
const MAX_CACHE_SIZE = 10000;

/**
 * Normalize cache key by trimming whitespace and lowercasing
 */
function normalizeCacheKey(
  propertyName: string,
  city?: string | null,
  state?: string | null,
  address?: string | null
): string {
  const parts = [
    propertyName?.trim().toLowerCase() || '',
    city?.trim().toLowerCase() || '',
    state?.trim().toLowerCase() || '',
    address?.trim().toLowerCase() || '',
  ];
  
  return `places:${parts.join(':')}`;
}

/**
 * Clean up cache if it gets too large
 */
function cleanupCache(): void {
  if (placeIdCache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries (simple FIFO approach)
    const entries = Array.from(placeIdCache.entries());
    const toRemove = entries.slice(0, placeIdCache.size - MAX_CACHE_SIZE);
    for (const [key] of toRemove) {
      placeIdCache.delete(key);
    }
  }
}

/**
 * Get place ID from database if available
 * Place IDs can be stored permanently per Google Terms
 */
async function getPlaceIdFromDatabase(
  propertyName: string,
  city?: string | null,
  state?: string | null
): Promise<string | null> {
  try {
    const supabase = createServerClient();
    
    let query = supabase
      .from('sage-glamping-data')
      .select('google_place_id')
      .eq('property_name', propertyName.trim());
    
    if (city) {
      query = query.eq('city', city.trim());
    }
    
    if (state) {
      query = query.eq('state', state.trim());
    }
    
    const { data, error } = await query.limit(1);
    
    if (error) {
      // Not an error - just no match found
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Return first non-null place_id found
    const placeId = data.find((row: any) => row.google_place_id)?.google_place_id;
    return placeId || null;
  } catch (error) {
    console.error('Error fetching place ID from database:', error);
    return null;
  }
}

/**
 * Fetch Google Places data with compliant caching
 * 
 * Caching Strategy (Google Terms Compliant):
 * - Place IDs: Cached permanently (in database + memory) ✅ Allowed
 * - All other data: ALWAYS fetched fresh (never cached) ✅ Compliant
 * 
 * This ensures we only cache what Google allows while minimizing API calls
 * by reusing stored placeIds to skip the Text Search call.
 */
export async function fetchGooglePlacesDataCached(
  propertyName: string,
  city?: string | null,
  state?: string | null,
  address?: string | null
): Promise<GooglePlacesData | null> {
  const cacheKey = normalizeCacheKey(propertyName, city, state, address);
  
  // Periodic cleanup (every 100 requests)
  if (placeIdCache.size > 0 && placeIdCache.size % 100 === 0) {
    cleanupCache();
  }
  
  // Step 1: Check database for placeId first (permanent storage - allowed)
  let placeId: string | null = await getPlaceIdFromDatabase(propertyName, city, state);
  
  // Step 2: Check in-memory placeId cache (permanent - no expiration)
  if (!placeId) {
    placeId = placeIdCache.get(cacheKey) || null;
  }
  
  // Step 3: Fetch Google Places data
  // - If placeId exists: Skip Text Search, go directly to Place Details (saves 1 API call)
  // - If no placeId: Search for it, then get Place Details (2 API calls)
  // - Place Details ALWAYS fetches fresh data (never cached) ✅ Compliant
  const result = await fetchGooglePlacesData(propertyName, city, state, address, placeId);
  
  // Step 4: Cache the placeId if we got a new one (permanent storage - allowed)
  if (result && result.placeId && !placeId) {
    placeIdCache.set(cacheKey, result.placeId);
    
    // TODO: Store placeId in database for permanent persistence
    // This would require property ID or identifier to update the correct record
  }
  
  return result;
}

/**
 * Clear the cache (useful for testing or manual cache invalidation)
 */
export function clearGooglePlacesCache(): void {
  placeIdCache.clear();
}

/**
 * Get cache statistics (useful for monitoring)
 */
export function getCacheStats(): {
  placeIdCacheSize: number;
  placeIdKeys: string[];
} {
  return {
    placeIdCacheSize: placeIdCache.size,
    placeIdKeys: Array.from(placeIdCache.keys()),
  };
}
