'use client';

import { useState, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';

export interface MapProperty {
  lat: number;
  lon: number;
  property_name: string;
  source: string;
  state?: string | null;
  distance_miles: number;
  drive_time_hours?: number;
  nearest_anchor: string;
  property_type?: string | null;
  unit_type?: string | null;
  property_total_sites?: number | null;
  quantity_of_units?: number | null;
  winter_weekday: number | null;
  winter_weekend: number | null;
  spring_weekday?: number | null;
  spring_weekend?: number | null;
  summer_weekday?: number | null;
  summer_weekend?: number | null;
  fall_weekday?: number | null;
  fall_weekend?: number | null;
  occupancy_2024?: number | null;
  occupancy_2025?: number | null;
}

export interface MapAnchor {
  id: number;
  name: string;
  lat: number;
  lon: number;
  slug?: string;
}

interface AnchorPointMapProps {
  mapProperties: MapProperty[];
  mapAnchors: MapAnchor[];
  anchorsWithCounts: Array<{ anchor_name: string; property_count_15_mi?: number; units_count_15_mi?: number }>;
  onAnchorClick?: (anchor: { id: number; slug?: string }) => void;
}

const mapContainerStyle = { width: '100%', height: '500px' };
const defaultCenter = { lat: 39.8283, lng: -98.5795 };

export function AnchorPointMap({ mapProperties, mapAnchors, anchorsWithCounts, onAnchorClick }: AnchorPointMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<MapAnchor | null>(null);

  const getAnchorCount = (anchorName: string) =>
    anchorsWithCounts.find((a) => a.anchor_name === anchorName)?.units_count_15_mi ??
    anchorsWithCounts.find((a) => a.anchor_name === anchorName)?.property_count_15_mi ??
    0;

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    // Fit bounds to show all markers if we have data
    if (mapProperties.length > 0 || mapAnchors.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      mapProperties.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lon }));
      mapAnchors.forEach((a) => bounds.extend({ lat: a.lat, lng: a.lon }));
      mapInstance.fitBounds(bounds, 50);
    }
  }, [mapProperties, mapAnchors]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-red-50 dark:bg-red-900/30 rounded-lg border border-gray-200 dark:border-gray-700">
        <span className="text-red-600 dark:text-red-400">Failed to load map. Check Google Maps API key.</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <span className="text-gray-500 dark:text-gray-400">Loading map...</span>
      </div>
    );
  }

  const center =
    mapProperties.length > 0
      ? { lat: mapProperties[0].lat, lng: mapProperties[0].lon }
      : mapAnchors.length > 0
        ? { lat: mapAnchors[0].lat, lng: mapAnchors[0].lon }
        : defaultCenter;

  const zoom = mapProperties.length > 0 || mapAnchors.length > 0 ? 5 : 3;

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
      >
        {mapAnchors.map((anchor) => (
          <Marker
            key={`anchor-${anchor.id}`}
            position={{ lat: anchor.lat, lng: anchor.lon }}
            onClick={() => {
              setSelectedAnchor(anchor);
              setSelectedProperty(null);
              onAnchorClick?.({ id: anchor.id, slug: anchor.slug });
            }}
            title={anchor.name}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#16a34a',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2,
            }}
          />
        ))}
        {mapProperties.map((prop, i) => (
          <Marker
            key={`prop-${i}-${prop.property_name}`}
            position={{ lat: prop.lat, lng: prop.lon }}
            onClick={() => {
              setSelectedProperty(prop);
              setSelectedAnchor(null);
            }}
            title={prop.property_name}
          />
        ))}
        {selectedProperty && (
          <InfoWindow
            position={{ lat: selectedProperty.lat, lng: selectedProperty.lon }}
            onCloseClick={() => setSelectedProperty(null)}
          >
            <div className="p-3 min-w-[240px] max-w-[320px]">
              <h3 className="font-semibold text-gray-900 mb-2 text-base leading-tight">
                {selectedProperty.property_name}
              </h3>
              <div className="space-y-1.5 text-sm text-gray-600">
                <p>
                  <span className="font-medium text-gray-500">Source:</span>{' '}
                  {selectedProperty.source}
                  {selectedProperty.state ? ` · ${selectedProperty.state}` : ''}
                </p>
                <p>
                  <span className="font-medium text-gray-500">Distance:</span>{' '}
                  {selectedProperty.distance_miles} mi to {selectedProperty.nearest_anchor}
                  {selectedProperty.drive_time_hours != null && selectedProperty.drive_time_hours > 0
                    ? ` (~${selectedProperty.drive_time_hours.toFixed(1)} hr drive)`
                    : ''}
                </p>
                {(selectedProperty.unit_type || selectedProperty.property_type) && (
                  <p>
                    <span className="font-medium text-gray-500">Type:</span>{' '}
                    {[selectedProperty.unit_type, selectedProperty.property_type]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </p>
                )}
                {(selectedProperty.property_total_sites != null ||
                  selectedProperty.quantity_of_units != null) && (
                  <p>
                    <span className="font-medium text-gray-500">Units:</span>{' '}
                    {selectedProperty.quantity_of_units ??
                      selectedProperty.property_total_sites ??
                      '—'}
                  </p>
                )}
                <p>
                  <span className="font-medium text-gray-500">Winter rate:</span>{' '}
                  {(selectedProperty.winter_weekend ?? selectedProperty.winter_weekday) != null
                    ? `$${selectedProperty.winter_weekend ?? selectedProperty.winter_weekday}`
                    : '—'}
                </p>
                {(selectedProperty.occupancy_2025 ?? selectedProperty.occupancy_2024) != null && (
                  <p>
                    <span className="font-medium text-gray-500">Occupancy:</span>{' '}
                    {(() => {
                      const occ =
                        selectedProperty.occupancy_2025 ?? selectedProperty.occupancy_2024;
                      if (occ == null) return '—';
                      const pct = occ <= 1 ? Math.round(occ * 100) : Math.round(occ);
                      return `${pct}%`;
                    })()}
                  </p>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
        {selectedAnchor && (
          <InfoWindow
            position={{ lat: selectedAnchor.lat, lng: selectedAnchor.lon }}
            onCloseClick={() => setSelectedAnchor(null)}
          >
            <div className="p-2 min-w-[180px]">
              <h3 className="font-semibold text-gray-900 mb-1">{selectedAnchor.name}</h3>
              <p className="text-sm text-gray-600">
                {getAnchorCount(selectedAnchor.name)} units within 15 mi
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
