/**
 * Data utilities for map location pages (states and cities)
 * Provides functions to fetch statistics, featured properties, and nearby attractions
 */

import { createServerClient } from '@/lib/supabase';
import { getCache, setCache } from '@/lib/redis';
import { normalizeStateName, normalizeCityName } from '@/lib/location-helpers';
import { NationalPark } from '@/lib/types/national-parks';
import { SageProperty } from '@/lib/types/sage';

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
 * Statistics for a location
 */
export interface LocationStatistics {
  propertyCount: number;
  uniqueProperties: number;
  averageRate: number | null;
  highRate: number | null;
  lowRate: number | null;
  averageOccupancy: number | null;
  unitTypes: Array<{ type: string; count: number }>;
}

/**
 * Get property statistics for a state
 */
export async function getStatePropertyStatistics(
  state: string,
  locale: string = 'en'
): Promise<LocationStatistics> {
  const normalizedState = normalizeStateName(state);
  const cacheKey = `state-stats:${normalizedState}:${locale}`;
  const ttlSeconds = 86400 * 7; // 7 days
  
  // Try cache first
  const cached = await getCache<LocationStatistics>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const supabase = createServerClient();
    
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name, avg__retail_daily_rate_2024, high_rate_2024, low_rate_2024, occupancy_rate_2024, unit_type')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .eq('state', normalizedState);
    
    if (error || !properties) {
      console.error('Error fetching state statistics:', error);
      return {
        propertyCount: 0,
        uniqueProperties: 0,
        averageRate: null,
        highRate: null,
        lowRate: null,
        averageOccupancy: null,
        unitTypes: [],
      };
    }
    
    // Count unique properties
    const uniquePropertyNames = new Set<string>();
    const rates: number[] = [];
    const occupancies: number[] = [];
    const unitTypeCounts = new Map<string, number>();
    
    properties.forEach((prop: any) => {
      const propertyName = prop.property_name?.trim();
      if (propertyName) {
        uniquePropertyNames.add(propertyName);
      }
      
      // Collect rates
      const rate = prop.avg__retail_daily_rate_2024 
        ? Number(prop.avg__retail_daily_rate_2024) 
        : null;
      if (rate !== null && !isNaN(rate)) {
        rates.push(rate);
      }
      
      // Collect occupancies
      const occupancy = prop.occupancy_rate_2024 
        ? Number(prop.occupancy_rate_2024) 
        : null;
      if (occupancy !== null && !isNaN(occupancy)) {
        occupancies.push(occupancy);
      }
      
      // Count unit types
      const unitType = prop.unit_type?.trim();
      if (unitType) {
        unitTypeCounts.set(unitType, (unitTypeCounts.get(unitType) || 0) + 1);
      }
    });
    
    // Calculate statistics
    const stats: LocationStatistics = {
      propertyCount: properties.length,
      uniqueProperties: uniquePropertyNames.size,
      averageRate: rates.length > 0 
        ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) 
        : null,
      highRate: rates.length > 0 ? Math.max(...rates) : null,
      lowRate: rates.length > 0 ? Math.min(...rates) : null,
      averageOccupancy: occupancies.length > 0
        ? Math.round((occupancies.reduce((a, b) => a + b, 0) / occupancies.length) * 10) / 10
        : null,
      unitTypes: Array.from(unitTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    };
    
    // Cache the result
    setCache(cacheKey, stats, ttlSeconds).catch(() => {
      // Ignore cache errors
    });
    
    return stats;
  } catch (error) {
    console.error('Error in getStatePropertyStatistics:', error);
    return {
      propertyCount: 0,
      uniqueProperties: 0,
      averageRate: null,
      highRate: null,
      lowRate: null,
      averageOccupancy: null,
      unitTypes: [],
    };
  }
}

/**
 * Get property statistics for a city
 */
