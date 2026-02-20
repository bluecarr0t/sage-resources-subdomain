'use client';

import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { SageProperty } from '@/lib/types/sage';

let globalFetchInProgress = false;
let globalAbortController: AbortController | null = null;

export type MapLayer = 'none' | 'population' | 'tourism' | 'opportunity';

interface MapContextType {
  filterCountry: string[];
  filterState: string[];
  filterUnitType: string[];
  filterRateRange: string[];
  showNationalParks: boolean;
  selectedMapLayer: MapLayer;
  showPopulationLayer: boolean;
  showGDPLayer: boolean;
  showOpportunityZones: boolean;
  populationYear: '2010' | '2020';
  isFullscreen: boolean;
  setFilterCountry: (country: string[]) => void;
  setFilterState: (state: string[]) => void;
  setFilterUnitType: (unitType: string[]) => void;
  setFilterRateRange: (rateRange: string[]) => void;
  toggleCountry: (country: string) => void;
  toggleState: (state: string) => void;
  toggleUnitType: (unitType: string) => void;
  toggleRateRange: (rateRange: string) => void;
  toggleNationalParks: () => void;
  setMapLayer: (layer: MapLayer) => void;
  setPopulationYear: (year: '2010' | '2020') => void;
  toggleFullscreen: () => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  properties: SageProperty[];
  allProperties: SageProperty[];
  propertiesLoading: boolean;
  propertiesError: string | null;
  hasLoadedOnce: boolean;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [filterCountry, setFilterCountry] = useState<string[]>(['United States', 'Canada']);
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterUnitType, setFilterUnitType] = useState<string[]>([]);
  const [filterRateRange, setFilterRateRange] = useState<string[]>([]);
  const [showNationalParks, setShowNationalParks] = useState<boolean>(true);
  const [selectedMapLayer, setSelectedMapLayer] = useState<MapLayer>('none');
  const [populationYear, setPopulationYear] = useState<'2010' | '2020'>('2020');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  const showPopulationLayer = selectedMapLayer === 'population';
  const showGDPLayer = selectedMapLayer === 'tourism';
  const showOpportunityZones = selectedMapLayer === 'opportunity';
  
  // Single source of truth: fetch all properties ONCE, filter client-side
  const [allProperties, setAllProperties] = useState<SageProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState<boolean>(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);
  const fetchInProgressRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const toggleCountry = (country: string) => {
    setFilterCountry((prev) => 
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]
    );
  };

  const toggleState = (state: string) => {
    setFilterState((prev) => 
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  const toggleUnitType = (unitType: string) => {
    setFilterUnitType((prev) => 
      prev.includes(unitType) ? prev.filter((u) => u !== unitType) : [...prev, unitType]
    );
  };

  const toggleRateRange = (rateRange: string) => {
    setFilterRateRange((prev) => 
      prev.includes(rateRange) ? prev.filter((r) => r !== rateRange) : [...prev, rateRange]
    );
  };

  const toggleNationalParks = () => setShowNationalParks((prev) => !prev);
  const setMapLayer = (layer: MapLayer) => setSelectedMapLayer(layer);
  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  const clearFilters = () => {
    setFilterCountry(['United States', 'Canada']);
    setFilterState([]);
    setFilterUnitType([]);
    setFilterRateRange([]);
  };

  const hasActiveFilters =
    filterCountry.length !== 2 ||
    !filterCountry.includes('United States') ||
    !filterCountry.includes('Canada') ||
    filterState.length > 0 ||
    filterUnitType.length > 0 ||
    filterRateRange.length > 0;

  // Fetch ALL properties once on mount with minimal fields for map markers
  // Client-side filtering (usePropertyProcessing) handles all filter logic
  // This eliminates duplicate server/client filter logic and avoids re-fetching on filter changes
  useEffect(() => {
    if (globalFetchInProgress) return;

    if (globalAbortController) {
      globalAbortController.abort();
      globalAbortController = null;
    }

    globalFetchInProgress = true;
    fetchInProgressRef.current = true;

    const abortController = new AbortController();
    globalAbortController = abortController;
    abortControllerRef.current = abortController;

    async function fetchAllProperties() {
      try {
        setPropertiesLoading(true);
        setPropertiesError(null);

        const params = new URLSearchParams();
        params.append('country', 'United States');
        params.append('country', 'Canada');
        params.append('fields', 'id,property_name,lat,lon,state,country,unit_type,rate_category');

        const response = await fetch(`/api/properties?${params.toString()}`, {
          signal: abortController.signal,
        });

        if (abortController.signal.aborted) return;

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch properties' }));
          throw new Error(errorData.message || errorData.error || 'Failed to fetch properties');
        }

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Failed to fetch properties');

        const data = result.data || [];

        if (!abortController.signal.aborted) {
          setAllProperties(data);
          setHasLoadedOnce(true);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!abortController.signal.aborted) {
          console.error('Error fetching properties:', err);
          setPropertiesError(err instanceof Error ? err.message : 'Failed to fetch properties');
        }
      } finally {
        if (globalAbortController === abortController) {
          setPropertiesLoading(false);
          globalFetchInProgress = false;
          fetchInProgressRef.current = false;
          globalAbortController = null;
          abortControllerRef.current = null;
        }
      }
    }

    fetchAllProperties();

    return () => {
      if (globalAbortController === abortController && abortControllerRef.current === abortController) {
        abortController.abort();
        globalAbortController = null;
        globalFetchInProgress = false;
        abortControllerRef.current = null;
        fetchInProgressRef.current = false;
      }
    };
  }, []); // Fetch once on mount - no filter dependencies

  return (
    <MapContext.Provider 
      value={{ 
        filterCountry, filterState, filterUnitType, filterRateRange,
        showNationalParks, selectedMapLayer,
        showPopulationLayer, showGDPLayer, showOpportunityZones,
        populationYear, isFullscreen,
        setFilterCountry, setFilterState, setFilterUnitType, setFilterRateRange,
        toggleCountry, toggleState, toggleUnitType, toggleRateRange,
        toggleNationalParks, setMapLayer, setPopulationYear, toggleFullscreen,
        clearFilters, hasActiveFilters,
        // allProperties serves as both the complete dataset AND the "properties" for processing
        properties: allProperties,
        allProperties,
        propertiesLoading, propertiesError, hasLoadedOnce,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}
