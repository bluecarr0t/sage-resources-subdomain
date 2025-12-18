import { useMemo, useRef } from 'react';
import { SageProperty } from '@/lib/types/sage';
import { processProperties } from '../utils/propertyProcessing';

/**
 * Hook to process and deduplicate properties with caching
 * Groups by property name, aggregates unit types and rates, applies filters
 * Caches results by filter combination to avoid reprocessing
 */
export function usePropertyProcessing(
  properties: SageProperty[],
  filterState: string[],
  filterCountry: string[]
) {
  // Cache processed results by filter combination
  const cacheRef = useRef<Map<string, any[]>>(new Map());
  const lastFiltersRef = useRef<string>('');
  
  return useMemo(() => {
    // Create cache key from filters
    const cacheKey = JSON.stringify({ filterState, filterCountry });
    
    // Check if we have cached result for this filter combination
    if (cacheKey === lastFiltersRef.current && cacheRef.current.has(cacheKey)) {
      const cachedResult = cacheRef.current.get(cacheKey);
      // Verify cached result matches current properties (in case properties updated)
      if (cachedResult && cachedResult.length > 0) {
        // Quick check: if first property ID matches, likely same dataset
        const firstCachedId = cachedResult[0]?.id;
        const firstCurrentId = properties[0]?.id;
        if (firstCachedId === firstCurrentId) {
          return cachedResult;
        }
      }
    }
    
    // Process properties
    const processed = processProperties(properties, filterState, filterCountry);
    
    // Cache the result
    cacheRef.current.set(cacheKey, processed);
    lastFiltersRef.current = cacheKey;
    
    // Limit cache size to prevent memory issues (keep last 5 filter combinations)
    if (cacheRef.current.size > 5) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }
    
    return processed;
  }, [properties, filterState, filterCountry]);
}