export async function getCityPropertyStatistics(
  city: string,
  state: string,
  locale: string = 'en'
): Promise<LocationStatistics> {
  const normalizedState = normalizeStateName(state);
  const normalizedCity = normalizeCityName(city, normalizedState);
  const cacheKey = `city-stats:${normalizedCity}:${normalizedState}:${locale}`;
  const ttlSeconds = 86400 * 7; // 7 days
  
  // Try cache first
  const cached = await getCache<LocationStatistics>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const supabase = createServerClient();
    
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name, avg__retail_daily_rate_2024, high_rate_2024, low_rate_2024, occupancy_rate_2024, unit_type')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .ilike('city', normalizedCity)
      .eq('state', normalizedState);
    
    if (error || !properties) {
      console.error('Error fetching city statistics:', error);
      return {
        propertyCount: 0,
        uniqueProperties: 0,
        averageRate: null,
        highRate: null,
        lowRate: null,
        averageOccupancy: null,
        unitTypes: [],
      };
    }
    
    // Count unique properties
    const uniquePropertyNames = new Set<string>();
    const rates: number[] = [];
    const occupancies: number[] = [];
    const unitTypeCounts = new Map<string, number>();
    
    properties.forEach((prop: any) => {
      const propertyName = prop.property_name?.trim();
      if (propertyName) {
        uniquePropertyNames.add(propertyName);
      }
      
      // Collect rates
      const rate = prop.avg__retail_daily_rate_2024 
        ? Number(prop.avg__retail_daily_rate_2024) 
        : null;
      if (rate !== null && !isNaN(rate)) {
        rates.push(rate);
      }
      
      // Collect occupancies
      const occupancy = prop.occupancy_rate_2024 
        ? Number(prop.occupancy_rate_2024) 
        : null;
      if (occupancy !== null && !isNaN(occupancy)) {
        occupancies.push(occupancy);
      }
      
      // Count unit types
      const unitType = prop.unit_type?.trim();
      if (unitType) {
        unitTypeCounts.set(unitType, (unitTypeCounts.get(unitType) || 0) + 1);
      }
    });
    
    // Calculate statistics
    const stats: LocationStatistics = {
      propertyCount: properties.length,
      uniqueProperties: uniquePropertyNames.size,
      averageRate: rates.length > 0 
        ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length) 
        : null,
      highRate: rates.length > 0 ? Math.max(...rates) : null,
      lowRate: rates.length > 0 ? Math.min(...rates) : null,
      averageOccupancy: occupancies.length > 0
        ? Math.round((occupancies.reduce((a, b) => a + b, 0) / occupancies.length) * 10) / 10
        : null,
      unitTypes: Array.from(unitTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    };
    
    // Cache the result
    setCache(cacheKey, stats, ttlSeconds).catch(() => {
      // Ignore cache errors
    });
    
    return stats;
  } catch (error) {
    console.error('Error in getCityPropertyStatistics:', error);
    return {
      propertyCount: 0,
      uniqueProperties: 0,
      averageRate: null,
      highRate: null,
      lowRate: null,
      averageOccupancy: null,
      unitTypes: [],
    };
  }
}

/**
 * Get featured properties for a state (top rated, most popular)
 */
export async function getFeaturedPropertiesForState(
  state: string,
  limit: number = 20
): Promise<SageProperty[]> {
  const normalizedState = normalizeStateName(state);
  const cacheKey = `state-featured:${normalizedState}:${limit}`;
  const ttlSeconds = 86400 * 7; // 7 days
  
  // Try cache first
  const cached = await getCache<SageProperty[]>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const supabase = createServerClient();
    
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('*')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .eq('state', normalizedState)
      .not('property_name', 'is', null)
      .order('google_rating', { ascending: false })
      .limit(limit * 2); // Get more to filter duplicates
    
    if (error || !properties) {
      console.error('Error fetching featured properties for state:', error);
      return [];
    }
    
    // Get unique properties (by property_name) with best ratings
    const propertyMap = new Map<string, any>();
    
    properties.forEach((prop: any) => {
      const propertyName = prop.property_name?.trim();
      if (!propertyName) return;
      
      const existing = propertyMap.get(propertyName);
      if (!existing || 
          (prop.google_rating && (!existing.google_rating || prop.google_rating > existing.google_rating))) {
        propertyMap.set(propertyName, prop);
      }
    });
    
    const uniqueProperties = Array.from(propertyMap.values())
      .sort((a, b) => {
        // Sort by rating (highest first), then by property name
        const ratingA = a.google_rating || 0;
        const ratingB = b.google_rating || 0;
        if (ratingB !== ratingA) {
          return ratingB - ratingA;
        }
        return (a.property_name || '').localeCompare(b.property_name || '');
      })
      .slice(0, limit);
    
    // Cache the result
    setCache(cacheKey, uniqueProperties, ttlSeconds).catch(() => {
      // Ignore cache errors
    });
    
    return uniqueProperties as SageProperty[];
  } catch (error) {
    console.error('Error in getFeaturedPropertiesForState:', error);
    return [];
  }
}

/**
 * Get featured properties for a city (within 25 miles, sorted by distance and rating)
 */
export async function getFeaturedPropertiesForCity(
  city: string,
  state: string,
  cityLat: number,
  cityLon: number,
  limit: number = 20
): Promise<Array<SageProperty & { distance: number }>> {
  const normalizedState = normalizeStateName(state);
  const normalizedCity = normalizeCityName(city, normalizedState);
  const cacheKey = `city-featured:${normalizedCity}:${normalizedState}:${limit}`;
  const ttlSeconds = 86400 * 7; // 7 days
  
  // Try cache first
  const cached = await getCache<Array<SageProperty & { distance: number }>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const supabase = createServerClient();
    
    // Get all properties in the state
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('*')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .eq('state', normalizedState)
      .not('lat', 'is', null)
      .not('lon', 'is', null)
      .not('property_name', 'is', null);
    
    if (error || !properties) {
      console.error('Error fetching properties for city:', error);
      return [];
    }
    
    // Filter by distance (25 miles) and calculate distances
    const radiusMiles = 25;
    const propertiesWithDistance: Array<SageProperty & { distance: number }> = [];
    const propertyMap = new Map<string, { property: any; distance: number }>();
    
    properties.forEach((prop: any) => {
      const lat = Number(prop.lat);
      const lon = Number(prop.lon);
      const propertyName = prop.property_name?.trim();
      
      if (isNaN(lat) || isNaN(lon) || !propertyName) return;
      
      const distance = calculateDistance(cityLat, cityLon, lat, lon);
      
      if (distance <= radiusMiles) {
        const existing = propertyMap.get(propertyName);
        if (!existing || distance < existing.distance ||
            (prop.google_rating && (!existing.property.google_rating || prop.google_rating > existing.property.google_rating))) {
          propertyMap.set(propertyName, { property: prop, distance });
        }
      }
    });
    
    // Sort by distance, then rating, and limit
    const result = Array.from(propertyMap.values())
      .map(({ property, distance }) => ({ ...property, distance }))
      .sort((a, b) => {
        // First by distance
        if (Math.abs(a.distance - b.distance) > 0.1) {
          return a.distance - b.distance;
        }
        // Then by rating
        const ratingA = a.google_rating || 0;
        const ratingB = b.google_rating || 0;
        return ratingB - ratingA;
      })
      .slice(0, limit) as Array<SageProperty & { distance: number }>;
    
    // Cache the result
    setCache(cacheKey, result, ttlSeconds).catch(() => {
      // Ignore cache errors
    });
    
    return result;
  } catch (error) {
    console.error('Error in getFeaturedPropertiesForCity:', error);
    return [];
  }
}

