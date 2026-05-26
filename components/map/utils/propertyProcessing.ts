import { SageProperty } from '@/lib/types/sage';
import { isGlampingVisibleOnPublicMap } from '@/lib/glamping-is-open';
import { propertyMatchesCountryFilters } from '@/lib/map/map-country-filter';
import { createStateFilterSet, stateMatchesFilter } from './stateUtils';
import { getPropertyCoordinates } from './coordinateUtils';

/**
 * Normalize property name for consistent grouping and counting
 * Trims whitespace and converts to lowercase to prevent duplicates
 */
export function normalizePropertyName(name: string | null | undefined): string {
  if (!name) return '';
  return name.trim().toLowerCase();
}

/**
 * Categorize a rate into one of the 5 standard categories
 * Returns the category string or null if rate is invalid
 */
export function getRateCategory(rate: number | null): string | null {
  if (rate === null || rate === undefined || isNaN(rate) || !isFinite(rate)) return null;
  
  if (rate <= 149) return '≤$149';
  if (rate >= 150 && rate <= 249) return '$150-$249';
  if (rate >= 250 && rate <= 399) return '$250-$399';
  if (rate >= 400 && rate <= 549) return '$400-$549';
  if (rate >= 550) return '$550+';
  
  return null;
}

/**
 * Faster dedupe for map markers when unit-type / rate filters are off.
 * Skips per-property rate aggregation and all_unit_types collection.
 */
export function processPropertiesForMapMarkers(
  properties: SageProperty[],
  filterState: string[],
  filterCountry: string[],
  filterUnitType: string[] = [],
  filterRateRange: string[] = []
): SageProperty[] {
  if (filterUnitType.length > 0 || filterRateRange.length > 0) {
    return processProperties(
      properties,
      filterState,
      filterCountry,
      filterUnitType,
      filterRateRange
    );
  }
  if (!properties?.length) return [];

  const filterStateSet = createStateFilterSet(filterState);
  const propertyMap = new Map<string, SageProperty>();

  for (const item of properties) {
    const openStatus = item.is_open;
    if (
      openStatus != null &&
      String(openStatus).trim() !== '' &&
      !isGlampingVisibleOnPublicMap(openStatus)
    ) {
      continue;
    }

    const propertyName = item.property_name;
    if (!propertyName) continue;

    if (filterState.length > 0 && !stateMatchesFilter(item.state, filterStateSet)) {
      continue;
    }
    if (
      filterCountry.length > 0 &&
      !propertyMatchesCountryFilters(item, filterCountry)
    ) {
      continue;
    }

    const coords = getPropertyCoordinates(item);
    if (!coords) continue;

    const normalizedName = normalizePropertyName(propertyName);
    const existing = propertyMap.get(normalizedName);
    if (!existing) {
      propertyMap.set(normalizedName, item);
      continue;
    }

    const existingCoords = getPropertyCoordinates(existing);
    const existingMatchesState = stateMatchesFilter(existing.state, filterStateSet);
    const itemMatchesState = stateMatchesFilter(item.state, filterStateSet);

    if (itemMatchesState && !existingMatchesState) {
      propertyMap.set(normalizedName, item);
    } else if (
      itemMatchesState === existingMatchesState &&
      coords &&
      !existingCoords
    ) {
      propertyMap.set(normalizedName, item);
    }
  }

  return Array.from(propertyMap.values());
}

/**
 * Process and deduplicate properties
 * Groups by property name, aggregates unit types and rates, applies all filters
 * Single source of truth for client-side filtering (B3)
 */
