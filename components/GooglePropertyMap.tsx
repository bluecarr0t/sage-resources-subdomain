'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from './GoogleMapsProvider';
import { supabase } from '@/lib/supabase';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';
import { NationalPark, NationalParkWithCoords, filterParksWithCoordinates } from '@/lib/types/national-parks';
import { useMapContext } from './MapContext';
import MultiSelect from './MultiSelect';
import { slugifyPropertyName } from '@/lib/properties';
import { PopulationLookup } from '@/lib/population/parse-population-csv';
import { fetchPopulationDataFromSupabase, PopulationDataByFIPS } from '@/lib/population/supabase-population';
import { getChangeRanges } from '@/lib/maps/county-boundaries';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// Dynamically import layer components to reduce initial bundle size
const PopulationLayer = dynamic(() => import('./PopulationLayer'), {
  ssr: false,
  loading: () => null, // No loading state needed - layer loads when visible
});

// Default center for lower 48 states (continental USA)
// Optimized to better frame the lower 48 states, excluding most of Canada and Mexico
// Centered on the continental US (approximately central US)
const defaultCenter = {
  lat: 39.5,
  lng: -98.5,
};

// Zoom level 4 provides a wider view showing the entire lower 48 states with more surrounding area
// This shows the full continental United States with some buffer, excluding Alaska and Hawaii
const defaultZoom = 4;
// Mobile default zoom is slightly lower (more zoomed out) for better mobile viewing
const defaultZoomMobile = 3.25;

// Libraries array is now handled by GoogleMapsProvider
// Note: 'places' library is included in GoogleMapsProvider for LocationSearch

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
 * Convert state abbreviation(s) to full state name(s)
 * Handles multiple states separated by commas, and preserves full names
 */
function getFullStateName(state: string | null): string | null {
  if (!state) return null;
  
  // Handle multiple states separated by commas or semicolons
  const stateSeparator = state.includes(',') ? ',' : (state.includes(';') ? ';' : null);
  
  if (stateSeparator) {
    const states = state.split(stateSeparator).map(s => s.trim()).filter(Boolean);
    const fullNames = states.map(s => {
      const upperState = s.toUpperCase();
      return STATE_ABBREVIATIONS[upperState] || s;
    });
    return fullNames.join(', ');
  }
  
  // Single state - check if it's an abbreviation
  const upperState = state.toUpperCase();
  return STATE_ABBREVIATIONS[upperState] || state;
}

/**
 * Normalize property name for consistent grouping and counting
 * Trims whitespace and converts to lowercase to prevent duplicates
 */
