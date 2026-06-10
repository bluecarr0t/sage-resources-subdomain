import { useEffect, useMemo, useRef } from 'react';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';
import { NationalPark, filterParksWithCoordinates } from '@/lib/types/national-parks';
import type { ClientWorkMapPoint } from '@/lib/map/client-work-locations';
import { mapMarkerPropertySyncKey } from '../utils/mapMarkerSyncKey';

type PropertyWithCoords = SageProperty & { coordinates: [number, number] };
type NationalParkWithCoords = NationalPark & { coordinates: [number, number] };

const MARKER_BATCH_SIZE = 80;

interface UseMapMarkersProps {
  map: google.maps.Map | null;
  isClient: boolean;
  properties: SageProperty[];
  nationalParks: NationalPark[];
  showNationalParks: boolean;
  clientWorkPoints: ClientWorkMapPoint[];
  showClientWork: boolean;
  setSelectedProperty: (property: PropertyWithCoords | null) => void;
  setSelectedPark: (park: NationalParkWithCoords | null) => void;
  setSelectedClientWork: (point: ClientWorkMapPoint | null) => void;
  markerClickTimeRef: React.MutableRefObject<number>;
  /** Call before opening an InfoWindow so controlled map center/zoom match the live viewport. */
  onBeforeMarkerSelect?: () => void;
}

