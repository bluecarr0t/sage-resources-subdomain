/**
 * Glamping service tier classification (property-level).
 * Distinct from rate_category (price buckets) and comps-v2 QUALITY_TIERS (ADR search heuristic).
 */

export const GLAMPING_SERVICE_TIERS = [
  'luxury',
  'upscale',
  'midscale',
  'rustic',
] as const;

export type GlampingServiceTier = (typeof GLAMPING_SERVICE_TIERS)[number];

export type GlampingServiceTierSource = 'auto' | 'manual';

export const GLAMPING_SERVICE_TIER_LABELS: Record<GlampingServiceTier, string> = {
  luxury: 'Luxury Glamping',
  upscale: 'Upscale Glamping',
  midscale: 'Comfort Glamping',
  rustic: 'Essential Glamping',
};

/** Compact labels for admin filters and selects (no “Glamping” suffix). */
export const GLAMPING_SERVICE_TIER_SHORT_LABELS: Record<GlampingServiceTier, string> = {
  luxury: 'Luxury',
  upscale: 'Upscale',
  midscale: 'Comfort',
  rustic: 'Rustic',
};

/** Short definitions for admin UI and docs (internal keys stored in DB). */
export const GLAMPING_SERVICE_TIER_DEFINITIONS: Record<
  GlampingServiceTier,
  { summary: string; alternates: string }
> = {
  luxury: {
    summary:
      'Private bath, climate control, premium finishes, often hot tub; fine dining, spa, curated experiences; remote or high-end destinations.',
    alternates: 'Ultra-luxury, ultra-premium',
  },
  upscale: {
    summary:
      'Top-tier units with private bath and climate control; restaurant or event space, pool or communal hot tub, strong service; desirable locations below luxury on price.',
    alternates: 'Premium full-service, destination upscale',
  },
  midscale: {
    summary:
      'Comfortable beds, power, heat/AC; fewer luxury features; family and adventure positioning; en-suite or shared bath.',
    alternates: 'Core glamping, select service',
  },
  rustic: {
    summary:
      'Budget-first; often shared bath; minimal infrastructure; bring-your-own or limited on-site services.',
    alternates: 'Economy glamping, back-to-nature',
  },
};

export const GLAMPING_SERVICE_TIER_AMENITY_SIGNALS: ReadonlyArray<{
  signal: string;
  points: number;
}> = [
  { signal: 'unit_private_bathroom = Yes', points: 2 },
  { signal: 'unit_air_conditioning = Yes', points: 1 },
  { signal: 'unit_hot_tub = Yes OR property_hot_tub = Yes', points: 2 },
  { signal: 'property_restaurant OR property_food_on_site = Yes', points: 2 },
  { signal: 'property_pool = Yes', points: 1 },
  { signal: 'property_sauna = Yes', points: 1 },
  { signal: 'Shared bath only (no private on any site row)', points: -2 },
];

export const GLAMPING_SERVICE_TIER_FAST_PATHS: ReadonlyArray<{
  condition: string;
  tier: GlampingServiceTier;
}> = [
  { condition: 'Max site ARDR ≥ $800', tier: 'luxury' },
  {
    condition: 'Max site ARDR < $150, shared bath, and amenity score < 1',
    tier: 'rustic',
  },
];

export const GLAMPING_SERVICE_TIER_BASE_RULES: ReadonlyArray<{
  tier: GlampingServiceTier;
  rule: string;
}> = [
  { tier: 'luxury', rule: 'Amenity score ≥ 6 AND max ARDR ≥ $500 (if not already luxury)' },
  { tier: 'upscale', rule: 'Amenity score ≥ 4 AND max ARDR ≥ $250' },
  {
    tier: 'midscale',
    rule: 'Amenity score ≥ 1 OR max ARDR ≥ $150 (price floor for low-amenity inventory)',
  },
  {
    tier: 'rustic',
    rule:
      'Shared bath + amenity score < 1 + max ARDR < $150; or amenity score < 1 with max ARDR null/<$150',
  },
];

/** How property-level inputs are derived before scoring. */
export const GLAMPING_SERVICE_TIER_AGGREGATION_STEPS = [
  'Group site rows by property_id (fallback: property_name + city + state).',
  'Amenities: BOOL_OR across rows (Yes on any row counts for the property).',
  'ARDR (avg. retail daily rate): MAX(rate_avg_retail_daily_rate) across site rows.',
  'Manual rows (glamping_service_tier_source = manual) are skipped by the batch classifier.',
] as const;

/** Suggested max-site ARDR bands (USD) from Sage cohort study — guidance only. */
export const TIER_ADR_GUIDANCE: Record<
  GlampingServiceTier,
  { min: number | null; max: number | null; note: string }
> = {
  luxury: {
    min: 800,
    max: null,
    note: 'Core $800+; often $1,200–$2,600+ all-inclusive',
  },
  upscale: {
    min: 250,
    max: 799,
    note: 'Sweet spot ~$300–$550',
  },
  midscale: {
    min: 125,
    max: 349,
    note: 'Bulk of published market (p25–p75)',
  },
  rustic: {
    min: null,
    max: 149,
    note: 'Core $75–$149; shared bath common',
  },
};

export type GlampingServiceTierRowInput = {
  unit_private_bathroom?: string | null;
  unit_air_conditioning?: string | null;
  unit_hot_tub?: string | null;
  property_hot_tub?: string | null;
  property_restaurant?: string | null;
  property_food_on_site?: string | null;
  property_pool?: string | null;
  property_sauna?: string | null;
  rate_avg_retail_daily_rate?: string | number | null;
};

