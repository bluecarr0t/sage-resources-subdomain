'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from './GoogleMapsProvider';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';

// Lazy import Supabase to avoid initialization during build time
async function getSupabaseClient() {
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}
import { NationalPark, NationalParkWithCoords, filterParksWithCoordinates } from '@/lib/types/national-parks';
import { useMapContext } from './MapContext';
import { slugifyPropertyName } from '@/lib/properties';
import { getChangeRanges, getCorrelationZoneRanges } from '@/lib/maps/county-boundaries';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// Import extracted utilities and hooks
import { STATE_ABBREVIATIONS, CANADIAN_PROVINCES, getFullStateName, createStateFilterSet, stateMatchesFilter } from './map/utils/stateUtils';
import { usePropertyProcessing } from './map/hooks/usePropertyProcessing';
import { useMapFilters } from './map/hooks/useMapFilters';
import { useMapBounds } from './map/hooks/useMapBounds';
import { useMapMarkers } from './map/hooks/useMapMarkers';
import { useMapLayers } from './map/hooks/useMapLayers';
import { PopulationLookup } from '@/lib/population/parse-population-csv';
import { PopulationDataByFIPS } from '@/lib/population/supabase-population';
import { GDPDataByFIPS } from '@/lib/gdp/supabase-gdp';

// Dynamically import layer components to reduce initial bundle size
const PopulationLayer = dynamic(() => import('./PopulationLayer'), {
  ssr: false,
  loading: () => null,
});
const GDPLayer = dynamic(() => import('./GDPLayer'), {
  ssr: false,
  loading: () => null,
});
const OpportunityZonesLayer = dynamic(() => import('./OpportunityZonesLayer'), {
  ssr: false,
  loading: () => null,
});

