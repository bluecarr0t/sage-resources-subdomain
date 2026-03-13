/**
 * Inclusion criteria for discovery pipeline
 * Aligned with RESEARCH_PIPELINE_ARCHITECTURE.md §2: ≥4 units, glamping-focused,
 * not campground/RV park/hotel
 */

import type { ExtractedProperty } from './extract-properties';

const MIN_GLAMPING_UNITS = 4;

const RV_NAME_PATTERNS = [
  /\bRV\s*Park\b/i,
  /\bRV\s*Resort\b/i,
  /\bRV\s*Campground\b/i,
  /\bRV\s*Camp\b/i,
  /\bRV\s*Village\b/i,
  /\bRV\s*Park\s*&\s*Resort\b/i,
];

const RV_UNIT_KEYWORDS = ['rv', 'rv site', 'camper', 'trailer', 'hookup', 'pull-through'];

const GLAMPING_UNIT_KEYWORDS = [
  'tent', 'yurt', 'cabin', 'treehouse', 'tree house', 'dome', 'safari',
  'airstream', 'tiny house', 'pod', 'shepherd', 'hut', 'cottage',
  'bungalow', 'lodge', 'glamping', 'canvas', 'bell tent', 'tipi', 'teepee',
];

const TENT_SITE_PATTERNS = [/\btent\s*site\b/i, /\btent\s*sites\b/i];

const HOTEL_PATTERNS = [
  /\bhotel\b/i,
  /\bmotel\b/i,
  /\binn\b/i,
  /\bbed\s*and\s*breakfast\b/i,
  /\bB&B\b/i,
  /\bresort\s+hotel\b/i,
];

function parseUnits(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const n = parseInt(String(val).trim(), 10);
  return isNaN(n) ? null : n;
}

function hasRVInName(name: string): boolean {
  return RV_NAME_PATTERNS.some((p) => p.test(name));
}

function hasRVUnitType(s: string | null | undefined): boolean {
  if (!s || typeof s !== 'string') return false;
  return RV_UNIT_KEYWORDS.some((kw) => s.toLowerCase().includes(kw));
}

function hasGlampingUnitType(s: string | null | undefined): boolean {
  if (!s || typeof s !== 'string') return false;
  return GLAMPING_UNIT_KEYWORDS.some((kw) => s.toLowerCase().includes(kw));
}

function isTentSite(s: string | null | undefined): boolean {
  return s != null && typeof s === 'string' && TENT_SITE_PATTERNS.some((p) => p.test(s));
}

function isHotelLike(propertyType: string | null | undefined, unitType: string | null | undefined): boolean {
  const check = (v: string | null | undefined) =>
    v && typeof v === 'string' && HOTEL_PATTERNS.some((p) => p.test(v));
  return check(propertyType) || check(unitType) || false;
}

export interface InclusionResult {
  pass: boolean;
  reason?: string;
}

/**
 * Check if extracted property passes glamping inclusion criteria.
 * Returns { pass: true } or { pass: false, reason: string }.
 */
export function passesInclusionCriteria(p: ExtractedProperty): InclusionResult {
  const name = (p.property_name || '').trim();
  if (!name) return { pass: false, reason: 'missing_property_name' };

  if (hasRVInName(name)) {
    return { pass: false, reason: 'rv_in_name' };
  }

  const unitType = p.unit_type ?? '';
  const propertyType = p.property_type ?? '';

  if (isTentSite(unitType) || isTentSite(propertyType)) {
    return { pass: false, reason: 'tent_site' };
  }

  if (hasRVUnitType(unitType) && !hasGlampingUnitType(unitType)) {
    return { pass: false, reason: 'rv_unit_type' };
  }

  if (hasRVUnitType(propertyType) && !hasGlampingUnitType(propertyType)) {
    return { pass: false, reason: 'rv_property_type' };
  }

  if (isHotelLike(propertyType, unitType)) {
    return { pass: false, reason: 'hotel_or_inn' };
  }

  const units = p.number_of_units ?? null;
  const n = typeof units === 'number' ? units : parseUnits(units);
  if (n != null && n < MIN_GLAMPING_UNITS) {
    return { pass: false, reason: '< 4 units' };
  }

  if (n == null) {
    return { pass: false, reason: 'unknown_units' };
  }

  if (!hasGlampingUnitType(unitType) && !hasGlampingUnitType(propertyType)) {
    return { pass: false, reason: 'no_glamping_unit_type' };
  }

  return { pass: true };
}
