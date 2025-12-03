'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';

// Dynamically import LeafletMap to prevent SSR
const LeafletMap = dynamic(() => import('@/components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});


export default function InteractiveMap() {
  const [properties, setProperties] = useState<SageProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterState, setFilterState] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side only
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    async function fetchProperties() {
      try {
        setLoading(true);
        setError(null);

        let query = supabase.from('sage').select('*');

        // Apply state filter if provided
        if (filterState) {
          query = query.eq('state', filterState);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          throw supabaseError;
        }

        setProperties(data || []);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch properties');
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [filterState]);

  const propertiesWithCoords = filterPropertiesWithCoordinates(properties);
  const coordinates = propertiesWithCoords.map((p) => p.coordinates);
  const uniqueStates = Array.from(
    new Set(properties.map((p) => p.state).filter(Boolean))
  ).sort() as string[];

  // Default center: Optimized for lower 48 states
  const defaultCenter: [number, number] = [38.5, -96.0];
  const defaultZoom = 6;

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing map...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Map</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

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
      {isClient && (
      <div className="border border-gray-300 rounded-lg overflow-hidden shadow-lg">
          <LeafletMap
            properties={propertiesWithCoords}
            defaultCenter={defaultCenter}
            defaultZoom={defaultZoom}
          />
        </div>
      )}
    </div>
  );
}
