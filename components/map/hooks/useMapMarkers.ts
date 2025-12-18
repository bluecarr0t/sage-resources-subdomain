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
        
        const marker = new AdvancedMarkerElement({
          map: map,
          position: {
            lat: property.coordinates[0],
            lng: property.coordinates[1],
          },
          content: bluePin.element,
        });

        marker.addEventListener('click', (event: any) => {
          markerClickTimeRef.current = Date.now();
          
          if (event.domEvent) {
            event.domEvent.stopPropagation();
            event.domEvent.stopImmediatePropagation();
          }
          if (event.stop) {
            event.stop();
          }
          setSelectedProperty(property as PropertyWithCoords);
          setSelectedPark(null);
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
        
        const marker = new AdvancedMarkerElement({
          map: map,
          position: {
            lat: park.coordinates[0],
            lng: park.coordinates[1],
          },
          content: greenPin.element,
        });

        marker.addEventListener('click', (event: any) => {
          markerClickTimeRef.current = Date.now();
          
          if (event.domEvent) {
            event.domEvent.stopPropagation();
            event.domEvent.stopImmediatePropagation();
          }
          if (event.stop) {
            event.stop();
          }
          setSelectedPark(park as NationalParkWithCoords);
          setSelectedProperty(null);
        });

        return marker;
      });

      parkMarkersRef.current = parkMarkers;
    };

    createParkMarkers().catch(console.error);
  }, [map, isClient, nationalParks, showNationalParks, setSelectedProperty, setSelectedPark, markerClickTimeRef]);

  return { markersRef, parkMarkersRef };
}
