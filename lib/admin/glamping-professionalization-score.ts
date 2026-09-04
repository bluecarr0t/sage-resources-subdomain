/**
 * Property-level “how close to a full professionalized glamping property” score.
 * Uses sibling inventory, not the list-anchor row alone. `property_type` and
 * `is_glamping_property` never gate the score — an RV Park with Yurts can score high.
 */

import { findGlampingUnitSubtype } from '@/lib/glamping-unit-type-classification';
import { isExcludedGlampingMarketSnapshotUnitType } from '@/lib/glamping-market-snapshot-unit-filter';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';
import {
  isGlampingServiceTier,
  parsePositiveRate,
} from '@/lib/glamping-service-tier';

export const GLAMPING_PROFESSIONALIZATION_SCORE_COLUMN =
  'glamping_professionalization_score' as const;

export const GLAMPING_PROFESSIONALIZATION_BREAKDOWN_KEY =
  'glamping_professionalization_breakdown' as const;

export const INVENTORY_MAX = 45;
export const EXPERIENCE_MAX = 30;
export const COMPLETENESS_MAX = 15;
export const OPERATIONS_MAX = 10;
export const ALIGNMENT_BONUS = 4;
export const CANONICAL_TYPE_BONUS = 3;

const CREDITED_FAMILY_IDS = new Set([
  'canvas-tented',
  'domes-pods',
  'cabins-lodges',
  'compact-mobile',
  'vintage-vehicles',
  'elevated-specialty',
  'mixed-other',
]);

const NEVER_CREDITED_CANONICAL = new Set(['mobile home']);

export type InventoryUnitClass = 'glamping' | 'non_glamping' | 'unclassified';

export type ClassifiedInventoryUnit = {
  class: InventoryUnitClass;
  canonical: string | null;
  /** True when the credited type is a specific furnished SKU (not Other Glamping). */
  isCanonicalGlamping: boolean;
};

export type GlampingProfessionalizationRow = {
  unit_type?: string | null;
  quantity_of_units?: string | number | null;
  property_total_sites?: string | number | null;
  unit_private_bathroom?: string | null;
  unit_air_conditioning?: string | null;
  unit_wifi?: string | null;
  unit_hot_tub?: string | null;
  property_hot_tub?: string | null;
  property_restaurant?: string | null;
  property_food_on_site?: string | null;
  property_pool?: string | null;
  property_sauna?: string | null;
  rate_avg_retail_daily_rate?: string | number | null;
  url?: string | null;
  city?: string | null;
  state?: string | null;
  lat?: string | number | null;
  lon?: string | number | null;
  is_open?: string | null;
  research_status?: string | null;
  property_type?: string | null;
  glamping_service_tier?: string | null;
  is_glamping_property?: string | null;
};

export type GlampingProfessionalizationBreakdown = {
  inventory: number;
  experience: number;
  completeness: number;
  operations: number;
  reasons: string[];
  glampingUnitCount: number;
  glampingShare: number;
  distinctGlampingTypes: string[];
};

export type GlampingProfessionalizationScore = {
  total: number;
} & GlampingProfessionalizationBreakdown;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function isYes(value: string | null | undefined): boolean {
  return String(value ?? '').trim().toLowerCase() === 'yes';
}

function trimText(value: unknown): string {
  return String(value ?? '').trim();
}