function clearPropertyMarkers(
  markersRef: React.MutableRefObject<google.maps.marker.AdvancedMarkerElement[]>
) {
  markersRef.current.forEach((marker) => {
    marker.map = null;
  });
  markersRef.current = [];
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
  clientWorkPoints,
  showClientWork,
  setSelectedProperty,
  setSelectedPark,
  setSelectedClientWork,
  markerClickTimeRef,
  onBeforeMarkerSelect,
}: UseMapMarkersProps) {
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const parkMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clientWorkMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const propertyIdsRef = useRef<Set<string | number>>(new Set());
  const lastClickedMarkerRef = useRef<{
    type: 'property' | 'park' | 'clientWork';
    id: string | number;
    timestamp: number;
  } | null>(null);
  const propertyMarkersGenerationRef = useRef(0);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  const propertiesWithCoords = useMemo(
    () => filterPropertiesWithCoordinates(properties),
    [properties]
  );
  const propertyMarkerSyncKey = useMemo(
    () => mapMarkerPropertySyncKey(propertiesWithCoords),
    [propertiesWithCoords]
  );

  // Manage property markers (one AdvancedMarkerElement per property).
  // Depends on propertyMarkerSyncKey only — not propertiesWithCoords (new array ref each
  // render would re-run cleanup, clear markers, and skip recreate on click/zoom panes).
  useEffect(() => {
    if (!map || !isClient) {
      clearPropertyMarkers(markersRef);
      propertyIdsRef.current.clear();
      mapInstanceRef.current = null;
      return;
    }

    if (propertiesWithCoords.length === 0) {
      clearPropertyMarkers(markersRef);
      propertyIdsRef.current.clear();
      return;
    }

    const currentPropertyIds = new Set(propertiesWithCoords.map((p) => p.id));
    const idsMatch =
      currentPropertyIds.size === propertyIdsRef.current.size &&
      Array.from(currentPropertyIds).every((id) => propertyIdsRef.current.has(id));

    const mapInstanceChanged = mapInstanceRef.current !== map;
    mapInstanceRef.current = map;

    const markersAttachedToCurrentMap =
      markersRef.current.length > 0 &&
      markersRef.current.every((marker) => marker.map === map);

    if (idsMatch && markersAttachedToCurrentMap && !mapInstanceChanged) {
      return;
    }

    clearPropertyMarkers(markersRef);
    propertyIdsRef.current = currentPropertyIds;

    const generation = ++propertyMarkersGenerationRef.current;
    let cancelled = false;

    const createMarkers = async () => {
      const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary(
        'marker'
      )) as google.maps.MarkerLibrary;

      if (cancelled || generation !== propertyMarkersGenerationRef.current) return;

      const markers: google.maps.marker.AdvancedMarkerElement[] = [];

      for (let i = 0; i < propertiesWithCoords.length; i += MARKER_BATCH_SIZE) {
        if (cancelled || generation !== propertyMarkersGenerationRef.current) return;

        const batch = propertiesWithCoords.slice(i, i + MARKER_BATCH_SIZE);
        for (const property of batch) {
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
            map,
            position: {
              lat: property.coordinates[0],
              lng: property.coordinates[1],
            },
            title: markerTitle,
            content: bluePin.element,
            gmpClickable: true,
          });

          marker.addEventListener('click', (event: Event) => {
            const domEvent = event as Event & {
              stopPropagation?: () => void;
              stopImmediatePropagation?: () => void;
              preventDefault?: () => void;
            };
            const clickTimestamp = Date.now();

            if (
              lastClickedMarkerRef.current &&
              clickTimestamp - lastClickedMarkerRef.current.timestamp < 50 &&
              (lastClickedMarkerRef.current.type !== 'property' ||
                lastClickedMarkerRef.current.id !== property.id)
            ) {
              domEvent.stopPropagation?.();
              domEvent.stopImmediatePropagation?.();
              return;
            }

            lastClickedMarkerRef.current = {
              type: 'property',
              id: property.id,
              timestamp: clickTimestamp,
            };

            domEvent.stopPropagation?.();
            domEvent.stopImmediatePropagation?.();
            domEvent.preventDefault?.();

            markerClickTimeRef.current = clickTimestamp;
            onBeforeMarkerSelect?.();
            setSelectedPark(null);
            setSelectedClientWork(null);
            setSelectedProperty(property as PropertyWithCoords);
          });

          markers.push(marker);
        }

        markersRef.current = markers;

        if (i + MARKER_BATCH_SIZE < propertiesWithCoords.length) {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
      }
    };

    createMarkers().catch((err) => {
      console.error('[useMapMarkers] Failed to create property markers:', err);
      propertyIdsRef.current.clear();
    });

    return () => {
      cancelled = true;
      clearPropertyMarkers(markersRef);
      propertyIdsRef.current.clear();
    };
  }, [
    map,
    isClient,
    propertyMarkerSyncKey,
    setSelectedProperty,
    setSelectedPark,
    setSelectedClientWork,
    markerClickTimeRef,
    onBeforeMarkerSelect,
  ]);

  // Manage national park markers
  useEffect(() => {
    if (!map || !isClient) {
      parkMarkersRef.current.forEach((marker) => {
        marker.map = null;
      });
      parkMarkersRef.current = [];
      return;
    }

    if (!showNationalParks) {
      parkMarkersRef.current.forEach((marker) => {
        marker.map = null;
      });
      parkMarkersRef.current = [];
      setSelectedPark(null);
      return;
    }

    const parksWithCoords = filterParksWithCoordinates(nationalParks);

    parkMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    parkMarkersRef.current = [];

    const createParkMarkers = async () => {
      const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary(
        'marker'
      )) as google.maps.MarkerLibrary;

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
          gmpClickable: true,
        });

        marker.addEventListener('click', (event: Event) => {
          const domEvent = event as Event & {
            stopPropagation?: () => void;
            stopImmediatePropagation?: () => void;
            preventDefault?: () => void;
          };
          const clickTimestamp = Date.now();

          if (
            lastClickedMarkerRef.current &&
            clickTimestamp - lastClickedMarkerRef.current.timestamp < 50 &&
            (lastClickedMarkerRef.current.type !== 'park' || lastClickedMarkerRef.current.id !== park.id)
          ) {
            domEvent.stopPropagation?.();
            domEvent.stopImmediatePropagation?.();
            return;
          }

          lastClickedMarkerRef.current = {
            type: 'park',
            id: park.id,
            timestamp: clickTimestamp,
          };

          domEvent.stopPropagation?.();
          domEvent.stopImmediatePropagation?.();
          domEvent.preventDefault?.();

          markerClickTimeRef.current = clickTimestamp;
          onBeforeMarkerSelect?.();
          setSelectedProperty(null);
          setSelectedClientWork(null);
          setSelectedPark(park as NationalParkWithCoords);
        });

        return marker;
      });

      parkMarkersRef.current = parkMarkers;
    };

    createParkMarkers().catch(console.error);
  }, [
    map,
    isClient,
    nationalParks,
    showNationalParks,
    setSelectedProperty,
    setSelectedPark,
    setSelectedClientWork,
    markerClickTimeRef,
    onBeforeMarkerSelect,
  ]);

  // Client Work markers (static gold pins)
  useEffect(() => {
    if (!map || !isClient) {
      clientWorkMarkersRef.current.forEach((marker) => {
        marker.map = null;
      });
      clientWorkMarkersRef.current = [];
      return;
    }

    if (!showClientWork) {
      clientWorkMarkersRef.current.forEach((marker) => {
        marker.map = null;
      });
      clientWorkMarkersRef.current = [];
      setSelectedClientWork(null);
      return;
    }

    clientWorkMarkersRef.current.forEach((marker) => {
      marker.map = null;
    });
    clientWorkMarkersRef.current = [];

    const createClientWorkMarkers = async () => {
      const { AdvancedMarkerElement, PinElement } = (await google.maps.importLibrary(
        'marker'
      )) as google.maps.MarkerLibrary;

      const cwMarkers = clientWorkPoints.map((point) => {
        const goldPin = new PinElement({
          background: '#CA8A04',
          borderColor: '#FFFFFF',
          glyphColor: '#FFFFFF',
          scale: 0.8,
        });

        const title = point.location;
        goldPin.element.setAttribute('aria-label', title);
        goldPin.element.setAttribute('role', 'button');
        goldPin.element.setAttribute('tabindex', '0');

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: point.lat, lng: point.lng },
          title,
          content: goldPin.element,
          gmpClickable: true,
        });

        marker.addEventListener('click', (event: Event) => {
          const domEvent = event as Event & {
            stopPropagation?: () => void;
            stopImmediatePropagation?: () => void;
            preventDefault?: () => void;
          };
          const clickTimestamp = Date.now();

          if (
            lastClickedMarkerRef.current &&
            clickTimestamp - lastClickedMarkerRef.current.timestamp < 50 &&
            (lastClickedMarkerRef.current.type !== 'clientWork' ||
              lastClickedMarkerRef.current.id !== point.id)
          ) {
            domEvent.stopPropagation?.();
            domEvent.stopImmediatePropagation?.();
            return;
          }

          lastClickedMarkerRef.current = {
            type: 'clientWork',
            id: point.id,
            timestamp: clickTimestamp,
          };

          domEvent.stopPropagation?.();
          domEvent.stopImmediatePropagation?.();
          domEvent.preventDefault?.();

          markerClickTimeRef.current = clickTimestamp;
          onBeforeMarkerSelect?.();
          setSelectedProperty(null);
          setSelectedPark(null);
          setSelectedClientWork(point);
        });

        return marker;
      });

      clientWorkMarkersRef.current = cwMarkers;
    };

    createClientWorkMarkers().catch(console.error);
  }, [
    map,
    isClient,
    clientWorkPoints,
    showClientWork,
    setSelectedProperty,
    setSelectedPark,
    setSelectedClientWork,
    markerClickTimeRef,
    onBeforeMarkerSelect,
  ]);

  return { markersRef, parkMarkersRef, clientWorkMarkersRef };
}