function normalizePropertyName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().toLowerCase();
}

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
  const { filterCountry, filterState, filterUnitType, filterRateRange, showNationalParks, showPopulationLayer, populationYear, setFilterCountry, setFilterState, setFilterUnitType, setFilterRateRange, toggleCountry, toggleState, toggleUnitType, toggleRateRange, toggleNationalParks, togglePopulationLayer, setPopulationYear, clearFilters, hasActiveFilters, properties: sharedProperties, allProperties: sharedAllProperties, propertiesLoading: sharedPropertiesLoading, propertiesError: sharedPropertiesError, hasLoadedOnce, isFullscreen, toggleFullscreen } = useMapContext();
  const t = useTranslations('map');
  // Use shared properties from context instead of local state
  const properties = sharedProperties;
  const allProperties = sharedAllProperties;
  const [nationalParks, setNationalParks] = useState<NationalPark[]>([]);
  // Use shared loading/error state from context
  const loading = sharedPropertiesLoading;
  const error = sharedPropertiesError;
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithCoords | null>(null);
  const [selectedPark, setSelectedPark] = useState<NationalParkWithCoords | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [urlInitialized, setUrlInitialized] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false); // Collapsed by default on mobile
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(defaultCenter);
  // Initialize with mobile zoom if on mobile, otherwise desktop zoom
  // This will be updated properly once isMobile is determined, but start with desktop default
  const [mapZoom, setMapZoom] = useState<number>(defaultZoom);
  const [shouldFitBounds, setShouldFitBounds] = useState(false); // Disabled by default - use fixed zoom/center for lower 48 states
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  const [populationLookup, setPopulationLookup] = useState<PopulationLookup | null>(null);
  const [populationFipsLookup, setPopulationFipsLookup] = useState<PopulationDataByFIPS | null>(null);
  const [populationLoading, setPopulationLoading] = useState(false);
  const [populationLayerKey, setPopulationLayerKey] = useState(0);

  // URL parameter handling
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Reset photo index when selected property changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [selectedProperty?.id]);

  // Close property InfoWindow when park is selected
  useEffect(() => {
    if (selectedPark) {
      setSelectedProperty(null);
    }
  }, [selectedPark]);

  // Close park InfoWindow when property is selected
  useEffect(() => {
    if (selectedProperty) {
      setSelectedPark(null);
    }
  }, [selectedProperty]);
  const clustererRef = useRef<any | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const parkMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const hasCenteredFromUrlRef = useRef<boolean>(false);
  const hasJustFittedBoundsRef = useRef<boolean>(false);

  // Ensure we're on the client side and detect mobile
  useEffect(() => {
    setIsClient(true);
    const checkMobile = () => {
      const isMobileCheck = window.innerWidth < 768;
      setIsMobile(isMobileCheck);
      // Update zoom to mobile default if on mobile and no URL params
      if (isMobileCheck && !urlInitialized) {
        const urlLat = searchParams.get('lat');
        const urlLon = searchParams.get('lon');
        if (!urlLat || !urlLon) {
          setMapZoom(defaultZoomMobile);
        }
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [urlInitialized, searchParams]);

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
      // No URL params, reset to defaults and use fixed zoom/center (don't fit bounds)
      // Use mobile zoom on mobile devices, desktop zoom otherwise
      const zoomToUse = isMobile ? defaultZoomMobile : defaultZoom;
      setMapCenter(defaultCenter);
      setMapZoom(zoomToUse);
      setShouldFitBounds(false); // Keep fixed zoom/center for lower 48 states
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

  // Enable fitBounds when state filter is applied, disable when cleared
  useEffect(() => {
    if (!isClient || !urlInitialized) return;
    
    const urlLat = searchParams.get('lat');
    const urlLon = searchParams.get('lon');
    
    // Don't enable fitBounds if there are URL coordinates (user has navigated to a specific location)
    if (urlLat && urlLon) {
      setShouldFitBounds(false);
      hasJustFittedBoundsRef.current = false;
      return;
    }
    
    // Enable fitBounds when state filter is applied
    if (filterState.length > 0) {
      setShouldFitBounds(true);
      // Reset the flag when enabling fitBounds
      hasJustFittedBoundsRef.current = false;
    } else {
      // Disable fitBounds when state filter is cleared
      // The default center/zoom effect will handle resetting the view
      setShouldFitBounds(false);
      hasJustFittedBoundsRef.current = false;
    }
  }, [filterState, isClient, urlInitialized, searchParams]);

  // Watch for changes to lat/lon/zoom URL parameters and update map position
  useEffect(() => {
    if (!isClient || !urlInitialized) return;

    const urlLat = searchParams.get('lat');
    const urlLon = searchParams.get('lon');
    const urlZoom = searchParams.get('zoom');

    // If lat/lon/zoom are provided, use them to center and zoom the map
    if (urlLat && urlLon) {
      const lat = parseFloat(urlLat);
      const lon = parseFloat(urlLon);
      if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
        const newCenter = { lat, lng: lon };
        // Always update mapCenter when URL params change (comparison prevents unnecessary re-renders in map effect)
        setMapCenter(newCenter);
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
      // No lat/lon params, reset to defaults (use fixed zoom/center, don't fit bounds)
      // Use mobile zoom on mobile devices, desktop zoom otherwise
      const zoomToUse = isMobile ? defaultZoomMobile : defaultZoom;
      setMapCenter(defaultCenter);
      setMapZoom(zoomToUse);
      setShouldFitBounds(false); // Keep fixed zoom/center for lower 48 states
      hasCenteredFromUrlRef.current = false;
    }
  }, [isClient, urlInitialized, searchParams]);

  // Use shared allProperties from context for filter option calculation
  // No need to fetch separately - context already provides this
  // The allProperties from context contains all properties without filters for filter dropdowns

  // Fetch national parks only when the toggle is enabled
  useEffect(() => {
    // Only fetch when user enables the national parks layer
    if (!showNationalParks) {
      return;
    }

    // If already loaded, don't reload
    if (nationalParks.length > 0) {
      return;
    }

    async function fetchNationalParks() {
      try {
        console.log('Fetching national parks from Supabase...');
        const { data, error: supabaseError } = await supabase
          .from('national-parks')
          .select('*');

        if (supabaseError) {
          console.error('Error fetching national parks:', supabaseError);
          return;
        }

        if (data) {
          setNationalParks(data as NationalPark[]);
          console.log(`✅ Fetched ${data.length} national parks`);
        }
      } catch (err) {
        console.error('Error fetching national parks:', err);
      }
    }
    fetchNationalParks();
  }, [showNationalParks, nationalParks.length]);

  // Increment layer key when toggled on to force remount (ensures Data component re-initializes)
  const prevShowPopulationLayerRef = useRef(showPopulationLayer);
  useEffect(() => {
    // Only increment when toggling from false to true
    if (showPopulationLayer && !prevShowPopulationLayerRef.current) {
      setPopulationLayerKey(prev => prev + 1);
    }
    prevShowPopulationLayerRef.current = showPopulationLayer;
  }, [showPopulationLayer]);

  // Fetch population data from Supabase only when layer is enabled
  useEffect(() => {
    // Only load data when the layer is actually enabled
    if (!showPopulationLayer) {
      return;
    }

    // If already loaded, don't reload
    if (populationLookup) {
      return;
    }

    async function loadPopulationData() {
      setPopulationLoading(true);
      try {
        console.log('Loading population data from Supabase...');
        const { lookup, fipsLookup } = await fetchPopulationDataFromSupabase();
        setPopulationLookup(lookup);
        setPopulationFipsLookup(fipsLookup);
      } catch (err) {
        console.error('Error loading population data from Supabase:', err);
      } finally {
        setPopulationLoading(false);
      }
    }

    loadPopulationData();
  }, [showPopulationLayer, populationLookup]);

  // Process shared properties from context (no fetching - that's done in context)
  // The context fetches raw data, and this component processes it for display
  const processedProperties = useMemo(() => {
    if (!properties || properties.length === 0) {
      return [];
    }
    
    const transformedData = properties;
        
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
          
          // Normalize property name to prevent duplicates from whitespace/case differences
          const normalizedName = normalizePropertyName(propertyName);
          
          // Collect unit types for this property
          if (!unitTypesMap.has(normalizedName)) {
            unitTypesMap.set(normalizedName, new Set());
          }
          if (item.unit_type) {
            unitTypesMap.get(normalizedName)!.add(item.unit_type);
          }
          
          // Collect rates for this property
          if (!ratesMap.has(normalizedName)) {
            ratesMap.set(normalizedName, []);
          }
          const rate = item.avg__rate__next_12_months_;
          if (rate != null && !isNaN(Number(rate)) && isFinite(Number(rate))) {
            ratesMap.get(normalizedName)!.push(Number(rate));
          }
          
          // Check if we already have this property
          if (!propertyMap.has(normalizedName)) {
            // Use this record as the representative
            propertyMap.set(normalizedName, item);
          } else {
            // If we already have this property, prefer one that matches the state filter and has valid coordinates
            const existing = propertyMap.get(normalizedName);
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
              propertyMap.set(normalizedName, item);
            } else if (currentMatchesState && !existingMatchesState) {
              propertyMap.set(normalizedName, item);
            } else if (currentHasCoords && !existingHasCoords && existingMatchesState === currentMatchesState) {
              propertyMap.set(normalizedName, item);
            }
          }
        });
        
        // Convert map to array and add unit types and rate range to each property
        let uniqueProperties = Array.from(propertyMap.entries()).map(([normalizedName, property]: [string, any]) => {
          const unitTypes = unitTypesMap.get(normalizedName);
          const rates = ratesMap.get(normalizedName) || [];
          
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
            // Strict filtering: only properties with country field set to Canada/CA
            // Do NOT use coordinate-based detection - only trust the country field
            uniqueProperties = uniqueProperties.filter((property: any) => {
              const country = String(property.country || '').toUpperCase();
              
              // Only check country field - must be 'CA', 'CAN', or 'CANADA'
              if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
                return true;
              }
              
              // Reject all others
              return false;
            });
            console.log(`After client-side Canada filtering (country field only): ${uniqueProperties.length} properties`);
          } else if (filterCountry.includes('United States')) {
            // Strict filtering: only properties with country field set to United States/USA/US
            // Do NOT use coordinate-based detection - only trust the country field
            uniqueProperties = uniqueProperties.filter((property: any) => {
              const country = String(property.country || '').toUpperCase();
              
              // Only check country field - must be 'US', 'USA', or 'UNITED STATES'
              if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
                return true;
              }
              
              // Reject all others
              return false;
            });
            console.log(`After client-side US filtering (country field only): ${uniqueProperties.length} properties`);
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
    
    return uniqueProperties;
  }, [properties, filterState, filterCountry]);
  
  // Use processed properties for display
  const displayProperties = processedProperties;

  // Filter properties by viewport bounds to reduce rendering overhead
  // Show all properties with coordinates - don't filter by viewport to prevent marker flashing on zoom
  const propertiesWithCoords = useMemo(() => {
    return filterPropertiesWithCoordinates(displayProperties);
  }, [displayProperties]);


  // Set default center and zoom for lower 48 states when map loads (if no URL params)
  // This overrides any fitBounds behavior to ensure consistent view
  // BUT: Don't reset if we've just fitted bounds or if state filter is active (prevents zooming out immediately after fitting)
  useEffect(() => {
    if (map && !shouldFitBounds) {
      // Don't reset if we just fitted bounds - give it time to settle
      if (hasJustFittedBoundsRef.current) {
        // Clear the flag after a delay to allow fitBounds to complete
        const timer = setTimeout(() => {
          hasJustFittedBoundsRef.current = false;
        }, 1000);
        return () => clearTimeout(timer);
      }
      
      // Don't reset if state filter is active (even if shouldFitBounds is false, we might be transitioning)
      if (filterState.length > 0) {
        return;
      }
      
      const urlLat = searchParams.get('lat');
      const urlLon = searchParams.get('lon');
      
      // Only set default if no URL location parameters
      if (!urlLat || !urlLon) {
        // Ensure map is at default center and zoom for lower 48 states
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        
        // Use mobile zoom on mobile devices, desktop zoom otherwise
        const zoomToUse = isMobile ? defaultZoomMobile : defaultZoom;
        
        // Check if we need to update (only if significantly different)
        const needsUpdate = !currentCenter || 
          Math.abs(currentCenter.lat() - defaultCenter.lat) > 0.1 ||
          Math.abs(currentCenter.lng() - defaultCenter.lng) > 0.1 ||
          !currentZoom ||
          Math.abs(currentZoom - zoomToUse) > 0.5;
        
        if (needsUpdate) {
          map.setCenter(defaultCenter);
          map.setZoom(zoomToUse);
        }
      }
    }
  }, [map, shouldFitBounds, searchParams, filterState, isMobile]);
  
  // Fit map bounds to show all glamping property markers (only if shouldFitBounds is true)
  // NOTE: Only includes glamping properties, not national parks, so state filters zoom to properties only
  // This is disabled by default to maintain fixed zoom/center for lower 48 states
  useEffect(() => {
    if (map && shouldFitBounds) {
      // Only use glamping properties for bounds calculation, exclude national parks
      // This ensures state filters zoom to show only the filtered properties
      if (propertiesWithCoords.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        propertiesWithCoords.forEach((item) => {
          bounds.extend({
            lat: item.coordinates[0],
            lng: item.coordinates[1],
          });
        });
        map.fitBounds(bounds);
        // Mark that we've just fitted bounds to prevent immediate reset
        hasJustFittedBoundsRef.current = true;
        // Clear the flag after fitBounds completes (Google Maps fitBounds is async)
        setTimeout(() => {
          hasJustFittedBoundsRef.current = false;
        }, 2000); // Give enough time for fitBounds animation to complete
      }
    }
  }, [map, propertiesWithCoords, shouldFitBounds]);
  
  // When map is loaded and we have specific coordinates from URL, center and zoom to that location
  useEffect(() => {
    if (map && !shouldFitBounds && mapCenter && mapZoom) {
      // Only center/zoom if coordinates are different from defaults (meaning we have URL params)
      const isFromUrl = mapCenter.lat !== defaultCenter.lat || mapCenter.lng !== defaultCenter.lng || mapZoom !== defaultZoom;
      
      if (isFromUrl) {
        // Check if map is already at the desired position (within a small threshold to avoid unnecessary updates)
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        const centerDiff = currentCenter ? 
          Math.abs(currentCenter.lat() - mapCenter.lat) + Math.abs(currentCenter.lng() - mapCenter.lng) : 
          Infinity;
        const zoomDiff = currentZoom ? Math.abs(currentZoom - mapZoom) : Infinity;
        
        // Only update if position has changed significantly (more than 0.001 degrees or 0.5 zoom levels)
        if (centerDiff > 0.001 || zoomDiff > 0.5) {
          map.setCenter(mapCenter);
          map.setZoom(mapZoom);
          hasCenteredFromUrlRef.current = true;
          
          // Update bounds after map finishes moving (onIdle will handle this)
          // Also set a timeout as backup in case onIdle doesn't fire immediately
          setTimeout(() => {
            const bounds = map.getBounds();
            if (bounds) {
              setMapBounds(bounds);
            }
          }, 500);
          
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
    }
  }, [map, mapCenter, mapZoom, shouldFitBounds, propertiesWithCoords]);


  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    
    // Set default map type to terrain
    map.setMapTypeId('terrain');
    
    // Set default center and zoom for lower 48 states if no URL params
    const urlLat = searchParams.get('lat');
    const urlLon = searchParams.get('lon');
    const urlZoom = searchParams.get('zoom');
    
    if (!urlLat || !urlLon) {
      // No URL params - use default center and zoom for lower 48 states
      // Use mobile zoom on mobile devices, desktop zoom otherwise
      const isMobileCheck = window.innerWidth < 768;
      const zoomToUse = isMobileCheck ? defaultZoomMobile : defaultZoom;
      map.setCenter(defaultCenter);
      map.setZoom(zoomToUse);
    }
    
    // Initialize bounds after a short delay to ensure map has rendered
    setTimeout(() => {
      const bounds = map.getBounds();
      if (bounds) {
        setMapBounds(bounds);
      }
    }, 200);
  }, [searchParams]);

  const onIdle = useCallback(() => {
    if (map) {
      const bounds = map.getBounds();
      if (bounds) {
        setMapBounds(bounds);
      }
    }
  }, [map]);

  // Update bounds when map changes (center/zoom)
  useEffect(() => {
    if (map && !shouldFitBounds) {
      // When a location is selected, update bounds after map settles
      const timer = setTimeout(() => {
        const bounds = map.getBounds();
        if (bounds) {
          setMapBounds(bounds);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [map, mapCenter, mapZoom, shouldFitBounds]);

  const onUnmount = useCallback(() => {
    // Clean up clusterer and markers
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    markersRef.current = [];
    setMap(null);
  }, []);

  // Memoize map options to update gesture handling when fullscreen/mobile state changes
  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    // Default to terrain map type on both desktop and mobile
    mapTypeId: 'terrain',
    // Mobile gesture handling: 'greedy' allows single-finger drag and pinch-to-zoom when map is expanded
    // 'cooperative' requires two fingers when map is not fullscreen (allows page scrolling)
    gestureHandling: isMobile && isFullscreen ? 'greedy' : 'cooperative',
    // Enable dragging (default is true, but explicit for clarity)
    draggable: true,
    // Disable scrollwheel zoom on mobile to prevent conflicts with touch gestures
    scrollwheel: !isMobile,
    // Enable keyboard shortcuts (useful for accessibility)
    keyboardShortcuts: true,
    mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'a17afb5a01f9ebd9f8514b81', // Style Map ID for custom map styling
  }), [isMobile, isFullscreen]);

  // Update map gesture handling when fullscreen/mobile state changes
  useEffect(() => {
    if (!map || !isClient) return;

    // Update gesture handling based on current state
    const gestureHandling = isMobile && isFullscreen ? 'greedy' : 'cooperative';
    map.setOptions({
      gestureHandling,
      scrollwheel: !isMobile,
    });
  }, [map, isClient, isMobile, isFullscreen]);

  // Listen for fullscreen changes to sync with React state (for mobile)
  useEffect(() => {
    if (!isClient) return;

    const handleFullscreenChange = () => {
      // Check if we're on mobile (screen width < 768px)
      const isMobileCheck = window.innerWidth < 768;
      if (!isMobileCheck) return;

      // Check if document is in fullscreen mode
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      // If fullscreen was exited and our React state says we're in fullscreen, toggle it
      if (!isCurrentlyFullscreen && isFullscreen) {
        toggleFullscreen();
      }
      // If fullscreen was entered and our React state says we're not in fullscreen, toggle it
      else if (isCurrentlyFullscreen && !isFullscreen) {
        toggleFullscreen();
      }
    };

    // Listen for fullscreen change events (support multiple browser prefixes)
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [isClient, isFullscreen, toggleFullscreen]);

  // Manage markers (no clustering - show all markers individually)
  // Use a ref to track property IDs to avoid recreating markers unnecessarily
  const propertyIdsRef = useRef<Set<string | number>>(new Set());
  
  useEffect(() => {
    if (!map || !isClient) {
      // Clean up if no map
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      markersRef.current = [];
      propertyIdsRef.current.clear();
      return;
    }

    // If no properties, clear markers
    if (propertiesWithCoords.length === 0) {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
        clustererRef.current = null;
      }
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      markersRef.current = [];
      propertyIdsRef.current.clear();
      return;
    }

    // Create a set of current property IDs
    const currentPropertyIds = new Set(propertiesWithCoords.map(p => p.id));
    
    // Check if property list has actually changed
    const idsMatch = 
      currentPropertyIds.size === propertyIdsRef.current.size &&
      Array.from(currentPropertyIds).every(id => propertyIdsRef.current.has(id));
    
    // If property list hasn't changed, don't recreate markers
    if (idsMatch && markersRef.current.length > 0) {
      return;
    }

    // Property list has changed - recreate markers
    // Clean up old markers first
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];

    // Clear clusterer if it exists
    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }

    // Update property IDs ref
    propertyIdsRef.current = currentPropertyIds;

    // Create markers using AdvancedMarkerElement
    const createMarkers = async () => {
      // Import the marker library
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

      // Create native Google Maps markers and add them directly to the map
      const markers = propertiesWithCoords.map((property) => {
        // Create a blue pin element for each property marker
        const bluePin = new PinElement({
          background: '#3B82F6',
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: 1.0,
        });
        
        const marker = new AdvancedMarkerElement({
          map: map,
          position: {
            lat: property.coordinates[0],
            lng: property.coordinates[1],
          },
          content: bluePin.element,
        });

        // Add click listener to open InfoWindow
        marker.addEventListener('click', () => {
          setSelectedProperty(property as PropertyWithCoords);
          setSelectedPark(null); // Close park InfoWindow if open
        });

        return marker;
      });

      // Update markers ref
      markersRef.current = markers;
    };

    createMarkers().catch(console.error);

    // Cleanup function
    return () => {
      // Only clean up if component unmounts or map/client changes
      // Don't clean up on property list changes to prevent flashing
    };
  }, [map, isClient, propertiesWithCoords]);

  // Manage national park markers
  useEffect(() => {
    if (!map || !isClient) {
      // Clean up if no map
      parkMarkersRef.current.forEach(marker => {
        marker.map = null;
      });
      parkMarkersRef.current = [];
      return;
    }

    // If National Parks are hidden, clean up and return early
    if (!showNationalParks) {
      parkMarkersRef.current.forEach(marker => {
        marker.map = null;
      });
      parkMarkersRef.current = [];
      // Close park InfoWindow if open
      setSelectedPark(null);
      return;
    }

    // Filter parks with valid coordinates
    const parksWithCoords = filterParksWithCoordinates(nationalParks);

    // Clean up old park markers first
    parkMarkersRef.current.forEach(marker => {
      marker.map = null;
    });
    parkMarkersRef.current = [];

    // Create markers using AdvancedMarkerElement
    const createParkMarkers = async () => {
      // Import the marker library
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

      // Create markers for national parks
      const parkMarkers = parksWithCoords.map((park) => {
        // Create a green pin element for each park marker
        const greenPin = new PinElement({
          background: '#10B981',
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: 1.0,
        });
        
        const marker = new AdvancedMarkerElement({
          map: map,
          position: {
            lat: park.coordinates[0],
            lng: park.coordinates[1],
          },
          content: greenPin.element,
          title: park.name,
        });

        // Add click listener to open InfoWindow
        marker.addEventListener('click', () => {
          setSelectedPark(park);
          setSelectedProperty(null); // Close property InfoWindow if open
        });

        return marker;
      });

      // Update park markers ref
      parkMarkersRef.current = parkMarkers;
    };

    createParkMarkers().catch(console.error);

    // Cleanup function
    return () => {
      // Clean up markers when dependencies change
      parkMarkersRef.current.forEach(marker => {
        marker.map = null;
      });
    };
  }, [map, isClient, nationalParks, showNationalParks]);

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
      
      // Normalize property name to prevent duplicates from whitespace/case differences
      const normalizedName = normalizePropertyName(propertyName);
      
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
      
      // Add property to the set for this state using normalized name
      if (!propertiesByState.has(normalizedState)) {
        propertiesByState.set(normalizedState, new Set());
      }
      propertiesByState.get(normalizedState)!.add(normalizedName);
    });
    
    // Count unique properties per state
    propertiesByState.forEach((propertySet, state) => {
      counts[state] = propertySet.size;
    });
    
    return counts;
  }, [allProperties, filterCountry, filterUnitType, filterRateRange]);

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
    // Note: We do NOT apply map bounds filter here to ensure the displayed count matches
    // the sum of country dropdown counts (countryCounts doesn't apply bounds filter)
    const propertiesWithValidCoords = filterPropertiesWithCoordinates(propertiesToCount);
    
    // Group by property_name to count unique properties (same as countryCounts logic)
    const uniquePropertyNames = new Set<string>();
    
    // Determine country for each property using ONLY the country column
    // This ensures we only count USA and Canada properties
    propertiesWithValidCoords.forEach((p) => {
      const propertyName = p.property_name;
      if (!propertyName) return;
      
      // Normalize property name to prevent duplicates from whitespace/case differences
      const normalizedName = normalizePropertyName(propertyName);
      
      // Use ONLY the country field - no coordinate-based detection
      const country = String(p.country || '').toUpperCase();
      let normalizedCountry: string | null = null;
      
      // Check for Canada
      if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
        normalizedCountry = 'Canada';
      }
      // Check for United States
      else if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
        normalizedCountry = 'United States';
      }
      // Skip properties that are not USA or Canada
      else {
        return;
      }
      
      // Only count if country filter matches (or both are selected)
      if (filterCountry.length > 0) {
        if (!filterCountry.includes(normalizedCountry)) {
          return; // Skip if not in the selected countries
        }
      }
      
      // Add to unique properties count using normalized name
      uniquePropertyNames.add(normalizedName);
    });
    
    return uniquePropertyNames.size;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // Also respect unit type, rate range, and state filters when counting to match displayed count
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
    
    // Apply state filter if active (to match calculatedDisplayedCount logic)
    if (filterState.length > 0) {
      propertiesToCount = propertiesToCount.filter((p) => stateMatchesFilter(p.state, filterState));
    }
    
    // Only count properties with valid coordinates (matching what's shown on the map)
    const propertiesWithValidCoords = filterPropertiesWithCoordinates(propertiesToCount);
    
    // First, group by normalized property name to get unique properties
    // This ensures each property is only counted once, matching calculatedDisplayedCount logic
    const propertyToCountryMap = new Map<string, string>(); // normalizedName -> country
    
    propertiesWithValidCoords.forEach((p) => {
      const propertyName = p.property_name;
      if (!propertyName) return;
      
      // Normalize property name to prevent duplicates from whitespace/case differences
      const normalizedName = normalizePropertyName(propertyName);
      
      // Use ONLY the country field - no coordinate-based detection
      const country = String(p.country || '').toUpperCase();
      let normalizedCountry: string | null = null;
      
      // Check for Canada
      if (country === 'CA' || country === 'CAN' || country === 'CANADA') {
        normalizedCountry = 'Canada';
      }
      // Check for United States
      else if (country === 'US' || country === 'USA' || country === 'UNITED STATES' || country === 'UNITED STATES OF AMERICA') {
        normalizedCountry = 'United States';
      }
      // Skip properties that are not USA or Canada
      else {
        return;
      }
      
      // If this property hasn't been assigned a country yet, assign it
      // If it has been assigned and the country is different, keep the first assignment
      // This ensures each unique property is only counted in one country
      if (!propertyToCountryMap.has(normalizedName)) {
        propertyToCountryMap.set(normalizedName, normalizedCountry);
      }
    });
    
    // Count unique properties per country
    propertyToCountryMap.forEach((country) => {
      counts[country] = (counts[country] || 0) + 1;
    });
    
    // Ensure both countries are in the counts object (even if 0)
    if (!counts['United States']) counts['United States'] = 0;
    if (!counts['Canada']) counts['Canada'] = 0;
    
    return counts;
  }, [allProperties, filterUnitType, filterRateRange, filterState, stateMatchesFilter]);

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
      
      // Normalize property name to prevent duplicates from whitespace/case differences
      const normalizedName = normalizePropertyName(propertyName);
      
      if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
        prop.all_unit_types.forEach((ut: string) => {
          if (!propertiesByUnitType.has(ut)) {
            propertiesByUnitType.set(ut, new Set());
          }
          propertiesByUnitType.get(ut)!.add(normalizedName);
        });
      } else if (p.unit_type) {
        const ut = p.unit_type;
        if (!propertiesByUnitType.has(ut)) {
          propertiesByUnitType.set(ut, new Set());
        }
        propertiesByUnitType.get(ut)!.add(normalizedName);
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

  // Security validation and logging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Import security utilities dynamically to avoid SSR issues
      import('../lib/api-key-security').then(({ logSecurityInfo, getSecurityWarnings }) => {
        logSecurityInfo(apiKey);
        const warnings = getSecurityWarnings();
        if (warnings.length > 0) {
          console.warn('[GooglePropertyMap] Security Warnings:', warnings);
        }
      });
    }
  }, [apiKey]);

  // Use shared Google Maps provider instead of loading script separately
  const { isLoaded, loadError } = useGoogleMaps();

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
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50 md:z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('errors.initializing')}</p>
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
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50 md:z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('errors.loadingMaps')}</p>
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
      <div className="w-full space-y-1 md:space-y-6">
        {/* Mobile-Optimized Header: Property Count + Filter Button on Same Row */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-3 bg-white rounded-lg border border-gray-200 shadow-sm p-3">
            {/* Property Count - Compact on Left */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span 
                key={displayedCount}
                className={`text-2xl font-bold text-green-700 transition-all duration-500 ease-in-out relative inline-block whitespace-nowrap ${
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
              <span className={`text-sm font-medium text-gray-600 transition-opacity duration-300 truncate ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {t('stats.properties')}
              </span>
            </div>
            
            {/* Filter Toggle Button - Compact on Right */}
            <button
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors flex-shrink-0 border border-indigo-200"
              aria-expanded={filtersExpanded}
              aria-controls="filters-section"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="text-sm font-semibold">{t('filters.title')}</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${
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
          </div>
        </div>

        {/* Desktop Stats - Original Design */}
        <div className="hidden md:block bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100 shadow-sm">
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
            <span className={`text-xl font-semibold text-gray-700 transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>{t('stats.properties')}</span>
          </div>
        </div>

        {/* Active Filters Badges */}
        {hasActiveFilters && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('filters.activeFilters')}</span>
              <button
                onClick={() => {
                  clearFilters();
                  // URL will be updated by the useEffect that watches filter changes
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 underline transition-colors flex-shrink-0"
              >
                {t('filters.clearAll')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterCountry.length < 2 && filterCountry.map((country) => (
                <span
                  key={country}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium"
                >
                  {t('filters.badges.country')}: {country}
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
                  {t('filters.badges.state')}: {state}
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
                  {t('filters.badges.unit')}: {unitType}
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
                  {t('filters.badges.rate')}: {rateRange}
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
        <div className="pt-5 md:border-t md:border-gray-200 md:pt-0">
          {/* Desktop Filter Title - Hidden on Mobile (now in header) */}
          <h2 className="hidden md:block text-lg font-semibold text-gray-900 mb-4">
            {t('filters.title')}
          </h2>

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
              label={t('filters.country.label')}
              placeholder={t('filters.country.placeholder')}
              allSelectedText={t('filters.country.allSelected')}
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
              label={t('filters.state.label')}
              placeholder={t('filters.state.placeholder')}
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
              label={t('filters.unitType.label')}
              placeholder={t('filters.unitType.placeholder')}
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
              label={t('filters.rateRange.label')}
              placeholder={t('filters.rateRange.placeholder')}
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

            {/* Map Layers */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                {t('layers.title')}
              </label>
              
              {/* National Parks Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {t('layers.nationalParks.label')}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({filterParksWithCoordinates(nationalParks).length} parks)
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {t('layers.nationalParks.description')}
                  </p>
                </div>
                <button
                  id="national-parks-toggle"
                  type="button"
                  role="switch"
                  aria-checked={showNationalParks}
                  aria-label={showNationalParks ? t('layers.nationalParks.hide') : t('layers.nationalParks.show')}
                  onClick={toggleNationalParks}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2 ${
                    showNationalParks ? 'bg-[#10B981]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      showNationalParks ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Population Layer Toggle */}
              <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {t('layers.population.label')}
                      </span>
                      {populationLoading && (
                        <span className="text-xs text-gray-500">({t('layers.population.loading')})</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {t('layers.population.description')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      Data source: <a 
                        href="https://data.census.gov" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        data.census.gov
                      </a>
                    </p>
                  </div>
                  <button
                    id="population-layer-toggle"
                    type="button"
                    role="switch"
                    aria-checked={showPopulationLayer}
                    aria-label={showPopulationLayer ? t('layers.population.hide') : t('layers.population.show')}
                    onClick={togglePopulationLayer}
                    disabled={populationLoading}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      showPopulationLayer ? 'bg-[#2196f3]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        showPopulationLayer ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                
              </div>

              {/* Population Change Legend */}
              {showPopulationLayer && !populationLoading && (
                <div className="p-3 bg-white rounded-lg border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-900 mb-2">{t('layers.population.legend.title')}</h4>
                  <div className="space-y-1">
                    {getChangeRanges().map((range) => (
                      <div key={range.label} className="flex items-center gap-2 text-xs">
                        <div
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{ backgroundColor: range.color }}
                        />
                        <span className="text-gray-700">{range.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200 italic text-center">
                    {t('layers.population.legend.dataSource')}: <a 
                      href="https://data.census.gov" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      data.census.gov
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render only map if showMap is true
  // On mobile, only use full viewport height when in fullscreen mode
  const shouldUseFullHeight = isFullscreen || !isMobile;
  
  return (
    <div className="w-full h-full" style={shouldUseFullHeight ? { minHeight: '100vh', height: '100%' } : { height: '100%' }}>
      {/* Map - Full Viewport Height */}
      <div className="h-full w-full relative" style={shouldUseFullHeight ? { minHeight: '100vh' } : {}}>
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-30">
            <div className="bg-white border border-red-200 rounded-lg p-6 m-4 max-w-md">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Map</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}
        {!isLoaded && !error && (
          <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50 md:z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('errors.loadingScript')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('errors.loadingScriptHint')}</p>
            </div>
          </div>
        )}
        {isLoaded && (
          <div className="relative h-full w-full" style={shouldUseFullHeight ? { minHeight: '100vh', height: '100%' } : { height: '100%' }}>
            <GoogleMap
              key={`map-${filterState.join(',')}-${filterUnitType.join(',')}-${filterRateRange.join(',')}`}
              mapContainerStyle={{ width: '100%', height: '100%', ...(shouldUseFullHeight ? { minHeight: '100vh' } : {}) }}
              center={mapCenter}
              zoom={mapZoom}
              onLoad={onLoad}
              onIdle={onIdle}
              onUnmount={onUnmount}
              options={mapOptions}
            >
              {selectedPark && (
                <InfoWindow
                  position={{
                    lat: selectedPark.coordinates[0],
                    lng: selectedPark.coordinates[1],
                  }}
                  onCloseClick={() => {
                    setSelectedPark(null);
                  }}
                >
                  <div className="max-w-xs p-2">
                    <h3 className="font-bold text-lg mb-2 text-gray-900">
                      {selectedPark.name.includes('National Park') 
                        ? selectedPark.name 
                        : `${selectedPark.name} National Park`}
                    </h3>
                    {selectedPark.state && (
                      <p className="text-sm text-gray-600 mb-2">
                        {getFullStateName(selectedPark.state)}
                      </p>
                    )}
                    {selectedPark.date_established && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">{t('infoWindow.park.established')}:</span> {selectedPark.date_established}
                      </p>
                    )}
                    {selectedPark.acres && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">{t('infoWindow.park.size')}:</span> {selectedPark.acres.toLocaleString()} {t('infoWindow.park.acres')}
                      </p>
                    )}
                    {selectedPark.recreation_visitors_2021 && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">{t('infoWindow.park.visitors')}:</span> {parseInt(selectedPark.recreation_visitors_2021, 10).toLocaleString()}
                      </p>
                    )}
                    {selectedPark.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                        {selectedPark.description}
                      </p>
                    )}
                    {selectedPark.slug && (() => {
                      // Extract locale from pathname (e.g., "/en/map" -> "en")
                      const pathSegments = pathname.split('/').filter(Boolean);
                      const locale = pathSegments[0] || 'en';
                      const parkUrl = `/${locale}/property/${selectedPark.slug}`;
                      
                      return (
                          <Link
                            href={parkUrl}
                            className="inline-block text-sm text-blue-600 hover:text-blue-800 underline font-medium mt-2 border-t border-gray-200 pt-2 w-full text-center"
                          >
                            {t('infoWindow.park.viewMore')}
                          </Link>
                      );
                    })()}
                  </div>
                </InfoWindow>
              )}
              {selectedProperty && (
                <InfoWindow
                  position={{
                    lat: selectedProperty.coordinates[0],
                    lng: selectedProperty.coordinates[1],
                  }}
                  onCloseClick={() => {
                    setSelectedProperty(null);
                    setSelectedPark(null); // Close park InfoWindow if open
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
                      const propertyName = selectedProperty.property_name || t('infoWindow.property.default');
                      const city = selectedProperty.city || '';
                      const state = selectedProperty.state || '';
                      const location = city && state ? ` in ${city}, ${state}` : state ? ` in ${state}` : '';
                      const altText = `Photo of ${propertyName} glamping property${location} - Image ${safeIndex + 1} of ${photos.length}`;

                      return (
                        <div className="mb-3 -mx-2 -mt-2 relative">
                          <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-gray-100 group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                  aria-label={t('infoWindow.photo.previous')}
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
                                  aria-label={t('infoWindow.photo.next')}
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
                      {selectedProperty.property_name || t('infoWindow.property.unnamed')}
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
                        <span className="font-semibold">{t('infoWindow.property.unitTypes')}:</span>{' '}
                        {(selectedProperty as any).all_unit_types.join(', ')}
                      </p>
                    )}
                    {(selectedProperty as any).rate_category && (
                      <p className="text-sm text-gray-700 mb-2">
                        <span className="font-semibold">{t('infoWindow.property.avgRate')}:</span>{' '}
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
                            ({(selectedProperty as any).google_user_rating_total.toLocaleString()} {((selectedProperty as any).google_user_rating_total === 1) ? t('infoWindow.property.reviews.one') : t('infoWindow.property.reviews.other')})
                          </span>
                        )}
                      </div>
                    )}
                    {(() => {
                      // Generate or use property slug for "View more" link
                      const propertySlug = selectedProperty.slug || 
                        (selectedProperty.property_name ? slugifyPropertyName(selectedProperty.property_name) : null);
                      
                      if (propertySlug) {
                        // Extract locale from pathname (e.g., "/en/map" -> "en")
                        const pathSegments = pathname.split('/').filter(Boolean);
                        const locale = pathSegments[0] || 'en';
                        const propertyUrl = `/${locale}/property/${propertySlug}`;
                        
                        return (
                          <Link
                            href={propertyUrl}
                            className="inline-block text-sm text-blue-600 hover:text-blue-800 underline font-medium mt-2 border-t border-gray-200 pt-2 w-full text-center"
                          >
                            {t('infoWindow.property.viewMore')}
                          </Link>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </InfoWindow>
              )}
              
              {/* Population Change Layer */}
              {showPopulationLayer && map && (
                <PopulationLayer
                  key={`population-layer-${populationLayerKey}`}
                  map={map}
                  populationLookup={populationLookup}
                  fipsLookup={populationFipsLookup || undefined}
                  year="2020"
                  visible={showPopulationLayer}
                />
              )}
            </GoogleMap>
            {/* Loading overlay when properties are being fetched */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-30 pointer-events-none">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
                  <p className="text-gray-600 font-medium mt-4">{t('errors.loadingProperties')}</p>
                </div>
              </div>
            )}
          </div>
        )}
        {!loading && !error && hasLoadedOnce && displayProperties.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 pointer-events-none z-20">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-gray-600 font-medium">{t('errors.noProperties')}</p>
              <p className="text-sm text-gray-500 mt-1">{t('errors.noPropertiesHint')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

