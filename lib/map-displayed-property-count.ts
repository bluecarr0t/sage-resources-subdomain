import type { SageProperty } from '@/lib/types/sage';
import { filterPropertiesWithCoordinates } from '@/lib/types/sage';
import { propertyMatchesCountryFilters } from '@/lib/map/map-country-filter';
import { normalizePropertyName } from '@/components/map/utils/propertyProcessing';
import { STATE_ABBREVIATIONS } from '@/components/map/utils/stateUtils';

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
      ([, fullName]) => fullName.toLowerCase() === s.toLowerCase()
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
    const prop = p as SageProperty & { all_unit_types?: string[] };
    if (prop.all_unit_types && Array.isArray(prop.all_unit_types)) {
      return prop.all_unit_types.some((ut) => filterUnitType.includes(ut));
    }
    return p.unit_type && filterUnitType.includes(p.unit_type);
  });
}

function applyRateRangeFilter(properties: SageProperty[], filterRateRange: string[]): SageProperty[] {
  if (filterRateRange.length === 0) return properties;
  return properties.filter((p) => {
    const prop = p as SageProperty & { rate_category?: string | null };
    return prop.rate_category && filterRateRange.includes(prop.rate_category);
  });
}

function applyStateFilter(properties: SageProperty[], filterState: string[]): SageProperty[] {
  if (filterState.length === 0) return properties;
  return properties.filter((p) => stateMatchesFilterLocal(p.state, filterState));
}

/**
 * Unique property count shown in the map sidebar — same logic as useFilterComputations.
 * Dedupes by normalized property_name among rows with valid coordinates.
 */
export function computeMapDisplayedPropertyCount(
  allProperties: SageProperty[],
  filterCountry: string[] = [],
  filterState: string[] = [],
  filterUnitType: string[] = [],
  filterRateRange: string[] = []
): number {
  let propertiesToCount = allProperties;
  propertiesToCount = applyUnitTypeFilter(propertiesToCount, filterUnitType);
  propertiesToCount = applyRateRangeFilter(propertiesToCount, filterRateRange);
  propertiesToCount = applyStateFilter(propertiesToCount, filterState);

  const propertiesWithValidCoords = filterPropertiesWithCoordinates(propertiesToCount);
  const uniquePropertyNames = new Set<string>();

  propertiesWithValidCoords.forEach((p) => {
    const propertyName = p.property_name;
    if (!propertyName) return;
    if (!propertyMatchesCountryFilters(p, filterCountry)) return;
    uniquePropertyNames.add(normalizePropertyName(propertyName));
  });

  return uniquePropertyNames.size;
}
