/**
 * Utility functions for property data management
 */
import { createServerClient } from '@/lib/supabase';
import { SageProperty } from '@/lib/types/sage';

/**
 * Convert property name to URL-safe slug
 * Transliterates accented characters to ASCII equivalents
 */
export function slugifyPropertyName(name: string): string {
  // Transliterate common accented characters to ASCII
  const transliterated = name
    .normalize('NFD') // Decompose characters into base + combining marks
    .replace(/[\u0300-\u036f]/g, ''); // Remove combining diacritical marks
  
  return transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}

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
 * Get all unique property slugs for generateStaticParams
 * Gets one slug per unique property name (not per database record)
 * This ensures we generate pages for unique properties (513) not all records (1,266)
 */
export async function getAllPropertySlugs(): Promise<Array<{ slug: string }>> {
  try {
    const supabase = createServerClient();
    
    // Get unique property names first, then get one slug per unique property
    // This ensures we only get 513 slugs (one per unique property) not 1,266 (one per record)
    // Try to get slug column, but if it doesn't exist, we'll generate slugs from property names
    // Note: We don't filter by slug being not null since the column may not exist
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name, slug')
      .not('property_name', 'is', null)
      .limit(10000);

    if (error) {
      console.error('Error fetching property slugs:', error);
      return [];
    }

    // Map: property_name -> slug (ensures one slug per unique property name)
    const propertyNameToSlug = new Map<string, string>();
    properties?.forEach((prop: { property_name?: string | null; slug?: string | null }) => {
      const propertyName = prop.property_name?.trim();
      if (!propertyName) return;
      
      // Use slug from database if available, otherwise generate from property name
      const slug = prop.slug?.trim() || slugifyPropertyName(propertyName);
      
      // Only add if we haven't seen this property name before
      // This ensures we get one slug per unique property, not per record
      if (!propertyNameToSlug.has(propertyName)) {
        propertyNameToSlug.set(propertyName, slug);
      }
    });

    // Return unique slugs (one per unique property name)
    const uniqueSlugs = Array.from(new Set(propertyNameToSlug.values()));
    return uniqueSlugs.sort().map((slug) => ({ slug }));
  } catch (error) {
    console.error('Error in getAllPropertySlugs:', error);
    return [];
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
 * Get properties by slug
 * Returns all records with the same slug (same property_name group)
 * 
 * Since the slug column may not exist, this function:
 * 1. First tries to query by slug column (if it exists)
 * 2. Falls back to generating slugs from property names to find matches
 * This ensures it works whether or not the slug column exists in the database
 */
export async function getPropertiesBySlug(slug: string): Promise<SageProperty[]> {
  try {
    const supabase = createServerClient();
    const trimmedSlug = slug.trim();
    
    // First, try direct lookup by slug field (if column exists)
    // This will fail gracefully if the column doesn't exist
    try {
      const { data: properties, error } = await supabase
        .from('all_glamping_properties')
        .select('*')
        .eq('slug', trimmedSlug);

      // If no error and we found properties, return them
      if (!error && properties && properties.length > 0) {
        return properties;
      }
      
      // If error is about column not existing, that's fine - we'll use fallback
      // Other errors we should log but continue to fallback
      if (error && !error.message?.includes('column') && !error.message?.includes('does not exist')) {
        console.warn('[getPropertiesBySlug] Error querying by slug column (will try fallback):', error.message);
      }
    } catch (columnError) {
      // Column doesn't exist or other error - continue to fallback
      console.log('[getPropertiesBySlug] Slug column may not exist, using fallback method...');
    }

    // Fallback: Generate slugs from property names to find matches
    // This works whether or not the slug column exists
    const { data: allProperties, error: allError } = await supabase
      .from('all_glamping_properties')
      .select('property_name')
      .not('property_name', 'is', null)
      .limit(10000);

    if (allError) {
      console.error('Error fetching all properties for fallback lookup:', allError);
      return [];
    }

    // Find property name(s) that generate this slug
    const matchingPropertyNames = new Set<string>();
    allProperties?.forEach((prop: { property_name?: string | null }) => {
      if (prop.property_name) {
        const generatedSlug = slugifyPropertyName(prop.property_name);
        if (generatedSlug === trimmedSlug) {
          matchingPropertyNames.add(prop.property_name.trim());
        }
      }
    });

    // If we found matching property names, fetch those properties
    if (matchingPropertyNames.size > 0) {
      const propertyNames = Array.from(matchingPropertyNames);
      
      const { data: fallbackProperties, error: fallbackError } = await supabase
        .from('all_glamping_properties')
        .select('*')
        .in('property_name', propertyNames);

      if (fallbackError) {
        console.error('Error fetching properties by name in fallback:', fallbackError);
        return [];
      }

      return fallbackProperties || [];
    }

    // No properties found
    return [];
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
        .neq('is_closed', 'Yes')
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