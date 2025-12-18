/**
 * Utility to revalidate the properties cache
 * Call this function after adding new properties to the database
 * 
 * Usage:
 * import { revalidatePropertiesCache } from '@/lib/revalidate-properties-cache';
 * await revalidatePropertiesCache();
 */
import { revalidateTag } from 'next/cache';
import { deleteCache, deleteCachePattern } from '@/lib/redis';

/**
 * Revalidate the properties cache
 * This will invalidate all cached property data, forcing fresh fetches on next request
 * 
 * Note: This function must be called from a Server Action or API route
 * It cannot be called from client components
 */
export async function revalidatePropertiesCache() {
  try {
    // Clear Redis cache for property statistics
    await deleteCache('property-statistics');
    
    // Clear all property filter caches using pattern matching
    const deletedCount = await deleteCachePattern('properties:*');
    
    // Also revalidate Next.js cache tag for any remaining Next.js cache
    revalidateTag('properties');
    
    console.log(`Properties cache revalidated successfully. Cleared ${deletedCount} Redis cache entries.`);
    return { success: true, redisKeysDeleted: deletedCount };
  } catch (error) {
    console.error('Error revalidating properties cache:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Clear a specific cache key from Redis
 * @param key Cache key to clear (e.g., 'property-statistics' or a specific properties filter key)
 */
export async function clearCacheKey(key: string) {
  try {
    const deleted = await deleteCache(key);
    if (deleted) {
      console.log(`Cache key '${key}' cleared successfully`);
    }
    return { success: deleted };
  } catch (error) {
    console.error(`Error clearing cache key '${key}':`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
