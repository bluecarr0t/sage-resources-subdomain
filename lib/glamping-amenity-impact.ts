import { isAffirmative } from '@/lib/market-report/normalize';

export const GLAMPING_MARKET_AMENITY_IMPACT_KEYS = [
  'unit_private_bathroom',
  'property_hot_tub',
  'property_food_on_site',
  'property_restaurant',
] as const;

export type GlampingMarketAmenityImpactKey =
  (typeof GLAMPING_MARKET_AMENITY_IMPACT_KEYS)[number];

export const GLAMPING_MARKET_AMENITY_IMPACT_LABELS: Record<
  GlampingMarketAmenityImpactKey,
  string
> = {
  unit_private_bathroom: 'Private Bathroom',
  property_hot_tub: 'Property Hot Tub',
  property_food_on_site: 'Food On Site',
  property_restaurant: 'Restaurant',
};

/** Hide rate delta when rated “with” unit weight is below this. */
export const AMENITY_IMPACT_MIN_UNITS = 30;

/** Show provisional (~) delta when rated “with” weight is in [this, MIN). */
export const AMENITY_IMPACT_PROVISIONAL_MIN_UNITS = 15;

export type AmenityImpactAggBucket = {
  rateTimesUnitsWith: number;
  unitsWith: number;
  rateTimesUnitsWithout: number;
  unitsWithout: number;
  /** Distinct `property_name` with ≥1 included unit/site that has the amenity. */
  propertyNamesWith: Set<string>;
};

export type GlampingAmenityImpactRow = {
  key: GlampingMarketAmenityImpactKey;
  label: string;
  avgWith: number | null;
  avgWithout: number | null;
  unitsWith: number;
  unitsWithout: number;
  /** Properties with ≥1 included unit/site that has the amenity. */
  propertiesWith: number;
  /**
   * Unit-weighted mean with − without; null when sample floor hides it or when
   * the observational delta is non-positive (inconclusive).
   */
  rateImpact: number | null;
  rateImpactProvisional: boolean;
  /**
   * True when with/without averages exist at/above the sample floor but
   * `with − without ≤ 0` (mix/confounding — do not publish as a rate premium).
   */
  rateImpactInconclusive: boolean;
};

function emptyAmenityImpactBucket(): AmenityImpactAggBucket {
  return {
    rateTimesUnitsWith: 0,
    unitsWith: 0,
    rateTimesUnitsWithout: 0,
    unitsWithout: 0,
    propertyNamesWith: new Set(),
  };
}

export function emptyAmenityImpactBuckets(): Record<
  GlampingMarketAmenityImpactKey,
  AmenityImpactAggBucket
> {
  return {
    unit_private_bathroom: emptyAmenityImpactBucket(),
    property_hot_tub: emptyAmenityImpactBucket(),
    property_food_on_site: emptyAmenityImpactBucket(),
    property_restaurant: emptyAmenityImpactBucket(),
  };
}

/**
 * Fold one open rated inventory row into with/without amenity buckets
 * (inventory-weighted, matching ARDR drivers).
 *
 * @param keys — when set, only fold those amenity keys (others unchanged).
 * @param propertyName — when set, counts toward `propertiesWith` for affirmative keys.
 */
export function foldAmenityImpactRow(
  buckets: Record<GlampingMarketAmenityImpactKey, AmenityImpactAggBucket>,
  raw: Partial<Record<GlampingMarketAmenityImpactKey, unknown>>,
  unitWeight: number,
  adr: number,
  keys: readonly GlampingMarketAmenityImpactKey[] = GLAMPING_MARKET_AMENITY_IMPACT_KEYS,
  propertyName?: string | null
): void {
  const w = unitWeight > 0 ? unitWeight : 1;
  const name = propertyName?.trim() ?? '';
  for (const key of keys) {
    const b = buckets[key];
    if (isAffirmative(raw[key])) {
      b.rateTimesUnitsWith += adr * w;
      b.unitsWith += w;
      if (name) b.propertyNamesWith.add(name);
    } else {
      b.rateTimesUnitsWithout += adr * w;
      b.unitsWithout += w;
    }
  }
}

export function finalizeAmenityImpactBuckets(
  buckets: Record<GlampingMarketAmenityImpactKey, AmenityImpactAggBucket>
): GlampingAmenityImpactRow[] {
  return GLAMPING_MARKET_AMENITY_IMPACT_KEYS.map((key) => {
    const b = buckets[key];
    const avgWith = b.unitsWith > 0 ? b.rateTimesUnitsWith / b.unitsWith : null;
    const avgWithout =
      b.unitsWithout > 0 ? b.rateTimesUnitsWithout / b.unitsWithout : null;

    let rateImpact: number | null = null;
    let rateImpactProvisional = false;
    let rateImpactInconclusive = false;
    if (avgWith != null && avgWithout != null) {
      if (b.unitsWith >= AMENITY_IMPACT_MIN_UNITS) {
        rateImpact = Math.round(avgWith - avgWithout);
      } else if (b.unitsWith >= AMENITY_IMPACT_PROVISIONAL_MIN_UNITS) {
        rateImpact = Math.round(avgWith - avgWithout);
        rateImpactProvisional = true;
      }
      if (rateImpact != null && rateImpact <= 0) {
        rateImpact = null;
        rateImpactProvisional = false;
        rateImpactInconclusive = true;
      }
    }

    return {
      key,
      label: GLAMPING_MARKET_AMENITY_IMPACT_LABELS[key],
      avgWith: avgWith != null ? Math.round(avgWith) : null,
      avgWithout: avgWithout != null ? Math.round(avgWithout) : null,
      unitsWith: Math.round(b.unitsWith),
      unitsWithout: Math.round(b.unitsWithout),
      propertiesWith: b.propertyNamesWith.size,
      rateImpact,
      rateImpactProvisional,
      rateImpactInconclusive,
    };
  });
}
