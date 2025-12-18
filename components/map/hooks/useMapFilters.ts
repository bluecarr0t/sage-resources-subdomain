import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const defaultCenter = { lat: 39.5, lng: -98.5 };
const defaultZoom = 4;
const defaultZoomMobile = 3.25;

interface UseMapFiltersProps {
  isClient: boolean;
  isMobile: boolean;
  filterCountry: string[];
  filterState: string[];
  filterUnitType: string[];
  filterRateRange: string[];
  setFilterCountry: (country: string[]) => void;
  setFilterState: (state: string[]) => void;
  setFilterUnitType: (unitType: string[]) => void;
  setFilterRateRange: (rateRange: string[]) => void;
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
  setShouldFitBounds: (fit: boolean) => void;
  hasCenteredFromUrlRef: React.MutableRefObject<boolean>;
  hasJustFittedBoundsRef: React.MutableRefObject<boolean>;
}

/**
 * Hook to manage filter state and URL synchronization
 */
export function useMapFilters({
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
}: UseMapFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [urlInitialized, setUrlInitialized] = useState(false);

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
        setShouldFitBounds(false);
        hasCenteredFromUrlRef.current = false;
        
        if (urlZoom) {
          const zoom = parseFloat(urlZoom);
          if (!isNaN(zoom) && isFinite(zoom) && zoom >= 1 && zoom <= 20) {
            setMapZoom(zoom);
          } else {
            setMapZoom(15);
          }
        } else {
          setMapZoom(15);
        }
      }
    } else {
      const zoomToUse = isMobile ? defaultZoomMobile : defaultZoom;
      setMapCenter(defaultCenter);
      setMapZoom(zoomToUse);
      setShouldFitBounds(false);
      hasCenteredFromUrlRef.current = false;
    }
    
    setUrlInitialized(true);
  }, [isClient, searchParams, urlInitialized, setFilterCountry, setFilterState, setFilterUnitType, setFilterRateRange, isMobile, setMapCenter, setMapZoom, setShouldFitBounds, hasCenteredFromUrlRef]);

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
    
    // Don't enable fitBounds if there are URL coordinates
    if (urlLat && urlLon) {
      setShouldFitBounds(false);
      hasJustFittedBoundsRef.current = false;
      return;
    }
    
    // Enable fitBounds when state filter is applied
    if (filterState.length > 0) {
      setShouldFitBounds(true);
      hasJustFittedBoundsRef.current = false;
    } else {
      setShouldFitBounds(false);
      hasJustFittedBoundsRef.current = false;
    }
  }, [filterState, isClient, urlInitialized, searchParams, setShouldFitBounds, hasJustFittedBoundsRef]);

  // Watch for changes to lat/lon/zoom URL parameters and update map position
  useEffect(() => {
    if (!isClient || !urlInitialized) return;

    const urlLat = searchParams.get('lat');
    const urlLon = searchParams.get('lon');
    const urlZoom = searchParams.get('zoom');

    if (urlLat && urlLon) {
      const lat = parseFloat(urlLat);
      const lon = parseFloat(urlLon);
      if (!isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon)) {
        setMapCenter({ lat, lng: lon });
        setShouldFitBounds(false);
        hasCenteredFromUrlRef.current = false;
        
        if (urlZoom) {
          const zoom = parseFloat(urlZoom);
          if (!isNaN(zoom) && isFinite(zoom) && zoom >= 1 && zoom <= 20) {
            setMapZoom(zoom);
          } else {
            setMapZoom(15);
          }
        } else {
          setMapZoom(15);
        }
      }
    } else {
      const zoomToUse = isMobile ? defaultZoomMobile : defaultZoom;
      setMapCenter(defaultCenter);
      setMapZoom(zoomToUse);
      setShouldFitBounds(false);
      hasCenteredFromUrlRef.current = false;
    }
  }, [isClient, urlInitialized, searchParams, isMobile, setMapCenter, setMapZoom, setShouldFitBounds, hasCenteredFromUrlRef]);

  return { urlInitialized };
}
