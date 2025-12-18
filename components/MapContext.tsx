'use client';

import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { SageProperty } from '@/lib/types/sage';

// Module-level flag to prevent duplicate fetches across component mount/unmount cycles
// This is necessary for React 18 Strict Mode which intentionally unmounts/remounts components
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
  // Shared properties state
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
  
  // Derive boolean states from selectedMapLayer for backward compatibility
  const showPopulationLayer = selectedMapLayer === 'population';
  const showGDPLayer = selectedMapLayer === 'tourism';
  const showOpportunityZones = selectedMapLayer === 'opportunity';
  
  // Shared properties state - fetched once and shared between all component instances
  const [properties, setProperties] = useState<SageProperty[]>([]);
  const [allProperties, setAllProperties] = useState<SageProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState<boolean>(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);
  const fetchInProgressRef = useRef<boolean>(false);
  const allPropertiesFetchInProgressRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const allPropertiesInitializedRef = useRef<boolean>(false);

  const toggleCountry = (country: string) => {
    setFilterCountry((prev) => 
      prev.includes(country) 
        ? prev.filter((c) => c !== country)
        : [...prev, country]
    );
  };

  const toggleState = (state: string) => {
    setFilterState((prev) => 
      prev.includes(state) 
        ? prev.filter((s) => s !== state)
        : [...prev, state]
    );
  };

  const toggleUnitType = (unitType: string) => {
    setFilterUnitType((prev) => 
      prev.includes(unitType) 
        ? prev.filter((u) => u !== unitType)
        : [...prev, unitType]
    );
  };

  const toggleRateRange = (rateRange: string) => {
    setFilterRateRange((prev) => 
      prev.includes(rateRange) 
        ? prev.filter((r) => r !== rateRange)
        : [...prev, rateRange]
    );
  };

  const toggleNationalParks = () => {
    setShowNationalParks((prev) => !prev);
  };

  const setMapLayer = (layer: MapLayer) => {
    setSelectedMapLayer(layer);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const clearFilters = () => {
    setFilterCountry(['United States', 'Canada']);
    setFilterState([]);
    setFilterUnitType([]);
    setFilterRateRange([]);
    // Note: showNationalParks is not reset by clearFilters as it's a display preference, not a filter
  };

  const hasActiveFilters = filterCountry.length !== 2 || !filterCountry.includes('United States') || !filterCountry.includes('Canada') || filterState.length > 0 || filterUnitType.length > 0 || filterRateRange.length > 0;

  // Fetch all properties (unfiltered) once for filter option calculation
  // This is optimized to reuse the filtered properties fetch when filters match defaults
  useEffect(() => {
    // Check if filters match defaults
    const isDefaultFilters = 
      filterCountry.length === 2 && 
      filterCountry.includes('United States') && 
      filterCountry.includes('Canada') &&
      filterState.length === 0 &&
      filterUnitType.length === 0 &&
      filterRateRange.length === 0;
    
    // If filters match defaults, we'll reuse filtered properties (set by filtered properties fetch)
    // Don't fetch separately when filters are defaults - the second useEffect will handle it
    if (isDefaultFilters) {
      // Reset initialization flag when filters change back to defaults
      // This allows the filtered properties fetch to set allProperties again
      allPropertiesInitializedRef.current = false;
      return; // Don't fetch separately when filters are defaults
    }
    
    // Only fetch allProperties separately when filters don't match defaults
    // (needed for filter dropdowns to show all available options)
    if (allPropertiesFetchInProgressRef.current || allPropertiesInitializedRef.current) {
      return;
    }
    
    async function fetchAllProperties() {
      if (allPropertiesFetchInProgressRef.current || allPropertiesInitializedRef.current) return;
      
      allPropertiesFetchInProgressRef.current = true;
      
      try {
        console.log('Fetching all properties (unfiltered) for filter options...');
        
        // Use URLSearchParams for consistent URL encoding (matches filtered properties fetch)
        const params = new URLSearchParams();
        params.append('country', 'United States');
        params.append('country', 'Canada');
        
        // Fetch all properties without filters for filter dropdowns
        const response = await fetch(`/api/properties?${params.toString()}`);
        
        if (!response.ok) {
          console.error('Failed to fetch all properties for filter options');
          return;
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('Fetched all properties (unfiltered):', result.data.length);
          setAllProperties(result.data);
          allPropertiesInitializedRef.current = true;
        }
      } catch (err) {
        console.error('Error fetching all properties:', err);
      } finally {
        allPropertiesFetchInProgressRef.current = false;
      }
    }

    fetchAllProperties();
  }, [filterCountry, filterState, filterUnitType, filterRateRange]); // Only depend on filters, not on properties state

  // Fetch filtered properties and share between all component instances
  useEffect(() => {
    // Don't start a new fetch if one is already in progress (module-level check)
    // This prevents duplicate fetches during React 18 Strict Mode double-mounting in development
    if (globalFetchInProgress) {
      console.log('Fetch already in progress (global check), skipping duplicate request');
      return;
    }
    
    // Cancel any in-flight request when filters change
    if (globalAbortController) {
      console.log('Canceling previous fetch due to filter change');
      globalAbortController.abort();
      globalAbortController = null;
    }
    
    // Mark as in progress BEFORE creating abort controller (both local and global)
    globalFetchInProgress = true;
    fetchInProgressRef.current = true;
    
    const abortController = new AbortController();
    globalAbortController = abortController;
    abortControllerRef.current = abortController;
    
    async function fetchProperties() {
      try {
        setPropertiesLoading(true);
        setPropertiesError(null);

        console.log('Fetching properties from cached API route (shared fetch)...');
        
        // Build query parameters for the API route
        const params = new URLSearchParams();
        filterCountry.forEach(country => params.append('country', country));
        filterState.forEach(state => params.append('state', state));
        filterUnitType.forEach(unitType => params.append('unitType', unitType));
        filterRateRange.forEach(rateRange => params.append('rateRange', rateRange));
        
        // Add field selection for map markers - always use minimal fields for map markers
        // This reduces payload size by 70-80%
        // Full property details will be fetched when marker is clicked (in InfoWindow)
        // Filter dropdowns will use processed minimal data (unit_type, rate_category are included)
        const isDefaultFilters = 
          filterCountry.length === 2 && 
          filterCountry.includes('United States') && 
          filterCountry.includes('Canada') &&
          filterState.length === 0 &&
          filterUnitType.length === 0 &&
          filterRateRange.length === 0;
        
        // Always use field selection for map markers to reduce payload size
        // The minimal fields include unit_type and rate_category which are sufficient for filter dropdowns
        // Full property details are fetched on-demand when marker is clicked
        params.append('fields', 'id,property_name,lat,lon,state,country,unit_type,rate_category');
        
        // Note: For default filters, we previously fetched full data for filter dropdowns
        // However, the minimal fields (unit_type, rate_category) are sufficient for filter options
        // This reduces initial payload from ~11.45 MB to ~2-3 MB (70-80% reduction)
        
        // Note: Bounds-based filtering would go here, but for initial load we fetch all
        // to ensure filter dropdowns work correctly. Viewport filtering can be done
        // client-side in GooglePropertyMap for better UX.
        
        // Fetch from cached API route with abort signal
        const response = await fetch(`/api/properties?${params.toString()}`, {
          signal: abortController.signal,
        });
        
        // Check if request was aborted
        if (abortController.signal.aborted) {
          console.log('Fetch was aborted');
          return;
        }
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch properties' }));
          throw new Error(errorData.message || errorData.error || 'Failed to fetch properties');
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch properties');
        }
        
        const data = result.data || [];
        console.log('Fetched properties (shared):', data?.length || 0);
        
        // Only update state if this request hasn't been aborted
        if (!abortController.signal.aborted) {
          setProperties(data);
          setHasLoadedOnce(true); // Mark that we've successfully loaded properties at least once
          
          // If filters match defaults, also set allProperties to avoid duplicate fetch
          const isDefaultFilters = 
            filterCountry.length === 2 && 
            filterCountry.includes('United States') && 
            filterCountry.includes('Canada') &&
            filterState.length === 0 &&
            filterUnitType.length === 0 &&
            filterRateRange.length === 0;
          
          if (isDefaultFilters && !allPropertiesInitializedRef.current) {
            console.log('Setting allProperties from filtered properties (default filters)');
            setAllProperties(data);
            allPropertiesInitializedRef.current = true;
          }
        }
      } catch (err) {
        // Ignore abort errors (expected when filters change quickly)
        if (err instanceof Error && err.name === 'AbortError') {
          // Silently handle abort - this is expected behavior when filters change
          console.log('Fetch aborted (expected)');
          return;
        }
        
        // Only set error if request wasn't aborted
        if (!abortController.signal.aborted) {
          console.error('Error fetching properties:', err);
          let errorMessage = 'Failed to fetch properties';
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          setPropertiesError(errorMessage);
        }
      } finally {
        // Only update loading state if this is still the current request
        if (globalAbortController === abortController) {
          setPropertiesLoading(false);
          globalFetchInProgress = false;
          fetchInProgressRef.current = false;
          globalAbortController = null;
          abortControllerRef.current = null;
        }
      }
    }

    fetchProperties();
    
    // Cleanup function to abort request if filters change or component unmounts
    return () => {
      // Only abort if this is still the current request
      // Don't abort during Strict Mode unmount - let the request complete for the remount
      if (globalAbortController === abortController && abortControllerRef.current === abortController) {
        console.log('Cleanup: aborting fetch');
        abortController.abort();
        globalAbortController = null;
        globalFetchInProgress = false;
        abortControllerRef.current = null;
        fetchInProgressRef.current = false;
      }
    };
  }, [filterCountry, filterState, filterUnitType, filterRateRange]);

  return (
    <MapContext.Provider 
      value={{ 
        filterCountry,
        filterState, 
        filterUnitType,
        filterRateRange,
        showNationalParks,
        selectedMapLayer,
        showPopulationLayer,
        showGDPLayer,
        showOpportunityZones,
        populationYear,
        isFullscreen,
        setFilterCountry,
        setFilterState, 
        setFilterUnitType,
        setFilterRateRange,
        toggleCountry,
        toggleState,
        toggleUnitType,
        toggleRateRange,
        toggleNationalParks,
        setMapLayer,
        setPopulationYear,
        toggleFullscreen,
        clearFilters,
        hasActiveFilters,
        // Shared properties
        properties,
        allProperties,
        propertiesLoading,
        propertiesError,
        hasLoadedOnce,
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