/**
 * Get nearby national parks within a radius
 */
export async function getNearbyNationalParks(
  lat: number,
  lon: number,
  radiusMiles: number = 100
): Promise<Array<NationalPark & { distance: number }>> {
  const cacheKey = `nearby-parks:${lat}:${lon}:${radiusMiles}`;
  const ttlSeconds = 86400 * 7; // 7 days
  
  // Try cache first
  const cached = await getCache<Array<NationalPark & { distance: number }>>(cacheKey);
  if (cached) {
    return cached;
  }
  
  try {
    const supabase = createServerClient();
    
    const { data: parks, error } = await supabase
      .from('national-parks')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    
    if (error || !parks) {
      console.error('Error fetching national parks:', error);
      return [];
    }
    
    // Calculate distances and filter
    const parksWithDistance: Array<NationalPark & { distance: number }> = parks
      .map((park: any) => {
        const parkLat = Number(park.latitude);
        const parkLon = Number(park.longitude);
        
        if (isNaN(parkLat) || isNaN(parkLon)) {
          return null;
        }
        
        const distance = calculateDistance(lat, lon, parkLat, parkLon);
        
        if (distance <= radiusMiles) {
          return { ...park, distance };
        }
        
        return null;
      })
      .filter((park): park is NationalPark & { distance: number } => park !== null)
      .sort((a, b) => a.distance - b.distance);
    
    // Cache the result
    setCache(cacheKey, parksWithDistance, ttlSeconds).catch(() => {
      // Ignore cache errors
    });
    
    return parksWithDistance;
  } catch (error) {
    console.error('Error in getNearbyNationalParks:', error);
    return [];
  }
}

/**
 * Get all properties for a state (for map display)
 */
export async function getStateProperties(
  state: string,
  limit?: number
): Promise<SageProperty[]> {
  const normalizedState = normalizeStateName(state);
  
  try {
    const supabase = createServerClient();
    
    let query = supabase
      .from('all_glamping_properties')
      .select('*')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .eq('state', normalizedState);
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data: properties, error } = await query;
    
    if (error || !properties) {
      console.error('Error fetching state properties:', error);
      return [];
    }
    
    return properties as SageProperty[];
  } catch (error) {
    console.error('Error in getStateProperties:', error);
    return [];
  }
}

/**
 * Get properties for a city (within 25 miles)
 */
export async function getCityProperties(
  city: string,
  state: string,
  cityLat: number,
  cityLon: number,
  limit?: number
): Promise<SageProperty[]> {
  const normalizedState = normalizeStateName(state);
  const radiusMiles = 25;
  
  try {
    const supabase = createServerClient();
    
    // Get all properties in the state
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('*')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .eq('state', normalizedState)
      .not('lat', 'is', null)
      .not('lon', 'is', null);
    
    if (error || !properties) {
      console.error('Error fetching city properties:', error);
      return [];
    }
    
    // Filter by distance
    const nearbyProperties = properties
      .map((prop: any) => {
        const lat = Number(prop.lat);
        const lon = Number(prop.lon);
        
        if (isNaN(lat) || isNaN(lon)) {
          return null;
        }
        
        const distance = calculateDistance(cityLat, cityLon, lat, lon);
        
        if (distance <= radiusMiles) {
          return prop;
        }
        
        return null;
      })
      .filter((prop): prop is any => prop !== null)
      .sort((a, b) => {
        const distanceA = calculateDistance(cityLat, cityLon, Number(a.lat), Number(a.lon));
        const distanceB = calculateDistance(cityLat, cityLon, Number(b.lat), Number(b.lon));
        return distanceA - distanceB;
      });
    
    if (limit) {
      return nearbyProperties.slice(0, limit) as SageProperty[];
    }
    
    return nearbyProperties as SageProperty[];
  } catch (error) {
    console.error('Error in getCityProperties:', error);
    return [];
  }
}
