import { useMemo, useCallback } from 'react';
import { SageProperty, filterPropertiesWithCoordinates } from '@/lib/types/sage';
import { computeMapDisplayedPropertyCount } from '@/lib/map-displayed-property-count';
import { STATE_ABBREVIATIONS, CANADIAN_PROVINCES } from '../utils/stateUtils';
import { normalizePropertyName } from '../utils/propertyProcessing';
import { getMapCountryFilterKey, propertyMatchesCountryFilters } from '@/lib/map/map-country-filter';

interface FilterComputationsInput {
  allProperties: SageProperty[];
  filterCountry: string[];
  filterState: string[];
  filterUnitType: string[];
  filterRateRange: string[];
}

function stateMatchesFilterLocal(state: string | null, filterStates: string[]): boolean {
  if (!state) return false;
  if (filterStates.length === 0) return true;

  const filterStateSet = new Set<string>();
  filterStates.forEach((s) => {
    filterStateSet.add(s);
    filterStateSet.add(s.toUpperCase());
    filterStateSet.add(s.toLowerCase());
    filterStateSet.add(s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());

    const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
      ([_, fullName]) => fullName.toLowerCase() === s.toLowerCase()
    );
    if (abbreviation) {
      filterStateSet.add(abbreviation[0]);
      filterStateSet.add(abbreviation[0].toUpperCase());
    }

    if (STATE_ABBREVIATIONS[s.toUpperCase()]) {
      const fullName = STATE_ABBREVIATIONS[s.toUpperCase()];
      filterStateSet.add(fullName);
      filterStateSet.add(fullName.toUpperCase());
      filterStateSet.add(fullName.toLowerCase());
    }
  });

  const stateStr = String(state);
  return (
    filterStateSet.has(stateStr) ||
    filterStateSet.has(stateStr.toUpperCase()) ||
    filterStateSet.has(stateStr.toLowerCase()) ||
    filterStateSet.has(stateStr.charAt(0).toUpperCase() + stateStr.slice(1).toLowerCase())
  );
}

function applyCountryFilter(properties: SageProperty[], filterCountry: string[]): SageProperty[] {
  if (filterCountry.length === 0) return properties;
  return properties.filter((p) => propertyMatchesCountryFilters(p, filterCountry));
}

function applyUnitTypeFilter(properties: SageProperty[], filterUnitType: string[]): SageProperty[] {
  if (filterUnitType.length === 0) return properties;
  return properties.filter((p) => {
    const prop = p as any;
    if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
      return prop.all_unit_types.some((ut: string) => filterUnitType.includes(ut));
    }
    return p.unit_type && filterUnitType.includes(p.unit_type);
  });
}

function applyRateRangeFilter(properties: SageProperty[], filterRateRange: string[]): SageProperty[] {
  if (filterRateRange.length === 0) return properties;
  return properties.filter((p) => {
    const prop = p as any;
    return prop.rate_category && filterRateRange.includes(prop.rate_category);
  });
}

function applyStateFilter(properties: SageProperty[], filterState: string[]): SageProperty[] {
  if (filterState.length === 0) return properties;
  return properties.filter((p) => stateMatchesFilterLocal(p.state, filterState));
}

/**
 * Hook that encapsulates all filter-related computations:
 * unique states, state/country/unitType/rateCategory counts,
 * available options, and the calculated displayed count.
 */
