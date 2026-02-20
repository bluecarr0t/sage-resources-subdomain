'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { GoogleMap, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from './GoogleMapsProvider';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';

async function getSupabaseClient() {
  const { supabase } = await import('@/lib/supabase');
  return supabase;
}
import { NationalPark, NationalParkWithCoords, filterParksWithCoordinates } from '@/lib/types/national-parks';
import { useMapContext } from './MapContext';
import { getChangeRanges } from '@/lib/maps/county-boundaries';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

import { usePropertyProcessing } from './map/hooks/usePropertyProcessing';
import { useMapFilters } from './map/hooks/useMapFilters';
import { useMapBounds } from './map/hooks/useMapBounds';
import { useMapMarkers } from './map/hooks/useMapMarkers';
import { useMapLayers } from './map/hooks/useMapLayers';
import { useFilterComputations } from './map/hooks/useFilterComputations';
import { getGooglePhotoUrl } from './map/utils/photoUtils';
import { parseGooglePhotos } from './map/utils/photoUtils';

import FilterSidebar from './map/FilterSidebar';
import PropertyInfoWindow from './map/PropertyInfoWindow';
import ParkInfoWindow from './map/ParkInfoWindow';

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

const defaultCenter = { lat: 39.5, lng: -98.5 };
const defaultZoom = 4;
const defaultZoomMobile = 3.25;

type PropertyWithCoords = SageProperty & { coordinates: [number, number] };

interface GooglePropertyMapProps {
  showMap?: boolean;
}

