'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import {
  ParsedSheetProperty,
  filterPropertiesWithCoordinates,
  hasValidCoordinates,
} from '@/lib/google-sheets';

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795,
};

const defaultZoom = 4;

// Libraries array must be a constant to prevent LoadScript reload warnings
const libraries: ('places')[] = ['places'];

type PropertyWithCoords = ParsedSheetProperty & { coordinates: [number, number] };

interface GoogleSheetMapProps {
  sheetId: string;
  sheetName?: string;
  mapTitle?: string;
  mapDescription?: string;
}

export default function GoogleSheetMap({
  sheetId,
  sheetName,
  mapTitle = 'Property Map',
  mapDescription = 'Explore locations on the map. Click on markers to view details.',
}: GoogleSheetMapProps) {
  const [properties, setProperties] = useState<ParsedSheetProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithCoords | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [filterState, setFilterState] = useState<string>('');

  // Fetch properties from API route
  useEffect(() => {
    async function fetchProperties() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          sheetId,
          public: 'true',
        });
        if (sheetName) {
          params.append('sheetName', sheetName);
        }

        const response = await fetch(`/api/google-sheets?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch sheet data');
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to load properties');
        }

        setProperties(result.data || []);
      } catch (err) {
        console.error('Error fetching properties:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch properties';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    if (sheetId) {
      fetchProperties();
    }
  }, [sheetId, sheetName]);

  const propertiesWithCoords = useMemo(
    () => filterPropertiesWithCoordinates(properties),
    [properties]
  );

  // Filter by state if filter is applied
  const filteredProperties = useMemo(() => {
    if (!filterState) return propertiesWithCoords;
    return propertiesWithCoords.filter((p) => 
      p.state?.toLowerCase() === filterState.toLowerCase()
    );
  }, [propertiesWithCoords, filterState]);

  // Fit map bounds to show all markers
  useEffect(() => {
    if (map && filteredProperties.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      filteredProperties.forEach((property) => {
        bounds.extend({
          lat: property.coordinates[0],
          lng: property.coordinates[1],
        });
      });
      map.fitBounds(bounds);
    }
  }, [map, filteredProperties]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const uniqueStates = useMemo(
    () =>
      Array.from(
        new Set(propertiesWithCoords.map((p) => p.state).filter(Boolean))
      ).sort() as string[],
    [propertiesWithCoords]
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-red-50 rounded-lg border-2 border-red-200">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-2">Error loading Google Maps</p>
          <p className="text-red-500 text-sm">{loadError.message}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading properties...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-red-50 rounded-lg border-2 border-red-200">
        <div className="text-center max-w-md">
          <p className="text-red-600 font-semibold mb-2">Error loading properties</p>
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (filteredProperties.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-gray-600">No properties found with valid coordinates.</p>
          {properties.length > 0 && (
            <p className="text-gray-500 text-sm mt-2">
              Found {properties.length} properties, but none have valid lat/lng coordinates.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Filters */}
      {(uniqueStates.length > 0 || propertiesWithCoords.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-4 items-center">
          {uniqueStates.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="state-filter" className="text-sm font-medium text-gray-700">
                Filter by State:
              </label>
              <select
                id="state-filter"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All States</option>
                {uniqueStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="text-sm text-gray-600">
            Showing {filteredProperties.length} of {propertiesWithCoords.length} properties
          </div>
        </div>
      )}

      {/* Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={defaultZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
        }}
      >
        {filteredProperties.map((property) => (
          <Marker
            key={property.id}
            position={{
              lat: property.coordinates[0],
              lng: property.coordinates[1],
            }}
            onClick={() => setSelectedProperty(property)}
          />
        ))}

        {selectedProperty && (
          <InfoWindow
            position={{
              lat: selectedProperty.coordinates[0],
              lng: selectedProperty.coordinates[1],
            }}
            onCloseClick={() => setSelectedProperty(null)}
          >
            <div className="max-w-xs p-2">
              <h3 className="font-bold text-lg mb-2 text-gray-900">
                {selectedProperty.name}
              </h3>
              {selectedProperty.city && selectedProperty.state && (
                <p className="text-sm text-gray-600 mb-2">
                  {selectedProperty.city}, {selectedProperty.state}
                </p>
              )}
              {selectedProperty.address && (
                <p className="text-sm text-gray-600 mb-2">
                  {selectedProperty.address}
                </p>
              )}
              {selectedProperty.type && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">Type:</span> {selectedProperty.type}
                </p>
              )}
              {selectedProperty.description && (
                <p className="text-sm text-gray-700 mb-2">
                  {selectedProperty.description}
                </p>
              )}
              {selectedProperty.url && (
                <a
                  href={selectedProperty.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View Details →
                </a>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

