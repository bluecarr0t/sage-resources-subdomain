import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getCache, setCache, hashCacheKey, logCacheMetrics } from '@/lib/redis';
import { filterToPublicColumns, filterRequestedFieldsToPublic } from '@/lib/property-column-privacy';

/**
 * API route for fetching glamping properties with caching
 * Cache can be invalidated by revalidating the 'properties' tag
 * Google API calls are NOT cached - they should use their own routes
 */

// Mark route as dynamic since it uses searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Check if fetching single property by ID
    const propertyId = searchParams.get('id');
    if (propertyId) {
      const supabase = createServerClient();
      const { data: property, error } = await supabase
        .from('all_glamping_properties')
        .select('*')
        .eq('id', propertyId)
        .eq('is_glamping_property', 'Yes')
        .neq('is_closed', 'Yes')
        .eq('research_status', 'published')
        .single();
      
      if (error || !property) {
        return NextResponse.json(
          { success: false, error: 'Property not found' },
          { status: 404 }
        );
      }

      // Strip private columns before returning to client
      const publicProperty = filterToPublicColumns(property as Record<string, unknown>);
      
      return NextResponse.json({
        success: true,
        data: publicProperty,
      }, {
        headers: {
          'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
        },
      });
    }
    
    // Extract filter parameters
    const filterCountry = searchParams.getAll('country');
    const filterState = searchParams.getAll('state');
    const filterUnitType = searchParams.getAll('unitType');
    const filterRateRange = searchParams.getAll('rateRange');
    
    // Extract viewport bounds (optional - for viewport-based loading)
    const north = searchParams.get('north');
    const south = searchParams.get('south');
    const east = searchParams.get('east');
    const west = searchParams.get('west');
    const bounds = north && south && east && west ? {
      north: parseFloat(north),
      south: parseFloat(south),
      east: parseFloat(east),
      west: parseFloat(west),
    } : null;
    
    // Extract fields parameter (optional - for field selection to reduce payload)
    // Filter to only public columns - private columns are never exposed
    const fieldsParam = searchParams.get('fields');
    const rawRequestedFields = fieldsParam ? fieldsParam.split(',').map((f) => f.trim()) : null;
    const requestedFields = rawRequestedFields
      ? filterRequestedFieldsToPublic(rawRequestedFields)
      : null;
    
    // Create a cache key based on filters, bounds, and fields
    // Use SHA-256 hash of the filter parameters for shorter, faster cache keys
    const filterParams = { filterCountry, filterState, filterUnitType, filterRateRange, bounds, fields: requestedFields };
    const filterHash = hashCacheKey(filterParams);
    const cacheKey = `properties:${filterHash}`;
    const ttlSeconds = 1209600; // 14 days

    console.warn(`[Cache] Checking cache for key: ${cacheKey.substring(0, 30)}...`);
    
    // Try to get from Redis cache first
    const cachedProperties = await getCache<any[]>(cacheKey);
    
    let properties: any[];
    let cacheStatus: 'HIT' | 'MISS' = 'MISS';
    
    if (cachedProperties) {
      console.warn(`[Cache] HIT for key: ${cacheKey.substring(0, 30)}... (found ${cachedProperties.length} properties)`);
      // Always filter to public columns (stale cache may have pre-privacy data)
      properties = cachedProperties.map((p: Record<string, unknown>) => filterToPublicColumns(p));
      cacheStatus = 'HIT';
    } else {
      console.warn(`[Cache] MISS for key: ${cacheKey.substring(0, 30)}... - fetching from database`);
      // Cache miss - fetch from database
      properties = await fetchPropertiesFromDatabase(filterCountry, filterState, filterUnitType, filterRateRange, bounds, requestedFields);
      
      console.warn(`[Cache] Fetched ${properties.length} properties, attempting to cache...`);
      
      // Store in Redis cache (non-blocking - don't wait for it)
      setCache(cacheKey, properties, ttlSeconds)
        .then((success) => {
          if (success) {
            console.warn(`[Cache] Successfully cached properties with key: ${cacheKey.substring(0, 20)}...`);
          } else {
            console.warn(`[Cache] Failed to cache properties (returned false) for key: ${cacheKey.substring(0, 20)}...`);
          }
        })
        .catch((err) => {
          console.error('[Cache] Failed to cache properties:', err);
          console.error('[Cache] Error details:', {
            message: err instanceof Error ? err.message : String(err),
            cacheKey: cacheKey.substring(0, 20) + '...',
          });
        });
    }
    
    // Log cache metrics (controlled by environment variable)
    logCacheMetrics();
    
    return NextResponse.json({
      success: true,
      data: properties,
      count: properties.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
        'X-Cache-Status': cacheStatus,
      },
    });
  } catch (error) {
    console.error('Error in properties API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch properties',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch properties from Supabase with filters
 * This function is called by the cached function above
 */
async function fetchPropertiesFromDatabase(
  filterCountry: string[],
  filterState: string[],
  filterUnitType: string[],
  filterRateRange: string[],
  bounds: { north: number; south: number; east: number; west: number } | null = null,
  requestedFields: string[] | null = null
) {
  const supabase = createServerClient();
  
  // Start query - apply filters BEFORE limit for better performance
  // Filter to only show glamping properties FIRST (uses index)
  // Exclude closed properties
  let query = supabase.from('all_glamping_properties')
    .select('*')
    .eq('is_glamping_property', 'Yes')
    .neq('is_closed', 'Yes')
    .eq('research_status', 'published');

  // Filter by country
  if (filterCountry.length === 0) {
    // No countries selected - return empty result
    query = query.eq('id', -1); // This will return no results
  } else if (filterCountry.length === 1) {
    // Only one country selected
    if (filterCountry.includes('United States')) {
      // Handle both 'USA' and 'United States' values
      query = query.in('country', ['USA', 'United States', 'US']);
    } else if (filterCountry.includes('Canada')) {
      // Filter by country field only - only show properties with country='Canada' or 'CA'
      query = query.in('country', ['Canada', 'CA']);
    }
  }
  // If both countries selected, don't filter by country at database level

  // Filter by state
  if (filterState.length > 0) {
    // Expand filterState to include both full names and their abbreviations
    const STATE_ABBREVIATIONS: Record<string, string> = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
      'DC': 'District of Columbia',
      // Canadian provinces
      'AB': 'Alberta', 'BC': 'British Columbia', 'MB': 'Manitoba', 'NB': 'New Brunswick',
      'NL': 'Newfoundland and Labrador', 'NS': 'Nova Scotia', 'NT': 'Northwest Territories',
      'NU': 'Nunavut', 'ON': 'Ontario', 'PE': 'Prince Edward Island', 'QC': 'Quebec',
      'SK': 'Saskatchewan', 'YT': 'Yukon'
    };
    
    const expandedStates: string[] = [];
    filterState.forEach((state) => {
      expandedStates.push(state);
      
      // Find abbreviation for this state (if it's a full name)
      const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
        ([_, fullName]) => fullName.toLowerCase() === state.toLowerCase()
      );
      if (abbreviation) {
        expandedStates.push(abbreviation[0]);
      }
      
      // Also check if the state itself is an abbreviation
      if (STATE_ABBREVIATIONS[state.toUpperCase()]) {
        const fullName = STATE_ABBREVIATIONS[state.toUpperCase()];
        expandedStates.push(fullName);
        expandedStates.push(state.toUpperCase());
      }
    });
    
    // Remove duplicates and ensure we have all variations
    const uniqueExpandedStates = Array.from(new Set(expandedStates));
    
    // Also try case-insensitive variations
    const allVariations: string[] = [];
    uniqueExpandedStates.forEach((s) => {
      allVariations.push(s);
      allVariations.push(s.toUpperCase());
      allVariations.push(s.toLowerCase());
      allVariations.push(s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
    });
    
    const finalStates = Array.from(new Set(allVariations));
    query = query.in('state', finalStates);
  }

  if (filterUnitType.length > 0) {
    query = query.in('unit_type', filterUnitType);
  }

  if (filterRateRange.length > 0) {
    query = query.in('rate_category', filterRateRange);
  }

  // Apply limit AFTER all filters for optimal query performance
  query = query.limit(5000);

  // Fetch all records using pagination (Supabase has a default limit of 1000)
  let allData: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const paginatedQuery = query.range(offset, offset + batchSize - 1);
    const { data: batchData, error: supabaseError } = await paginatedQuery;
    
    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      throw new Error(
        `Supabase query failed: ${supabaseError.message}${supabaseError.details ? ` (${supabaseError.details})` : ''}`
      );
    }
    
    if (batchData) {
      allData = allData.concat(batchData);
      hasMore = batchData.length === batchSize;
      offset += batchSize;
    } else {
      hasMore = false;
    }
  }
  
  // Filter by bounds if provided (after fetching to avoid complex PostGIS queries)
  let filteredData = allData || [];
  if (bounds) {
    filteredData = filteredData.filter((item: any) => {
      const lat = typeof item.lat === 'number' ? item.lat : parseFloat(String(item.lat));
      const lon = typeof item.lon === 'number' ? item.lon : parseFloat(String(item.lon));
      
      // Skip items without valid coordinates
      if (!lat || !lon || isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon)) {
        return false;
      }
      
      // Check if point is within bounds
      // Handle longitude wraparound (east could be less than west if crossing 180/-180)
      const withinLat = lat >= bounds.south && lat <= bounds.north;
      let withinLon = false;
      
      if (bounds.east >= bounds.west) {
        // Normal case: no wraparound
        withinLon = lon >= bounds.west && lon <= bounds.east;
      } else {
        // Wraparound case: bounds cross the international date line
        withinLon = lon >= bounds.west || lon <= bounds.east;
      }
      
      return withinLat && withinLon;
    });
  }
  
  // Transform data - column names are now clean (v4 migration removed double underscores)
  let transformedData = filteredData.map((item: any) => {
    const transformed: any = {
      ...item,
      lat: item.lat ?? null,
      lon: item.lon ?? null,
    };
    
    // If specific fields requested, only include those fields (already filtered to public columns)
    // Always include essential fields: id, property_name, lat, lon, state, country
    if (requestedFields && requestedFields.length > 0) {
      const essentialFields = ['id', 'property_name', 'lat', 'lon', 'state', 'country', 'unit_type', 'rate_category'];
      const fieldsToInclude = new Set([...essentialFields, ...requestedFields]);
      
      const filtered: any = {};
      fieldsToInclude.forEach((field) => {
        if (transformed.hasOwnProperty(field)) {
          filtered[field] = transformed[field];
        }
      });
      return filtered;
    }
    
    // No field filter: strip private columns before returning
    return filterToPublicColumns(transformed);
  });
  
  return transformedData;
}
