'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';

// Helper function to escape HTML
function escapeHtml(text: string | null): string {
  if (!text) return '';
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export default function PropertyMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [properties, setProperties] = useState<SageProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>('');
  const [mapInitialized, setMapInitialized] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Fetch properties
  useEffect(() => {
    async function fetchProperties() {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching properties from Supabase...');
        console.log('Supabase client:', supabase ? 'initialized' : 'not initialized');
        
        let query = supabase.from('sage').select('*').limit(1000);

        if (filterState) {
          query = query.eq('state', filterState);
          console.log('Filtering by state:', filterState);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          console.error('Supabase error:', supabaseError);
          throw supabaseError;
        }

        console.log('Fetched properties:', data?.length || 0);
        if (data && data.length > 0) {
          console.log('Sample property:', data[0]);
          console.log('Sample property coords:', { lat: data[0].lat, lon: data[0].lon });
        }
        
        setProperties(data || []);
      } catch (err) {
        console.error('Error fetching properties:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch properties';
        setError(errorMessage);
        // Don't set loading to false on error so user can see the error
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [filterState]);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || mapInitialized) return;

    const initMap = async () => {
      // Wait for the map container to be available
      if (!mapRef.current) {
        // Retry after a short delay
        setTimeout(initMap, 100);
        return;
      }

      // Check if map is already initialized on this element
      if ((mapRef.current as any)._leaflet_id) {
        setMapInitialized(true);
        return;
      }

      try {
        // Load Leaflet CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
          link.crossOrigin = '';
          document.head.appendChild(link);
          
          // Wait for CSS to load
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Import Leaflet
        const L = (await import('leaflet')).default;

        // Fix icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Ensure the container is still available
        if (!mapRef.current) {
          throw new Error('Map container not available');
        }

        // Create map
        const map = L.map(mapRef.current, {
          center: [39.8283, -98.5795],
          zoom: 4,
        });

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        setMapInitialized(true);
        console.log('Map initialized successfully');
      } catch (err) {
        console.error('Error initializing map:', err);
        setError(`Failed to initialize map: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timeoutId);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null;
      }
      markersRef.current.forEach(marker => {
        try {
          marker.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      markersRef.current = [];
    };
  }, [mapInitialized]);

  // Update markers when properties change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapInitialized) return;

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add new markers
      const propertiesWithCoords = filterPropertiesWithCoordinates(properties);
      
      console.log('Properties with coordinates:', propertiesWithCoords.length);
      console.log('Sample property with coords:', propertiesWithCoords[0]);
      
      propertiesWithCoords.forEach((property) => {
        try {
          const marker = L.marker(property.coordinates).addTo(map);
          
          const rating = (property as any).google_rating;
          const reviewCount = (property as any).google_user_rating_total;
          const ratingHtml = rating || reviewCount ? `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              ${rating ? `
                <div style="display: flex; align-items: center; gap: 0.25rem;">
                  <svg style="width: 16px; height: 16px; color: #fbbf24; fill: currentColor;" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                  <span style="font-size: 0.875rem; font-weight: 600; color: #111827;">${rating.toFixed(1)}</span>
                </div>
              ` : ''}
              ${reviewCount ? `
                <span style="font-size: 0.875rem; color: #4b5563;">
                  (${reviewCount.toLocaleString()} ${reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              ` : ''}
            </div>
          ` : '';

          const popupContent = `
            <div style="max-width: 300px;">
              <h3 style="font-weight: bold; font-size: 1.125rem; margin-bottom: 0.5rem; color: #111827;">
                ${escapeHtml(property.property_name || property.site_name || 'Unnamed Property')}
              </h3>
              ${property.city && property.state ? `<p style="font-size: 0.875rem; color: #4b5563; margin-bottom: 0.5rem;">${escapeHtml(property.city)}, ${escapeHtml(property.state)}</p>` : ''}
              ${ratingHtml}
              ${property.property_type ? `<p style="font-size: 0.875rem; color: #374151; margin-bottom: 0.5rem;"><strong>Type:</strong> ${escapeHtml(property.property_type)}</p>` : ''}
              ${property.unit_type ? `<p style="font-size: 0.875rem; color: #374151; margin-bottom: 0.5rem;"><strong>Unit Type:</strong> ${escapeHtml(property.unit_type)}</p>` : ''}
              ${property.avg_retail_daily_rate_2024 ? `<p style="font-size: 0.875rem; color: #374151; margin-bottom: 0.5rem;"><strong>Avg Rate (2024):</strong> $${escapeHtml(property.avg_retail_daily_rate_2024)}</p>` : ''}
              ${property.url ? `<a href="${escapeHtml(property.url)}" target="_blank" rel="noopener noreferrer" style="font-size: 0.875rem; color: #2563eb; text-decoration: underline;">Visit Website →</a>` : ''}
            </div>
          `;
          
          marker.bindPopup(popupContent);
          markersRef.current.push(marker);
        } catch (err) {
          console.error('Error adding marker:', err, property);
        }
      });

      // Fit map to bounds if there are markers
      if (propertiesWithCoords.length > 0) {
        try {
          const group = new L.FeatureGroup(markersRef.current.map(m => m));
          map.fitBounds(group.getBounds().pad(0.1));
        } catch (err) {
          console.error('Error fitting bounds:', err);
        }
      }
    };

    updateMarkers();
  }, [properties, mapInitialized]);

  const uniqueStates = Array.from(
    new Set(properties.map((p) => p.state).filter(Boolean))
  ).sort() as string[];

  const propertiesWithCoords = filterPropertiesWithCoordinates(properties);

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <label
            htmlFor="state-filter"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Filter by State
          </label>
          <select
            id="state-filter"
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All States ({properties.length} properties)</option>
            {uniqueStates.map((state) => {
              const count = properties.filter((p) => p.state === state).length;
              return (
                <option key={state} value={state}>
                  {state} ({count} properties)
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex items-end">
          <div className="px-4 py-2 bg-blue-50 rounded-md">
            <span className="text-sm font-medium text-blue-900">
              {propertiesWithCoords.length} properties with valid locations
            </span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg relative" style={{ height: '600px' }}>
        {loading && !mapInitialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
            <div className="bg-white border border-red-200 rounded-lg p-6 m-4 max-w-md">
              <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Map</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}
        <div 
          ref={mapRef} 
          style={{ height: '600px', width: '100%', position: 'relative', zIndex: 0 }} 
        />
        {!loading && !error && properties.length === 0 && mapInitialized && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 pointer-events-none z-20">
            <div className="text-center p-4 bg-white rounded-lg shadow-sm">
              <p className="text-gray-600 font-medium">No properties found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

