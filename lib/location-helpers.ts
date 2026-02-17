/**
 * Location helper utilities for state and city name normalization,
 * slugification, and display name conversion
 */

import { createServerClient } from '@/lib/supabase';
import { getCache, setCache } from '@/lib/redis';

/**
 * State code to full name mapping
 */
const STATE_CODE_TO_NAME: Record<string, string> = {
  // US States
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming', 'DC': 'District of Columbia',
  // Canadian Provinces
  'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick',
  'NL': 'Newfoundland and Labrador', 'NS': 'Nova Scotia', 'NT': 'Northwest Territories',
  'NU': 'Nunavut', 'ON': 'Ontario', 'PE': 'Prince Edward Island', 'QC': 'Quebec',
  'SK': 'Saskatchewan', 'YT': 'Yukon',
};

/**
 * Full state name to code mapping
 */
const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODE_TO_NAME).map(([code, name]) => [name.toLowerCase(), code])
);

/**
 * Convert state/city name to URL-safe slug
 */
export function slugifyLocation(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim();
}

/**
 * Normalize state name to standard format
 * Handles both codes (CA) and full names (California)
 */
export function normalizeStateName(state: string): string {
  if (!state) return '';
  
  const trimmed = state.trim();
  const upper = trimmed.toUpperCase();
  
  // If it's a state code, return the full name
  if (STATE_CODE_TO_NAME[upper]) {
    return STATE_CODE_TO_NAME[upper];
  }
  
  // If it's a full name, return capitalized version
  const lower = trimmed.toLowerCase();
  if (STATE_NAME_TO_CODE[lower]) {
    return STATE_CODE_TO_NAME[STATE_NAME_TO_CODE[lower]];
  }
  
  // Otherwise, return title case
  return trimmed
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize city name to standard format
 */
export function normalizeCityName(city: string, state: string): string {
  if (!city) return '';
  
  // Handle common city name variations
  const normalized = city
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .split(' ')
    .map(word => {
      // Handle special cases like "St.", "Mt.", etc.
      const specialCases: Record<string, string> = {
        'st.': 'St.',
        'st': 'St.',
        'mt.': 'Mt.',
        'mt': 'Mt.',
        'ft.': 'Ft.',
        'ft': 'Ft.',
      };
      const lower = word.toLowerCase();
      if (specialCases[lower]) {
        return specialCases[lower];
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  return normalized;
}

/**
 * Get display name for state code
 */
export function getStateDisplayName(stateCode: string): string {
  const upper = stateCode.toUpperCase().trim();
  return STATE_CODE_TO_NAME[upper] || stateCode;
}

/**
 * Get city center coordinates from database
 * Returns average coordinates of all properties in that city
 */
export async function getCityCoordinates(
  city: string,
  state: string
): Promise<{ lat: number; lon: number } | null> {
  const cacheKey = `city-coords:${slugifyLocation(city)}:${slugifyLocation(state)}`;
  const ttlSeconds = 86400 * 30; // 30 days
  
  // Try cache first
  const cached = await getCache<{ lat: number; lon: number }>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const supabase = createServerClient();
    
    const { data, error } = await supabase
      .from('all_glamping_properties')
      .select('lat, lon')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .ilike('city', city.trim())
      .eq('state', normalizeStateName(state))
      .not('lat', 'is', null)
      .not('lon', 'is', null);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    // Calculate average coordinates
    const validCoords = data.filter(
      (item: any) => 
        item.lat !== null && 
        item.lon !== null &&
        !isNaN(Number(item.lat)) &&
        !isNaN(Number(item.lon))
    );
    
    if (validCoords.length === 0) {
      return null;
    }
    
    const avgLat = validCoords.reduce(
      (sum: number, item: any) => sum + Number(item.lat),
      0
    ) / validCoords.length;
    
    const avgLon = validCoords.reduce(
      (sum: number, item: any) => sum + Number(item.lon),
      0
    ) / validCoords.length;
    
    const coords = { lat: avgLat, lon: avgLon };
    
    // Cache the result
    setCache(cacheKey, coords, ttlSeconds).catch(() => {
      // Ignore cache errors
    });
    
    return coords;
  } catch (error) {
    console.error('Error getting city coordinates:', error);
    return null;
  }
}

/**
 * Get top N states by property count
 */
export async function getTopStates(count: number = 50): Promise<Array<{ state: string; propertyCount: number }>> {
  const cacheKey = `top-states:${count}`;
  const ttlSeconds = 86400 * 7; // 7 days
  
  // Try cache first
  const cached = await getCache<Array<{ state: string; propertyCount: number }>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const supabase = createServerClient();
    
    // Get all properties with states
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name, state')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .not('state', 'is', null);
    
    if (error || !properties) {
      console.error('Error fetching states:', error);
      return [];
    }
    
    // Count unique properties per state
    const stateCounts = new Map<string, Set<string>>();
    
    properties.forEach((prop: { property_name?: string | null; state?: string | null }) => {
      const state = prop.state?.trim();
      const propertyName = prop.property_name?.trim();
      
      if (!state || !propertyName) return;
      
      // Normalize state name
      const normalizedState = normalizeStateName(state);
      
      if (!stateCounts.has(normalizedState)) {
        stateCounts.set(normalizedState, new Set());
      }
      
      stateCounts.get(normalizedState)!.add(propertyName);
    });
    
    // Convert to array and sort by count
    const result = Array.from(stateCounts.entries())
      .map(([state, propertyNames]) => ({
        state,
        propertyCount: propertyNames.size,
      }))
      .sort((a, b) => b.propertyCount - a.propertyCount)
      .slice(0, count);
    
    // Cache the result
    setCache(cacheKey, result, ttlSeconds).catch(() => {
      // Ignore cache errors
    });
    
    return result;
  } catch (error) {
    console.error('Error in getTopStates:', error);
    return [];
  }
}

/**
 * Get top N cities by property count
 */
export async function getTopCities(count: number = 100): Promise<Array<{
  city: string;
  state: string;
  propertyCount: number;
  avgLat: number;
  avgLon: number;
}>> {
  const cacheKey = `top-cities:${count}`;
  const ttlSeconds = 86400 * 7; // 7 days
  
  // Try cache first
  const cached = await getCache<Array<{
    city: string;
    state: string;
    propertyCount: number;
    avgLat: number;
    avgLon: number;
  }>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const supabase = createServerClient();
    
    // Get all properties with cities and coordinates
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name, city, state, lat, lon')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .not('city', 'is', null)
      .not('state', 'is', null)
      .not('lat', 'is', null)
      .not('lon', 'is', null);
    
    if (error || !properties) {
      console.error('Error fetching cities:', error);
      return [];
    }
    
    // Group by city+state and count unique properties
    const cityGroups = new Map<string, {
      city: string;
      state: string;
      propertyNames: Set<string>;
      coordinates: Array<{ lat: number; lon: number }>;
    }>();
    
    properties.forEach((prop: {
      property_name?: string | null;
      city?: string | null;
      state?: string | null;
      lat?: number | string | null;
      lon?: number | string | null;
    }) => {
      const city = prop.city?.trim();
      const state = prop.state?.trim();
      const propertyName = prop.property_name?.trim();
      const lat = prop.lat ? Number(prop.lat) : null;
      const lon = prop.lon ? Number(prop.lon) : null;
      
      if (!city || !state || !propertyName || lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
        return;
      }
      
      const normalizedState = normalizeStateName(state);
      const normalizedCity = normalizeCityName(city, normalizedState);
      const key = `${normalizedCity}:${normalizedState}`;
      
      if (!cityGroups.has(key)) {
        cityGroups.set(key, {
          city: normalizedCity,
          state: normalizedState,
          propertyNames: new Set(),
          coordinates: [],
        });
      }
      
      const group = cityGroups.get(key)!;
      group.propertyNames.add(propertyName);
      group.coordinates.push({ lat, lon });
    });
    
    // Convert to array, calculate averages, and sort by count
    const result = Array.from(cityGroups.values())
      .filter((group) => group.propertyNames.size >= 3) // Minimum 3 properties
      .map((group) => {
        const avgLat = group.coordinates.reduce((sum, c) => sum + c.lat, 0) / group.coordinates.length;
        const avgLon = group.coordinates.reduce((sum, c) => sum + c.lon, 0) / group.coordinates.length;
        
        return {
          city: group.city,
          state: group.state,
          propertyCount: group.propertyNames.size,
          avgLat,
          avgLon,
        };
      })
      .sort((a, b) => b.propertyCount - a.propertyCount)
      .slice(0, count);
    
    // Cache the result
    setCache(cacheKey, result, ttlSeconds).catch(() => {
      // Ignore cache errors
    });
    
    return result;
  } catch (error) {
    console.error('Error in getTopCities:', error);
    return [];
  }
}

/**
 * Create city slug from city name and state
 * Format: city-name-state-code (e.g., "aspen-co")
 */
export function createCitySlug(city: string, state: string): string {
  const citySlug = slugifyLocation(city);
  const stateNormalized = normalizeStateName(state);
  
  // Convert state name to code if possible
  const stateLower = stateNormalized.toLowerCase();
  const stateCode = STATE_NAME_TO_CODE[stateLower];
  const stateSlug = stateCode ? stateCode.toLowerCase() : slugifyLocation(stateNormalized);
  
  return `${citySlug}-${stateSlug}`;
}

/**
 * Parse city slug back to city and state
 * Format: city-name-state-code (e.g., "aspen-co")
 */
export function parseCitySlug(slug: string): { city: string; state: string } | null {
  // Try to find the last hyphen that separates city from state code
  // State codes are typically 2 letters, but could be longer for full names
  const parts = slug.split('-');
  
  if (parts.length < 2) {
    return null;
  }
  
  // Try 2-letter state code first (most common)
  const lastTwo = parts.slice(-2).join('-');
  const stateCode = parts[parts.length - 1].toUpperCase();
  
  if (STATE_CODE_TO_NAME[stateCode]) {
    return {
      city: parts.slice(0, -1).join('-'),
      state: STATE_CODE_TO_NAME[stateCode],
    };
  }
  
  // Otherwise, try full state name
  const possibleStateName = parts.slice(-2).join(' ');
  const stateNameLower = possibleStateName.toLowerCase();
  
  if (STATE_NAME_TO_CODE[stateNameLower]) {
    return {
      city: parts.slice(0, -2).join('-'),
      state: STATE_CODE_TO_NAME[STATE_NAME_TO_CODE[stateNameLower]],
    };
  }
  
  // Fallback: assume last part is state
  return {
    city: parts.slice(0, -1).join('-'),
    state: parts[parts.length - 1],
  };
}
