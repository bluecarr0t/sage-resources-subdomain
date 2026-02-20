import { useEffect, useRef } from 'react';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';
import { NationalPark, filterParksWithCoordinates } from '@/lib/types/national-parks';

type PropertyWithCoords = SageProperty & { coordinates: [number, number] };
type NationalParkWithCoords = NationalPark & { coordinates: [number, number] };

interface UseMapMarkersProps {
  map: google.maps.Map | null;
  isClient: boolean;
  properties: SageProperty[];
  nationalParks: NationalPark[];
  showNationalParks: boolean;
  setSelectedProperty: (property: PropertyWithCoords | null) => void;
  setSelectedPark: (park: NationalParkWithCoords | null) => void;
  markerClickTimeRef: React.MutableRefObject<number>;
}

/**
 * Hook to manage map markers for properties and national parks
 */
export function useMapMarkers({
  map,
  isClient,
  properties,
  nationalParks,
  showNationalParks,
  setSelectedProperty,
  setSelectedPark,
  markerClickTimeRef,
}: UseMapMarkersProps) {
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const parkMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const propertyIdsRef = useRef<Set<string | number>>(new Set());
  const lastClickedMarkerRef = useRef<{ type: 'property' | 'park'; id: string | number; timestamp: number } | null>(null);

  // Filter properties with coordinates
  const propertiesWithCoords = filterPropertiesWithCoordinates(properties);

  // Manage property markers
  useEffect(() => {
    if (!map || !isClient) {
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      markersRef.current = [];
      propertyIdsRef.current.clear();
      return;
    }

    if (propertiesWithCoords.length === 0) {
      markersRef.current.forEach(marker => {
        marker.map = null;
      });
      markersRef.current = [];
      propertyIdsRef.current.clear();
      return;
    }

    // Check if property list has changed
    const currentPropertyIds = new Set(propertiesWithCoords.map(p => p.id));
    const idsMatch = 
      currentPropertyIds.size === propertyIdsRef.current.size &&
      Array.from(currentPropertyIds).every(id => propertyIdsRef.current.has(id));
    
    if (idsMatch && markersRef.current.length > 0) {
      return;
    }

    // Clean up old markers
    markersRef.current.forEach(marker => {
      marker.map = null;
    });
    markersRef.current = [];
    propertyIdsRef.current = currentPropertyIds;

    // Create markers using AdvancedMarkerElement
    const createMarkers = async () => {
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

      const markers = propertiesWithCoords.map((property) => {
        const bluePin = new PinElement({
          background: '#3B82F6',
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: 1.0,
        });
        
        const markerTitle = property.property_name || 'Glamping property';
        bluePin.element.setAttribute('aria-label', markerTitle);
        bluePin.element.setAttribute('role', 'button');
        bluePin.element.setAttribute('tabindex', '0');
        
        const marker = new AdvancedMarkerElement({
          map: map,
          position: {
            lat: property.coordinates[0],
            lng: property.coordinates[1],
          },
          title: markerTitle,
          content: bluePin.element,
        });

        marker.addEventListener('click', (event: any) => {
          const clickTimestamp = Date.now();
          
          // Check if another marker was clicked very recently (within 50ms)
          // If so, and it's a different marker, ignore this click to prevent conflicts
          if (lastClickedMarkerRef.current && 
              clickTimestamp - lastClickedMarkerRef.current.timestamp < 50 &&
              (lastClickedMarkerRef.current.type !== 'property' || lastClickedMarkerRef.current.id !== property.id)) {
            // Another marker was clicked very recently, ignore this one
            if (event.domEvent) {
              event.domEvent.stopPropagation();
              event.domEvent.stopImmediatePropagation();
            }
            if (event.stop) {
              event.stop();
            }
            return;
          }
          
          // Record this as the last clicked marker
          lastClickedMarkerRef.current = {
            type: 'property',
            id: property.id,
            timestamp: clickTimestamp,
          };
          
          // Immediately stop all event propagation to prevent other markers from responding
          if (event.domEvent) {
            event.domEvent.stopPropagation();
            event.domEvent.stopImmediatePropagation();
            event.domEvent.preventDefault();
          }
          if (event.stop) {
            event.stop();
          }
          
          // Update click time ref to prevent data layer clicks
          markerClickTimeRef.current = clickTimestamp;
          
          // Clear any other selections first
          setSelectedPark(null);
          
          // Immediately set the selected property to the one that was actually clicked
          // This ensures the correct info window is displayed
          setSelectedProperty(property as PropertyWithCoords);
        });

        return marker;
      });

      markersRef.current = markers;
    };

    createMarkers().catch(console.error);
  }, [map, isClient, propertiesWithCoords, setSelectedProperty, setSelectedPark, markerClickTimeRef]);

  // Manage national park markers
  useEffect(() => {
    if (!map || !isClient) {
      parkMarkersRef.current.forEach(marker => {
        marker.map = null;
      });
      parkMarkersRef.current = [];
      return;
    }

    if (!showNationalParks) {
      parkMarkersRef.current.forEach(marker => {
        marker.map = null;
      });
      parkMarkersRef.current = [];
      setSelectedPark(null);
      return;
    }

    const parksWithCoords = filterParksWithCoordinates(nationalParks);

    // Clean up old park markers
    parkMarkersRef.current.forEach(marker => {
      marker.map = null;
    });
    parkMarkersRef.current = [];

    const createParkMarkers = async () => {
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;

      const parkMarkers = parksWithCoords.map((park) => {
        const greenPin = new PinElement({
          background: '#10B981',
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: 0.8,
        });
        
        const parkTitle = park.name || 'National Park';
        greenPin.element.setAttribute('aria-label', parkTitle);
        greenPin.element.setAttribute('role', 'button');
        greenPin.element.setAttribute('tabindex', '0');
        
        const marker = new AdvancedMarkerElement({
          map: map,
          position: {
            lat: park.coordinates[0],
            lng: park.coordinates[1],
          },
          title: parkTitle,
          content: greenPin.element,
        });

        marker.addEventListener('click', (event: any) => {
          const clickTimestamp = Date.now();
          
          // Check if another marker was clicked very recently (within 50ms)
          // If so, and it's a different marker, ignore this click to prevent conflicts
          if (lastClickedMarkerRef.current && 
              clickTimestamp - lastClickedMarkerRef.current.timestamp < 50 &&
              (lastClickedMarkerRef.current.type !== 'park' || lastClickedMarkerRef.current.id !== park.id)) {
            // Another marker was clicked very recently, ignore this one
            if (event.domEvent) {
              event.domEvent.stopPropagation();
              event.domEvent.stopImmediatePropagation();
            }
            if (event.stop) {
              event.stop();
            }
            return;
          }
          
          // Record this as the last clicked marker
          lastClickedMarkerRef.current = {
            type: 'park',
            id: park.id,
            timestamp: clickTimestamp,
          };
          
          // Immediately stop all event propagation to prevent other markers from responding
          if (event.domEvent) {
            event.domEvent.stopPropagation();
            event.domEvent.stopImmediatePropagation();
            event.domEvent.preventDefault();
          }
          if (event.stop) {
            event.stop();
          }
          
          // Update click time ref to prevent data layer clicks
          markerClickTimeRef.current = clickTimestamp;
          
          // Clear any other selections first
          setSelectedProperty(null);
          
          // Immediately set the selected park to the one that was actually clicked
          // This ensures the correct info window is displayed
          setSelectedPark(park as NationalParkWithCoords);
        });

        return marker;
      });

      parkMarkersRef.current = parkMarkers;
    };

    createParkMarkers().catch(console.error);
  }, [map, isClient, nationalParks, showNationalParks, setSelectedProperty, setSelectedPark, markerClickTimeRef]);

  return { markersRef, parkMarkersRef };
}