export type AggregatedPropertyForTier = {
  hasPrivateBathroom: boolean;
  hasAirConditioning: boolean;
  hasHotTub: boolean;
  hasRestaurantOrFood: boolean;
  hasPool: boolean;
  hasSauna: boolean;
  maxAdr: number | null;
};

export type TierComputationResult = {
  tier: GlampingServiceTier;
  points: number;
  rationale: string;
};

function isYes(value: string | null | undefined): boolean {
  return String(value ?? '').trim().toLowerCase() === 'yes';
}

export function parsePositiveRate(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  const n = parseFloat(String(value).replace(/[$,]/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return n === 0 ? null : n;
  return n > 0 ? n : null;
}

export function aggregateRowsForTier(rows: GlampingServiceTierRowInput[]): AggregatedPropertyForTier {
  let maxAdr: number | null = null;
  let hasPrivateBathroom = false;
  let hasAirConditioning = false;
  let hasHotTub = false;
  let hasRestaurantOrFood = false;
  let hasPool = false;
  let hasSauna = false;

  for (const row of rows) {
    if (isYes(row.unit_private_bathroom)) hasPrivateBathroom = true;
    if (isYes(row.unit_air_conditioning)) hasAirConditioning = true;
    if (isYes(row.unit_hot_tub) || isYes(row.property_hot_tub)) hasHotTub = true;
    if (isYes(row.property_restaurant) || isYes(row.property_food_on_site)) {
      hasRestaurantOrFood = true;
    }
    if (isYes(row.property_pool)) hasPool = true;
    if (isYes(row.property_sauna)) hasSauna = true;
    const adr = parsePositiveRate(row.rate_avg_retail_daily_rate);
    if (adr != null && (maxAdr == null || adr > maxAdr)) maxAdr = adr;
  }

  return {
    hasPrivateBathroom,
    hasAirConditioning,
    hasHotTub,
    hasRestaurantOrFood,
    hasPool,
    hasSauna,
    maxAdr,
  };
}

export function amenityPoints(agg: AggregatedPropertyForTier): number {
  let points = 0;
  if (agg.hasPrivateBathroom) points += 2;
  else points -= 2;
  if (agg.hasAirConditioning) points += 1;
  if (agg.hasHotTub) points += 2;
  if (agg.hasRestaurantOrFood) points += 2;
  if (agg.hasPool) points += 1;
  if (agg.hasSauna) points += 1;
  return points;
}

export function computeGlampingServiceTier(
  agg: AggregatedPropertyForTier
): TierComputationResult {
  const points = amenityPoints(agg);
  const adr = agg.maxAdr;

  if (adr != null && adr >= 800) {
    return {
      tier: 'luxury',
      points,
      rationale: `ADR $${adr} ≥ $800 (luxury fast-path)`,
    };
  }

  // Shared-bath, low-amenity inventory in the rustic ADR guidance band stays rustic
  // even when price clears the old $125 midscale floor.
  if (adr != null && adr < 150 && !agg.hasPrivateBathroom && points < 1) {
    return {
      tier: 'rustic',
      points,
      rationale: `ADR $${adr} < $150 with shared bath (score ${points})`,
    };
  }

  if (points >= 6 && adr != null && adr >= 500) {
    return {
      tier: 'luxury',
      points,
      rationale: `amenity score ${points}, ADR $${adr}`,
    };
  }

  if (points >= 4 && adr != null && adr >= 250) {
    return {
      tier: 'upscale',
      points,
      rationale: `amenity score ${points}, ADR $${adr}`,
    };
  }

  if (points >= 1 || (adr != null && adr >= 150)) {
    return {
      tier: 'midscale',
      points,
      rationale:
        adr != null
          ? `amenity score ${points}, ADR $${adr}`
          : `amenity score ${points}, no ADR`,
    };
  }

  // Low-amenity properties with ADR still in the rustic band stay rustic.
  if (adr != null && adr < 150) {
    return {
      tier: 'rustic',
      points,
      rationale: `ADR $${adr} < $150, amenity score ${points}`,
    };
  }

  // Price above the rustic band with weak amenity signals still lands midscale.
  if (adr != null && adr >= 150) {
    return {
      tier: 'midscale',
      points,
      rationale: `ADR $${adr} ≥ $150 midscale floor (amenity score ${points})`,
    };
  }

  return {
    tier: 'rustic',
    points,
    rationale: `default rustic (amenity score ${points})`,
  };
}

export function computeGlampingServiceTierFromRows(
  rows: GlampingServiceTierRowInput[]
): TierComputationResult {
  return computeGlampingServiceTier(aggregateRowsForTier(rows));
}

export function tierDisplayLabel(
  tier: string | null | undefined,
  style: 'full' | 'short' = 'full'
): string {
  if (!tier) return '';
  if (!(GLAMPING_SERVICE_TIERS as readonly string[]).includes(tier)) return tier;
  const key = tier as GlampingServiceTier;
  const labels =
    style === 'short' ? GLAMPING_SERVICE_TIER_SHORT_LABELS : GLAMPING_SERVICE_TIER_LABELS;
  return labels[key] ?? tier;
}

/** Public one-line blurb for market-overview classification filter (active tier). */
export function glampingServiceTierPublicSummary(tier: GlampingServiceTier): string {
  return GLAMPING_SERVICE_TIER_DEFINITIONS[tier].summary;
}

export function isGlampingServiceTier(value: string): value is GlampingServiceTier {
  return (GLAMPING_SERVICE_TIERS as readonly string[]).includes(value);
}

export function isGlampingServiceTierSource(
  value: string
): value is GlampingServiceTierSource {
  return value === 'auto' || value === 'manual';
}
