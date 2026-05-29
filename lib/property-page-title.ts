import { normalizeDbStateToUspsAbbr } from '@/lib/normalize-us-state-abbr';
import { formatUnitTypesDisplay } from '@/lib/property-unit-types';

/** Target length for Google SERP title display (approximate). */
export const PROPERTY_PAGE_TITLE_MAX_LENGTH = 60;

/** Property types that may include a unit-type segment in the page title. */
export const GLAMPING_PROPERTY_TYPES_FOR_UNIT_TYPE_TITLE = [
  'Glamping',
  'Glamping Resort',
] as const;

/** Unit types that should not appear in public page titles. */
const GENERIC_UNIT_TYPES = new Set([
  'mixed',
  'unknown',
  'various',
  'multiple',
  'all',
  'n/a',
  'na',
  'other',
  'general',
  'assorted',
]);

export type PropertyPageTitleInput = {
  propertyName: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  propertyType?: string | null;
  unitTypes?: string[];
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

export function isGlampingPropertyTypeForUnitTypeTitle(
  propertyType: string | null | undefined
): boolean {
  const trimmed = propertyType?.trim() ?? '';
  if (!trimmed) return false;
  return (GLAMPING_PROPERTY_TYPES_FOR_UNIT_TYPE_TITLE as readonly string[]).includes(trimmed);
}

export function isGenericUnitTypeForTitle(unitType: string | null | undefined): boolean {
  const normalized = normalizeToken(unitType ?? '');
  if (!normalized) return true;
  return GENERIC_UNIT_TYPES.has(normalized);
}

export function meaningfulUnitTypesForTitle(unitTypes: string[]): string[] {
  return unitTypes.filter((type) => !isGenericUnitTypeForTitle(type));
}

/** `Moab, UT` for use after `in` in titles. */
export function formatPropertyPageTitleCityState(input: {
  city?: string | null;
  state?: string | null;
  country?: string | null;
}): string | null {
  const city = input.city?.trim() ?? '';
  const state = input.state?.trim() ?? '';
  const country = input.country?.trim() ?? '';
  const abbr = normalizeDbStateToUspsAbbr(state);

  if (city && abbr) return `${city}, ${abbr}`;
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (abbr) return abbr;
  if (state) return state;
  if (country) return country;
  return null;
}

export function propertyPageTitlePropertyType(
  propertyType: string | null | undefined
): string | null {
  const trimmed = propertyType?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'unknown') return null;
  return trimmed;
}

/**
 * Middle segment for titles. Glamping rows: `Glamping, Safari Tent`.
 * Other property types: `Campground` only (no unit type).
 */
export function propertyPageTitleTypeSegment(input: {
  propertyType: string;
  unitTypes?: string[];
}): string {
  const { propertyType } = input;
  if (!isGlampingPropertyTypeForUnitTypeTitle(propertyType)) {
    return propertyType;
  }

  const meaningful = meaningfulUnitTypesForTitle(input.unitTypes ?? []);
  if (meaningful.length === 0 || meaningful.length > 2) {
    return propertyType;
  }

  const unitLabel = formatUnitTypesDisplay(meaningful);
  if (!unitLabel) return propertyType;

  return `${propertyType}, ${unitLabel}`;
}

function truncateToMaxLength(title: string, maxLength: number): string {
  if (title.length <= maxLength) return title;
  if (maxLength <= 3) return title.slice(0, maxLength);
  return `${title.slice(0, maxLength - 3).trimEnd()}...`;
}

/**
 * Default: `{Property Name} | {Property Type} in {City, State}`
 * Glamping: `{Property Name} | {Property Type}, {Unit Type} in {City, State}` when unit type is specific (1–2 types).
 */
export function buildPropertyPageTitle(
  input: PropertyPageTitleInput,
  maxLength: number = PROPERTY_PAGE_TITLE_MAX_LENGTH
): string {
  const name = input.propertyName.trim() || 'Property';
  const propertyType = propertyPageTitlePropertyType(input.propertyType);
  const cityState = formatPropertyPageTitleCityState({
    city: input.city,
    state: input.state,
    country: input.country,
  });

  const typeSegment = propertyType
    ? propertyPageTitleTypeSegment({
        propertyType,
        unitTypes: input.unitTypes,
      })
    : null;

  const candidates = [
    typeSegment && cityState ? `${name} | ${typeSegment} in ${cityState}` : null,
    propertyType && cityState ? `${name} | ${propertyType} in ${cityState}` : null,
    typeSegment ? `${name} | ${typeSegment}` : null,
    propertyType ? `${name} | ${propertyType}` : null,
    cityState ? `${name} in ${cityState}` : null,
    name,
  ].filter((value): value is string => Boolean(value));

  const uniqueCandidates = [...new Set(candidates)];
  const bestFit =
    uniqueCandidates.find((candidate) => candidate.length <= maxLength) ??
    uniqueCandidates[uniqueCandidates.length - 1];

  return truncateToMaxLength(bestFit, maxLength);
}
