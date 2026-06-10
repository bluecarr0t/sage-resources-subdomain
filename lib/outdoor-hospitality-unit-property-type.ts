import {
  GLAMPING_UNIT_CLASSIFICATION_FAMILIES,
  type GlampingUnitSubtype,
  type UnitPropertyTypeFilter,
} from '@/lib/glamping-unit-type-classification';

export type { UnitPropertyTypeFilter };

export const UNIT_PROPERTY_TYPE_FILTERS: readonly UnitPropertyTypeFilter[] = [
  'glamping',
  'rvResort',
  'campground',
  'marina',
] as const;

export const DEFAULT_UNIT_PROPERTY_TYPE_FILTERS: ReadonlySet<UnitPropertyTypeFilter> = new Set([
  'glamping',
]);

export type UnitPropertyTypeFilterOption = {
  id: UnitPropertyTypeFilter;
  label: string;
  shortLabel: string;
  description: string;
};

export const UNIT_PROPERTY_TYPE_FILTER_OPTIONS: readonly UnitPropertyTypeFilterOption[] = [
  {
    id: 'glamping',
    label: 'Glamping',
    shortLabel: 'Glamping',
    description:
      'Furnished outdoor structures — tents, domes, cabins, treehouses, and similar glamping inventory.',
  },
  {
    id: 'rvResort',
    label: 'RV Resort',
    shortLabel: 'RV Resort',
    description:
      'RV resorts and hybrid outdoor resorts — pads, park models, lodge rooms, and mixed resort inventory.',
  },
  {
    id: 'campground',
    label: 'Campground',
    shortLabel: 'Campground',
    description: 'Campground and RV-park pads — BYO tent sites and RV hookup inventory.',
  },
  {
    id: 'marina',
    label: 'Marina',
    shortLabel: 'Marina',
    description: 'Marina-adjacent lodging and coastal unit labels at the inventory grain.',
  },
] as const;

export function getUnitPropertyTypeFilterOption(
  id: UnitPropertyTypeFilter
): UnitPropertyTypeFilterOption {
  return UNIT_PROPERTY_TYPE_FILTER_OPTIONS.find((o) => o.id === id)!;
}

export function subtypeMatchesPropertyTypeFilters(
  propertyTypes: readonly UnitPropertyTypeFilter[],
  selected: ReadonlySet<UnitPropertyTypeFilter>
): boolean {
  return propertyTypes.some((pt) => selected.has(pt));
}

export function filterSubtypesByPropertyType(
  subtypes: GlampingUnitSubtype[],
  selected: ReadonlySet<UnitPropertyTypeFilter>
): GlampingUnitSubtype[] {
  return subtypes.filter((s) => subtypeMatchesPropertyTypeFilters(s.propertyTypes, selected));
}

export function countSubtypesByPropertyType(propertyType: UnitPropertyTypeFilter): number {
  return GLAMPING_UNIT_CLASSIFICATION_FAMILIES.reduce(
    (n, f) => n + f.subtypes.filter((s) => s.propertyTypes.includes(propertyType)).length,
    0
  );
}
