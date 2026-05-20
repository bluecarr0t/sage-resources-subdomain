/**
 * Utility functions for property data management
 */
import { createServerClient } from '@/lib/supabase';
import {
  buildPublishedPropertySlugList,
  fetchPublishedPropertyAnchors,
  fetchPublishedRowsByGroupKey,
  findPublishedGroupKeyBySlug,
  PUBLISHED_RESEARCH_STATUS,
} from '@/lib/published-property-pages';
import { slugifyPropertyName } from '@/lib/property-slug';
import { SageProperty } from '@/lib/types/sage';

export { slugifyPropertyName } from '@/lib/property-slug';

/**
 * Get unique property names from the database
 * Returns array of unique, non-null, trimmed property names
 */
export async function getUniquePropertyNames(): Promise<string[]> {
  try {
    const supabase = createServerClient();
    
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name');

    if (error) {
      console.error('Error fetching property names:', error);
      return [];
    }

    // Get unique property names (non-null, non-empty, trimmed)
    const uniqueNames = new Set<string>();
    properties?.forEach((prop: { property_name?: string | null }) => {
      if (prop.property_name && prop.property_name.trim()) {
        uniqueNames.add(prop.property_name.trim());
      }
    });

    return Array.from(uniqueNames).sort();
  } catch (error) {
    console.error('Error in getUniquePropertyNames:', error);
    return [];
  }
}

/**
 * All public listing slugs: one per published logical property (property_id / slug / name+city+state).
 * Map markers use a narrower filter in /api/properties — not all published rows appear on the map.
 */
export async function getAllPropertySlugs(): Promise<Array<{ slug: string }>> {
  try {
    const anchors = await fetchPublishedPropertyAnchors();
    const slugs = buildPublishedPropertySlugList(anchors);
    return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.error('Error in getAllPropertySlugs:', error);
    return [];
  }
}

/**
 * Get the most recent updated_at timestamp from properties.
 * Used for sitemap lastmod. Returns ISO string or null if unavailable.
 */
export async function getMaxPropertyUpdatedAt(): Promise<string | null> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select('updated_at')
      .eq('research_status', PUBLISHED_RESEARCH_STATUS)
      .not('updated_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error || !data?.[0]?.updated_at) return null;
    return new Date(data[0].updated_at).toISOString();
  } catch {
    return null;
  }
}

/**
 * Fetch all properties matching a property name
 * Returns all locations/units for a given property name
 */
export async function getPropertiesByName(propertyName: string): Promise<SageProperty[]> {
  try {
    const supabase = createServerClient();
    
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('*')
      .eq('property_name', propertyName.trim());

    if (error) {
      console.error('Error fetching properties by name:', error);
      return [];
    }

    return properties || [];
  } catch (error) {
    console.error('Error in getPropertiesByName:', error);
    return [];
  }
}

/**
 * Published listing page rows for a public slug (all unit rows for the logical property).
 */
export async function getPropertiesBySlug(slug: string): Promise<SageProperty[]> {
  try {
    const groupKey = await findPublishedGroupKeyBySlug(slug.trim());
    if (!groupKey) return [];
    return fetchPublishedRowsByGroupKey(groupKey);
  } catch (error) {
    console.error('Error in getPropertiesBySlug:', error);
    return [];
  }
}

/**
 * Get a mapping of all property names to their slugs
 * Useful for lookups without querying database multiple times
 */
