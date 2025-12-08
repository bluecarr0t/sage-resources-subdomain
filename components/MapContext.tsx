'use client';

import { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { SageProperty } from '@/lib/types/sage';

interface MapContextType {
  filterCountry: string[];
  filterState: string[];
  filterUnitType: string[];
  filterRateRange: string[];
  showNationalParks: boolean;
  showPopulationLayer: boolean;
  showGDPLayer: boolean;
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
  togglePopulationLayer: () => void;
  toggleGDPLayer: () => void;
  setPopulationYear: (year: '2010' | '2020') => void;
  toggleFullscreen: () => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  // Shared properties state
  properties: SageProperty[];
  allProperties: SageProperty[];
  propertiesLoading: boolean;
  propertiesError: string | null;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [filterCountry, setFilterCountry] = useState<string[]>(['United States', 'Canada']);
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterUnitType, setFilterUnitType] = useState<string[]>([]);
  const [filterRateRange, setFilterRateRange] = useState<string[]>([]);
  const [showNationalParks, setShowNationalParks] = useState<boolean>(true);
  const [showPopulationLayer, setShowPopulationLayer] = useState<boolean>(false);
  const [showGDPLayer, setShowGDPLayer] = useState<boolean>(false);
  const [populationYear, setPopulationYear] = useState<'2010' | '2020'>('2020');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  
  // Shared properties state - fetched once and shared between all component instances
  const [properties, setProperties] = useState<SageProperty[]>([]);
  const [allProperties, setAllProperties] = useState<SageProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState<boolean>(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const fetchInProgressRef = useRef<boolean>(false);
  const allPropertiesFetchInProgressRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const togglePopulationLayer = () => {
    setShowPopulationLayer((prev) => !prev);
  };

  const toggleGDPLayer = () => {
    setShowGDPLayer((prev) => !prev);
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
  useEffect(() => {
    // Prevent duplicate fetches (handles React Strict Mode double mounting)
    if (allPropertiesFetchInProgressRef.current || allProperties.length > 0) {
      return;
    }
    
    async function fetchAllProperties() {
      if (allPropertiesFetchInProgressRef.current || allProperties.length > 0) return;
      
      allPropertiesFetchInProgressRef.current = true;
      
      try {
        console.log('Fetching all properties (unfiltered) for filter options...');
        
        // Fetch all properties without filters for filter dropdowns
        const response = await fetch('/api/properties?country=United%20States&country=Canada');
        
        if (!response.ok) {
          console.error('Failed to fetch all properties for filter options');
          return;
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          console.log('Fetched all properties (unfiltered):', result.data.length);
          setAllProperties(result.data);
        }
      } catch (err) {
        console.error('Error fetching all properties:', err);
      } finally {
        allPropertiesFetchInProgressRef.current = false;
      }
    }

    fetchAllProperties();
  }, [allProperties.length]); // Only fetch once on mount

  // Fetch filtered properties and share between all component instances
  useEffect(() => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Prevent duplicate fetches (handles React Strict Mode double mounting)
    if (fetchInProgressRef.current) {
      return () => {
        // Cleanup: abort if component unmounts
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    fetchInProgressRef.current = true;
    
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
        
        // Fetch from cached API route with abort signal
        const response = await fetch(`/api/properties?${params.toString()}`, {
          signal: abortController.signal,
        });
        
        // Check if request was aborted
        if (abortController.signal.aborted) {
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
        
        setProperties(data);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Properties fetch aborted');
          return;
        }
        
        console.error('Error fetching properties:', err);
        let errorMessage = 'Failed to fetch properties';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        setPropertiesError(errorMessage);
      } finally {
        setPropertiesLoading(false);
        fetchInProgressRef.current = false;
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    }

    fetchProperties();
    
    // Cleanup function to abort request if filters change or component unmounts
    return () => {
      if (abortControllerRef.current === abortController) {
        abortController.abort();
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
        showPopulationLayer,
        showGDPLayer,
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
        togglePopulationLayer,
        toggleGDPLayer,
        setPopulationYear,
        toggleFullscreen,
        clearFilters,
        hasActiveFilters,
        // Shared properties
        properties,
        allProperties,
        propertiesLoading,
        propertiesError,
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

