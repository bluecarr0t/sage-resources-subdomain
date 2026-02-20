import { useMemo, useRef } from 'react';
import { SageProperty } from '@/lib/types/sage';
import { processProperties } from '../utils/propertyProcessing';

/**
 * Hook to process and deduplicate properties with caching
 * Groups by property name, aggregates unit types and rates, applies all filters
 * Single source of truth for client-side filtering (B3)
 */
export function usePropertyProcessing(
  properties: SageProperty[],
  filterState: string[],
  filterCountry: string[],
  filterUnitType: string[] = [],
  filterRateRange: string[] = []
) {
  const cacheRef = useRef<Map<string, any[]>>(new Map());
  const lastFiltersRef = useRef<string>('');
  
  return useMemo(() => {
    const cacheKey = JSON.stringify({ filterState, filterCountry, filterUnitType, filterRateRange });
    
    if (cacheKey === lastFiltersRef.current && cacheRef.current.has(cacheKey)) {
      const cachedResult = cacheRef.current.get(cacheKey);
      if (cachedResult && cachedResult.length > 0) {
        const firstCachedId = cachedResult[0]?.id;
        const firstCurrentId = properties[0]?.id;
        if (firstCachedId === firstCurrentId) {
          return cachedResult;
        }
      }
    }
    
    const processed = processProperties(properties, filterState, filterCountry, filterUnitType, filterRateRange);
    
    cacheRef.current.set(cacheKey, processed);
    lastFiltersRef.current = cacheKey;
    
    if (cacheRef.current.size > 5) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }
    
    return processed;
  }, [properties, filterState, filterCountry, filterUnitType, filterRateRange]);
}
