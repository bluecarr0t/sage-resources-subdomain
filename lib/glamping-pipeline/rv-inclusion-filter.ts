import type { ExtractedProperty } from '@/lib/glamping-discovery/extract-properties';
import type { InclusionResult } from '@/lib/glamping-discovery/inclusion-filter';
import {
  PIPELINE_MIN_RV_SITES,
  PIPELINE_RV_PROPERTY_TYPES,
  isPipelineRvSegmentPropertyType,
} from './constants';

const RV_NAME_PATTERNS = [
  /\bRV\s*Park\b/i,
  /\bRV\s*Resort\b/i,
  /\bRV\s*Campground\b/i,
  /\bRV\s*Camp\b/i,
];

const CAMPGROUND_NAME_PATTERNS = [/\bcampground\b/i, /\bcamp\s+ground\b/i];

const TENT_ONLY_PATTERNS = [
  /\btent[\s-]*only\b/i,
  /\btent\s*sites?\s*only\b/i,
  /\bprimitive\s*camping\b/i,
];

function parseUnits(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const n = parseInt(String(val).trim(), 10);
  return isNaN(n) ? null : n;
}

function looksLikeRvPrimaryProperty(property: ExtractedProperty): boolean {
  const name = (property.property_name ?? '').trim();
  const propertyType = (property.property_type ?? '').trim();

  if (isPipelineRvSegmentPropertyType(propertyType)) return true;
  if (RV_NAME_PATTERNS.some((p) => p.test(name))) return true;

  if (CAMPGROUND_NAME_PATTERNS.some((p) => p.test(name))) {
    return /\bRV\b/i.test(name) || propertyType === 'Campground';
  }

  return false;
}

function isTentOnlyCampground(property: ExtractedProperty): boolean {
  const name = (property.property_name ?? '').trim();
  const unitType = (property.unit_type ?? '').trim();
  const haystack = `${name} ${unitType}`;
  return TENT_ONLY_PATTERNS.some((p) => p.test(haystack));
}

function belowMinSites(units: number | null): boolean {
  return units != null && units < PIPELINE_MIN_RV_SITES;
}

/**
 * Inclusion rules for new USA RV Park / RV Resort / RV-primary campground pipeline rows.
 */
export function passesRvPipelineInclusionCriteria(
  property: ExtractedProperty
): InclusionResult {
  const name = (property.property_name ?? '').trim();
  if (!name) return { pass: false, reason: 'missing_property_name' };

  const country = (property.country ?? 'United States').trim();
  if (!/united states|usa|u\.s\./i.test(country)) {
    return { pass: false, reason: 'not_usa' };
  }

  if (!looksLikeRvPrimaryProperty(property)) {
    return { pass: false, reason: 'not_rv_park_resort_or_campground' };
  }

  if (isTentOnlyCampground(property)) {
    return { pass: false, reason: 'tent_only_campground' };
  }

  const units = parseUnits(property.number_of_units);
  if (belowMinSites(units)) {
    return { pass: false, reason: 'below_min_rv_sites' };
  }

  return { pass: true };
}

export function passesRvPipelinePostEnrichmentCriteria(
  property: ExtractedProperty
): InclusionResult {
  if (isTentOnlyCampground(property)) {
    return { pass: false, reason: 'tent_only_campground' };
  }

  const units = parseUnits(property.number_of_units);
  if (belowMinSites(units)) {
    return { pass: false, reason: 'below_min_rv_sites' };
  }

  return { pass: true };
}
