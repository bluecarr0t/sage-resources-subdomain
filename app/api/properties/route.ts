import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { unstable_cache } from 'next/cache';

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
    
    // Extract filter parameters
    const filterCountry = searchParams.getAll('country');
    const filterState = searchParams.getAll('state');
    const filterUnitType = searchParams.getAll('unitType');
    const filterRateRange = searchParams.getAll('rateRange');
    
    // Create a cache key based on filters
    const cacheKey = `properties-${JSON.stringify({ filterCountry, filterState, filterUnitType, filterRateRange })}`;
    
    // Fetch properties with caching
    // Cache tag: 'properties' - can be invalidated when properties are added
    const cachedFetch = unstable_cache(
      async () => {
        return await fetchPropertiesFromDatabase(filterCountry, filterState, filterUnitType, filterRateRange);
      },
      [cacheKey],
      {
        tags: ['properties'],
        revalidate: false, // Cache until manually invalidated
      }
    );
    
    const properties = await cachedFetch();
    
    return NextResponse.json({
      success: true,
      data: properties,
      count: properties.length,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=31536000, stale-while-revalidate=86400',
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
  filterRateRange: string[]
) {
  const supabase = createServerClient();
  
  // Start query - apply filters BEFORE limit for better performance
  // Filter to only show glamping properties FIRST (uses index)
  let query = supabase.from('sage-glamping-data')
    .select('*')
    .eq('is_glamping_property', 'Yes');

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
  
  // Transform data to map new column names to expected format
  const transformedData = (allData || []).map((item: any) => ({
    ...item,
    // Map column names with double underscores to single underscores
    avg_retail_daily_rate_2024: item.avg__retail_daily_rate_2024 ?? item.avg_retail_daily_rate_2024,
    duplicate_note: item.duplicatenote ?? item.duplicate_note,
    property_total_sites: item.property__total_sites ?? item.property_total_sites,
    operating_season_months: item.operating_season__months_ ?? item.operating_season_months,
    num_locations: item.__of_locations ?? item.num_locations,
    retail_daily_rate_fees_2024: item.retail_daily_rate__fees__2024 ?? item.retail_daily_rate_fees_2024,
    retail_daily_rate_fees_ytd: item.retail_daily_rate__fees__ytd ?? item.retail_daily_rate_fees_ytd,
    avg_rate_next_12_months: item.avg__rate__next_12_months_ ?? item.avg_rate_next_12_months,
    // Ensure lat and lon are accessible (they may be numbers from NUMERIC columns)
    lat: item.lat ?? null,
    lon: item.lon ?? null,
  }));
  
  return transformedData;
}