export default function GooglePropertyMap({ showMap = true }: GooglePropertyMapProps) {
  const {
    filterCountry, filterState, filterUnitType, filterRateRange,
    showNationalParks, selectedMapLayer, showPopulationLayer, showGDPLayer, showOpportunityZones,
    populationYear, toggleNationalParks, setMapLayer, setPopulationYear,
    clearFilters, hasActiveFilters,
    properties: sharedProperties, allProperties: sharedAllProperties,
    propertiesLoading: sharedPropertiesLoading, propertiesError: sharedPropertiesError,
    hasLoadedOnce, isFullscreen, toggleFullscreen,
    setFilterCountry, setFilterState, setFilterUnitType, setFilterRateRange,
    toggleCountry, toggleState, toggleUnitType, toggleRateRange,
  } = useMapContext();

  const t = useTranslations('map');
  const properties = sharedProperties;
  const allProperties = sharedAllProperties;
  const [nationalParks, setNationalParks] = useState<NationalPark[]>([]);
  const loading = sharedPropertiesLoading;
  const error = sharedPropertiesError;
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithCoords | null>(null);
  const [selectedPark, setSelectedPark] = useState<NationalParkWithCoords | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(defaultCenter);
  const [mapZoom, setMapZoom] = useState<number>(defaultZoom);
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null);

  const {
    populationLookup, populationFipsLookup, populationLoading, populationLayerKey,
    gdpLookup, gdpLoading, gdpLayerKey,
  } = useMapLayers({ showPopulationLayer, showGDPLayer, populationYear });

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Full property details for InfoWindow (fetched on marker click)
  const [fullPropertyDetails, setFullPropertyDetails] = useState<any>(null);
  const [loadingPropertyDetails, setLoadingPropertyDetails] = useState(false);

  // Fresh Google Places data for photos and ratings
  const [freshGooglePlacesData, setFreshGooglePlacesData] = useState<{
    photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
    rating?: number;
    userRatingCount?: number;
  } | null>(null);

  // National Park Google Places data
  const [parkGooglePlacesData, setParkGooglePlacesData] = useState<{
    photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
    rating?: number;
    userRatingCount?: number;
  } | null>(null);
  const [loadingParkPlacesData, setLoadingParkPlacesData] = useState(false);
  const [currentParkPhotoIndex, setCurrentParkPhotoIndex] = useState(0);

  useEffect(() => { setCurrentPhotoIndex(0); }, [selectedProperty?.id]);
  useEffect(() => { setCurrentParkPhotoIndex(0); }, [selectedPark?.id]);

  // Fetch full property details AND fresh Google Places data when marker is clicked
  useEffect(() => {
    if (!selectedProperty || !selectedProperty.id) {
      setFullPropertyDetails(null);
      setFreshGooglePlacesData(null);
      return;
    }

    const hasFullDetails = selectedProperty.google_photos !== undefined ||
      selectedProperty.address !== undefined ||
      selectedProperty.description !== undefined;

    if (hasFullDetails) {
      setFullPropertyDetails(selectedProperty);
    } else if (selectedProperty.property_name || selectedProperty.site_name) {
      setFullPropertyDetails(selectedProperty);
    }

    async function fetchFullPropertyDetails() {
      if (!selectedProperty?.id) return;
      setLoadingPropertyDetails(true);
      try {
        const response = await fetch(`/api/properties?id=${selectedProperty.id}`);
        if (!response.ok) throw new Error('Failed to fetch property details');
        const result = await response.json();
        if (result.success && result.data) {
          setFullPropertyDetails({ ...selectedProperty, ...result.data });
        } else {
          setFullPropertyDetails(selectedProperty);
        }
      } catch (err) {
        console.error('Error fetching property details:', err);
        setFullPropertyDetails(selectedProperty);
      } finally {
        setLoadingPropertyDetails(false);
      }
    }

    async function fetchFreshGooglePlacesData() {
      if (!selectedProperty?.property_name) return;
      try {
        const params = new URLSearchParams({ propertyName: selectedProperty.property_name || '' });
        if (selectedProperty.city) params.append('city', selectedProperty.city);
        if (selectedProperty.state) params.append('state', selectedProperty.state);
        if (selectedProperty.address) params.append('address', selectedProperty.address);
        const response = await fetch(`/api/google-places?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setFreshGooglePlacesData(data);
        } else {
          setFreshGooglePlacesData(null);
        }
      } catch {
        setFreshGooglePlacesData(null);
      }
    }

    fetchFullPropertyDetails();
    fetchFreshGooglePlacesData();
  }, [selectedProperty]);

  const propertyForDisplay = selectedProperty ? { ...selectedProperty, ...(fullPropertyDetails || {}) } : null;

  const parsedPhotos = useMemo(() => {
    if (freshGooglePlacesData?.photos && freshGooglePlacesData.photos.length > 0) {
      return freshGooglePlacesData.photos;
    }
    const photosData = fullPropertyDetails?.google_photos || selectedProperty?.google_photos;
    return parseGooglePhotos(photosData, selectedProperty?.property_name);
  }, [freshGooglePlacesData, selectedProperty?.id, selectedProperty?.google_photos, fullPropertyDetails?.google_photos]);

  const currentPhotoUrl = useMemo(() => {
    if (!parsedPhotos || parsedPhotos.length === 0) return null;
    const safeIndex = Math.max(0, Math.min(currentPhotoIndex, parsedPhotos.length - 1));
    const currentPhoto = parsedPhotos[safeIndex];
    if (!currentPhoto || !currentPhoto.name) return null;
    const photoName = String(currentPhoto.name).trim();
    if (photoName === '' || photoName === 'null' || photoName === 'undefined') return null;
    const photoUrl = getGooglePhotoUrl(currentPhoto, true);
    return photoUrl || null;
  }, [parsedPhotos, currentPhotoIndex, selectedProperty?.id, freshGooglePlacesData]);

  // Fetch Google Places data for National Park
  useEffect(() => {
    if (!selectedPark) { setParkGooglePlacesData(null); return; }
    async function fetchParkGooglePlacesData() {
      if (!selectedPark?.name) return;
      setLoadingParkPlacesData(true);
      try {
        const params = new URLSearchParams({
          propertyName: selectedPark.name.includes('National Park') ? selectedPark.name : `${selectedPark.name} National Park`,
        });
        if (selectedPark.state) params.append('state', selectedPark.state);
        const response = await fetch(`/api/google-places?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setParkGooglePlacesData(data);
        } else {
          setParkGooglePlacesData(null);
        }
      } catch {
        setParkGooglePlacesData(null);
      } finally {
        setLoadingParkPlacesData(false);
      }
    }
    fetchParkGooglePlacesData();
  }, [selectedPark]);

  // Mutual exclusion between property and park selection
  useEffect(() => { if (selectedPark) { setSelectedProperty(null); setFullPropertyDetails(null); } }, [selectedPark]);
  useEffect(() => { if (selectedProperty) { setSelectedPark(null); } }, [selectedProperty]);

  const clustererRef = useRef<any | null>(null);
  const hasCenteredFromUrlRef = useRef<boolean>(false);
  const hasJustFittedBoundsRef = useRef<boolean>(false);
  const markerClickTimeRef = useRef<number>(0);

  useEffect(() => {
    setIsClient(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const { urlInitialized } = useMapFilters({
    isClient, isMobile,
    filterCountry, filterState, filterUnitType, filterRateRange,
    setFilterCountry, setFilterState, setFilterUnitType, setFilterRateRange,
    setMapCenter, setMapZoom, setShouldFitBounds,
    hasCenteredFromUrlRef, hasJustFittedBoundsRef,
  });

  // Lazy load national parks
  useEffect(() => {
    if (!showNationalParks || nationalParks.length > 0) return;
    async function fetchNationalParks() {
      try {
        const supabaseClient = await getSupabaseClient();
        const { data, error: supabaseError } = await supabaseClient.from('national-parks').select('*');
        if (supabaseError) { console.error('Error fetching national parks:', supabaseError); return; }
        if (data) setNationalParks(data as NationalPark[]);
      } catch (err) { console.error('Error fetching national parks:', err); }
    }
    const timer = setTimeout(() => fetchNationalParks(), 100);
    return () => clearTimeout(timer);
  }, [showNationalParks, nationalParks.length]);

  const processedProperties = usePropertyProcessing(properties, filterState, filterCountry, filterUnitType, filterRateRange);
  const displayProperties = processedProperties;
  const propertiesWithCoords = useMemo(() => filterPropertiesWithCoordinates(displayProperties), [displayProperties]);

  const { markersRef, parkMarkersRef } = useMapMarkers({
    map, isClient,
    properties: displayProperties, nationalParks, showNationalParks,
    setSelectedProperty, setSelectedPark, markerClickTimeRef,
  });

  const isNearMarker = useCallback((lat: number, lng: number, threshold: number = 0.002): boolean => {
    const timeSinceMarkerClick = Date.now() - markerClickTimeRef.current;
    if (timeSinceMarkerClick < 100) return true;
    for (const property of propertiesWithCoords) {
      const [markerLat, markerLng] = property.coordinates;
      if (Math.abs(lat - markerLat) < threshold && Math.abs(lng - markerLng) < threshold) return true;
    }
    if (showNationalParks) {
      for (const park of filterParksWithCoordinates(nationalParks)) {
        const [markerLat, markerLng] = park.coordinates;
        if (Math.abs(lat - markerLat) < threshold && Math.abs(lng - markerLng) < threshold) return true;
      }
    }
    return false;
  }, [propertiesWithCoords, nationalParks, showNationalParks, markerClickTimeRef]);

  const { onIdle: onIdleFromHook } = useMapBounds({
    map, isClient, isMobile, shouldFitBounds, filterState,
    mapCenter, mapZoom, propertiesWithCoords,
    setMapCenter, setMapZoom, setMapBounds, hasJustFittedBoundsRef,
  });

  // Center map from URL coordinates
  useEffect(() => {
    if (map && !shouldFitBounds && mapCenter && mapZoom) {
      const isFromUrl = mapCenter.lat !== defaultCenter.lat || mapCenter.lng !== defaultCenter.lng || mapZoom !== defaultZoom;
      if (isFromUrl) {
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        const centerDiff = currentCenter ? Math.abs(currentCenter.lat() - mapCenter.lat) + Math.abs(currentCenter.lng() - mapCenter.lng) : Infinity;
        const zoomDiff = currentZoom ? Math.abs(currentZoom - mapZoom) : Infinity;
        if (centerDiff > 0.001 || zoomDiff > 0.5) {
          map.setCenter(mapCenter);
          map.setZoom(mapZoom);
          hasCenteredFromUrlRef.current = true;
          setTimeout(() => { const bounds = map.getBounds(); if (bounds) setMapBounds(bounds); }, 500);
          if (propertiesWithCoords.length > 0) {
            const targetProperty = propertiesWithCoords.find((property) => {
              const [lat, lon] = property.coordinates;
              return Math.abs(lat - mapCenter.lat) < 0.01 && Math.abs(lon - mapCenter.lng) < 0.01;
            });
            if (targetProperty) setSelectedProperty(targetProperty);
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
      map.setCenter(defaultCenter);
      map.setZoom(isMobileCheck ? defaultZoomMobile : defaultZoom);
    }
    setTimeout(() => { const bounds = map.getBounds(); if (bounds) setMapBounds(bounds); }, 200);
  }, [searchParams, setMapBounds]);

  const onIdle = useCallback(() => onIdleFromHook(), [onIdleFromHook]);

  useEffect(() => {
    if (map && !shouldFitBounds) {
      const timer = setTimeout(() => { const bounds = map.getBounds(); if (bounds) setMapBounds(bounds); }, 300);
      return () => clearTimeout(timer);
    }
  }, [map, mapCenter, mapZoom, shouldFitBounds]);

  const onUnmount = useCallback(() => {
    if (clustererRef.current) { clustererRef.current.clearMarkers(); clustererRef.current = null; }
    if (markersRef.current) { markersRef.current.forEach((marker) => { marker.map = null; }); markersRef.current = []; }
    setMap(null);
  }, [markersRef]);

  const checkWebGLSupport = useCallback(() => {
    if (typeof window === 'undefined') return false;
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || canvas.getContext('webgl2');
      return !!gl;
    } catch { return false; }
  }, []);

  const mapOptions = useMemo(() => {
    const baseOptions = {
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: true,
      fullscreenControl: true,
      mapTypeId: 'terrain' as const,
      gestureHandling: (isMobile && isFullscreen ? 'greedy' : 'cooperative') as 'greedy' | 'cooperative',
      draggable: true,
      scrollwheel: !isMobile,
      keyboardShortcuts: true,
    };
    const hasWebGL = checkWebGLSupport();
    if (hasWebGL) {
      return { ...baseOptions, mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'a17afb5a01f9ebd9f8514b81' };
    }
    return baseOptions;
  }, [isMobile, isFullscreen, checkWebGLSupport]);

  useEffect(() => {
    if (!map || !isClient) return;
    map.setOptions({ gestureHandling: isMobile && isFullscreen ? 'greedy' : 'cooperative', scrollwheel: !isMobile });
  }, [map, isClient, isMobile, isFullscreen]);

  // Fullscreen change sync
  useEffect(() => {
    if (!isClient) return;
    const handleFullscreenChange = () => {
      if (window.innerWidth >= 768) return;
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement);
      if (!isCurrentlyFullscreen && isFullscreen) toggleFullscreen();
      else if (isCurrentlyFullscreen && !isFullscreen) toggleFullscreen();
    };
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

  // Filter clearing effects for unit types and rate categories
  const { availableUnitTypes, availableRateCategories } = useFilterComputations({
    allProperties, filterCountry, filterState, filterUnitType, filterRateRange,
  });

  useEffect(() => {
    if (filterUnitType.length > 0 && availableUnitTypes.length > 0) {
      const validUnitTypes = filterUnitType.filter((ut) => availableUnitTypes.includes(ut));
      if (validUnitTypes.length !== filterUnitType.length) setFilterUnitType(validUnitTypes);
    }
  }, [availableUnitTypes, filterUnitType, setFilterUnitType]);

  useEffect(() => {
    if (filterRateRange.length > 0 && availableRateCategories.length > 0) {
      const validRateRanges = filterRateRange.filter((rr) => availableRateCategories.includes(rr));
      if (validRateRanges.length !== filterRateRange.length) setFilterRateRange(validRateRanges);
    }
  }, [availableRateCategories, filterRateRange, setFilterRateRange]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      import('../lib/api-key-security').then(({ logSecurityInfo, getSecurityWarnings }) => {
        logSecurityInfo(apiKey);
        const warnings = getSecurityWarnings();
        if (warnings.length > 0) console.warn('[GooglePropertyMap] Security Warnings:', warnings);
      });
    }
  }, [apiKey]);

  const { isLoaded, loadError } = useGoogleMaps();
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => { if (loadError) setMapError(loadError.message || 'Failed to load Google Maps'); }, [loadError]);

  // Suppress vector map fallback error
  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      const originalError = console.error;
      const errorInterceptor = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('Vector Map') && (message.includes('Falling back to Raster') || message.includes('falling back'))) return;
        originalError.apply(console, args);
      };
      console.error = errorInterceptor;
      return () => { console.error = originalError; };
    }
  }, [isClient]);

  useEffect(() => {
    if (!isLoaded && !loadError && apiKey) {
      const timeout = setTimeout(() => console.warn('Google Maps script taking longer than expected to load.'), 10000);
      return () => clearTimeout(timeout);
    }
  }, [isLoaded, loadError, apiKey]);

  // Early returns for loading/error states
  if (!isClient && showMap) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50 md:z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('errors.initializing')}</p>
        </div>
      </div>
    );
  }

  if (!isClient && !showMap) return <div className="w-full space-y-6" />;

  if (!apiKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Google Maps API Key Required</h3>
        <p className="text-yellow-600 mb-4">
          Please add your Google Maps API key to <code className="bg-yellow-100 px-2 py-1 rounded">.env.local</code>:
        </p>
        <code className="block bg-yellow-100 p-3 rounded text-sm">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here</code>
      </div>
    );
  }

  if (loadError || mapError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Google Maps Error</h3>
        <p className="text-red-600 mb-4 font-medium">{loadError?.message || mapError || 'Failed to load Google Maps'}</p>
      </div>
    );
  }

  if (!isLoaded && showMap) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-100 z-50 md:z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('errors.loadingMaps')}</p>
        </div>
      </div>
    );
  }

  // Render FilterSidebar when showMap is false
  if (!showMap) {
    return (
      <FilterSidebar
        nationalParks={nationalParks}
        populationLoading={populationLoading}
        gdpLoading={gdpLoading}
        isMobile={isMobile}
      />
    );
  }

  // Render map
  const shouldUseFullHeight = isFullscreen || !isMobile;

  return (
    <div
      className="w-full h-full"
      style={shouldUseFullHeight
        ? { minHeight: '100vh', height: '100%', width: '100%', aspectRatio: '16/9' }
        : { height: '100%', width: '100%', aspectRatio: '16/9' }
      }
    >
      <div
        className="h-full w-full relative"
        style={shouldUseFullHeight
          ? { minHeight: '100vh', width: '100%', aspectRatio: '16/9' }
          : { width: '100%', aspectRatio: '16/9' }
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
            style={{ width: '100%', height: '100%', aspectRatio: '16/9' }}
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">{t('errors.loadingScript')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('errors.loadingScriptHint')}</p>
            </div>
          </div>
        )}

        {isLoaded && (
          <div
            className="relative h-full w-full"
            style={shouldUseFullHeight
              ? { minHeight: '100vh', height: '100%', width: '100%', aspectRatio: '16/9' }
              : { height: '100%', width: '100%', aspectRatio: '16/9' }
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
              {/* National Park InfoWindow */}
              {selectedPark && (
                <InfoWindow
                  key={selectedPark.id}
                  position={{ lat: selectedPark.coordinates[0], lng: selectedPark.coordinates[1] }}
                  onCloseClick={() => {
                    setSelectedPark(null);
                    setCurrentParkPhotoIndex(0);
                    setParkGooglePlacesData(null);
                  }}
                  options={{ pixelOffset: new google.maps.Size(0, -10) }}
                >
                  <ParkInfoWindow
                    selectedPark={selectedPark}
                    parkGooglePlacesData={parkGooglePlacesData}
                    loadingParkPlacesData={loadingParkPlacesData}
                    currentParkPhotoIndex={currentParkPhotoIndex}
                    setCurrentParkPhotoIndex={setCurrentParkPhotoIndex}
                    onClose={() => {
                      setSelectedPark(null);
                      setCurrentParkPhotoIndex(0);
                      setParkGooglePlacesData(null);
                    }}
                  />
                </InfoWindow>
              )}

              {/* Property InfoWindow */}
              {selectedProperty && propertyForDisplay && (
                <InfoWindow
                  key={selectedProperty.id || `property-${selectedProperty.coordinates[0]}-${selectedProperty.coordinates[1]}`}
                  position={{ lat: selectedProperty.coordinates[0], lng: selectedProperty.coordinates[1] }}
                  onCloseClick={() => {
                    setSelectedProperty(null);
                    setSelectedPark(null);
                    setCurrentPhotoIndex(0);
                    setFullPropertyDetails(null);
                  }}
                  options={{ pixelOffset: new google.maps.Size(0, -10) }}
                >
                  <PropertyInfoWindow
                    selectedProperty={selectedProperty}
                    propertyForDisplay={propertyForDisplay}
                    parsedPhotos={parsedPhotos}
                    currentPhotoUrl={currentPhotoUrl}
                    currentPhotoIndex={currentPhotoIndex}
                    setCurrentPhotoIndex={setCurrentPhotoIndex}
                    loadingPropertyDetails={loadingPropertyDetails}
                    onClose={() => {
                      setSelectedProperty(null);
                      setSelectedPark(null);
                      setCurrentPhotoIndex(0);
                      setFullPropertyDetails(null);
                    }}
                  />
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

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-30 pointer-events-none">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600" />
                  <p className="text-gray-600 font-medium mt-4">{t('errors.loadingProperties')}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && hasLoadedOnce && displayProperties.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20" role="status">
            <div className="text-center p-6 bg-white rounded-xl shadow-md max-w-xs mx-4">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-700 font-semibold text-lg">{t('errors.noProperties')}</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">{t('errors.noPropertiesHint')}</p>
              {hasActiveFilters && (
                <button
                  onClick={() => clearFilters()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('filters.clearAll')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
