'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface MapContextType {
  filterCountry: string[];
  filterState: string[];
  filterUnitType: string[];
  filterRateRange: string[];
  setFilterCountry: (country: string[]) => void;
  setFilterState: (state: string[]) => void;
  setFilterUnitType: (unitType: string[]) => void;
  setFilterRateRange: (rateRange: string[]) => void;
  toggleCountry: (country: string) => void;
  toggleState: (state: string) => void;
  toggleUnitType: (unitType: string) => void;
  toggleRateRange: (rateRange: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [filterCountry, setFilterCountry] = useState<string[]>(['United States', 'Canada']);
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterUnitType, setFilterUnitType] = useState<string[]>([]);
  const [filterRateRange, setFilterRateRange] = useState<string[]>([]);

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

  const clearFilters = () => {
    setFilterCountry(['United States', 'Canada']);
    setFilterState([]);
    setFilterUnitType([]);
    setFilterRateRange([]);
  };

  const hasActiveFilters = filterCountry.length !== 2 || !filterCountry.includes('United States') || !filterCountry.includes('Canada') || filterState.length > 0 || filterUnitType.length > 0 || filterRateRange.length > 0;

  return (
    <MapContext.Provider 
      value={{ 
        filterCountry,
        filterState, 
        filterUnitType,
        filterRateRange,
        setFilterCountry,
        setFilterState, 
        setFilterUnitType,
        setFilterRateRange,
        toggleCountry,
        toggleState,
        toggleUnitType,
        toggleRateRange,
        clearFilters,
        hasActiveFilters
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