export function parsePositiveQuantity(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const n = parseFloat(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function hasPlaceholderText(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'not available' ||
    lower === 'unavailable' ||
    lower === 'none' ||
    lower === 'null'
  );
}

function firstNonEmpty(rows: GlampingProfessionalizationRow[], key: keyof GlampingProfessionalizationRow): string {
  for (const row of rows) {
    const v = trimText(row[key]);
    if (v) return v;
  }
  return '';
}

function parseCoord(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

export function classifyInventoryUnitType(
  unitType: string | null | undefined
): ClassifiedInventoryUnit {
  if (isExcludedGlampingMarketSnapshotUnitType(unitType)) {
    return { class: 'non_glamping', canonical: null, isCanonicalGlamping: false };
  }

  const raw = trimText(unitType);
  const canonical = normalizeGlampingUnitTypeForStorage(unitType);
  if (!canonical) {
    return { class: 'unclassified', canonical: null, isCanonicalGlamping: false };
  }

  const match =
    findGlampingUnitSubtype(canonical) ?? (raw ? findGlampingUnitSubtype(raw) : null);
  if (!match) {
    return { class: 'unclassified', canonical, isCanonicalGlamping: false };
  }

  if (match.subtype.excludedFromMarketSnapshot) {
    return { class: 'non_glamping', canonical: match.subtype.canonical, isCanonicalGlamping: false };
  }
  if (NEVER_CREDITED_CANONICAL.has(match.subtype.canonical.toLowerCase())) {
    return { class: 'non_glamping', canonical: match.subtype.canonical, isCanonicalGlamping: false };
  }
  if (!CREDITED_FAMILY_IDS.has(match.family.id)) {
    return { class: 'non_glamping', canonical: match.subtype.canonical, isCanonicalGlamping: false };
  }

  const isOtherGlamping = match.family.id === 'mixed-other';
  return {
    class: 'glamping',
    canonical: match.subtype.canonical,
    isCanonicalGlamping: !isOtherGlamping,
  };
}

function typePresenceScore(distinctCount: number): number {
  if (distinctCount <= 0) return 0;
  if (distinctCount === 1) return 8;
  return 16;
}

function glampingCountScore(n: number): number {
  if (n <= 0) return 0;
  if (n <= 3) return 8;
  if (n <= 9) return 16;
  if (n <= 24) return 22;
  return 26;
}

function glampingShareScore(share: number): number {
  if (share <= 0) return 0;
  if (share < 0.1) return 4;
  if (share < 0.3) return 8;
  if (share < 0.7) return 12;
  return 16;
}

function pluralizeType(canonical: string, count: number): string {
  if (count === 1) return canonical;
  if (/s$/i.test(canonical)) return canonical;
  return `${canonical}s`;
}

function typeCountLabel(count: number, types: string[]): string {
  if (types.length === 1) {
    return `${formatCount(count)} ${pluralizeType(types[0], count)}`;
  }
  return `${formatCount(count)} glamping units (${types.join(', ')})`;
}

function formatCount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function scoreInventory(rows: GlampingProfessionalizationRow[]): {
  points: number;
  glampingUnitCount: number;
  glampingShare: number;
  distinctGlampingTypes: string[];
} {
  let glampingUnitCount = 0;
  let rowQuantitySum = 0;
  let propertyTotalSites: number | null = null;
  const typeSet = new Set<string>();
  let allCreditedAreCanonical = true;
  let hasCreditedType = false;

  for (const row of rows) {
    const classified = classifyInventoryUnitType(row.unit_type);
    const qty = parsePositiveQuantity(row.quantity_of_units);
    const sites = parsePositiveQuantity(row.property_total_sites);
    if (sites != null && (propertyTotalSites == null || sites > propertyTotalSites)) {
      propertyTotalSites = sites;
    }

    if (classified.class === 'glamping') {
      hasCreditedType = true;
      const creditedQty = qty ?? 1;
      glampingUnitCount += creditedQty;
      rowQuantitySum += creditedQty;
      if (classified.canonical) typeSet.add(classified.canonical);
      if (!classified.isCanonicalGlamping) allCreditedAreCanonical = false;
    } else if (classified.class === 'non_glamping') {
      rowQuantitySum += qty ?? 1;
    } else if (qty != null) {
      rowQuantitySum += qty;
    }
  }

  const denominator = Math.max(rowQuantitySum, propertyTotalSites ?? 0, 1);
  const glampingShare = glampingUnitCount / denominator;
  const distinctGlampingTypes = [...typeSet].sort((a, b) => a.localeCompare(b));

  let points =
    typePresenceScore(distinctGlampingTypes.length) +
    glampingCountScore(glampingUnitCount) +
    glampingShareScore(glampingShare);

  if (hasCreditedType && allCreditedAreCanonical) {
    points += CANONICAL_TYPE_BONUS;
  }

  const propertyType = firstNonEmpty(rows, 'property_type');
  if (propertyType === 'Glamping' && glampingUnitCount > 0) {
    points += ALIGNMENT_BONUS;
  }

  return {
    points: clamp(points, 0, INVENTORY_MAX),
    glampingUnitCount,
    glampingShare,
    distinctGlampingTypes,
  };
}

function scoreExperience(rows: GlampingProfessionalizationRow[]): {
  points: number;
  hasPrivateBathroom: boolean;
} {
  const glampingRows = rows.filter(
    (row) => classifyInventoryUnitType(row.unit_type).class === 'glamping'
  );
  const unitRows = glampingRows.length > 0 ? glampingRows : rows;

  const hasPrivateBathroom = unitRows.some((row) => isYes(row.unit_private_bathroom));
  const hasAirConditioning = unitRows.some((row) => isYes(row.unit_air_conditioning));
  const hasWifi = unitRows.some((row) => isYes(row.unit_wifi));
  const hasHotTub = rows.some((row) => isYes(row.unit_hot_tub) || isYes(row.property_hot_tub));
  const hasRestaurantOrFood = rows.some(
    (row) => isYes(row.property_restaurant) || isYes(row.property_food_on_site)
  );
  const hasPool = rows.some((row) => isYes(row.property_pool));

  let points = 0;
  if (hasPrivateBathroom) points += 8;
  if (hasAirConditioning) points += 4;
  if (hasWifi) points += 3;
  if (hasRestaurantOrFood) points += 5;
  if (hasPool || hasHotTub) points += 5;

  const tierRaw = firstNonEmpty(rows, 'glamping_service_tier');
  if (isGlampingServiceTier(tierRaw)) {
    if (tierRaw === 'luxury' || tierRaw === 'upscale') points += 5;
    else if (tierRaw === 'midscale') points += 3;
    else points += 1;
  }

  return { points: clamp(points, 0, EXPERIENCE_MAX), hasPrivateBathroom };
}

function scoreCompleteness(
  rows: GlampingProfessionalizationRow[],
  glampingRows: GlampingProfessionalizationRow[]
): number {
  let points = 0;
  const url = firstNonEmpty(rows, 'url');
  if (url && !hasPlaceholderText(url)) points += 3;

  const city = firstNonEmpty(rows, 'city');
  const state = firstNonEmpty(rows, 'state');
  if (city && state) points += 3;

  const hasCoords = rows.some((row) => parseCoord(row.lat) != null && parseCoord(row.lon) != null);
  if (hasCoords) points += 3;

  const hasGlampingAdr = glampingRows.some(
    (row) => parsePositiveRate(row.rate_avg_retail_daily_rate) != null
  );
  if (hasGlampingAdr) points += 4;

  if (
    glampingRows.length > 0 &&
    glampingRows.every((row) => parsePositiveQuantity(row.quantity_of_units) != null)
  ) {
    points += 2;
  }

  return clamp(points, 0, COMPLETENESS_MAX);
}

function scoreOperations(rows: GlampingProfessionalizationRow[]): {
  points: number;
  isOpen: string;
  researchStatus: string;
} {
  const isOpen = firstNonEmpty(rows, 'is_open');
  const researchStatus = firstNonEmpty(rows, 'research_status');
  const openLower = isOpen.toLowerCase();
  const statusLower = researchStatus.toLowerCase();

  let points = 0;
  if (openLower === 'yes') points += 5;
  else if (openLower === 'under construction' || openLower === 'proposed development') {
    points += 2;
  }

  if (statusLower === 'published') points += 5;
  else if (statusLower === 'in_progress') points += 3;
  else if (statusLower === 'new') points += 1;

  return { points: clamp(points, 0, OPERATIONS_MAX), isOpen, researchStatus };
}

function buildReasons(input: {
  glampingUnitCount: number;
  glampingShare: number;
  distinctGlampingTypes: string[];
  hasPrivateBathroom: boolean;
  isOpen: string;
  researchStatus: string;
  inventory: number;
  experience: number;
  completeness: number;
  operations: number;
}): string[] {
  const reasons: string[] = [];
  if (input.glampingUnitCount > 0 && input.distinctGlampingTypes.length > 0) {
    const pct = Math.round(input.glampingShare * 100);
    reasons.push(
      `${typeCountLabel(input.glampingUnitCount, input.distinctGlampingTypes)} (${pct}% of sites)`
    );
  } else {
    reasons.push('no glamping units');
  }
  if (!input.hasPrivateBathroom) reasons.push('no private bath');
  if (input.researchStatus.toLowerCase() !== 'published') {
    reasons.push(input.researchStatus ? input.researchStatus : 'unpublished');
  }
  if (input.isOpen.toLowerCase() !== 'yes') {
    reasons.push(input.isOpen ? `not open (${input.isOpen})` : 'not open');
  }
  reasons.push(
    `Inventory ${input.inventory} · Experience ${input.experience} · Completeness ${input.completeness} · Operations ${input.operations}`
  );
  return reasons;
}

export function scoreProfessionalizedGlamping(
  rows: GlampingProfessionalizationRow[]
): GlampingProfessionalizationScore {
  const safeRows = rows.length > 0 ? rows : [{}];
  const inventory = scoreInventory(safeRows);
  const glampingRows = safeRows.filter(
    (row) => classifyInventoryUnitType(row.unit_type).class === 'glamping'
  );
  const experience = scoreExperience(safeRows);
  const completeness = scoreCompleteness(safeRows, glampingRows);
  const operations = scoreOperations(safeRows);

  const total = clamp(
    inventory.points + experience.points + completeness + operations.points,
    0,
    100
  );

  return {
    total,
    inventory: inventory.points,
    experience: experience.points,
    completeness,
    operations: operations.points,
    glampingUnitCount: inventory.glampingUnitCount,
    glampingShare: inventory.glampingShare,
    distinctGlampingTypes: inventory.distinctGlampingTypes,
    reasons: buildReasons({
      glampingUnitCount: inventory.glampingUnitCount,
      glampingShare: inventory.glampingShare,
      distinctGlampingTypes: inventory.distinctGlampingTypes,
      hasPrivateBathroom: experience.hasPrivateBathroom,
      isOpen: operations.isOpen,
      researchStatus: operations.researchStatus,
      inventory: inventory.points,
      experience: experience.points,
      completeness,
      operations: operations.points,
    }),
  };
}

export function professionalizationScoreBand(score: number): 'red' | 'yellow' | 'green' {
  if (score >= 75) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}
