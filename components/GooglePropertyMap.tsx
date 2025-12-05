'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { supabase } from '@/lib/supabase';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';
import { useMapContext } from './MapContext';
import MultiSelect from './MultiSelect';

// Default center for lower 48 states (continental USA)
// Optimized to better frame the lower 48 states, excluding most of Canada and Mexico
const defaultCenter = {
  lat: 38.5,
  lng: -96.0,
};

// Zoom level 6 provides a closer view of the lower 48 states, excluding Alaska and Hawaii
const defaultZoom = 6;

// Libraries array must be a constant to prevent LoadScript reload warnings
const libraries: ('places')[] = ['places'];

type PropertyWithCoords = SageProperty & { coordinates: [number, number] };

/**
 * Generate Google Places Photo URL from photo object
 * Uses API route to proxy the request (handles authentication securely)
 */
function getGooglePhotoUrl(photo: {
  name: string;
  widthPx?: number;
  heightPx?: number;
}): string {
  if (!photo?.name) {
    console.warn('No photo name provided');
    return '';
  }
  
  // Use a reasonable size for the info window (max 800px width, 600px height)
  const maxWidth = photo.widthPx ? Math.min(photo.widthPx, 800) : 800;
  const maxHeight = photo.heightPx ? Math.min(photo.heightPx, 600) : 600;
  
  // Encode the photo name for URL
  const encodedPhotoName = encodeURIComponent(photo.name);
  
  // Use API route to proxy the photo request (handles authentication)
  const url = `/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
  console.log('Generated photo URL:', url);
  
  return url;
}

// State abbreviation to full name mapping
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

// Canadian provinces to exclude from state filter
const CANADIAN_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Nova Scotia', 'Northwest Territories',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec',
  'Saskatchewan', 'Yukon'
];

/**
 * Convert exact rate to a rough range to avoid revealing precise scraped data
 */
function getRoughRateRange(rate: string | number | null): string | null {
  if (rate === null || rate === undefined) return null;
  
  const numRate = typeof rate === 'number' ? rate : parseFloat(String(rate));
  if (isNaN(numRate)) return null;
  
  // Define rough ranges
  if (numRate < 50) return '$0-50';
  if (numRate < 100) return '$50-100';
  if (numRate < 150) return '$100-150';
  if (numRate < 200) return '$150-200';
  if (numRate < 300) return '$200-300';
  if (numRate < 500) return '$300-500';
  return '$500+';
}

/**
 * Categorize a rate into one of the 5 standard categories
 * Returns the category string or null if rate is invalid
 */
function getRateCategory(rate: number | null): string | null {
  if (rate === null || rate === undefined || isNaN(rate) || !isFinite(rate)) return null;
  
  if (rate <= 149) return '≤$149';
  if (rate >= 150 && rate <= 249) return '$150-$249';
  if (rate >= 250 && rate <= 399) return '$250-$399';
  if (rate >= 400 && rate <= 549) return '$400-$549';
  if (rate >= 550) return '$550+';
  
  return null;
}

/**
 * Get rate category from min/max values by calculating average
 */
function getRateCategoryFromMinMax(min: number | null, max: number | null): string | null {
  if (min === null || max === null) return null;
  
  const numMin = typeof min === 'number' ? min : parseFloat(String(min));
  const numMax = typeof max === 'number' ? max : parseFloat(String(max));
  
  if (isNaN(numMin) || isNaN(numMax) || !isFinite(numMin) || !isFinite(numMax)) return null;
  
  // Calculate average rate
  const avgRate = (numMin + numMax) / 2;
  
  return getRateCategory(avgRate);
}

/**
 * Get a single rough rate range that encompasses both min and max values
 * Never displays "$0" - always uses the actual minimum value from the data
 */
function getRoughRateRangeFromMinMax(min: number | null, max: number | null): string | null {
  if (min === null || max === null) return null;
  
  const numMin = typeof min === 'number' ? min : parseFloat(String(min));
  const numMax = typeof max === 'number' ? max : parseFloat(String(max));
  
  if (isNaN(numMin) || isNaN(numMax)) return null;
  
  // Ensure min is at least 1 (never use 0)
  const actualMin = Math.max(1, numMin);
  
  // If min and max are very close (within the same rough range), show that single range
  const minRange = getRoughRateRange(actualMin);
  const maxRange = getRoughRateRange(numMax);
  
  if (minRange === maxRange) {
    return minRange;
  }
  
  // If min is less than $50, use "< $50" format
  if (actualMin < 50) {
    // If max is also less than $50, just show "< $50"
    if (numMax < 50) {
      return '< $50';
    }
    // If max is $50 or higher, show "< $50 - $[upperBound]"
    let upperBound: number | string;
    if (numMax < 100) upperBound = 100;
    else if (numMax < 150) upperBound = 150;
    else if (numMax < 200) upperBound = 200;
    else if (numMax < 300) upperBound = 300;
    else if (numMax < 500) upperBound = 500;
    else upperBound = '500+';
    
    if (upperBound === '500+') {
      return '< $500+';
    }
    return `< $50 - $${upperBound}`;
  }
  
  // Otherwise, create a single range that spans from min's lower bound to max's upper bound
  // Determine the lower bound category based on actual minimum
  let lowerBound: number;
  if (actualMin < 100) lowerBound = 50;
  else if (actualMin < 150) lowerBound = 100;
  else if (actualMin < 200) lowerBound = 150;
  else if (actualMin < 300) lowerBound = 200;
  else if (actualMin < 500) lowerBound = 300;
  else lowerBound = 500;
  
  // Determine the upper bound category
  let upperBound: number | string;
  if (numMax < 100) upperBound = 100;
  else if (numMax < 150) upperBound = 150;
  else if (numMax < 200) upperBound = 200;
  else if (numMax < 300) upperBound = 300;
  else if (numMax < 500) upperBound = 500;
  else upperBound = '500+';
  
  // Format the range
  if (upperBound === '500+') {
    if (lowerBound === 500) return '$500+';
    return `$${lowerBound}+`;
  }
  
  if (lowerBound === upperBound) {
    // Both in same category, use the standard range
    return getRoughRateRange(numMax);
  }
  
  return `$${lowerBound}-${upperBound}`;
}

interface GooglePropertyMapProps {
  showMap?: boolean;
}

export default function GooglePropertyMap({ showMap = true }: GooglePropertyMapProps) {
  const { filterCountry, filterState, filterUnitType, filterRateRange, setFilterCountry, setFilterState, setFilterUnitType, setFilterRateRange, toggleCountry, toggleState, toggleUnitType, toggleRateRange, clearFilters, hasActiveFilters } = useMapContext();
  const [properties, setProperties] = useState<SageProperty[]>([]);
  const [allProperties, setAllProperties] = useState<SageProperty[]>([]); // Store all properties for filter option calculation
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithCoords | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false); // Collapsed by default on mobile
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(defaultZoom);
  const [shouldFitBounds, setShouldFitBounds] = useState(true);

  // URL parameter handling
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Reset photo index when selected property changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [selectedProperty?.id]);
  const clustererRef = useRef<any | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const hasCenteredFromUrlRef = useRef<boolean>(false);

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize filters and map position from URL parameters on mount
  useEffect(() => {
    if (!isClient || urlInitialized) return;

    const urlState = searchParams.getAll('state');
    const urlCountry = searchParams.getAll('country');
    const urlUnitType = searchParams.getAll('unitType');
    const urlRateRange = searchParams.getAll('rateRange');
    
    // Check for lat/lon/zoom parameters for map positioning
    const urlLat = searchParams.get('lat');
    const urlLon = searchParams.get('lon');
    const urlZoom = searchParams.get('zoom');

    if (urlState.length > 0 || urlCountry.length > 0 || urlUnitType.length > 0 || urlRateRange.length > 0) {
      if (urlCountry.length > 0) {
        setFilterCountry(urlCountry);
      }
      if (urlState.length > 0) {
        setFilterState(urlState);
      }
      if (urlUnitType.length > 0) {
        setFilterUnitType(urlUnitType);
      }
      if (urlRateRange.length > 0) {
        setFilterRateRange(urlRateRange);
      }
    }
    
    // If lat/lon/zoom are provided, use them to center and zoom the map
    if (urlLat && urlLon) {
      const lat = parseFloat(urlLat);
      const lon = parseFloat(urlLon);
      if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
        setMapCenter({ lat, lng: lon });
        setShouldFitBounds(false); // Don't fit bounds if we have specific coordinates
        hasCenteredFromUrlRef.current = false; // Reset so we can center again with new coordinates
        
        // Set zoom if provided, otherwise use default zoom for single location
        if (urlZoom) {
          const zoom = parseFloat(urlZoom);
          if (!isNaN(zoom) && isFinite(zoom) && zoom >= 1 && zoom <= 20) {
            setMapZoom(zoom);
          } else {
            setMapZoom(15); // Default zoom for single location
          }
        } else {
          setMapZoom(15); // Default zoom for single location
        }
      }
    } else {
      // No URL params, reset to defaults and allow fitBounds
      setMapCenter(defaultCenter);
      setMapZoom(defaultZoom);
      setShouldFitBounds(true);
      hasCenteredFromUrlRef.current = false;
    }
    
    setUrlInitialized(true);
  }, [isClient, searchParams, urlInitialized, setFilterCountry, setFilterState, setFilterUnitType, setFilterRateRange]);

  // Update URL when filters change (preserve lat/lon/zoom if they exist)
  useEffect(() => {
    if (!isClient || !urlInitialized) return;

    const params = new URLSearchParams();

    if (filterCountry.length > 0) {
      filterCountry.forEach(country => params.append('country', country));
    }
    if (filterState.length > 0) {
      filterState.forEach(state => params.append('state', state));
    }
    if (filterUnitType.length > 0) {
      filterUnitType.forEach(type => params.append('unitType', type));
    }
    if (filterRateRange.length > 0) {
      filterRateRange.forEach(range => params.append('rateRange', range));
    }
    
    // Preserve lat/lon/zoom parameters if they exist
    const urlLat = searchParams.get('lat');
    const urlLon = searchParams.get('lon');
    const urlZoom = searchParams.get('zoom');
    if (urlLat) params.set('lat', urlLat);
    if (urlLon) params.set('lon', urlLon);
    if (urlZoom) params.set('zoom', urlZoom);

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [filterCountry, filterState, filterUnitType, filterRateRange, isClient, urlInitialized, pathname, router, searchParams]);

  // Fetch all properties once (without filters) for filter option calculation
  useEffect(() => {
    async function fetchAllProperties() {
      try {
        const { data, error: supabaseError } = await supabase
          .from('sage-glamping-data')
          .select('*')
          .limit(5000);

        if (supabaseError) {
          console.error('Error fetching all properties:', supabaseError);
          return;
        }

        if (data && data.length > 0) {
          // Transform data to map new column names to expected format
          const transformedData = (data || []).map((item: any) => ({
            ...item,
            avg_retail_daily_rate_2024: item.avg__retail_daily_rate_2024 ?? item.avg_retail_daily_rate_2024,
            duplicate_note: item.duplicatenote ?? item.duplicate_note,
            property_total_sites: item.property__total_sites ?? item.property_total_sites,
            operating_season_months: item.operating_season__months_ ?? item.operating_season_months,
            num_locations: item.__of_locations ?? item.num_locations,
            retail_daily_rate_fees_2024: item.retail_daily_rate__fees__2024 ?? item.retail_daily_rate_fees_2024,
            retail_daily_rate_fees_ytd: item.retail_daily_rate__fees__ytd ?? item.retail_daily_rate_fees_ytd,
            avg_rate_next_12_months: item.avg__rate__next_12_months_ ?? item.avg_rate_next_12_months,
            lat: item.lat ?? null,
            lon: item.lon ?? null,
          }));

          // Group by property_name similar to the main fetch
          const propertyMap = new Map<string, any>();
          const unitTypesMap = new Map<string, Set<string>>();
          const ratesMap = new Map<string, number[]>();

          transformedData.forEach((item: any) => {
            const propertyName = item.property_name;
            if (!propertyName) return;

            if (!unitTypesMap.has(propertyName)) {
              unitTypesMap.set(propertyName, new Set());
            }
            if (item.unit_type) {
              unitTypesMap.get(propertyName)!.add(item.unit_type);
            }

            if (!ratesMap.has(propertyName)) {
              ratesMap.set(propertyName, []);
            }
            const rate = item.avg__rate__next_12_months_;
            if (rate != null && !isNaN(Number(rate)) && isFinite(Number(rate))) {
              ratesMap.get(propertyName)!.push(Number(rate));
            }

            // When grouping, if a property appears in multiple states, keep all state records
            // We'll handle deduplication when counting per state
            if (!propertyMap.has(propertyName)) {
              propertyMap.set(propertyName, [item]);
            } else {
              // Store multiple records for the same property (different states)
              const existing = propertyMap.get(propertyName)!;
              if (Array.isArray(existing)) {
                existing.push(item);
              } else {
                propertyMap.set(propertyName, [existing, item]);
              }
            }
          });

          const uniqueProperties = Array.from(propertyMap.values()).map((propertyOrArray: any) => {
            // Handle case where property might be an array (multiple records for same property_name)
            const property = Array.isArray(propertyOrArray) ? propertyOrArray[0] : propertyOrArray;
            const propertyName = property.property_name;
            const unitTypes = unitTypesMap.get(propertyName);
            const rates = ratesMap.get(propertyName) || [];

            let rateRange: { min: number | null; max: number | null } = { min: null, max: null };
            if (rates.length > 0) {
              rateRange.min = Math.min(...rates);
              rateRange.max = Math.max(...rates);
            }

            let rateCategory = property.rate_category;
            if (!rateCategory) {
              const avgRate = rateRange.min !== null && rateRange.max !== null 
                ? (rateRange.min + rateRange.max) / 2 
                : null;
              rateCategory = getRateCategory(avgRate);
            }

            return {
              ...property,
              all_unit_types: unitTypes ? Array.from(unitTypes).sort() : [],
              rate_range: rateRange,
              rate_category: rateCategory,
            };
          });

          setAllProperties(uniqueProperties);
        }
      } catch (err) {
        console.error('Error fetching all properties:', err);
      }
    }
    fetchAllProperties();
  }, []);

  // Fetch properties
  useEffect(() => {
    async function fetchProperties() {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching properties from Supabase...');
        
        let query = supabase.from('sage-glamping-data').select('*').limit(5000);

        // Filter by country
        if (filterCountry.length === 0) {
          // No countries selected - return empty result
          query = query.eq('id', -1); // This will return no results
          console.log('No countries selected - showing no properties');
        } else if (filterCountry.length === 1) {
          // Only one country selected
          if (filterCountry.includes('United States')) {
            // Handle both 'USA' and 'United States' values
            query = query.in('country', ['USA', 'United States', 'US']);
            console.log('Filtering by country: United States (including USA, United States, US)');
          } else if (filterCountry.includes('Canada')) {
            // Handle both 'Canada' and 'CA' values
            // Note: We'll do additional client-side filtering for Canadian provinces
            query = query.in('country', ['Canada', 'CA']);
            console.log('Filtering by country: Canada (including Canada, CA)');
          }
        } else if (filterCountry.length === 2 && filterCountry.includes('United States') && filterCountry.includes('Canada')) {
          // Both countries selected - don't filter by country at database level
          // Return all properties and use client-side coordinate-based detection to identify which are Canadian/US
          // This ensures we catch properties with incorrect country field values
          console.log('Both countries selected - returning all properties (will filter client-side using coordinate detection)');
          // No country filter - return all properties
        }
        // If neither condition matches, don't filter by country (show all)

        if (filterState.length > 0) {
          // Expand filterState to include both full names and their abbreviations
          const expandedStates: string[] = [];
          filterState.forEach((state) => {
            // Add the state as-is (case-insensitive matching will be handled by Supabase)
            expandedStates.push(state);
            
            // Find abbreviation for this state (if it's a full name)
            const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
              ([_, fullName]) => fullName.toLowerCase() === state.toLowerCase()
            );
            if (abbreviation) {
              expandedStates.push(abbreviation[0]); // Add "CA" if state is "California"
            }
            
            // Also check if the state itself is an abbreviation
            if (STATE_ABBREVIATIONS[state.toUpperCase()]) {
              const fullName = STATE_ABBREVIATIONS[state.toUpperCase()];
              expandedStates.push(fullName); // Add "California" if state is "CA"
              expandedStates.push(state.toUpperCase()); // Add "CA" in uppercase
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
            // Capitalize first letter
            allVariations.push(s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
          });
          
          const finalStates = Array.from(new Set(allVariations));
          query = query.in('state', finalStates);
          console.log('Filtering by states:', filterState, 'expanded to:', finalStates);
        }

        if (filterUnitType.length > 0) {
          query = query.in('unit_type', filterUnitType);
          console.log('Filtering by unit types:', filterUnitType);
        }

        if (filterRateRange.length > 0) {
          query = query.in('rate_category', filterRateRange);
          console.log('Filtering by rate categories:', filterRateRange);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          console.error('Supabase error:', supabaseError);
          throw supabaseError;
        }

        console.log('Fetched properties:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('Sample property:', data[0]);
          console.log('Sample property state:', data[0].state);
          console.log('Sample property lat/lon:', { lat: data[0].lat, lon: data[0].lon, latType: typeof data[0].lat, lonType: typeof data[0].lon });
          // Log states distribution
          const stateCounts: Record<string, number> = {};
          data.forEach((p: any) => {
            if (p.state) {
              stateCounts[p.state] = (stateCounts[p.state] || 0) + 1;
            }
          });
          console.log('States in fetched data:', stateCounts);
        }
        
        // Transform data to map new column names to expected format
        const transformedData = (data || []).map((item: any) => ({
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
        
        // Create a set of all state variations we're filtering by (for use during grouping)
        const filterStateSet = new Set<string>();
        if (filterState.length > 0) {
          filterState.forEach((state) => {
            filterStateSet.add(state);
            filterStateSet.add(state.toUpperCase());
            filterStateSet.add(state.toLowerCase());
            filterStateSet.add(state.charAt(0).toUpperCase() + state.slice(1).toLowerCase());
            
            // Add abbreviation if it's a full name
            const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
              ([_, fullName]) => fullName.toLowerCase() === state.toLowerCase()
            );
            if (abbreviation) {
              filterStateSet.add(abbreviation[0]);
              filterStateSet.add(abbreviation[0].toUpperCase());
            }
            
            // Add full name if it's an abbreviation
            if (STATE_ABBREVIATIONS[state.toUpperCase()]) {
              const fullName = STATE_ABBREVIATIONS[state.toUpperCase()];
              filterStateSet.add(fullName);
              filterStateSet.add(fullName.toUpperCase());
              filterStateSet.add(fullName.toLowerCase());
            }
          });
        }
        
        // Helper function to check if a state matches the filter
        const stateMatchesFilter = (state: string | null): boolean => {
          if (!state) return false;
          if (filterStateSet.size === 0) return true; // No filter = all match
          const stateStr = String(state);
          return filterStateSet.has(stateStr) || 
                 filterStateSet.has(stateStr.toUpperCase()) ||
                 filterStateSet.has(stateStr.toLowerCase()) ||
                 filterStateSet.has(stateStr.charAt(0).toUpperCase() + stateStr.slice(1).toLowerCase());
        };
        
        // Group by property_name and collect all unit types and rates for each property
        const propertyMap = new Map<string, any>();
        const unitTypesMap = new Map<string, Set<string>>(); // Track unit types per property
        const ratesMap = new Map<string, number[]>(); // Track avg__rate__next_12_months_ per property
        
        transformedData.forEach((item: any) => {
          const propertyName = item.property_name;
          if (!propertyName) return; // Skip records without property_name
          
          // Collect unit types for this property
          if (!unitTypesMap.has(propertyName)) {
            unitTypesMap.set(propertyName, new Set());
          }
          if (item.unit_type) {
            unitTypesMap.get(propertyName)!.add(item.unit_type);
          }
          
          // Collect rates for this property
          if (!ratesMap.has(propertyName)) {
            ratesMap.set(propertyName, []);
          }
          const rate = item.avg__rate__next_12_months_;
          if (rate != null && !isNaN(Number(rate)) && isFinite(Number(rate))) {
            ratesMap.get(propertyName)!.push(Number(rate));
          }
          
          // Check if we already have this property
          if (!propertyMap.has(propertyName)) {
            // Use this record as the representative
            propertyMap.set(propertyName, item);
          } else {
            // If we already have this property, prefer one that matches the state filter and has valid coordinates
            const existing = propertyMap.get(propertyName);
            const existingLat = typeof existing.lat === 'number' ? existing.lat : parseFloat(String(existing.lat));
            const existingLon = typeof existing.lon === 'number' ? existing.lon : parseFloat(String(existing.lon));
            const existingHasCoords = existing.lat != null && existing.lon != null && 
                                     !isNaN(existingLat) && !isNaN(existingLon) &&
                                     isFinite(existingLat) && isFinite(existingLon);
            const existingMatchesState = stateMatchesFilter(existing.state);
            
            const currentLat = typeof item.lat === 'number' ? item.lat : parseFloat(String(item.lat));
            const currentLon = typeof item.lon === 'number' ? item.lon : parseFloat(String(item.lon));
            const currentHasCoords = item.lat != null && item.lon != null && 
                                    !isNaN(currentLat) && !isNaN(currentLon) &&
                                    isFinite(currentLat) && isFinite(currentLon);
            const currentMatchesState = stateMatchesFilter(item.state);
            
            // Priority: 1) Matches state filter + has coords, 2) Matches state filter, 3) Has coords
            if (currentMatchesState && currentHasCoords && (!existingMatchesState || !existingHasCoords)) {
              propertyMap.set(propertyName, item);
            } else if (currentMatchesState && !existingMatchesState) {
              propertyMap.set(propertyName, item);
            } else if (currentHasCoords && !existingHasCoords && existingMatchesState === currentMatchesState) {
              propertyMap.set(propertyName, item);
            }
          }
        });
        
        // Convert map to array and add unit types and rate range to each property
        let uniqueProperties = Array.from(propertyMap.values()).map((property: any) => {
          const propertyName = property.property_name;
          const unitTypes = unitTypesMap.get(propertyName);
          const rates = ratesMap.get(propertyName) || [];
          
          // Calculate min and max rates
          let rateRange: { min: number | null; max: number | null } = { min: null, max: null };
          if (rates.length > 0) {
            rateRange.min = Math.min(...rates);
            rateRange.max = Math.max(...rates);
          }
          
          // Use rate_category from database if available, otherwise calculate it
          let rateCategory = property.rate_category;
          if (!rateCategory) {
            // Fallback: calculate the rate category from min/max rates
            const avgRate = rateRange.min !== null && rateRange.max !== null 
              ? (rateRange.min + rateRange.max) / 2 
              : null;
            rateCategory = getRateCategory(avgRate);
          }
          
          return {
            ...property,
            all_unit_types: unitTypes ? Array.from(unitTypes).sort() : [],
            rate_range: rateRange,
            rate_category: rateCategory,
          };
        });
        
        // If state filter is applied, ensure we only show properties that match the filter
        // This handles cases where the same property_name might have records in different states
        if (filterState.length > 0) {
          // Create a set of all state variations we're filtering by
          const filterStateSet = new Set<string>();
          filterState.forEach((state) => {
            filterStateSet.add(state);
            filterStateSet.add(state.toUpperCase());
            filterStateSet.add(state.toLowerCase());
            filterStateSet.add(state.charAt(0).toUpperCase() + state.slice(1).toLowerCase());
            
            // Add abbreviation if it's a full name
            const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
              ([_, fullName]) => fullName.toLowerCase() === state.toLowerCase()
            );
            if (abbreviation) {
              filterStateSet.add(abbreviation[0]);
              filterStateSet.add(abbreviation[0].toUpperCase());
            }
            
            // Add full name if it's an abbreviation
            if (STATE_ABBREVIATIONS[state.toUpperCase()]) {
              const fullName = STATE_ABBREVIATIONS[state.toUpperCase()];
              filterStateSet.add(fullName);
              filterStateSet.add(fullName.toUpperCase());
              filterStateSet.add(fullName.toLowerCase());
            }
          });
          
          // Filter properties to only include those whose state matches the filter
          uniqueProperties = uniqueProperties.filter((property: any) => {
            if (!property.state) return false;
            const propertyState = String(property.state);
            return filterStateSet.has(propertyState) || 
                   filterStateSet.has(propertyState.toUpperCase()) ||
                   filterStateSet.has(propertyState.toLowerCase()) ||
                   filterStateSet.has(propertyState.charAt(0).toUpperCase() + propertyState.slice(1).toLowerCase());
          });
          
          console.log(`After state filtering: ${uniqueProperties.length} properties match the state filter`);
        }
        
        // Note: Rate category filtering is now done at the database level for better performance
        // No need for client-side filtering here
        
        // Additional client-side country filtering to ensure accuracy
        // This handles cases where country field might be missing or inconsistent
        // Uses improved coordinate-based detection to catch properties with incorrect country data
        
        // Helper function to check if coordinates are likely in Canada (same as countryCounts)
        const isLikelyCanadaByCoords = (lat: number, lon: number): boolean => {
          if (lat < 41.7 || lat >= 85 || lon < -141 || lon > -52) {
            return false;
          }
          if (lat >= 60) return true;
          if (lat >= 41.7 && lat < 60 && lon >= -95 && lon <= -52) return true;
          if (lat >= 48 && lat < 60 && lon >= -139 && lon <= -89) return true;
          if (lat >= 49 && lat < 60) {
            if (lon < -100) return true;
            if (lon >= -100 && lon <= -89 && lat >= 50) return true;
            if (lon >= -95 && lon <= -89 && lat >= 49) return true;
          }
          if (lat >= 45 && lat < 49) {
            if (lon >= -75 && lon <= -52) return true;
            if (lon >= -95 && lon < -75) {
              if (lat >= 46) return true;
              if (lon >= -80) return true;
            }
          }
          if (lat >= 41.7 && lat < 45 && lon >= -95.2 && lon <= -74.3) return true;
          return false;
        };
        
        if (filterCountry.length === 1) {
          if (filterCountry.includes('Canada')) {
            uniqueProperties = uniqueProperties.filter((property: any) => {
              const country = String(property.country || '').toUpperCase();
              const state = String(property.state || '').toUpperCase();
              
              // Check country field
              if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
                return true;
              }
              
              // Check if state is a Canadian province
              const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
              if (canadianProvinceCodes.includes(state)) {
                return true;
              }
              
              // Check if state is a Canadian province full name
              if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) {
                return true;
              }
              
              // Check coordinates if available
              const lat = typeof property.lat === 'number' ? property.lat : parseFloat(String(property.lat));
              const lon = typeof property.lon === 'number' ? property.lon : parseFloat(String(property.lon));
              if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
                if (isLikelyCanadaByCoords(lat, lon)) {
                  return true;
                }
              }
              
              return false;
            });
            console.log(`After client-side Canada filtering: ${uniqueProperties.length} properties`);
          } else if (filterCountry.includes('United States')) {
            uniqueProperties = uniqueProperties.filter((property: any) => {
              const country = String(property.country || '').toUpperCase();
              const state = String(property.state || '').toUpperCase();
              
              // Check country field
              if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
                return true;
              }
              
              // If country is not set but state is a US state (not a Canadian province), include it
              if (!country || country === '' || country === 'NULL') {
                const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
                const isCanadianProvince = canadianProvinceCodes.includes(state) || 
                  CANADIAN_PROVINCES.some(province => province.toUpperCase() === state);
                if (!isCanadianProvince && state && state.length === 2) {
                  // Likely a US state abbreviation
                  return true;
                }
              }
              
              return false;
            });
            console.log(`After client-side US filtering: ${uniqueProperties.length} properties`);
          }
        } else if (filterCountry.length === 2 && filterCountry.includes('Canada') && filterCountry.includes('United States')) {
          // Both countries selected - database query returns all properties
          // Apply permissive client-side filtering using coordinate-based detection to include ALL properties from both countries
          // This catches properties with incorrect country field values
          uniqueProperties = uniqueProperties.filter((property: any) => {
            const country = String(property.country || '').toUpperCase();
            const state = String(property.state || '').toUpperCase();
            
            // Helper functions
            const isCanadianProperty = (): boolean => {
              if (country === 'CA' || country === 'CAN' || country === 'CANADA') return true;
              const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
              if (canadianProvinceCodes.includes(state)) return true;
              if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) return true;
              
              // Check coordinates if available - prioritize coordinate-based detection
              const lat = typeof property.lat === 'number' ? property.lat : parseFloat(String(property.lat));
              const lon = typeof property.lon === 'number' ? property.lon : parseFloat(String(property.lon));
              if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
                if (isLikelyCanadaByCoords(lat, lon)) return true;
              }
              
              return false;
            };
            
            const isUSProperty = (): boolean => {
              if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') return true;
              const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
              const isCanadianProvince = canadianProvinceCodes.includes(state) || 
                CANADIAN_PROVINCES.some(province => province.toUpperCase() === state);
              if ((!country || country === '' || country === 'NULL') && !isCanadianProvince && state && state.length === 2) return true;
              if (country && (country.includes('US') || country.includes('UNITED STATES'))) return true;
              
              // Check coordinates if available and not Canadian
              const lat = typeof property.lat === 'number' ? property.lat : parseFloat(String(property.lat));
              const lon = typeof property.lon === 'number' ? property.lon : parseFloat(String(property.lon));
              if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
                if (lat >= 18 && lat < 85 && lon >= -179 && lon <= -50) {
                  if (!isLikelyCanadaByCoords(lat, lon)) return true;
                }
              }
              
              return false;
            };
            
            // Check if Canadian first (using coordinate-based detection)
            if (isCanadianProperty()) {
              return true;
            }
            
            // Check if US
            if (isUSProperty()) {
              return true;
            }
            
            // If we can't determine, check coordinates - include any property in North America
            const lat = typeof property.lat === 'number' ? property.lat : parseFloat(String(property.lat));
            const lon = typeof property.lon === 'number' ? property.lon : parseFloat(String(property.lon));
            if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
              // Include any property with coordinates in North America (Canada or US)
              if (lat >= 18 && lat < 85 && lon >= -179 && lon <= -50) {
                return true;
              }
            }
            
            // Include all other properties that don't have coordinates (database query already filtered)
            return true;
          });
          console.log(`After client-side filtering (both countries): ${uniqueProperties.length} properties`);
        } else {
          // Fallback: apply filtering if needed
          uniqueProperties = uniqueProperties.filter((property: any) => {
            const country = String(property.country || '').toUpperCase();
            const state = String(property.state || '').toUpperCase();
            
            // Helper functions
            const isCanadianProperty = (): boolean => {
              if (country === 'CA' || country === 'CAN' || country === 'CANADA') return true;
              const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
              if (canadianProvinceCodes.includes(state)) return true;
              if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) return true;
              
              // Check coordinates if available - prioritize coordinate-based detection
              const lat = typeof property.lat === 'number' ? property.lat : parseFloat(String(property.lat));
              const lon = typeof property.lon === 'number' ? property.lon : parseFloat(String(property.lon));
              if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
                if (isLikelyCanadaByCoords(lat, lon)) return true;
              }
              
              return false;
            };
            
            const isUSProperty = (): boolean => {
              if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') return true;
              const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
              const isCanadianProvince = canadianProvinceCodes.includes(state) || 
                CANADIAN_PROVINCES.some(province => province.toUpperCase() === state);
              if ((!country || country === '' || country === 'NULL') && !isCanadianProvince && state && state.length === 2) return true;
              if (country && (country.includes('US') || country.includes('UNITED STATES'))) return true;
              
              // Check coordinates if available and not Canadian
              const lat = typeof property.lat === 'number' ? property.lat : parseFloat(String(property.lat));
              const lon = typeof property.lon === 'number' ? property.lon : parseFloat(String(property.lon));
              if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
                // If coordinates are in North America and not Canadian, likely US
                if (lat >= 18 && lat < 85 && lon >= -179 && lon <= -50) {
                  if (!isLikelyCanadaByCoords(lat, lon)) return true;
                }
              }
              
              return false;
            };
            
            // When both countries are selected, be very permissive
            // Check if property is Canadian first (using coordinate-based detection to catch incorrect country data)
            if (isCanadianProperty()) {
              return true;
            }
            
            // Then check if property is US
            if (isUSProperty()) {
              return true;
            }
            
            // If we can't determine from country/state fields, check coordinates
            // Include any property with coordinates in North America (Canada or US)
            const lat = typeof property.lat === 'number' ? property.lat : parseFloat(String(property.lat));
            const lon = typeof property.lon === 'number' ? property.lon : parseFloat(String(property.lon));
            if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
              // If coordinates are in North America (Canada or US), include it
              if (lat >= 18 && lat < 85 && lon >= -179 && lon <= -50) {
                return true;
              }
            }
            
            // Include all other properties (database query already filtered by country)
            // This ensures we don't accidentally exclude valid properties
            return true;
          });
          console.log(`After client-side filtering (both countries): ${uniqueProperties.length} properties`);
        }
        
        console.log(`Grouped ${transformedData.length} records into ${uniqueProperties.length} unique properties`);
        
        setProperties(uniqueProperties);
      } catch (err) {
        console.error('Error fetching properties:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch properties';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [filterCountry, filterState, filterUnitType, filterRateRange]);

  const propertiesWithCoords = useMemo(
    () => filterPropertiesWithCoordinates(properties),
    [properties]
  );


  // Fit map bounds to show all markers (only if shouldFitBounds is true)
  useEffect(() => {
    if (map && propertiesWithCoords.length > 0 && shouldFitBounds) {
      const bounds = new google.maps.LatLngBounds();
      propertiesWithCoords.forEach((property) => {
        bounds.extend({
          lat: property.coordinates[0],
          lng: property.coordinates[1],
        });
      });
      map.fitBounds(bounds);
    }
  }, [map, propertiesWithCoords, shouldFitBounds]);
  
  // When map is loaded and we have specific coordinates from URL, center and zoom to that location
  useEffect(() => {
    if (map && !shouldFitBounds && mapCenter && mapZoom && !hasCenteredFromUrlRef.current) {
      // Only center/zoom if coordinates are different from defaults (meaning we have URL params)
      const isFromUrl = mapCenter.lat !== defaultCenter.lat || mapCenter.lng !== defaultCenter.lng || mapZoom !== defaultZoom;
      
      if (isFromUrl) {
        map.setCenter(mapCenter);
        map.setZoom(mapZoom);
        hasCenteredFromUrlRef.current = true;
        
        // Try to find and select the property at these coordinates
        if (propertiesWithCoords.length > 0) {
          const targetProperty = propertiesWithCoords.find((property) => {
            const [lat, lon] = property.coordinates;
            // Check if coordinates are close (within ~0.01 degrees, roughly 1km)
            const latDiff = Math.abs(lat - mapCenter.lat);
            const lonDiff = Math.abs(lon - mapCenter.lng);
            return latDiff < 0.01 && lonDiff < 0.01;
          });
          
          if (targetProperty) {
            setSelectedProperty(targetProperty);
          }
        }
      }
    }
  }, [map, mapCenter, mapZoom, shouldFitBounds, propertiesWithCoords]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    // Clean up clusterer and markers
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    markersRef.current = [];
    setMap(null);
  }, []);

  // Manage markers (no clustering - show all markers individually)
  useEffect(() => {
    if (!map || !isClient) {
      // Clean up if no map
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      return;
    }

    // If no properties, clear markers
    if (propertiesWithCoords.length === 0) {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      return;
    }

    // Clean up old markers first
    markersRef.current.forEach(marker => {
      marker.setMap(null);
      google.maps.event.clearInstanceListeners(marker);
    });
    markersRef.current = [];

    // Clear clusterer if it exists
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    // Create blue marker icon
    const blueMarkerIcon = {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: '#3B82F6', // Blue color
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 8,
    };

    // Alternative: Use a pin-shaped marker
    const bluePinIcon = {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
        <svg width="24" height="40" viewBox="0 0 24 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 8.5 12 28 12 28s12-19.5 12-28C24 5.373 18.627 0 12 0z" fill="#3B82F6"/>
          <circle cx="12" cy="12" r="6" fill="#FFFFFF"/>
        </svg>
      `),
      scaledSize: new google.maps.Size(24, 40),
      anchor: new google.maps.Point(12, 40),
    };

    // Create native Google Maps markers and add them directly to the map
    const markers = propertiesWithCoords.map((property) => {
      const marker = new google.maps.Marker({
        position: {
          lat: property.coordinates[0],
          lng: property.coordinates[1],
        },
        map: map, // Add marker directly to map (no clustering)
        icon: bluePinIcon, // Use blue pin icon
      });

      // Add click listener to open InfoWindow
      marker.addListener('click', () => {
        setSelectedProperty(property as PropertyWithCoords);
      });

      return marker;
    });

    // Update markers ref
    markersRef.current = markers;

    // Cleanup function
    return () => {
      // Clean up markers when dependencies change
      markers.forEach(marker => {
        marker.setMap(null);
        google.maps.event.clearInstanceListeners(marker);
      });
    };
  }, [map, isClient, propertiesWithCoords]);

  const uniqueStates = useMemo(() => {
    // Filter properties by country if only one country is selected
    let propertiesToUse = allProperties;
    if (filterCountry.length === 1) {
      if (filterCountry.includes('United States')) {
        propertiesToUse = allProperties.filter((p) => {
          const country = p.country?.toLowerCase() || '';
          return country === 'usa' || country === 'united states' || country === 'us';
        });
      } else if (filterCountry.includes('Canada')) {
        propertiesToUse = allProperties.filter((p) => {
          const country = p.country?.toLowerCase() || '';
          return country === 'canada' || country === 'ca';
        });
      }
    }
    
    // Use filtered properties to show states
    const allStates = Array.from(new Set(propertiesToUse.map((p) => p.state).filter(Boolean))) as string[];
    
    // Create a map to combine abbreviations with full names
    const stateMap = new Map<string, string>();
    
    allStates.forEach((state) => {
      const upperState = state.toUpperCase();
      
      // If it's an abbreviation, use the full name
      if (STATE_ABBREVIATIONS[upperState]) {
        const fullName = STATE_ABBREVIATIONS[upperState];
        // Always skip Canadian provinces from state filter
        if (CANADIAN_PROVINCES.includes(fullName)) {
          return;
        }
        // If we haven't seen this full name yet, or if we have but want to prefer full name
        if (!stateMap.has(fullName)) {
          stateMap.set(fullName, fullName);
        }
      } else {
        // Check if this full name has an abbreviation in our list
        const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
          ([_, fullName]) => fullName.toLowerCase() === state.toLowerCase()
        );
        
        if (abbreviation) {
          const fullName = abbreviation[1];
          // Always skip Canadian provinces from state filter
          if (CANADIAN_PROVINCES.includes(fullName)) {
            return;
          }
          // Use the full name (standardized)
          stateMap.set(fullName, fullName);
        } else {
          // Not a known abbreviation or full name
          const isCanadianProvince = CANADIAN_PROVINCES.some(province => province.toLowerCase() === state.toLowerCase());
          // Always skip Canadian provinces from state filter
          if (!isCanadianProvince) {
          stateMap.set(state, state);
          }
        }
      }
    });
    
    return Array.from(stateMap.values()).sort();
  }, [allProperties, filterCountry]);

  // Helper function to get filtered properties matching current filters (same logic as displayed properties)
  // This ensures state counts match the displayed count
  const getFilteredPropertiesForCounting = useCallback((propertiesToFilter: SageProperty[]) => {
    // Helper functions that match the exact client-side filter logic
    const isCanadianProperty = (property: any): boolean => {
      const country = String(property.country || '').toUpperCase();
      const state = String(property.state || '').toUpperCase();
      
      if (country === 'CA' || country === 'CAN' || country === 'CANADA') return true;
      const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      if (canadianProvinceCodes.includes(state)) return true;
      if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) return true;
      return false;
    };
    
    const isUSProperty = (property: any): boolean => {
      const country = String(property.country || '').toUpperCase();
      const state = String(property.state || '').toUpperCase();
      
      if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') return true;
      const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      const isCanadianProvince = canadianProvinceCodes.includes(state) || CANADIAN_PROVINCES.some(province => province.toUpperCase() === state);
      if ((!country || country === '' || country === 'NULL') && !isCanadianProvince && state && state.length === 2) return true;
      if (country && (country.includes('US') || country.includes('UNITED STATES'))) return true;
      return false;
    };
    
    let filtered = propertiesToFilter;
    
    // Apply country filter
    if (filterCountry.length === 1) {
      if (filterCountry.includes('United States')) {
        filtered = filtered.filter((p) => isUSProperty(p));
      } else if (filterCountry.includes('Canada')) {
        filtered = filtered.filter((p) => isCanadianProperty(p));
      }
    }
    
    // Apply state filter (same logic as fetchProperties)
    if (filterState.length > 0) {
      const filterStateSet = new Set<string>();
      filterState.forEach((state) => {
        filterStateSet.add(state);
        filterStateSet.add(state.toUpperCase());
        filterStateSet.add(state.toLowerCase());
        filterStateSet.add(state.charAt(0).toUpperCase() + state.slice(1).toLowerCase());
        
        const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
          ([_, fullName]) => fullName.toLowerCase() === state.toLowerCase()
        );
        if (abbreviation) {
          filterStateSet.add(abbreviation[0]);
          filterStateSet.add(abbreviation[0].toUpperCase());
        }
        
        if (STATE_ABBREVIATIONS[state.toUpperCase()]) {
          const fullName = STATE_ABBREVIATIONS[state.toUpperCase()];
          filterStateSet.add(fullName);
          filterStateSet.add(fullName.toUpperCase());
          filterStateSet.add(fullName.toLowerCase());
        }
      });
      
      filtered = filtered.filter((property: any) => {
        if (!property.state) return false;
        const propertyState = String(property.state);
        return filterStateSet.has(propertyState) || 
               filterStateSet.has(propertyState.toUpperCase()) ||
               filterStateSet.has(propertyState.toLowerCase()) ||
               filterStateSet.has(propertyState.charAt(0).toUpperCase() + propertyState.slice(1).toLowerCase());
      });
    }
    
    // Apply unit type filter
    if (filterUnitType.length > 0) {
      filtered = filtered.filter((p) => {
        const prop = p as any;
        if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
          return prop.all_unit_types.some((ut: string) => filterUnitType.includes(ut));
        }
        return p.unit_type && filterUnitType.includes(p.unit_type);
      });
    }
    
    // Apply rate range filter
    if (filterRateRange.length > 0) {
      filtered = filtered.filter((p) => {
        const prop = p as any;
        return prop.rate_category && filterRateRange.includes(prop.rate_category);
      });
    }
    
    // Only include properties with valid coordinates
    return filterPropertiesWithCoordinates(filtered);
  }, [filterCountry, filterState, filterUnitType, filterRateRange]);

  // Calculate state counts - for each state, show what the count would be if that state were selected
  // This ensures the dropdown count matches what would be displayed when that state is selected
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Helper functions for country detection (same as getFilteredPropertiesForCounting)
    const isCanadianProperty = (property: any): boolean => {
      const country = String(property.country || '').toUpperCase();
      const state = String(property.state || '').toUpperCase();
      if (country === 'CA' || country === 'CAN' || country === 'CANADA') return true;
      const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      if (canadianProvinceCodes.includes(state)) return true;
      if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) return true;
      return false;
    };
    
    const isUSProperty = (property: any): boolean => {
      const country = String(property.country || '').toUpperCase();
      const state = String(property.state || '').toUpperCase();
      if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') return true;
      const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      const isCanadianProvince = canadianProvinceCodes.includes(state) || CANADIAN_PROVINCES.some(province => province.toUpperCase() === state);
      if ((!country || country === '' || country === 'NULL') && !isCanadianProvince && state && state.length === 2) return true;
      if (country && (country.includes('US') || country.includes('UNITED STATES'))) return true;
      return false;
    };
    
    // Start with all properties, apply filters EXCEPT state filter
    let propertiesToCount = allProperties;
    
    // Apply country filter
    if (filterCountry.length === 1) {
      if (filterCountry.includes('United States')) {
        propertiesToCount = propertiesToCount.filter((p) => isUSProperty(p));
      } else if (filterCountry.includes('Canada')) {
        propertiesToCount = propertiesToCount.filter((p) => isCanadianProperty(p));
      }
    }
    
    // Apply unit type filter
    if (filterUnitType.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => {
        const prop = p as any;
        if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
          return prop.all_unit_types.some((ut: string) => filterUnitType.includes(ut));
        }
        return p.unit_type && filterUnitType.includes(p.unit_type);
      });
    }
    
    // Apply rate range filter
    if (filterRateRange.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => {
        const prop = p as any;
        return prop.rate_category && filterRateRange.includes(prop.rate_category);
      });
    }
    
    // Only include properties with valid coordinates
    const propertiesWithValidCoords = filterPropertiesWithCoordinates(propertiesToCount);
    
    // Group by property_name and state to count unique properties per state
    const propertiesByState = new Map<string, Set<string>>();
    
    propertiesWithValidCoords.forEach((p) => {
      const state = p.state;
      const propertyName = p.property_name;
      if (!state || !propertyName) return;
      
      // Normalize state name (convert abbreviation to full name if applicable)
      const stateStr = String(state);
      const upperState = stateStr.toUpperCase();
      let normalizedState = stateStr;
      
      if (STATE_ABBREVIATIONS[upperState]) {
        normalizedState = STATE_ABBREVIATIONS[upperState];
      } else {
        const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
          ([_, fullName]) => fullName.toLowerCase() === stateStr.toLowerCase()
        );
        if (abbreviation) {
          normalizedState = abbreviation[1];
        }
      }
      
      // Add property to the set for this state
      if (!propertiesByState.has(normalizedState)) {
        propertiesByState.set(normalizedState, new Set());
      }
      propertiesByState.get(normalizedState)!.add(propertyName);
    });
    
    // Count unique properties per state
    propertiesByState.forEach((propertySet, state) => {
      counts[state] = propertySet.size;
    });
    
    return counts;
  }, [allProperties, filterUnitType, filterRateRange]);

  // Helper function to check if a state matches the filter (defined early for use in calculatedDisplayedCount)
  const stateMatchesFilter = useCallback((state: string | null, filterStates: string[]): boolean => {
    if (!state) return false;
    if (filterStates.length === 0) return true; // No filter = all match
    
    const filterStateSet = new Set<string>();
    filterStates.forEach((s) => {
      filterStateSet.add(s);
      filterStateSet.add(s.toUpperCase());
      filterStateSet.add(s.toLowerCase());
      filterStateSet.add(s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
      
      // Add abbreviation if it's a full name
      const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
        ([_, fullName]) => fullName.toLowerCase() === s.toLowerCase()
      );
      if (abbreviation) {
        filterStateSet.add(abbreviation[0]);
        filterStateSet.add(abbreviation[0].toUpperCase());
      }
      
      // Add full name if it's an abbreviation
      if (STATE_ABBREVIATIONS[s.toUpperCase()]) {
        const fullName = STATE_ABBREVIATIONS[s.toUpperCase()];
        filterStateSet.add(fullName);
        filterStateSet.add(fullName.toUpperCase());
        filterStateSet.add(fullName.toLowerCase());
      }
    });
    
    const stateStr = String(state);
    return filterStateSet.has(stateStr) || 
           filterStateSet.has(stateStr.toUpperCase()) ||
           filterStateSet.has(stateStr.toLowerCase()) ||
           filterStateSet.has(stateStr.charAt(0).toUpperCase() + stateStr.slice(1).toLowerCase());
  }, []);

  // Calculate displayed count using the EXACT SAME logic as countryCounts
  // This ensures the displayed count matches the country dropdown filter counts
  // Groups by property_name to count unique properties (not individual records)
  const calculatedDisplayedCount = useMemo(() => {
    // Apply unit type filter if active
    let propertiesToCount = allProperties;
    if (filterUnitType.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => {
        const prop = p as any;
        if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
          return prop.all_unit_types.some((ut: string) => filterUnitType.includes(ut));
        }
        return p.unit_type && filterUnitType.includes(p.unit_type);
      });
    }
    
    // Apply rate range filter if active
    if (filterRateRange.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => {
        const prop = p as any;
        return prop.rate_category && filterRateRange.includes(prop.rate_category);
      });
    }
    
    // Apply state filter if active
    if (filterState.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => stateMatchesFilter(p.state, filterState));
    }
    
    // Only count properties with valid coordinates (matching what's shown on the map)
    const propertiesWithValidCoords = filterPropertiesWithCoordinates(propertiesToCount);
    
    // Group by property_name to count unique properties (same as countryCounts logic)
    const uniquePropertyNames = new Set<string>();
    
    // Helper function to check if coordinates are likely in Canada (same as countryCounts)
    const isLikelyCanadaByCoords = (lat: number, lon: number): boolean => {
      // Check if within overall Canada bounds
      if (lat < 41.7 || lat >= 85 || lon < -141 || lon > -52) {
        return false;
      }
      
      // Northern territories (above 60°N) - definitely Canada
      if (lat >= 60) {
        return true;
      }
      
      // Eastern Canada (Ontario, Quebec, Maritimes) - 41.7°N to 60°N, -95°W to -52°W
      if (lat >= 41.7 && lat < 60 && lon >= -95 && lon <= -52) {
        return true;
      }
      
      // Western provinces (BC, Alberta, Saskatchewan, Manitoba) - 48°N to 60°N, -139°W to -89°W
      if (lat >= 48 && lat < 60 && lon >= -139 && lon <= -89) {
        return true;
      }
      
      // Border region (49°N to 60°N) - check more carefully
      if (lat >= 49 && lat < 60) {
        if (lon < -100) {
          return true;
        }
        if (lon >= -100 && lon <= -89 && lat >= 50) {
          return true;
        }
        if (lon >= -95 && lon <= -89 && lat >= 49) {
          return true;
        }
      }
      
      // Border region near US-Canada border (45°N to 49°N)
      if (lat >= 45 && lat < 49) {
        if (lon >= -75 && lon <= -52) {
          return true;
        }
        if (lon >= -95 && lon < -75) {
          if (lat >= 46) {
            return true;
          }
          if (lon >= -80) {
            return true;
          }
        }
      }
      
      // Additional check: 41.7°N to 45°N - could be southern Ontario
      if (lat >= 41.7 && lat < 45 && lon >= -95.2 && lon <= -74.3) {
        return true;
      }
      
      return false;
    };
    
    // Helper functions that match the EXACT countryCounts logic
    const isCanadianProperty = (property: any): boolean => {
      const country = String(property.country || '').toUpperCase();
      const state = String(property.state || '').toUpperCase();
      
      if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
        return true;
      }
      
      const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      if (canadianProvinceCodes.includes(state)) {
        return true;
      }
      
      if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) {
        return true;
      }
      
      return false;
    };
    
    const isUSProperty = (property: any): boolean => {
      const country = String(property.country || '').toUpperCase();
      const state = String(property.state || '').toUpperCase();
      
      if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
        return true;
      }
      
      const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      const isCanadianProvince = canadianProvinceCodes.includes(state) || 
        CANADIAN_PROVINCES.some(province => province.toUpperCase() === state);
      
      if ((!country || country === '' || country === 'NULL') && !isCanadianProvince && state && state.length === 2) {
        return true;
      }
      
      if (country && (country.includes('US') || country.includes('UNITED STATES'))) {
        return true;
      }
      
      return false;
    };
    
    // Determine country for each property using the same logic as countryCounts
    // Prioritize coordinate-based detection when coordinates are available
    propertiesWithValidCoords.forEach((p) => {
      const propertyName = p.property_name;
      if (!propertyName) return;
      
      let normalizedCountry: string | null = null;
      const coords = p.coordinates;
      
      // Prioritize coordinate-based detection when coordinates are available
      if (coords) {
        const [lat, lon] = coords;
        
        if (isLikelyCanadaByCoords(lat, lon)) {
          normalizedCountry = 'Canada';
        } else if (lat >= 18 && lat < 85 && lon >= -179 && lon <= -50) {
          normalizedCountry = 'United States';
        }
      }
      
      // If coordinate-based detection didn't work, fall back to country/state fields
      if (!normalizedCountry) {
        if (isCanadianProperty(p)) {
          normalizedCountry = 'Canada';
        } else if (isUSProperty(p)) {
          normalizedCountry = 'United States';
        } else {
          return; // Skip properties we can't determine
        }
      }
      
      // Apply country filter if only one country is selected
      if (filterCountry.length === 1) {
        if (filterCountry.includes('United States') && normalizedCountry !== 'United States') {
          return; // Skip if doesn't match filter
        }
        if (filterCountry.includes('Canada') && normalizedCountry !== 'Canada') {
          return; // Skip if doesn't match filter
        }
      }
      
      // Add to unique properties count
      uniquePropertyNames.add(propertyName);
    });
    
    return uniquePropertyNames.size;
  }, [allProperties, filterCountry, filterState, filterUnitType, filterRateRange, stateMatchesFilter]);

  // Update displayed count to match calculated count (ensures it matches dropdown counts)
  useEffect(() => {
    if (calculatedDisplayedCount !== displayedCount && calculatedDisplayedCount > 0) {
      setIsAnimating(true);
      setDisplayedCount(calculatedDisplayedCount);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [calculatedDisplayedCount, displayedCount]);

  // Calculate country counts from properties with valid coordinates
  // Count unique properties (not sites) per country - only count properties that can be plotted on the map
  // Use the EXACT same country detection logic as the client-side filter
  // Also respect unit type and rate range filters when counting
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Apply unit type filter if active
    let propertiesToCount = allProperties;
    if (filterUnitType.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => {
        const prop = p as any;
        if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
          return prop.all_unit_types.some((ut: string) => filterUnitType.includes(ut));
        }
        return p.unit_type && filterUnitType.includes(p.unit_type);
      });
    }
    
    // Apply rate range filter if active
    if (filterRateRange.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => {
        const prop = p as any;
        return prop.rate_category && filterRateRange.includes(prop.rate_category);
      });
    }
    
    // Only count properties with valid coordinates (matching what's shown on the map)
    const propertiesWithValidCoords = filterPropertiesWithCoordinates(propertiesToCount);
    
    // Group by property_name to count unique properties per country
    const propertiesByCountry = new Map<string, Set<string>>();
    
    // Helper function that matches the EXACT client-side filter logic
    const isCanadianProperty = (property: any): boolean => {
      const country = String(property.country || '').toUpperCase();
      const state = String(property.state || '').toUpperCase();
      
      // Check country field
      if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
        return true;
      }
      
      // Check if state is a Canadian province
      const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      if (canadianProvinceCodes.includes(state)) {
        return true;
      }
      
      // Check if state is a Canadian province full name
      if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) {
        return true;
      }
      
      return false;
    };
    
    const isUSProperty = (property: any): boolean => {
      const country = String(property.country || '').toUpperCase();
      const state = String(property.state || '').toUpperCase();
      
      // Check country field
      if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
        return true;
      }
      
      // If country is not set but state is a US state (not a Canadian province), include it
      const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
      const isCanadianProvince = canadianProvinceCodes.includes(state) || 
        CANADIAN_PROVINCES.some(province => province.toUpperCase() === state);
      
      if ((!country || country === '' || country === 'NULL') && !isCanadianProvince && state && state.length === 2) {
        // Likely a US state abbreviation
        return true;
      }
      
      // If country field indicates US
      if (country && (country.includes('US') || country.includes('UNITED STATES'))) {
        return true;
      }
      
      return false;
    };
    
    // Helper function to check if coordinates are likely in Canada
    // Canada spans approximately 41.7°N to 83°N and -141°W to -52°W
    const isLikelyCanadaByCoords = (lat: number, lon: number): boolean => {
      // Check if within overall Canada bounds
      if (lat < 41.7 || lat >= 85 || lon < -141 || lon > -52) {
        return false;
      }
      
      // Northern territories (above 60°N) - definitely Canada
      if (lat >= 60) {
        return true;
      }
      
      // Eastern Canada (Ontario, Quebec, Maritimes) - 41.7°N to 60°N, -95°W to -52°W
      // This covers most of Eastern Canada including major cities like Toronto, Montreal
      if (lat >= 41.7 && lat < 60 && lon >= -95 && lon <= -52) {
        return true;
      }
      
      // Western provinces (BC, Alberta, Saskatchewan, Manitoba) - 48°N to 60°N, -139°W to -89°W
      if (lat >= 48 && lat < 60 && lon >= -139 && lon <= -89) {
        return true;
      }
      
      // Border region (49°N to 60°N) - check more carefully
      if (lat >= 49 && lat < 60) {
        // West of -100°W is likely Canada (BC, Alberta)
        if (lon < -100) {
          return true;
        }
        // Between -100°W and -89°W, above 50°N is likely Canada (Manitoba)
        if (lon >= -100 && lon <= -89 && lat >= 50) {
          return true;
        }
        // Even between -89°W and -95°W at this latitude could be Ontario
        if (lon >= -95 && lon <= -89 && lat >= 49) {
          return true;
        }
      }
      
      // Border region near US-Canada border (45°N to 49°N)
      // Check if longitude suggests Canada vs US
      if (lat >= 45 && lat < 49) {
        // East of -75°W is likely Canada (Quebec, Maritimes)
        if (lon >= -75 && lon <= -52) {
          return true;
        }
        // Between -95°W and -75°W, this could be Ontario or border states
        // Be more inclusive - if it's above 46°N, it's more likely Canada
        if (lon >= -95 && lon < -75) {
          if (lat >= 46) {
            return true;
          }
          // For 45-46°N in this region, check longitude more carefully
          // Closer to -75°W is more likely Canada (eastern Canada)
          if (lon >= -80) {
            return true;
          }
        }
      }
      
      // Additional check: 41.7°N to 45°N - could be southern Ontario
      // Ontario extends down to 41.7°N, between -95.2°W and -74.3°W
      if (lat >= 41.7 && lat < 45 && lon >= -95.2 && lon <= -74.3) {
        return true;
      }
      
      return false;
    };
    
    propertiesWithValidCoords.forEach((p) => {
      const propertyName = p.property_name;
      if (!propertyName) return;
      
      let normalizedCountry: string | null = null;
      const coords = p.coordinates;
      
      // Prioritize coordinate-based detection when coordinates are available
      // This helps catch properties with incorrect country/state data
      if (coords) {
        const [lat, lon] = coords;
        
        if (isLikelyCanadaByCoords(lat, lon)) {
          normalizedCountry = 'Canada';
        } else if (lat >= 18 && lat < 85 && lon >= -179 && lon <= -50) {
          // Check if it's likely in USA (includes Alaska and Hawaii)
          normalizedCountry = 'United States';
        }
      }
      
      // If coordinate-based detection didn't work, fall back to country/state fields
      if (!normalizedCountry) {
        // Use the exact same logic as client-side filter
        if (isCanadianProperty(p)) {
          normalizedCountry = 'Canada';
        } else if (isUSProperty(p)) {
          normalizedCountry = 'United States';
        } else {
          // If no country/state match and no coordinates, skip this property
          return;
        }
      }
      
      // Only count USA and Canada
      if (normalizedCountry !== 'United States' && normalizedCountry !== 'Canada') {
        return;
      }
      
      // Add property to the set for this country
      if (!propertiesByCountry.has(normalizedCountry)) {
        propertiesByCountry.set(normalizedCountry, new Set());
      }
      propertiesByCountry.get(normalizedCountry)!.add(propertyName);
    });
    
    // Count unique properties per country
    propertiesByCountry.forEach((propertySet, country) => {
      counts[country] = propertySet.size;
    });
    
    // Ensure both countries are in the counts object (even if 0)
    if (!counts['United States']) counts['United States'] = 0;
    if (!counts['Canada']) counts['Canada'] = 0;
    
    return counts;
  }, [allProperties, filterUnitType, filterRateRange]);

  // Get available unit types based on selected states
  const availableUnitTypes = useMemo(() => {
    if (filterState.length === 0) {
      // No state filter - get all unit types from all properties
      const unitTypesSet = new Set<string>();
      allProperties.forEach((p) => {
        const prop = p as any; // Type assertion for transformed properties
        if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
          prop.all_unit_types.forEach((ut: string) => unitTypesSet.add(ut));
        } else if (p.unit_type) {
          unitTypesSet.add(p.unit_type);
        }
      });
      return Array.from(unitTypesSet).sort();
    } else {
      // Filter by selected states
      const unitTypesSet = new Set<string>();
      allProperties.forEach((p) => {
        if (stateMatchesFilter(p.state, filterState)) {
          const prop = p as any; // Type assertion for transformed properties
          if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
            prop.all_unit_types.forEach((ut: string) => unitTypesSet.add(ut));
          } else if (p.unit_type) {
            unitTypesSet.add(p.unit_type);
          }
        }
      });
      return Array.from(unitTypesSet).sort();
    }
  }, [allProperties, filterState, stateMatchesFilter]);

  // Get unit type counts for filtering
  const unitTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let propertiesToCount = allProperties;
    
    // Apply country filter if only one country is selected
    if (filterCountry.length === 1) {
      const isCanadianProperty = (property: any): boolean => {
        const country = String(property.country || '').toUpperCase();
        const state = String(property.state || '').toUpperCase();
        if (country === 'CA' || country === 'CAN' || country === 'CANADA') return true;
        const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
        if (canadianProvinceCodes.includes(state)) return true;
        if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) return true;
        return false;
      };
      const isUSProperty = (property: any): boolean => {
        const country = String(property.country || '').toUpperCase();
        const state = String(property.state || '').toUpperCase();
        if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') return true;
        const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
        const isCanadianProvince = canadianProvinceCodes.includes(state) || CANADIAN_PROVINCES.some(province => province.toUpperCase() === state);
        if ((!country || country === '' || country === 'NULL') && !isCanadianProvince && state && state.length === 2) return true;
        if (country && (country.includes('US') || country.includes('UNITED STATES'))) return true;
        return false;
      };
      if (filterCountry.includes('United States')) {
        propertiesToCount = propertiesToCount.filter((p) => isUSProperty(p));
      } else if (filterCountry.includes('Canada')) {
        propertiesToCount = propertiesToCount.filter((p) => isCanadianProperty(p));
      }
    }
    
    // Apply state filter
    if (filterState.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => stateMatchesFilter(p.state, filterState));
    }
    
    // Apply rate range filter if active
    if (filterRateRange.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => {
        const prop = p as any;
        return prop.rate_category && filterRateRange.includes(prop.rate_category);
      });
    }
    
    // Only count properties with valid coordinates (matching what's shown on the map)
    propertiesToCount = filterPropertiesWithCoordinates(propertiesToCount);
    
    // Group by unit type to count unique properties
    const propertiesByUnitType = new Map<string, Set<string>>();
    
    propertiesToCount.forEach((p) => {
      const prop = p as any; // Type assertion for transformed properties
      const propertyName = p.property_name;
      if (!propertyName) return;
      
      if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
        prop.all_unit_types.forEach((ut: string) => {
          if (!propertiesByUnitType.has(ut)) {
            propertiesByUnitType.set(ut, new Set());
          }
          propertiesByUnitType.get(ut)!.add(propertyName);
        });
      } else if (p.unit_type) {
        const ut = p.unit_type;
        if (!propertiesByUnitType.has(ut)) {
          propertiesByUnitType.set(ut, new Set());
        }
        propertiesByUnitType.get(ut)!.add(propertyName);
      }
    });
    
    // Count unique properties per unit type
    propertiesByUnitType.forEach((propertySet, unitType) => {
      counts[unitType] = propertySet.size;
    });
    
    return counts;
  }, [allProperties, filterCountry, filterState, filterRateRange, stateMatchesFilter]);

  // Get available rate categories based on selected states and unit types
  const availableRateCategories = useMemo(() => {
    const allCategories = ['≤$149', '$150-$249', '$250-$399', '$400-$549', '$550+'];
    const availableCategories = new Set<string>();
    
    const propertiesToCheck = allProperties.filter((p) => {
      const prop = p as any; // Type assertion for transformed properties
      // Check state filter
      const matchesState = filterState.length === 0 || stateMatchesFilter(p.state, filterState);
      // Check unit type filter
      const matchesUnitType = filterUnitType.length === 0 || 
        (prop.all_unit_types && Array.isArray(prop.all_unit_types) && 
         prop.all_unit_types.some((ut: string) => filterUnitType.includes(ut))) ||
        (p.unit_type && filterUnitType.includes(p.unit_type));
      
      return matchesState && matchesUnitType;
    });
    
    propertiesToCheck.forEach((p) => {
      const prop = p as any; // Type assertion for transformed properties
      if (prop.rate_category) {
        availableCategories.add(prop.rate_category);
      }
    });
    
    // Return only categories that have properties, in the original order
    return allCategories.filter((cat) => availableCategories.has(cat));
  }, [allProperties, filterState, filterUnitType, stateMatchesFilter]);

  // Calculate rate category counts based on selected states and unit types
  // Count unique properties (not sites) per rate category - only count properties that can be plotted on the map
  const rateCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    let propertiesToCount = allProperties;
    
    // Apply country filter if only one country is selected
    if (filterCountry.length === 1) {
      const isCanadianProperty = (property: any): boolean => {
        const country = String(property.country || '').toUpperCase();
        const state = String(property.state || '').toUpperCase();
        if (country === 'CA' || country === 'CAN' || country === 'CANADA') return true;
        const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
        if (canadianProvinceCodes.includes(state)) return true;
        if (CANADIAN_PROVINCES.some(province => province.toUpperCase() === state)) return true;
        return false;
      };
      const isUSProperty = (property: any): boolean => {
        const country = String(property.country || '').toUpperCase();
        const state = String(property.state || '').toUpperCase();
        if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') return true;
        const canadianProvinceCodes = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
        const isCanadianProvince = canadianProvinceCodes.includes(state) || CANADIAN_PROVINCES.some(province => province.toUpperCase() === state);
        if ((!country || country === '' || country === 'NULL') && !isCanadianProvince && state && state.length === 2) return true;
        if (country && (country.includes('US') || country.includes('UNITED STATES'))) return true;
        return false;
      };
      if (filterCountry.includes('United States')) {
        propertiesToCount = propertiesToCount.filter((p) => isUSProperty(p));
      } else if (filterCountry.includes('Canada')) {
        propertiesToCount = propertiesToCount.filter((p) => isCanadianProperty(p));
      }
    }
    
    // Apply state filter
    if (filterState.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => stateMatchesFilter(p.state, filterState));
    }
    
    // Apply unit type filter
    if (filterUnitType.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => {
        const prop = p as any;
        if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
          return prop.all_unit_types.some((ut: string) => filterUnitType.includes(ut));
        }
        return p.unit_type && filterUnitType.includes(p.unit_type);
      });
    }
    
    // Only count properties with valid coordinates (matching what's shown on the map)
    propertiesToCount = filterPropertiesWithCoordinates(propertiesToCount);
    
    // Group by rate category to count unique properties
    const propertiesByRateCategory = new Map<string, Set<string>>();
    
    propertiesToCount.forEach((p) => {
      const prop = p as any; // Type assertion for transformed properties
      const propertyName = p.property_name;
      if (!propertyName || !prop.rate_category) return;
      
      if (!propertiesByRateCategory.has(prop.rate_category)) {
        propertiesByRateCategory.set(prop.rate_category, new Set());
      }
      propertiesByRateCategory.get(prop.rate_category)!.add(propertyName);
    });
    
    // Count unique properties per rate category
    propertiesByRateCategory.forEach((propertySet, category) => {
      counts[category] = propertySet.size;
    });
    
    return counts;
  }, [allProperties, filterCountry, filterState, filterUnitType, stateMatchesFilter]);

  // Clear selected unit types that are no longer available when states change
  useEffect(() => {
    if (filterUnitType.length > 0 && availableUnitTypes.length > 0) {
      const validUnitTypes = filterUnitType.filter((ut) => availableUnitTypes.includes(ut));
      if (validUnitTypes.length !== filterUnitType.length) {
        setFilterUnitType(validUnitTypes);
      }
    }
  }, [availableUnitTypes, filterUnitType, setFilterUnitType]);

  // Clear selected rate ranges that are no longer available when states or unit types change
  useEffect(() => {
    if (filterRateRange.length > 0 && availableRateCategories.length > 0) {
      const validRateRanges = filterRateRange.filter((rr) => availableRateCategories.includes(rr));
      if (validRateRanges.length !== filterRateRange.length) {
        setFilterRateRange(validRateRanges);
      }
    }
  }, [availableRateCategories, filterRateRange, setFilterRateRange]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Debug: Log API key status (first few chars only for security)
  useEffect(() => {
    if (apiKey) {
      console.log('Google Maps API Key loaded:', apiKey.substring(0, 10) + '...');
    } else {
      console.warn('Google Maps API Key not found in environment variables');
    }
  }, [apiKey]);

  // useLoadScript must be called unconditionally (rules of hooks)
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries: libraries,
  });

  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (loadError) {
      console.error('Google Maps load error:', loadError);
      setMapError(loadError.message || 'Failed to load Google Maps');
    }
  }, [loadError]);

  useEffect(() => {
    console.log('Google Maps state:', { isLoaded, loadError: loadError?.message, apiKey: apiKey ? 'present' : 'missing' });
    
    // Timeout to detect if script isn't loading
    if (!isLoaded && !loadError && apiKey) {
      const timeout = setTimeout(() => {
        console.warn('Google Maps script taking longer than expected to load. Check API key and network.');
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isLoaded, loadError, apiKey]);

  // Show loading state only in map column, not in sidebar
  if (!isClient && showMap) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  // For sidebar, show empty content while initializing
  if (!isClient && !showMap) {
    return <div className="w-full space-y-6"></div>;
  }

  if (!apiKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Google Maps API Key Required</h3>
        <p className="text-yellow-600 mb-4">
          Please add your Google Maps API key to <code className="bg-yellow-100 px-2 py-1 rounded">.env.local</code>:
        </p>
        <code className="block bg-yellow-100 p-3 rounded text-sm">
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
        </code>
        <p className="text-sm text-yellow-600 mt-4">
          Get your API key from:{' '}
          <a
            href="https://console.cloud.google.com/google/maps-apis"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Google Cloud Console
          </a>
        </p>
        <p className="text-sm text-yellow-600 mt-2">
          After adding the key, restart your development server.
        </p>
      </div>
    );
  }

  if (loadError || mapError) {
    const isApiNotActivated = loadError?.message?.includes('ApiNotActivatedMapError') || 
                              loadError?.message?.includes('ApiNotActivated');
    
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Google Maps Error</h3>
        <p className="text-red-600 mb-4 font-medium">
          {loadError?.message || mapError || 'Failed to load Google Maps'}
        </p>
        
        {isApiNotActivated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 font-semibold mb-2">⚠️ Maps JavaScript API Not Enabled</p>
            <p className="text-yellow-700 text-sm mb-3">
              Your API key exists, but the &quot;Maps JavaScript API&quot; is not enabled for your Google Cloud project.
            </p>
            <div className="text-sm text-yellow-700 space-y-2">
              <p><strong>To fix this:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Go to <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console → APIs & Services → Library</a></li>
                <li>Search for &quot;Maps JavaScript API&quot;</li>
                <li>Click on it and press the &quot;Enable&quot; button</li>
                <li>Wait a few minutes for the API to activate</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        )}
        
        <div className="text-sm text-red-700 space-y-2">
          <p><strong>Other common fixes:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Verify your API key is correct in <code className="bg-red-100 px-1 rounded">.env.local</code></li>
            <li>Check that billing is enabled on your Google Cloud project</li>
            <li>Verify API key restrictions allow requests from <code className="bg-red-100 px-1 rounded">localhost:3001/*</code></li>
            <li>Restart your development server after making changes</li>
          </ul>
          <p className="mt-4">
            Check the browser console (F12) for more detailed error messages.
          </p>
        </div>
      </div>
    );
  }

  // Only show loading for map, not for sidebar
  if (!isLoaded && showMap) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Google Maps...</p>
        </div>
      </div>
    );
  }

  // For sidebar, continue to render filters even if maps aren't loaded
  if (!isLoaded && !showMap) {
    // Continue to render filters section below
  }

  // Render only filters if showMap is false
  if (!showMap) {
    return (
      <div className="w-full space-y-6">
        {/* Stats */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100 shadow-sm">
          <div className="flex items-center justify-center gap-4">
            <span 
              key={displayedCount}
              className={`text-4xl font-bold text-green-700 transition-all duration-500 ease-in-out relative inline-block ${
                isAnimating ? 'scale-110 opacity-70' : 'scale-100 opacity-100'
              }`}
            >
              <span className={loading ? 'opacity-60' : ''}>{displayedCount}</span>
              {loading && (
                <span 
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-green-50/60 to-transparent animate-shimmer pointer-events-none"
                  aria-label="Loading property count"
                />
              )}
            </span>
            <span className={`text-xl font-semibold text-gray-700 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>Properties</span>
          </div>
        </div>

        {/* Active Filters Badges */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Filters</span>
              <button
                onClick={() => {
                  clearFilters();
                  // URL will be updated by the useEffect that watches filter changes
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 underline transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterCountry.length < 2 && filterCountry.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium"
                >
                  Country: {country}
                  <button
                    onClick={() => {
                      toggleCountry(country);
                      setFilterState([]);
                    }}
                    className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${country} filter`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
              {filterState.map((state) => (
                <span
                  key={state}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                >
                  State: {state}
                  <button
                    onClick={() => toggleState(state)}
                    className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${state} filter`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
              {filterUnitType.map((unitType) => (
                <span
                  key={unitType}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium"
                >
                  Unit: {unitType}
                  <button
                    onClick={() => toggleUnitType(unitType)}
                    className="hover:bg-orange-200 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${unitType} filter`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
              {filterRateRange.map((rateRange) => (
                <span
                  key={rateRange}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium"
                >
                  Rate: {rateRange}
                  <button
                    onClick={() => toggleRateRange(rateRange)}
                    className="hover:bg-green-200 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${rateRange} filter`}
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters - Collapsible on Mobile */}
        <div className="border-t border-gray-200 pt-5 md:border-t-0 md:pt-0">
          {/* Filter Toggle Button - Mobile Only */}
          <button
            onClick={() => setFiltersExpanded(!filtersExpanded)}
            className="md:hidden w-full flex items-center justify-between py-3 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            aria-expanded={filtersExpanded}
            aria-controls="filters-section"
          >
            <span className="text-sm font-semibold text-gray-900">
              Filters
            </span>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                filtersExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Filters Section - Collapsible on Mobile, Always Visible on Desktop */}
          <div
            id="filters-section"
            className={`space-y-5 relative transition-all duration-300 ease-in-out ${
              filtersExpanded
                ? 'max-h-[2000px] opacity-100 overflow-visible mt-4'
                : 'max-h-0 opacity-0 overflow-hidden md:max-h-none md:opacity-100 md:overflow-visible md:mt-0'
            }`}
          >
            <MultiSelect
              id="country-filter"
              label="Filter by Country"
              placeholder="All Countries"
              allSelectedText="All Countries"
              options={[
                { value: 'United States', label: `United States (${countryCounts['United States'] || 0})` },
                { value: 'Canada', label: `Canada (${countryCounts['Canada'] || 0})` },
              ].filter((option) => {
                const count = countryCounts[option.value] || 0;
                return count > 0;
              })}
              selectedValues={filterCountry}
              onToggle={(country) => {
                toggleCountry(country);
                // Clear state filter when country changes to avoid invalid combinations
                setFilterState([]);
              }}
              onClear={() => {
                setFilterCountry(['United States', 'Canada']);
                setFilterState([]);
              }}
              activeColor="indigo"
            />

            <MultiSelect
              id="state-filter"
              label="Filter by State"
              placeholder="All States"
              options={uniqueStates
                .filter((state) => {
                  const count = stateCounts[state] ?? 0;
                  return count > 0;
                })
                .map((state) => {
                  const count = stateCounts[state] ?? 0;
                  return {
                    value: state,
                    label: `${state} (${count})`,
                  };
                })}
              selectedValues={filterState}
              onToggle={toggleState}
              onClear={() => setFilterState([])}
              activeColor="blue"
            />
            
            <MultiSelect
              id="unit-type-filter"
              label="Filter by Unit Type"
              placeholder="All Unit Types"
              options={availableUnitTypes
                .filter((unitType) => {
                  // Filter out RV-related unit types (case-insensitive)
                  if (unitType.toLowerCase().includes('rv')) {
                    return false;
                  }
                  // Filter out "Lodge or Hotel Room"
                  if (unitType === 'Lodge or Hotel Room') {
                    return false;
                  }
                  // Filter out "Other Glamping Units"
                  if (unitType === 'Other Glamping Units') {
                    return false;
                  }
                  // Filter out "Vacation Rental"
                  if (unitType === 'Vacation Rental') {
                    return false;
                  }
                  // Filter out unit types with 0 count or 4 or fewer properties
                  const count = unitTypeCounts[unitType] || 0;
                  return count > 4;
                })
                .map((unitType) => {
                  const count = unitTypeCounts[unitType] || 0;
                  return {
                  value: unitType,
                    label: `${unitType} (${count})`,
                  };
                })
                .filter((option) => {
                  // Double-check: remove any with 0 count (shouldn't happen due to above filter, but just in case)
                  const count = unitTypeCounts[option.value] || 0;
                  return count > 0;
                })}
              selectedValues={filterUnitType}
              onToggle={toggleUnitType}
              onClear={() => setFilterUnitType([])}
              activeColor="orange"
            />
            
            <MultiSelect
              id="rate-range-filter"
              label="Filter by Avg. Retail Rate Range"
              placeholder="All Rate Ranges"
              options={availableRateCategories
                .filter((category) => (rateCategoryCounts[category] || 0) > 0)
                .map((category) => {
                  const count = rateCategoryCounts[category] || 0;
                  return {
                  value: category,
                    label: `${category} (${count})`,
                  };
                })}
              selectedValues={filterRateRange}
              onToggle={toggleRateRange}
              onClear={() => setFilterRateRange([])}
              activeColor="green"
            />
          </div>
        </div>
      </div>
    );
  }

  // Render only map if showMap is true
  return (
    <div className="w-full h-full">
      {/* Map - Full Viewport Height */}
      <div className="h-full w-full">
        {loading && (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map data...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-full bg-red-50">
            <div className="bg-white border border-red-200 rounded-lg p-6 m-4 max-w-md">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Map</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}
        {!loading && !error && !isLoaded && (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Google Maps script...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
            </div>
          </div>
        )}
        {!loading && !error && isLoaded && (
          <div className="relative h-full w-full">
            {/* Loading overlay when filters are changing */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Updating map...</p>
                </div>
              </div>
            )}
            <GoogleMap
              key={`map-${filterState.join(',')}-${filterUnitType.join(',')}-${filterRateRange.join(',')}`}
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={mapCenter}
              zoom={mapZoom}
              onLoad={onLoad}
              onUnmount={onUnmount}
              options={{
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: true,
                fullscreenControl: true,
              }}
            >
              {selectedProperty && (
                <InfoWindow
                  position={{
                    lat: selectedProperty.coordinates[0],
                    lng: selectedProperty.coordinates[1],
                  }}
                  onCloseClick={() => {
                    setSelectedProperty(null);
                    setCurrentPhotoIndex(0); // Reset photo index when closing
                  }}
                >
                  <div className="max-w-xs p-2">
                    {/* Google Photos - Display at the top */}
                    {(() => {
                      let photos = selectedProperty.google_photos;
                      
                      // Parse photos if it's a string (JSONB from Supabase comes as string)
                      if (photos && typeof photos === 'string') {
                        try {
                          photos = JSON.parse(photos);
                        } catch (e) {
                          console.error('Failed to parse google_photos JSON:', e);
                          photos = null;
                        }
                      }
                      
                      // Return null if no photos - don't show any placeholder
                      if (!photos || !Array.isArray(photos) || photos.length === 0) {
                        return null;
                      }
                      
                      // Ensure currentPhotoIndex is within bounds
                      const safeIndex = Math.max(0, Math.min(currentPhotoIndex, photos.length - 1));
                      const currentPhoto = photos[safeIndex];
                      const photoUrl = getGooglePhotoUrl(currentPhoto);
                      
                      const goToPrevious = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
                      };
                      
                      const goToNext = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
                      };
                      
                      // Generate descriptive alt text
                      const propertyName = selectedProperty.property_name || 'Glamping property';
                      const city = selectedProperty.city || '';
                      const state = selectedProperty.state || '';
                      const location = city && state ? ` in ${city}, ${state}` : state ? ` in ${state}` : '';
                      const altText = `Photo of ${propertyName} glamping property${location} - Image ${safeIndex + 1} of ${photos.length}`;

                      return (
                        <div className="mb-3 -mx-2 -mt-2 relative">
                          <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-gray-100 group">
                            <img
                              src={photoUrl}
                              alt={altText}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error('❌ Image failed to load:', {
                                  url: photoUrl,
                                  property: selectedProperty.property_name,
                                  error: e
                                });
                                // Hide the entire photo container if image fails to load
                                const target = e.target as HTMLImageElement;
                                const container = target.closest('.mb-3') as HTMLElement;
                                if (container) {
                                  container.style.display = 'none';
                                }
                              }}
                              onLoad={() => {
                                console.log('✅ Image loaded successfully for', selectedProperty.property_name);
                              }}
                            />
                            
                            {/* Navigation Arrows - Only show if more than 1 photo */}
                            {photos.length > 1 && (
                              <>
                                {/* Previous Arrow */}
                                <button
                                  onClick={goToPrevious}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20"
                                  aria-label="Previous photo"
                                  type="button"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>
                                
                                {/* Next Arrow */}
                                <button
                                  onClick={goToNext}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 z-20"
                                  aria-label="Next photo"
                                  type="button"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </>
                            )}
                            
                            {/* Photo counter and total */}
                            {photos.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded z-10">
                                {safeIndex + 1} / {photos.length}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    <h3 className="font-bold text-lg mb-2 text-gray-900">
                      {selectedProperty.property_name || 'Unnamed Property'}
                    </h3>
                    {(() => {
                      const addressParts = [];
                      if (selectedProperty.address) {
                        addressParts.push(selectedProperty.address.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
                      }
                      if (selectedProperty.city) {
                        addressParts.push(selectedProperty.city);
                      }
                      if (selectedProperty.state) {
                        addressParts.push(selectedProperty.state);
                      }
                      const fullAddress = addressParts.join(', ');
                      return fullAddress ? (
                        <p className="text-sm text-gray-600 mb-2 truncate" title={fullAddress}>
                          {fullAddress}
                        </p>
                      ) : null;
                    })()}
                    {(selectedProperty as any).all_unit_types && (selectedProperty as any).all_unit_types.length > 0 && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">Unit Types:</span>{' '}
                        {(selectedProperty as any).all_unit_types.join(', ')}
                      </p>
                    )}
                    {(selectedProperty as any).rate_category && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">Avg. Retail Daily Rate:</span>{' '}
                        {(selectedProperty as any).rate_category}
                      </p>
                    )}
                    {((selectedProperty as any).google_rating || (selectedProperty as any).google_user_rating_total) && (
                      <div className="flex items-center gap-2 mb-2">
                        {(selectedProperty as any).google_rating && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                              <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                            </svg>
                            <span className="text-sm font-semibold text-gray-900">
                              {(selectedProperty as any).google_rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {(selectedProperty as any).google_user_rating_total && (
                          <span className="text-sm text-gray-600">
                            ({(selectedProperty as any).google_user_rating_total.toLocaleString()} {((selectedProperty as any).google_user_rating_total === 1) ? 'review' : 'reviews'})
                          </span>
                        )}
                      </div>
                    )}
                    {(() => {
                      // Prioritize google_website_uri, fall back to url if not available
                      const websiteUrl = (selectedProperty as any).google_website_uri || selectedProperty.url;
                      
                      // Show website link if URL exists
                      if (websiteUrl) {
                        return (
                          <a
                            href={websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            Visit Website →
                          </a>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </div>
        )}
        {!loading && !error && properties.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 pointer-events-none z-20">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-gray-600 font-medium">No properties found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

