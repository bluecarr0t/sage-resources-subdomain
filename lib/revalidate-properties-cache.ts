/**
 * Utility to revalidate the properties cache
 * Call this function after adding new properties to the database
 * 
 * Usage:
 * import { revalidatePropertiesCache } from '@/lib/revalidate-properties-cache';
 * await revalidatePropertiesCache();
 */
import { revalidateTag } from 'next/cache';

/**
 * Revalidate the properties cache
 * This will invalidate all cached property data, forcing fresh fetches on next request
 * 
 * Note: This function must be called from a Server Action or API route
 * It cannot be called from client components
 */
export async function revalidatePropertiesCache() {
  try {
    // Revalidate the 'properties' tag, which invalidates:
    // - /api/properties route cache
    // - getPropertyStatistics cache in map pages
    revalidateTag('properties');
    console.log('Properties cache revalidated successfully');
    return { success: true };
  } catch (error) {
    console.error('Error revalidating properties cache:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
