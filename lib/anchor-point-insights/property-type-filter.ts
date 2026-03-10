/**
 * Property type filtering for Anchor Point Insights
 * Glamping vs RV vs All
 */

import type { PropertySource } from './types';

export type PropertyTypeFilter = 'glamping' | 'rv' | 'all';

const MIN_GLAMPING_UNITS = 4;

/** RV-related patterns in property name - exclude from Glamping */
const RV_NAME_PATTERNS = [
  /\bRV\s*Park\b/i,
  /\bRV\s*Resort\b/i,
  /\bRV\s*Campground\b/i,
  /\bRV\s*Camp\b/i,
  /\bRV\s*Village\b/i,
  /\bRV\s*Park\s*&\s*Resort\b/i,
];

/** Glamping unit type keywords - include for Glamping filter on Hipcamp */
const GLAMPING_UNIT_KEYWORDS = [
  'tent', 'yurt', 'cabin', 'treehouse', 'tree house', 'dome', 'safari',
  'airstream', 'tiny house', 'pod', 'shepherd', 'hut', 'cottage',
  'bungalow', 'lodge', 'glamping', 'canvas', 'bell tent', 'tipi', 'teepee',
];

/** RV unit type keywords - exclude from Glamping, include for RV filter */
const RV_UNIT_KEYWORDS = ['rv', 'rv site', 'camper', 'trailer', 'hookup', 'pull-through'];

/** Tent Site - exclude from Glamping filter (basic tent camping, not glamping) */
const TENT_SITE_PATTERNS = [/\btent\s*site\b/i, /\btent\s*sites\b/i];

export interface PropertyForTypeFilter {
  source: PropertySource;
  property_name: string;
  property_type?: string | null;
  property_total_sites?: number | null;
  quantity_of_units?: number | null;
  unit_type?: string | null;
  is_glamping_property?: string | null;
}

function parseUnits(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const n = parseInt(String(val).trim(), 10);
  return isNaN(n) ? null : n;
}

function hasRVInName(name: string): boolean {
  return RV_NAME_PATTERNS.some((p) => p.test(name));
}

function hasGlampingUnitType(unitType: string | null | undefined): boolean {
  if (!unitType || typeof unitType !== 'string') return false;
  const lower = unitType.toLowerCase();
  return GLAMPING_UNIT_KEYWORDS.some((kw) => lower.includes(kw));
}

function hasRVUnitType(unitType: string | null | undefined): boolean {
  if (!unitType || typeof unitType !== 'string') return false;
  const lower = unitType.toLowerCase();
  return RV_UNIT_KEYWORDS.some((kw) => lower.includes(kw));
}

function isTentSiteUnit(unitType: string | null | undefined, propertyType: string | null | undefined): boolean {
  const check = (s: string | null | undefined) =>
    s && typeof s === 'string' && TENT_SITE_PATTERNS.some((p) => p.test(s));
  return check(unitType) || check(propertyType) || false;
}

function hasEnoughUnits(p: PropertyForTypeFilter): boolean {
  const units = p.quantity_of_units ?? p.property_total_sites ?? null;
  const n = typeof units === 'number' ? units : parseUnits(units);
  return n != null && n >= MIN_GLAMPING_UNITS;
}

/**
 * Passes for Glamping filter: glamping units, at least 4 units, no RV in title,
 * not majority RV (exclude if unit_type is primarily RV).
 */
export function isGlampingProperty(p: PropertyForTypeFilter): boolean {
  if (hasRVInName(p.property_name)) return false;
  if (isTentSiteUnit(p.unit_type, p.property_type)) return false;
  if (!hasEnoughUnits(p)) return false;

  if (p.source === 'sage_glamping') {
    if (String(p.is_glamping_property || '').toLowerCase() === 'no') return false;
    return true;
  }

  if (p.source === 'hipcamp') {
    if (hasRVUnitType(p.unit_type) && !hasGlampingUnitType(p.unit_type)) return false;
    return hasGlampingUnitType(p.unit_type) || hasGlampingUnitType(p.property_type);
  }

  return false;
}

/**
 * Passes for RV filter: RV-focused properties (RV in name or RV unit type).
 */
export function isRVProperty(p: PropertyForTypeFilter): boolean {
  if (hasRVInName(p.property_name)) return true;
  if (hasRVUnitType(p.unit_type)) return true;
  if (hasRVUnitType(p.property_type)) return true;
  return false;
}

/**
 * Filter properties by property type.
 */
export function filterByPropertyType<T extends PropertyForTypeFilter>(
  properties: T[],
  filter: PropertyTypeFilter
): T[] {
  if (filter === 'all') return properties;
  if (filter === 'glamping') return properties.filter(isGlampingProperty);
  if (filter === 'rv') return properties.filter(isRVProperty);
  return properties;
}