export function processProperties(
  properties: SageProperty[],
  filterState: string[],
  filterCountry: string[],
  filterUnitType: string[] = [],
  filterRateRange: string[] = []
): any[] {
  if (!properties || properties.length === 0) {
    return [];
  }
  
  // Create state filter set
  const filterStateSet = createStateFilterSet(filterState);
  
  // Group by property_name and collect all unit types and rates for each property
  // Optimized: Use single pass to collect all data
  const propertyMap = new Map<string, any>();
  const unitTypesMap = new Map<string, Set<string>>();
  const ratesMap = new Map<string, number[]>();
  
  // Pre-compute coordinates and state matches for better performance
  const propertyDataCache = new Map<any, { coords: { lat: number; lon: number } | null; hasCoords: boolean; matchesState: boolean }>();
  
  properties.forEach((item: any) => {
    const openStatus = item.is_open;
    if (
      openStatus != null &&
      String(openStatus).trim() !== '' &&
      !isGlampingVisibleOnPublicMap(openStatus)
    ) {
      return;
    }

    const propertyName = item.property_name;
    if (!propertyName) return; // Skip records without property_name
    
    const normalizedName = normalizePropertyName(propertyName);
    
    // Cache coordinate and state match calculations
    let cachedData = propertyDataCache.get(item);
    if (!cachedData) {
      const coords = getPropertyCoordinates(item);
      cachedData = {
        coords,
        hasCoords: coords !== null,
        matchesState: stateMatchesFilter(item.state, filterStateSet),
      };
      propertyDataCache.set(item, cachedData);
    }
    
    // Collect unit types for this property
    if (!unitTypesMap.has(normalizedName)) {
      unitTypesMap.set(normalizedName, new Set());
    }
    if (item.unit_type) {
      unitTypesMap.get(normalizedName)!.add(item.unit_type);
    }
    
    // Collect rates for this property
    if (!ratesMap.has(normalizedName)) {
      ratesMap.set(normalizedName, []);
    }
    const rate = item.avg__rate__next_12_months_;
    if (rate != null && !isNaN(Number(rate)) && isFinite(Number(rate))) {
      ratesMap.get(normalizedName)!.push(Number(rate));
    }
    
    // Check if we already have this property
    if (!propertyMap.has(normalizedName)) {
      propertyMap.set(normalizedName, item);
    } else {
      // Prefer property that matches state filter and has valid coordinates
      const existing = propertyMap.get(normalizedName)!;
      let existingData = propertyDataCache.get(existing);
      if (!existingData) {
        const coords = getPropertyCoordinates(existing);
        existingData = {
          coords,
          hasCoords: coords !== null,
          matchesState: stateMatchesFilter(existing.state, filterStateSet),
        };
        propertyDataCache.set(existing, existingData);
      }
      
      // Priority: 1) Matches state filter + has coords, 2) Matches state filter, 3) Has coords
      if (cachedData.matchesState && cachedData.hasCoords && (!existingData.matchesState || !existingData.hasCoords)) {
        propertyMap.set(normalizedName, item);
      } else if (cachedData.matchesState && !existingData.matchesState) {
        propertyMap.set(normalizedName, item);
      } else if (cachedData.hasCoords && !existingData.hasCoords && existingData.matchesState === cachedData.matchesState) {
        propertyMap.set(normalizedName, item);
      }
    }
  });
  
  // Convert map to array and add unit types and rate range to each property
  let uniqueProperties = Array.from(propertyMap.entries()).map(([normalizedName, property]: [string, any]) => {
    const unitTypes = unitTypesMap.get(normalizedName);
    const rates = ratesMap.get(normalizedName) || [];
    
    // Calculate min and max rates
    let rateRange: { min: number | null; max: number | null } = { min: null, max: null };
    if (rates.length > 0) {
      rateRange.min = Math.min(...rates);
      rateRange.max = Math.max(...rates);
    }
    
    // Use rate_category from database if available, otherwise calculate it
    let rateCategory = property.rate_category;
    if (!rateCategory) {
      const avgRate = rateRange.min !== null && rateRange.max !== null 
        ? (rateRange.min + rateRange.max) / 2 
        : null;
      rateCategory = getRateCategory(avgRate);
    }
    
    return {
      ...property,
      all_unit_types: unitTypes ? Array.from(unitTypes).sort() : [],
      rate_range: rateRange,
      rate_category: rateCategory,
    };
  });
  
  // Apply state filter
  if (filterState.length > 0) {
    uniqueProperties = uniqueProperties.filter((property: any) => {
      return stateMatchesFilter(property.state, filterStateSet);
    });
    console.log(`After state filtering: ${uniqueProperties.length} properties match the state filter`);
  }
  
  // Apply country filter (empty = all countries in the loaded dataset)
  if (filterCountry.length > 0) {
    uniqueProperties = uniqueProperties.filter((property: any) =>
      propertyMatchesCountryFilters(property, filterCountry)
    );
    console.log(`After client-side country filtering: ${uniqueProperties.length} properties`);
  }
  
  // Apply unit type filter (client-side single source of truth)
  if (filterUnitType.length > 0) {
    uniqueProperties = uniqueProperties.filter((property: any) => {
      if (property.all_unit_types && Array.isArray(property.all_unit_types)) {
        return property.all_unit_types.some((ut: string) => filterUnitType.includes(ut));
      }
      return property.unit_type && filterUnitType.includes(property.unit_type);
    });
  }

  // Apply rate range filter (client-side single source of truth)
  if (filterRateRange.length > 0) {
    uniqueProperties = uniqueProperties.filter((property: any) => {
      return property.rate_category && filterRateRange.includes(property.rate_category);
    });
  }

  return uniqueProperties;
}
