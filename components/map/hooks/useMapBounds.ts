import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

const defaultCenter = { lat: 39.5, lng: -98.5 };
const defaultZoom = 4;
const defaultZoomMobile = 3.25;

interface UseMapBoundsProps {
  map: google.maps.Map | null;
  isClient: boolean;
  isMobile: boolean;
  shouldFitBounds: boolean;
  filterState: string[];
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  propertiesWithCoords: Array<{ coordinates: [number, number] }>;
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
  setMapBounds: (bounds: google.maps.LatLngBounds | null) => void;
  hasJustFittedBoundsRef: React.MutableRefObject<boolean>;
}

/**
 * Hook to manage map bounds and viewport
 */
export function useMapBounds({
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
}: UseMapBoundsProps) {
  const searchParams = useSearchParams();

  // Set default center and zoom for lower 48 states when map loads
  useEffect(() => {
    if (map && !shouldFitBounds) {
      if (hasJustFittedBoundsRef.current) {
        const timer = setTimeout(() => {
          hasJustFittedBoundsRef.current = false;
        }, 1000);
        return () => clearTimeout(timer);
      }
      
      if (filterState.length > 0) {
        return;
      }
      
      const urlLat = searchParams.get('lat');
      const urlLon = searchParams.get('lon');
      
      if (!urlLat || !urlLon) {
        const currentCenter = map.getCenter();
        const currentZoom = map.getZoom();
        const zoomToUse = isMobile ? defaultZoomMobile : defaultZoom;
        
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
  }, [map, shouldFitBounds, searchParams, filterState, isMobile, hasJustFittedBoundsRef]);

  // Fit map bounds to show all property markers
  useEffect(() => {
    if (map && shouldFitBounds) {
      if (propertiesWithCoords.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        propertiesWithCoords.forEach((item) => {
          bounds.extend({
            lat: item.coordinates[0],
            lng: item.coordinates[1],
          });
        });
        map.fitBounds(bounds);
        hasJustFittedBoundsRef.current = true;
        setTimeout(() => {
          hasJustFittedBoundsRef.current = false;
        }, 1000);
      }
    }
  }, [map, shouldFitBounds, propertiesWithCoords, hasJustFittedBoundsRef]);

  // Update bounds when map changes
  useEffect(() => {
    if (map && !shouldFitBounds) {
      const timer = setTimeout(() => {
        const bounds = map.getBounds();
        if (bounds) {
          setMapBounds(bounds);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [map, mapCenter, mapZoom, shouldFitBounds, setMapBounds]);

  // Update bounds on map idle
  const onIdle = () => {
    if (map) {
      const bounds = map.getBounds();
      if (bounds) {
        setMapBounds(bounds);
      }
    }
  };

  return { onIdle };
}