export async function getPropertyNameToSlugMap(): Promise<Map<string, string>> {
  try {
    const supabase = createServerClient();
    
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name, slug')
      .not('property_name', 'is', null)
      .not('slug', 'is', null)
      .limit(10000);

    if (error) {
      console.error('Error fetching property name to slug mapping:', error);
      return new Map();
    }

    const map = new Map<string, string>();
    properties?.forEach((prop: { property_name?: string | null; slug?: string | null }) => {
      if (prop.property_name && prop.slug) {
        const propertyName = prop.property_name.trim();
        const slug = prop.slug.trim();
        // Only set if not already in map (first occurrence wins)
        if (!map.has(propertyName)) {
          map.set(propertyName, slug);
        }
      }
    });
    
    return map;
  } catch (error) {
    console.error('Error in getPropertyNameToSlugMap:', error);
    return new Map();
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in miles
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Radius of the Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get nearby properties within a radius
 * Returns properties sorted by distance (closest first)
 */
export async function getNearbyProperties(
  lat: number,
  lon: number,
  excludeSlug: string,
  radiusMiles: number = 50,
  limit: number = 6
): Promise<SageProperty[]> {
  const maxRetries = 3;
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const supabase = createServerClient();
      
      // Only fetch necessary fields to reduce response size
      // This prevents JSON parsing errors with very large responses
      // Exclude closed properties
      const { data: properties, error } = await supabase
        .from('all_glamping_properties')
        .select('slug, property_name, lat, lon, city, state, country, unit_type, rate_category, url, phone_number')
        .not('lat', 'is', null)
        .not('lon', 'is', null)
        .not('slug', 'is', null)
        .neq('is_open', 'Closed')
        .neq('is_open', 'Temporarily closed')
        .neq('is_open', 'Under Construction')
        .neq('is_open', 'Proposed Development')
        .limit(5000); // Reduced limit to prevent oversized responses

      if (error) {
        // If it's a JSON parsing error or network error, retry
        const isRetryableError = 
          error.message?.includes('JSON') ||
          error.message?.includes('terminated') ||
          error.message?.includes('socket') ||
          error.message?.includes('UND_ERR') ||
          error.message?.includes('Unterminated');
        
        if (attempt < maxRetries && isRetryableError) {
          // Only log on first attempt to reduce noise
          if (attempt === 1) {
            console.warn(`Error fetching properties for nearby search (will retry):`, error.message || error);
          }
          lastError = error;
          // Exponential backoff: wait 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
          continue;
        }
        // Only log non-retryable errors or final failures
        if (attempt === maxRetries) {
          console.error('Error fetching properties for nearby search (final attempt):', error);
        }
        return [];
      }

      if (!properties || properties.length === 0) {
        return [];
      }

      // Filter and calculate distances
      const propertiesWithDistance: Array<{ property: SageProperty; distance: number }> = [];
      
      for (const property of properties) {
        // Skip the current property
        if (property.slug === excludeSlug) continue;
        
        // Parse coordinates
        const propertyLat = typeof property.lat === 'string' 
          ? parseFloat(property.lat) 
          : property.lat;
        const propertyLon = typeof property.lon === 'string' 
          ? parseFloat(property.lon) 
          : property.lon;
        
        if (!propertyLat || !propertyLon || isNaN(propertyLat) || isNaN(propertyLon)) {
          continue;
        }
        
        // Calculate distance
        const distance = calculateDistance(lat, lon, propertyLat, propertyLon);
        
        // Only include if within radius
        if (distance <= radiusMiles) {
          propertiesWithDistance.push({ property: property as unknown as SageProperty, distance });
        }
      }
      
      // Sort by distance (closest first)
      propertiesWithDistance.sort((a, b) => a.distance - b.distance);
      
      // Get unique properties (by slug) and limit results
      const uniqueProperties = new Map<string, SageProperty>();
      for (const { property } of propertiesWithDistance) {
        if (property.slug && !uniqueProperties.has(property.slug)) {
          uniqueProperties.set(property.slug, property);
          if (uniqueProperties.size >= limit) break;
        }
      }
      
      return Array.from(uniqueProperties.values());
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a JSON parsing error or network error that we should retry
      const isRetryableError = 
        error?.message?.includes('JSON') ||
        error?.message?.includes('Unterminated') ||
        error?.message?.includes('terminated') ||
        error?.message?.includes('socket') ||
        error?.message?.includes('UND_ERR') ||
        error?.name === 'SyntaxError';
      
      if (attempt < maxRetries && isRetryableError) {
        // Only log on first attempt to reduce noise
        if (attempt === 1) {
          console.warn(`Error in getNearbyProperties (will retry):`, error?.message || error);
        }
        // Exponential backoff: wait 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        continue;
      }
      
      // Log error but don't throw - return empty array instead
      // Only log on final attempt to reduce noise
      if (attempt === maxRetries) {
        console.error('Error in getNearbyProperties (final attempt):', error?.message || error);
      }
      return [];
    }
  }

  // If we've exhausted all retries, return empty array
  console.error('Failed to fetch nearby properties after', maxRetries, 'attempts:', lastError?.message || lastError);
  return [];
}