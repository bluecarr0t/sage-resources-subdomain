'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useEffect,
  useMemo,
  Suspense,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { SageProperty } from '@/lib/types/sage';
import type { ClientWorkMapPoint } from '@/lib/map/client-work-locations';
import {
  isMapClientWorkOnlyLayer,
  isMapEmbedMode,
  shouldShowClientWorkInMapView,
  shouldShowNationalParksInMapView,
} from '@/lib/map-embed-mode';
import { mapSearchParamsFromUrlSearchParams } from '@/lib/map-search-params';

let globalFetchInProgress = false;
let globalAbortController: AbortController | null = null;

const MAP_PROPERTIES_SESSION_KEY = 'sage-map-properties-v3';
const MAP_PROPERTIES_SESSION_MAX_AGE_MS = 5 * 60 * 1000;

function readMapPropertiesSessionCache(): SageProperty[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(MAP_PROPERTIES_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; data?: SageProperty[] };
    if (!parsed.at || !Array.isArray(parsed.data)) return null;
    if (Date.now() - parsed.at > MAP_PROPERTIES_SESSION_MAX_AGE_MS) {
      sessionStorage.removeItem(MAP_PROPERTIES_SESSION_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeMapPropertiesSessionCache(data: SageProperty[]): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      MAP_PROPERTIES_SESSION_KEY,
      JSON.stringify({ at: Date.now(), data })
    );
  } catch {
    // Quota or private mode — ignore
  }
}

export type MapLayer = 'none' | 'population' | 'tourism' | 'opportunity';

interface MapContextType {
  /** WordPress iframe (`?embed=1`) — e.g. property links open in a new tab. */
  embedMode: boolean;
  /** When true, only Client Work markers are shown (see `?layer=client-work`). */
  clientWorkOnly: boolean;
  filterCountry: string[];
  filterState: string[];
  filterUnitType: string[];
  filterRateRange: string[];
  showNationalParks: boolean;
  showClientWork: boolean;
  selectedMapLayer: MapLayer;
  showPopulationLayer: boolean;
  showGDPLayer: boolean;
  showOpportunityZones: boolean;
  populationYear: '2010' | '2020';
  isFullscreen: boolean;
  setFilterCountry: Dispatch<SetStateAction<string[]>>;
  setFilterState: Dispatch<SetStateAction<string[]>>;
  setFilterUnitType: Dispatch<SetStateAction<string[]>>;
  setFilterRateRange: Dispatch<SetStateAction<string[]>>;
  toggleState: (state: string) => void;
  toggleUnitType: (unitType: string) => void;
  toggleRateRange: (rateRange: string) => void;
  toggleNationalParks: () => void;
  toggleClientWork: () => void;
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
  clientWorkPoints: ClientWorkMapPoint[];
  clientWorkPointsLoading: boolean;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

function MapProviderInner({ children }: { children: ReactNode }) {
  const urlSearchParams = useSearchParams();
  const queryRecord = useMemo(
    () => mapSearchParamsFromUrlSearchParams(urlSearchParams),
    [urlSearchParams]
  );
  const embedMode = isMapEmbedMode(queryRecord);
  const clientWorkOnly = isMapClientWorkOnlyLayer(queryRecord);
  const initialShowNationalParks = shouldShowNationalParksInMapView(
    queryRecord,
    embedMode,
    clientWorkOnly
  );
  const initialShowClientWork = shouldShowClientWorkInMapView(
    queryRecord,
    embedMode,
    clientWorkOnly
  );

  /** Empty array = all countries in the published map dataset */
  const [filterCountry, setFilterCountry] = useState<string[]>([]);
  const [filterState, setFilterState] = useState<string[]>([]);
  const [filterUnitType, setFilterUnitType] = useState<string[]>([]);
  const [filterRateRange, setFilterRateRange] = useState<string[]>([]);
  const [showNationalParks, setShowNationalParks] = useState<boolean>(initialShowNationalParks);
  const [showClientWork, setShowClientWork] = useState<boolean>(initialShowClientWork);
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

  const [clientWorkPoints, setClientWorkPoints] = useState<ClientWorkMapPoint[]>([]);
  const [clientWorkPointsLoading, setClientWorkPointsLoading] = useState<boolean>(true);

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

  const toggleNationalParks = () => {
    if (clientWorkOnly) return;
    setShowNationalParks((prev) => !prev);
  };
  const toggleClientWork = () => {
    if (clientWorkOnly) return;
    setShowClientWork((prev) => !prev);
  };
  const setMapLayer = (layer: MapLayer) => setSelectedMapLayer(layer);
  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  useEffect(() => {
    if (clientWorkOnly) {
      setShowNationalParks(false);
    }
  }, [clientWorkOnly]);

  const clearFilters = () => {
    setFilterCountry([]);
    setFilterState([]);
    setFilterUnitType([]);
    setFilterRateRange([]);
  };

  const hasActiveFilters =
    filterCountry.length > 0 ||
    filterState.length > 0 ||
    filterUnitType.length > 0 ||
    filterRateRange.length > 0;

  // Fetch ALL properties once on mount with minimal fields for map markers
  // Client-side filtering (usePropertyProcessing) handles all filter logic
  // This eliminates duplicate server/client filter logic and avoids re-fetching on filter changes
  useEffect(() => {
    if (clientWorkOnly) {
      setAllProperties([]);
      setPropertiesLoading(false);
      setPropertiesError(null);
      setHasLoadedOnce(true);
      return;
    }

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
        setPropertiesError(null);

        const sessionCached = readMapPropertiesSessionCache();
        if (sessionCached?.length) {
          setAllProperties(sessionCached);
          setHasLoadedOnce(true);
          setPropertiesLoading(false);
        } else {
          setPropertiesLoading(true);
        }

        const params = new URLSearchParams();
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
          writeMapPropertiesSessionCache(data);
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
  }, [clientWorkOnly]); // Fetch once on mount - no filter dependencies

  useEffect(() => {
    let cancelled = false;
    async function loadClientWork() {
      try {
        const response = await fetch('/api/map/client-work');
        const result = await response.json();
        if (cancelled) return;
        if (result.success && Array.isArray(result.points)) {
          setClientWorkPoints(result.points as ClientWorkMapPoint[]);
        }
      } catch (err) {
        console.error('Error fetching client work map points:', err);
      } finally {
        if (!cancelled) {
          setClientWorkPointsLoading(false);
        }
      }
    }
    loadClientWork();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MapContext.Provider 
      value={{
        embedMode,
        clientWorkOnly,
        filterCountry, filterState, filterUnitType, filterRateRange,
        showNationalParks, showClientWork, selectedMapLayer,
        showPopulationLayer, showGDPLayer, showOpportunityZones,
        populationYear, isFullscreen,
        setFilterCountry, setFilterState, setFilterUnitType, setFilterRateRange,
        toggleState, toggleUnitType, toggleRateRange,
        toggleNationalParks, toggleClientWork, setMapLayer, setPopulationYear, toggleFullscreen,
        clearFilters, hasActiveFilters,
        // allProperties serves as both the complete dataset AND the "properties" for processing
        properties: allProperties,
        allProperties,
        propertiesLoading, propertiesError, hasLoadedOnce,
        clientWorkPoints,
        clientWorkPointsLoading,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function MapProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<div className="h-screen w-full bg-neutral-100/40" aria-busy="true" />}
    >
      <MapProviderInner>{children}</MapProviderInner>
    </Suspense>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}