// Dynamically import MultiSelect to reduce initial bundle size
const MultiSelect = dynamic(() => import('./MultiSelect'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 h-10 rounded"></div>,
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
 * 
 * @param photo - Photo object with name and optional dimensions
 * @param fixedDimensions - Optional flag to use fixed dimensions for InfoWindow (standardized aspect ratio)
 * @returns Photo URL for the proxied API route
 */
function getGooglePhotoUrl(
  photo: {
    name: string;
    widthPx?: number;
    heightPx?: number;
  },
  fixedDimensions?: boolean
): string {
  // Validate photo object and name
  if (!photo || !photo.name) {
    console.warn('[GooglePropertyMap] No photo name provided', photo);
    return '';
  }

  // Validate photo name format - should be in format: places/PLACE_ID/photos/PHOTO_REFERENCE
  const photoName = photo.name.trim();
  if (photoName === '' || photoName === 'null' || photoName === 'undefined') {
    console.warn('[GooglePropertyMap] Invalid photo name (empty or null string):', photoName);
    return '';
  }

  // Basic format validation - should start with 'places/' and contain '/photos/'
  if (!photoName.startsWith('places/') || !photoName.includes('/photos/')) {
    console.warn('[GooglePropertyMap] Photo name does not match expected format:', photoName.substring(0, 100));
    // Don't return empty - might be a valid legacy format, let the API handle it
  }
  
  // For InfoWindow images, use standardized dimensions (16:9 aspect ratio)
  // This ensures consistent display across all markers
  // Standard size: 400x225 (16:9) - optimal for info windows
  if (fixedDimensions) {
    const encodedPhotoName = encodeURIComponent(photoName);
    const url = `/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=400&maxHeightPx=225`;
    return url;
  }
  
  // For other uses (property detail pages, etc.), use reasonable max sizes
  const maxWidth = photo.widthPx ? Math.min(photo.widthPx, 800) : 800;
  const maxHeight = photo.heightPx ? Math.min(photo.heightPx, 600) : 600;
  
  // Encode the photo name for URL
  const encodedPhotoName = encodeURIComponent(photoName);
  
  // Use API route to proxy the photo request (handles authentication)
  const url = `/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
  
  return url;
}

// Import normalizePropertyName from utilities (will be used in filter calculations)
import { normalizePropertyName } from './map/utils/propertyProcessing';

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
  const { filterCountry, filterState, filterUnitType, filterRateRange, showNationalParks, selectedMapLayer, showPopulationLayer, showGDPLayer, showOpportunityZones, populationYear, setFilterCountry, setFilterState, setFilterUnitType, setFilterRateRange, toggleCountry, toggleState, toggleUnitType, toggleRateRange, toggleNationalParks, setMapLayer, setPopulationYear, clearFilters, hasActiveFilters, properties: sharedProperties, allProperties: sharedAllProperties, propertiesLoading: sharedPropertiesLoading, propertiesError: sharedPropertiesError, hasLoadedOnce, isFullscreen, toggleFullscreen } = useMapContext();
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
  const [filtersExpanded, setFiltersExpanded] = useState(false); // Collapsed by default on mobile
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(defaultCenter);
  // Initialize with mobile zoom if on mobile, otherwise desktop zoom
  // This will be updated properly once isMobile is determined, but start with desktop default
  const [mapZoom, setMapZoom] = useState<number>(defaultZoom);
  const [shouldFitBounds, setShouldFitBounds] = useState(false); // Disabled by default - use fixed zoom/center for lower 48 states
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);
  
  // Use extracted hook for layer management
  const {
    populationLookup,
    populationFipsLookup,
    populationLoading,
    populationLayerKey,
    gdpLookup,
    gdpLoading,
    gdpLayerKey,
  } = useMapLayers({
    showPopulationLayer,
    showGDPLayer,
    populationYear,
  });

  // URL parameter handling
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // State for full property details (fetched when marker is clicked)
  const [fullPropertyDetails, setFullPropertyDetails] = useState<any>(null);
  const [loadingPropertyDetails, setLoadingPropertyDetails] = useState(false);

  // State for National Park Google Places data (photos, rating, etc.)
  const [parkGooglePlacesData, setParkGooglePlacesData] = useState<{
    photos?: Array<{
      name: string;
      widthPx?: number;
      heightPx?: number;
    }>;
    rating?: number;
    userRatingCount?: number;
  } | null>(null);
  const [loadingParkPlacesData, setLoadingParkPlacesData] = useState(false);
  const [currentParkPhotoIndex, setCurrentParkPhotoIndex] = useState(0);

  // Reset photo index when selected property changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [selectedProperty?.id]);

  // Reset park photo index when selected park changes
  useEffect(() => {
    setCurrentParkPhotoIndex(0);
  }, [selectedPark?.id]);

  // Fetch full property details when marker is clicked (if we only have minimal fields)
  useEffect(() => {
    if (!selectedProperty || !selectedProperty.id) {
      setFullPropertyDetails(null);
      return;
    }

    // Check if we already have full details (check for fields that are only in full fetch)
    // Note: We check for these fields being defined (not just truthy) to distinguish
    // between "field exists but is null/empty" vs "field doesn't exist"
    const hasFullDetails = selectedProperty.google_photos !== undefined || 
                           selectedProperty.address !== undefined ||
                           selectedProperty.description !== undefined;

    if (hasFullDetails) {
      // Already have full details, use them
      setFullPropertyDetails(selectedProperty);
      return;
    }

    // If we have at least basic property info (name, coordinates), we can show the info window
    // even while loading full details, so we set it immediately
    if (selectedProperty.property_name || selectedProperty.site_name) {
      setFullPropertyDetails(selectedProperty);
    }

    // Fetch full property details
    async function fetchFullPropertyDetails() {
      if (!selectedProperty?.id) return;
      
      setLoadingPropertyDetails(true);
      try {
        const response = await fetch(`/api/properties?id=${selectedProperty.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch property details');
        }
        const result = await response.json();
        if (result.success && result.data) {
          // Merge with selectedProperty to ensure we have all fields
          setFullPropertyDetails({
            ...selectedProperty,
            ...result.data,
          });
        } else {
          // If API returns no data, use selectedProperty
          setFullPropertyDetails(selectedProperty);
        }
      } catch (err) {
        console.error('Error fetching property details:', err);
        // Fallback to using selectedProperty even if fetch fails
        setFullPropertyDetails(selectedProperty);
      } finally {
        setLoadingPropertyDetails(false);
      }
    }

    fetchFullPropertyDetails();
  }, [selectedProperty]);

  // Use full property details if available, otherwise use selectedProperty
  // Merge both to ensure we always have at least the basic fields from selectedProperty
  const propertyForDisplay = selectedProperty ? {
    ...selectedProperty,
    ...(fullPropertyDetails || {}),
  } : null;

  // Memoize parsed photos to prevent unnecessary re-parsing and URL recalculation
  const parsedPhotos = useMemo(() => {
    if (!propertyForDisplay?.google_photos) {
      return null;
    }
    
    let photos = propertyForDisplay.google_photos;
    
    // Parse photos if it's a string (JSONB from Supabase comes as string)
    if (typeof photos === 'string') {
      try {
        photos = JSON.parse(photos);
      } catch (e) {
        console.error('[GooglePropertyMap] Failed to parse google_photos JSON:', e);
        return null;
      }
    }
    
    // Return null if no photos or not an array
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return null;
    }
    
    // Filter out invalid photos (missing name or empty/invalid name)
    const validPhotos = photos.filter((photo) => {
      if (!photo || !photo.name) {
        return false;
      }
      const photoName = String(photo.name).trim();
      return photoName !== '' && photoName !== 'null' && photoName !== 'undefined';
    });
    
    if (validPhotos.length === 0) {
      console.warn('[GooglePropertyMap] No valid photos found after filtering:', {
        property: propertyForDisplay.property_name,
        originalCount: photos.length
      });
      return null;
    }
    
    // Log if some photos were filtered out
    if (validPhotos.length < photos.length) {
      console.warn('[GooglePropertyMap] Filtered out invalid photos:', {
        property: propertyForDisplay.property_name,
        originalCount: photos.length,
        validCount: validPhotos.length
      });
    }
    
    return validPhotos;
  }, [propertyForDisplay?.google_photos, propertyForDisplay?.property_name]);

  // Memoize the current photo URL to prevent it from changing on re-renders
  const currentPhotoUrl = useMemo(() => {
    if (!parsedPhotos || parsedPhotos.length === 0) {
      return null;
    }
    
    // Ensure currentPhotoIndex is within bounds
    const safeIndex = Math.max(0, Math.min(currentPhotoIndex, parsedPhotos.length - 1));
    const currentPhoto = parsedPhotos[safeIndex];
    
    // Validate photo object and name
    if (!currentPhoto || !currentPhoto.name) {
      console.warn('[GooglePropertyMap] Invalid photo at index', safeIndex, ':', currentPhoto);
      return null;
    }

    // Validate photo name is not empty or invalid
    const photoName = String(currentPhoto.name).trim();
    if (photoName === '' || photoName === 'null' || photoName === 'undefined') {
      console.warn('[GooglePropertyMap] Photo name is empty or invalid:', photoName);
      return null;
    }
    
    // Use fixed dimensions for InfoWindow to ensure consistent aspect ratio (16:9)
    const photoUrl = getGooglePhotoUrl(currentPhoto, true);
    
    // Return null if getGooglePhotoUrl returned empty string (invalid photo)
    return photoUrl || null;
  }, [parsedPhotos, currentPhotoIndex]);

  // Fetch Google Places data for National Park when selected
  useEffect(() => {
    if (!selectedPark) {
      setParkGooglePlacesData(null);
      return;
    }

    async function fetchParkGooglePlacesData() {
      if (!selectedPark?.name) return;
      
      setLoadingParkPlacesData(true);
      try {
        const params = new URLSearchParams({
          propertyName: selectedPark.name.includes('National Park')
            ? selectedPark.name
            : `${selectedPark.name} National Park`,
        });
        
        if (selectedPark.state) {
          params.append('state', selectedPark.state);
        }
        
        const response = await fetch(`/api/google-places?${params.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          setParkGooglePlacesData(data);
        } else {
          // Silently fail - park info window will work without photos
          console.warn('Failed to fetch Google Places data for park:', selectedPark.name);
          setParkGooglePlacesData(null);
        }
      } catch (error) {
        // Silently fail - park info window will work without photos
        console.warn('Error fetching Google Places data for park:', error);
        setParkGooglePlacesData(null);
      } finally {
        setLoadingParkPlacesData(false);
      }
    }

    fetchParkGooglePlacesData();
  }, [selectedPark]);

  // Close property InfoWindow when park is selected
  useEffect(() => {
    if (selectedPark) {
      setSelectedProperty(null);
      setFullPropertyDetails(null);
    }
  }, [selectedPark]);

  // Close park InfoWindow when property is selected
  useEffect(() => {
    if (selectedProperty) {
      setSelectedPark(null);
    }
  }, [selectedProperty]);
  const clustererRef = useRef<any | null>(null);
  const hasCenteredFromUrlRef = useRef<boolean>(false);
  const hasJustFittedBoundsRef = useRef<boolean>(false);
  // Ref to track when a marker is clicked to prevent data layer from opening
  const markerClickTimeRef = useRef<number>(0);

  // Ensure we're on the client side and detect mobile
  useEffect(() => {
    setIsClient(true);
    const checkMobile = () => {
      const isMobileCheck = window.innerWidth < 768;
      setIsMobile(isMobileCheck);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use extracted hook for filter and URL management
  const { urlInitialized } = useMapFilters({
    isClient,
    isMobile,
    filterCountry,
    filterState,
    filterUnitType,
    filterRateRange,
    setFilterCountry,
    setFilterState,
    setFilterUnitType,
    setFilterRateRange,
    setMapCenter,
    setMapZoom,
    setShouldFitBounds,
    hasCenteredFromUrlRef,
    hasJustFittedBoundsRef,
  });

  // Use shared allProperties from context for filter option calculation
  // No need to fetch separately - context already provides this
  // The allProperties from context contains all properties without filters for filter dropdowns

  // Lazy load national parks only when the toggle is enabled
  // This reduces initial bundle size and improves performance
  useEffect(() => {
    if (!showNationalParks || nationalParks.length > 0) {
      return;
    }

    // Use dynamic import to lazy load Supabase client and fetch parks
    async function fetchNationalParks() {
      try {
        console.log('Lazy loading national parks from Supabase...');
        const supabaseClient = await getSupabaseClient();
        const { data, error: supabaseError } = await supabaseClient
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
    
    // Small delay to avoid blocking initial render
    const timer = setTimeout(() => {
      fetchNationalParks();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [showNationalParks, nationalParks.length]);

  // Layer management is now handled by useMapLayers hook (see above)

  // Process shared properties from context using extracted hook
  // This replaces the large useMemo with a cleaner hook-based approach
  const processedProperties = usePropertyProcessing(properties, filterState, filterCountry);
  
  // Use processed properties for display
  const displayProperties = processedProperties;
  
  // Filter properties with coordinates for marker display
  const propertiesWithCoords = useMemo(() => {
    return filterPropertiesWithCoordinates(displayProperties);
  }, [displayProperties]);

  // Use extracted hook for marker management
  const { markersRef, parkMarkersRef } = useMapMarkers({
    map,
    isClient,
    properties: displayProperties,
    nationalParks,
    showNationalParks,
    setSelectedProperty,
    setSelectedPark,
    markerClickTimeRef,
  });

  // Helper function to check if a lat/lng is near any marker (to prevent layer InfoWindow from opening on marker clicks)
  // Uses a slightly larger threshold (0.002 degrees ≈ 222 meters) to account for coordinate precision and marker size
  const isNearMarker = useCallback((lat: number, lng: number, threshold: number = 0.002): boolean => {
    // First check if a marker was clicked recently (within last 100ms) - this catches marker clicks even if coordinates don't match exactly
    const timeSinceMarkerClick = Date.now() - markerClickTimeRef.current;
    if (timeSinceMarkerClick < 100) {
      return true;
    }
    
    // Check property markers
    for (const property of propertiesWithCoords) {
      const [markerLat, markerLng] = property.coordinates;
      const latDiff = Math.abs(lat - markerLat);
      const lngDiff = Math.abs(lng - markerLng);
      // Use a more forgiving check - if within threshold in either direction
      if (latDiff < threshold && lngDiff < threshold) {
        return true;
      }
    }
    // Check park markers
    if (showNationalParks) {
      const parksWithCoords = filterParksWithCoordinates(nationalParks);
      for (const park of parksWithCoords) {
        const [markerLat, markerLng] = park.coordinates;
        const latDiff = Math.abs(lat - markerLat);
        const lngDiff = Math.abs(lng - markerLng);
        if (latDiff < threshold && lngDiff < threshold) {
          return true;
        }
      }
    }
    return false;
  }, [propertiesWithCoords, nationalParks, showNationalParks, markerClickTimeRef]);


  // Use extracted hook for bounds management
  const { onIdle: onIdleFromHook } = useMapBounds({
    map,
    isClient,
    isMobile,
    shouldFitBounds,
    filterState,
    mapCenter,
    mapZoom,
    propertiesWithCoords,
    setMapCenter,
    setMapZoom,
    setMapBounds,
    hasJustFittedBoundsRef,
  });

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
          
          // Update bounds after map finishes moving
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
  }, [map, mapCenter, mapZoom, shouldFitBounds, propertiesWithCoords, setMapBounds]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    map.setMapTypeId('terrain');
    
    const urlLat = searchParams.get('lat');
    const urlLon = searchParams.get('lon');
    
    if (!urlLat || !urlLon) {
      const isMobileCheck = window.innerWidth < 768;
      const zoomToUse = isMobileCheck ? defaultZoomMobile : defaultZoom;
      map.setCenter(defaultCenter);
      map.setZoom(zoomToUse);
    }
    
    setTimeout(() => {
      const bounds = map.getBounds();
      if (bounds) {
        setMapBounds(bounds);
      }
    }, 200);
  }, [searchParams, setMapBounds]);

  const onIdle = useCallback(() => {
    onIdleFromHook();
  }, [onIdleFromHook]);

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
    if (markersRef.current) {
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      markersRef.current = [];
    }
    setMap(null);
  }, [markersRef]);

  // Check WebGL support for vector maps (synchronously to prevent errors)
  const checkWebGLSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || 
                 canvas.getContext('webgl2');
      return !!gl;
    } catch (e) {
      return false;
    }
  }, []);

  // Memoize map options to update gesture handling when fullscreen/mobile state changes
  const mapOptions = useMemo(() => {
    const baseOptions = {
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
      // Default to terrain map type on both desktop and mobile
      mapTypeId: 'terrain' as const,
      // Mobile gesture handling: 'greedy' allows single-finger drag and pinch-to-zoom when map is expanded
      // 'cooperative' requires two fingers when map is not fullscreen (allows page scrolling)
      gestureHandling: (isMobile && isFullscreen ? 'greedy' : 'cooperative') as 'greedy' | 'cooperative',
      // Enable dragging (default is true, but explicit for clarity)
      draggable: true,
      // Disable scrollwheel zoom on mobile to prevent conflicts with touch gestures
      scrollwheel: !isMobile,
      // Enable keyboard shortcuts (useful for accessibility)
      keyboardShortcuts: true,
    };

    // Only use mapId (vector maps) if WebGL is supported
    // This prevents the "Vector Map failed, falling back to Raster" console error
    // Check WebGL support synchronously to avoid timing issues
    const hasWebGL = checkWebGLSupport();
    if (hasWebGL) {
      return {
        ...baseOptions,
        mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'a17afb5a01f9ebd9f8514b81',
      };
    }

    // If WebGL is not supported, don't use mapId
    // This will use raster maps by default, avoiding the console error
    return baseOptions;
  }, [isMobile, isFullscreen, checkWebGLSupport]);

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

  // Marker management is now handled by useMapMarkers hook (see above)

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

  // Suppress Google Maps vector map fallback console error
  // This error occurs when WebGL is not available and Google Maps falls back to raster
  // Since we now check WebGL support before using mapId, this should rarely occur
  // But we keep this as a safety net in case the check misses edge cases
  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      const originalError = console.error;
      const errorInterceptor = (...args: any[]) => {
        const message = args.join(' ');
        // Suppress the vector map fallback error (handled gracefully by Google Maps)
        if (message.includes('Vector Map') && 
            (message.includes('Falling back to Raster') || message.includes('falling back'))) {
          // Silently ignore - Google Maps handles this gracefully by using raster maps
          return;
        }
        // Allow other errors through
        originalError.apply(console, args);
      };
      
      // Intercept in both production and development to prevent PageSpeed Insights from flagging it
      console.error = errorInterceptor;
      
      return () => {
        console.error = originalError;
      };
    }
  }, [isClient]);

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
              <span className={`text-sm font-medium text-gray-900 transition-opacity duration-300 truncate ${loading ? 'opacity-50' : 'opacity-100'}`}>
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
        <div className="hidden md:block bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100 shadow-sm md:mt-6">
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
          {/* Filter Title - Visible on Mobile for proper heading hierarchy */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4 md:pt-6">
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
                  return {
                    value: state,
                    label: state,
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
            
            {/* Rate Range Filter - Hidden */}
            {false && (
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
            )}

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

              {/* Data Layers Radio Button Group */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2">{t('layers.dataLayers.title')}</h3>
                
                {/* None Option */}
                <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500 border-gray-200">
                  <input
                    type="radio"
                    name="mapLayer"
                    value="none"
                    checked={selectedMapLayer === 'none'}
                    onChange={() => setMapLayer('none')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{t('layers.dataLayers.none.label')}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{t('layers.dataLayers.none.description')}</div>
                  </div>
                </label>

                {/* Population Change Option */}
                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500 border-gray-200 ${populationLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    name="mapLayer"
                    value="population"
                    checked={selectedMapLayer === 'population'}
                    onChange={() => setMapLayer('population')}
                    disabled={populationLoading}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{t('layers.population.label')}</span>
                      {populationLoading && (
                        <span className="text-xs text-gray-500">({t('layers.population.loading')})</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">{t('layers.population.description')}</div>
                    <div className="text-xs text-gray-500 mt-1 italic">
                      Data source: <a 
                        href="https://data.census.gov" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        data.census.gov
                      </a>
                    </div>
                  </div>
                </label>

                {/* Population Change Legend */}
                {selectedMapLayer === 'population' && !populationLoading && (
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

                {/* Tourism Change Option */}
                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500 border-gray-200 ${gdpLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <input
                    type="radio"
                    name="mapLayer"
                    value="tourism"
                    checked={selectedMapLayer === 'tourism'}
                    onChange={() => setMapLayer('tourism')}
                    disabled={gdpLoading}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{t('layers.dataLayers.tourism.label')}</span>
                      {gdpLoading && (
                        <span className="text-xs text-gray-500">(Loading...)</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">{t('layers.dataLayers.tourism.description')}</div>
                    <div className="text-xs text-gray-500 mt-1 italic">
                      Data source: <a 
                        href="https://www.bea.gov" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        U.S. Bureau of Economic Analysis
                      </a>
                    </div>
                  </div>
                </label>

                {/* GDP Growth Legend */}
                {selectedMapLayer === 'tourism' && !gdpLoading && (
                  <div className="p-3 bg-white rounded-lg border border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-900 mb-2">Average Year-over-Year Growth (2001-2023)</h4>
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
                      Data source: <a 
                        href="https://www.bea.gov" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        U.S. Bureau of Economic Analysis
                      </a>
                    </p>
                  </div>
                )}

                {/* Market Opportunity Zones Option - Hidden for now, will be re-added later */}
                {/* <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 [&:has(input:checked)]:bg-blue-50 [&:has(input:checked)]:border-blue-500 border-gray-200">
                  <input
                    type="radio"
                    name="mapLayer"
                    value="opportunity"
                    checked={selectedMapLayer === 'opportunity'}
                    onChange={() => setMapLayer('opportunity')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{t('layers.dataLayers.opportunity.label')}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{t('layers.dataLayers.opportunity.description')}</div>
                    <div className="text-xs text-gray-500 mt-1 italic">
                      Data sources: <a 
                        href="https://data.census.gov" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        U.S. Census Bureau
                      </a>, <a 
                        href="https://www.bea.gov" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        U.S. Bureau of Economic Analysis
                      </a>
                    </div>
                  </div>
                </label> */}

                {/* Market Opportunity Zones Legend - Hidden for now, will be re-added later */}
                {/* {showOpportunityZones && !populationLoading && !gdpLoading && (
                  <div className="p-3 bg-white rounded-lg border border-gray-200 mt-2">
                    <h4 className="text-xs font-semibold text-gray-900 mb-2">Market Opportunity Zones</h4>
                    <div className="space-y-1">
                      {getCorrelationZoneRanges().map((zone) => (
                        <div key={zone.zone} className="flex items-start gap-2 text-xs">
                          <div
                            className="w-4 h-4 rounded border border-gray-300 mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: zone.color }}
                          />
                          <div className="flex-1">
                            <span className="text-gray-700 font-medium">{zone.label}</span>
                            <p className="text-gray-500 text-xs mt-0.5">{zone.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200 italic text-center">
                      Data sources: <a 
                        href="https://data.census.gov" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        U.S. Census Bureau
                      </a>, <a 
                        href="https://www.bea.gov" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        U.S. Bureau of Economic Analysis
                      </a>
                    </p>
                  </div>
                )} */}
              </div>
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
    <div 
      className="w-full h-full" 
      style={shouldUseFullHeight 
        ? { 
            minHeight: '100vh', 
            height: '100%',
            width: '100%',
            aspectRatio: '16/9' // Prevent layout shift
          } 
        : { 
            height: '100%',
            width: '100%',
            aspectRatio: '16/9' // Prevent layout shift
          }
      }
    >
      {/* Map - Full Viewport Height */}
      <div 
        className="h-full w-full relative" 
        style={shouldUseFullHeight 
          ? { 
              minHeight: '100vh',
              width: '100%',
              aspectRatio: '16/9' // Prevent layout shift
            } 
          : {
              width: '100%',
              aspectRatio: '16/9' // Prevent layout shift
            }
        }
      >
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-30">
            <div className="bg-white border border-red-200 rounded-lg p-6 m-4 max-w-md">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Map</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}
        {!isLoaded && !error && (
          <div 
            className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50 md:z-50"
            style={{ 
              width: '100%', 
              height: '100%',
              aspectRatio: '16/9' // Match map container dimensions to prevent layout shift
            }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('errors.loadingScript')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('errors.loadingScriptHint')}</p>
            </div>
          </div>
        )}
        {isLoaded && (
          <div 
            className="relative h-full w-full" 
            style={shouldUseFullHeight 
              ? { 
                  minHeight: '100vh', 
                  height: '100%',
                  width: '100%',
                  aspectRatio: '16/9' // Prevent layout shift
                } 
              : { 
                  height: '100%',
                  width: '100%',
                  aspectRatio: '16/9' // Prevent layout shift
                }
            }
          >
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
                  key={selectedPark.id}
                  position={{
                    lat: selectedPark.coordinates[0],
                    lng: selectedPark.coordinates[1],
                  }}
                  onCloseClick={() => {
                    setSelectedPark(null);
                    setCurrentParkPhotoIndex(0);
                    setParkGooglePlacesData(null);
                  }}
                  options={{
                    pixelOffset: new google.maps.Size(0, -10),
                  }}
                >
                  <div className="max-w-xs p-2">
                    {loadingParkPlacesData && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Loading photos...</p>
                      </div>
                    )}
                    {/* Google Places Photos - Lazy loaded when InfoWindow opens */}
                    {!loadingParkPlacesData && (() => {
                      const photos = parkGooglePlacesData?.photos;
                      
                      // Return null if no photos - don't show any placeholder
                      if (!photos || !Array.isArray(photos) || photos.length === 0) {
                        return null;
                      }
                      
                      // Ensure currentParkPhotoIndex is within bounds
                      const safeIndex = Math.max(0, Math.min(currentParkPhotoIndex, photos.length - 1));
                      const currentPhoto = photos[safeIndex];
                      // Use fixed dimensions for InfoWindow to ensure consistent aspect ratio (16:9)
                      const photoUrl = getGooglePhotoUrl(currentPhoto, true);
                      
                      const goToPrevious = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setCurrentParkPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
                      };
                      
                      const goToNext = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setCurrentParkPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
                      };
                      
                      // Generate descriptive alt text
                      const parkName = selectedPark.name.includes('National Park')
                        ? selectedPark.name
                        : `${selectedPark.name} National Park`;
                      const state = selectedPark.state ? ` in ${getFullStateName(selectedPark.state)}` : '';
                      const altText = `Photo of ${parkName}${state} - Image ${safeIndex + 1} of ${photos.length}`;

                      return (
                        <div className="mb-3 -mx-2 -mt-2 relative">
                          {/* Standardized image container: 192px height (h-48) with 16:9 aspect ratio */}
                          <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-gray-100 group" style={{ aspectRatio: '16/9' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photoUrl}
                              alt={altText}
                              className="w-full h-full object-cover"
                              width={400}
                              height={225}
                              onError={(e) => {
                                console.error('❌ Image failed to load for park:', {
                                  url: photoUrl,
                                  park: parkName,
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
                                console.log('✅ Image loaded successfully for', parkName);
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
              {selectedProperty && propertyForDisplay && (
                <InfoWindow
                  key={selectedProperty.id || `property-${selectedProperty.coordinates[0]}-${selectedProperty.coordinates[1]}`}
                  position={{
                    lat: selectedProperty.coordinates[0],
                    lng: selectedProperty.coordinates[1],
                  }}
                  onCloseClick={() => {
                    setSelectedProperty(null);
                    setSelectedPark(null);
                    setCurrentPhotoIndex(0);
                    setFullPropertyDetails(null);
                  }}
                  options={{
                    pixelOffset: new google.maps.Size(0, -10),
                  }}
                >
                  <div className="max-w-xs p-2">
                    {/* Only show loading spinner if we don't have basic property data to display */}
                    {loadingPropertyDetails && (!propertyForDisplay || (!propertyForDisplay.property_name && !propertyForDisplay.site_name)) && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600">Loading details...</p>
                      </div>
                    )}
                    {/* Google Photos - Lazy loaded when InfoWindow opens */}
                    {(!loadingPropertyDetails || (propertyForDisplay && (propertyForDisplay.property_name || propertyForDisplay.site_name))) && propertyForDisplay && parsedPhotos && currentPhotoUrl && (() => {
                      // Ensure currentPhotoIndex is within bounds
                      const safeIndex = Math.max(0, Math.min(currentPhotoIndex, parsedPhotos.length - 1));
                      
                      const goToPrevious = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : parsedPhotos.length - 1));
                      };
                      
                      const goToNext = (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex((prev) => (prev < parsedPhotos.length - 1 ? prev + 1 : 0));
                      };
                      
                      // Generate descriptive alt text
                      const propertyName = propertyForDisplay.property_name || t('infoWindow.property.default');
                      const city = propertyForDisplay.city || '';
                      const state = propertyForDisplay.state || '';
                      const location = city && state ? ` in ${city}, ${state}` : state ? ` in ${state}` : '';
                      const altText = `Photo of ${propertyName} glamping property${location} - Image ${safeIndex + 1} of ${parsedPhotos.length}`;

                      return (
                        <div className="mb-3 -mx-2 -mt-2 relative">
                          {/* Standardized image container: 192px height (h-48) with 16:9 aspect ratio */}
                          <div className="relative w-full h-48 overflow-hidden rounded-t-lg bg-gray-100 group" style={{ aspectRatio: '16/9' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              key={currentPhotoUrl}
                              src={currentPhotoUrl}
                              alt={altText}
                              className="w-full h-full object-cover"
                              width={400}
                              height={225}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const imgUrl = target.src;
                                
                                console.error('❌ Image failed to load:', {
                                  url: imgUrl,
                                  property: propertyForDisplay.property_name,
                                  photoIndex: safeIndex,
                                  totalPhotos: parsedPhotos.length,
                                  photoName: parsedPhotos[safeIndex]?.name?.substring(0, 100),
                                  error: e
                                });
                                
                                // Hide the entire photo container if image fails to load
                                const container = target.closest('.mb-3') as HTMLElement;
                                if (container) {
                                  container.style.display = 'none';
                                }
                              }}
                              onLoad={() => {
                                console.log('✅ Image loaded successfully for', propertyForDisplay.property_name);
                              }}
                            />
                            
                            {/* Navigation Arrows - Only show if more than 1 photo */}
                            {parsedPhotos.length > 1 && (
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
                            {parsedPhotos.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded z-10">
                                {safeIndex + 1} / {parsedPhotos.length}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    {propertyForDisplay && (
                      <>
                        <h3 className="font-bold text-lg mb-2 text-gray-900">
                          {propertyForDisplay.property_name || propertyForDisplay.site_name || t('infoWindow.property.unnamed')}
                        </h3>
                        {(() => {
                          const addressParts = [];
                          if (propertyForDisplay.address) {
                            addressParts.push(propertyForDisplay.address.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
                          }
                          if (propertyForDisplay.city) {
                            addressParts.push(propertyForDisplay.city);
                          }
                          if (propertyForDisplay.state) {
                            addressParts.push(propertyForDisplay.state);
                          }
                          const fullAddress = addressParts.join(', ');
                          return fullAddress ? (
                            <p className="text-sm text-gray-600 mb-2 truncate" title={fullAddress}>
                              {fullAddress}
                            </p>
                          ) : null;
                        })()}
                      </>
                    )}
                    {propertyForDisplay && (
                      <>
                        {(propertyForDisplay as any).all_unit_types && (propertyForDisplay as any).all_unit_types.length > 0 && (
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-semibold">{t('infoWindow.property.unitTypes')}:</span>{' '}
                            {(propertyForDisplay as any).all_unit_types.join(', ')}
                          </p>
                        )}
                        {/* Show unit_type as fallback if all_unit_types is not available */}
                        {(!(propertyForDisplay as any).all_unit_types || (propertyForDisplay as any).all_unit_types.length === 0) && propertyForDisplay.unit_type && (
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-semibold">{t('infoWindow.property.unitTypes')}:</span>{' '}
                            {propertyForDisplay.unit_type}
                          </p>
                        )}
                        {/* Rate Category - Hidden */}
                        {false && (propertyForDisplay as any).rate_category && (
                          <p className="text-sm text-gray-700 mb-2">
                            <span className="font-semibold">{t('infoWindow.property.avgRate')}:</span>{' '}
                            {(propertyForDisplay as any).rate_category}
                          </p>
                        )}
                        {((propertyForDisplay as any).google_rating || (propertyForDisplay as any).google_user_rating_total) && (
                          <div className="flex items-center gap-2 mb-2">
                            {(propertyForDisplay as any).google_rating && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                                </svg>
                                <span className="text-sm font-semibold text-gray-900">
                                  {(propertyForDisplay as any).google_rating.toFixed(1)}
                                </span>
                              </div>
                            )}
                            {(propertyForDisplay as any).google_user_rating_total && (
                              <span className="text-sm text-gray-600">
                                ({(propertyForDisplay as any).google_user_rating_total.toLocaleString()} {((propertyForDisplay as any).google_user_rating_total === 1) ? t('infoWindow.property.reviews.one') : t('infoWindow.property.reviews.other')})
                              </span>
                            )}
                          </div>
                        )}
                        {(() => {
                          // Generate or use property slug for "View more" link
                          const propertySlug = propertyForDisplay.slug || 
                            (propertyForDisplay.property_name ? slugifyPropertyName(propertyForDisplay.property_name) : 
                             (propertyForDisplay.site_name ? slugifyPropertyName(propertyForDisplay.site_name) : null));
                          
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
                      </>
                    )}
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
                  otherLayerEnabled={showGDPLayer}
                  otherLayerData={showGDPLayer ? gdpLookup : null}
                  isNearMarker={isNearMarker}
                />
              )}

              {/* GDP Growth Layer */}
              {showGDPLayer && map && (
                <GDPLayer
                  key={`gdp-layer-${gdpLayerKey}`}
                  map={map}
                  gdpLookup={gdpLookup}
                  visible={showGDPLayer}
                  otherLayerEnabled={showPopulationLayer}
                  otherLayerData={showPopulationLayer ? (populationFipsLookup || populationLookup) : null}
                  isNearMarker={isNearMarker}
                />
              )}

              {/* Market Opportunity Zones Layer */}
              {showOpportunityZones && map && populationFipsLookup && gdpLookup && (
                <OpportunityZonesLayer
                  key={`opportunity-zones-layer-${populationLayerKey}-${gdpLayerKey}`}
                  map={map}
                  populationLookup={populationFipsLookup}
                  gdpLookup={gdpLookup}
                  visible={showOpportunityZones}
                  isNearMarker={isNearMarker}
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