export function useFilterComputations({
  allProperties,
  filterCountry,
  filterState,
  filterUnitType,
  filterRateRange,
}: FilterComputationsInput) {
  const stateMatchesFilter = useCallback(
    (state: string | null, filterStates: string[]): boolean => stateMatchesFilterLocal(state, filterStates),
    []
  );

  const uniqueStates = useMemo(() => {
    let propertiesToUse = allProperties;
    if (filterCountry.length > 0) {
      propertiesToUse = applyCountryFilter(allProperties, filterCountry);
    }

    const allStates = Array.from(new Set(propertiesToUse.map((p) => p.state).filter(Boolean))) as string[];
    const stateMap = new Map<string, string>();

    allStates.forEach((state) => {
      const upperState = state.toUpperCase();
      if (STATE_ABBREVIATIONS[upperState]) {
        const fullName = STATE_ABBREVIATIONS[upperState];
        if (CANADIAN_PROVINCES.includes(fullName)) return;
        if (!stateMap.has(fullName)) stateMap.set(fullName, fullName);
      } else {
        const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
          ([_, fullName]) => fullName.toLowerCase() === state.toLowerCase()
        );
        if (abbreviation) {
          const fullName = abbreviation[1];
          if (CANADIAN_PROVINCES.includes(fullName)) return;
          stateMap.set(fullName, fullName);
        } else {
          const isCanadianProvince = CANADIAN_PROVINCES.some(
            (province) => province.toLowerCase() === state.toLowerCase()
          );
          if (!isCanadianProvince) {
            stateMap.set(state, state);
          }
        }
      }
    });

    return Array.from(stateMap.values()).sort();
  }, [allProperties, filterCountry]);

  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let propertiesToCount = allProperties;
    propertiesToCount = applyCountryFilter(propertiesToCount, filterCountry);
    propertiesToCount = applyUnitTypeFilter(propertiesToCount, filterUnitType);
    propertiesToCount = applyRateRangeFilter(propertiesToCount, filterRateRange);

    const propertiesWithValidCoords = filterPropertiesWithCoordinates(propertiesToCount);
    const propertiesByState = new Map<string, Set<string>>();

    propertiesWithValidCoords.forEach((p) => {
      const state = p.state;
      const propertyName = p.property_name;
      if (!state || !propertyName) return;

      const normalizedName = normalizePropertyName(propertyName);
      const stateStr = String(state);
      const upperState = stateStr.toUpperCase();
      let normalizedState = stateStr;

      if (STATE_ABBREVIATIONS[upperState]) {
        normalizedState = STATE_ABBREVIATIONS[upperState];
      } else {
        const abbreviation = Object.entries(STATE_ABBREVIATIONS).find(
          ([_, fullName]) => fullName.toLowerCase() === stateStr.toLowerCase()
        );
        if (abbreviation) normalizedState = abbreviation[1];
      }

      if (!propertiesByState.has(normalizedState)) {
        propertiesByState.set(normalizedState, new Set());
      }
      propertiesByState.get(normalizedState)!.add(normalizedName);
    });

    propertiesByState.forEach((propertySet, state) => {
      counts[state] = propertySet.size;
    });

    return counts;
  }, [allProperties, filterCountry, filterUnitType, filterRateRange]);

  const calculatedDisplayedCount = useMemo(
    () =>
      computeMapDisplayedPropertyCount(
        allProperties,
        filterCountry,
        filterState,
        filterUnitType,
        filterRateRange
      ),
    [allProperties, filterCountry, filterState, filterUnitType, filterRateRange]
  );

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let propertiesToCount = allProperties;
    propertiesToCount = applyUnitTypeFilter(propertiesToCount, filterUnitType);
    propertiesToCount = applyRateRangeFilter(propertiesToCount, filterRateRange);
    propertiesToCount = applyStateFilter(propertiesToCount, filterState);

    const propertiesWithValidCoords = filterPropertiesWithCoordinates(propertiesToCount);
    const propertyToCountryMap = new Map<string, string>();

    propertiesWithValidCoords.forEach((p) => {
      const propertyName = p.property_name;
      if (!propertyName) return;
      const normalizedName = normalizePropertyName(propertyName);
      const mapKey = getMapCountryFilterKey(p);
      if (!mapKey) return;

      if (!propertyToCountryMap.has(normalizedName)) {
        propertyToCountryMap.set(normalizedName, mapKey);
      }
    });

    propertyToCountryMap.forEach((country) => {
      counts[country] = (counts[country] || 0) + 1;
    });

    return counts;
  }, [allProperties, filterUnitType, filterRateRange, filterState]);

  const availableUnitTypes = useMemo(() => {
    const unitTypesSet = new Set<string>();
    const source = filterState.length === 0
      ? allProperties
      : allProperties.filter((p) => stateMatchesFilter(p.state, filterState));

    source.forEach((p) => {
      const prop = p as any;
      if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
        prop.all_unit_types.forEach((ut: string) => unitTypesSet.add(ut));
      } else if (p.unit_type) {
        unitTypesSet.add(p.unit_type);
      }
    });

    return Array.from(unitTypesSet).sort();
  }, [allProperties, filterState, stateMatchesFilter]);

  const unitTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let propertiesToCount = allProperties;
    propertiesToCount = applyCountryFilter(propertiesToCount, filterCountry);
    propertiesToCount = applyStateFilter(propertiesToCount, filterState);
    propertiesToCount = applyRateRangeFilter(propertiesToCount, filterRateRange);
    propertiesToCount = filterPropertiesWithCoordinates(propertiesToCount);

    const propertiesByUnitType = new Map<string, Set<string>>();

    propertiesToCount.forEach((p) => {
      const prop = p as any;
      const propertyName = p.property_name;
      if (!propertyName) return;
      const normalizedName = normalizePropertyName(propertyName);

      if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
        prop.all_unit_types.forEach((ut: string) => {
          if (!propertiesByUnitType.has(ut)) propertiesByUnitType.set(ut, new Set());
          propertiesByUnitType.get(ut)!.add(normalizedName);
        });
      } else if (p.unit_type) {
        if (!propertiesByUnitType.has(p.unit_type)) propertiesByUnitType.set(p.unit_type, new Set());
        propertiesByUnitType.get(p.unit_type)!.add(normalizedName);
      }
    });

    propertiesByUnitType.forEach((propertySet, unitType) => {
      counts[unitType] = propertySet.size;
    });

    return counts;
  }, [allProperties, filterCountry, filterState, filterRateRange]);

  const availableRateCategories = useMemo(() => {
    const allCategories = ['≤$149', '$150-$249', '$250-$399', '$400-$549', '$550+'];
    const availableCategories = new Set<string>();

    const propertiesToCheck = allProperties.filter((p) => {
      const prop = p as any;
      const matchesState = filterState.length === 0 || stateMatchesFilter(p.state, filterState);
      const matchesUnitType =
        filterUnitType.length === 0 ||
        (prop.all_unit_types &&
          Array.isArray(prop.all_unit_types) &&
          prop.all_unit_types.some((ut: string) => filterUnitType.includes(ut))) ||
        (p.unit_type && filterUnitType.includes(p.unit_type));
      return matchesState && matchesUnitType;
    });

    propertiesToCheck.forEach((p) => {
      const prop = p as any;
      if (prop.rate_category) availableCategories.add(prop.rate_category);
    });

    return allCategories.filter((cat) => availableCategories.has(cat));
  }, [allProperties, filterState, filterUnitType, stateMatchesFilter]);

  const rateCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let propertiesToCount = allProperties;
    propertiesToCount = applyCountryFilter(propertiesToCount, filterCountry);
    propertiesToCount = applyStateFilter(propertiesToCount, filterState);
    propertiesToCount = applyUnitTypeFilter(propertiesToCount, filterUnitType);
    propertiesToCount = filterPropertiesWithCoordinates(propertiesToCount);

    const propertiesByRateCategory = new Map<string, Set<string>>();

    propertiesToCount.forEach((p) => {
      const prop = p as any;
      const propertyName = p.property_name;
      if (!propertyName || !prop.rate_category) return;

      if (!propertiesByRateCategory.has(prop.rate_category)) {
        propertiesByRateCategory.set(prop.rate_category, new Set());
      }
      propertiesByRateCategory.get(prop.rate_category)!.add(propertyName);
    });

    propertiesByRateCategory.forEach((propertySet, category) => {
      counts[category] = propertySet.size;
    });

    return counts;
  }, [allProperties, filterCountry, filterState, filterUnitType]);

  return {
    uniqueStates,
    stateCounts,
    calculatedDisplayedCount,
    countryCounts,
    availableUnitTypes,
    unitTypeCounts,
    availableRateCategories,
    rateCategoryCounts,
    stateMatchesFilter,
  };
}
