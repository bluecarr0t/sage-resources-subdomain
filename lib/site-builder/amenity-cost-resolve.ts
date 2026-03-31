import { effectiveAmenityCostPerUnit } from '@/lib/site-builder/effective-amenity-cost';

/** Upper bound for a single amenity override (avoids abuse / overflow). */
export const SITE_BUILDER_AMENITY_OVERRIDE_MAX = 500_000;

/**
 * Unit cost for an amenity: explicit author override wins; otherwise DB value with slug-specific guards.
 */
export function resolveAmenityUnitCost(
  slug: string,
  dbCostPerUnit: unknown,
  overrides?: Record<string, number>
): number {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, slug)) {
    const raw = overrides[slug];
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      if (raw < 0) return 0;
      if (raw > SITE_BUILDER_AMENITY_OVERRIDE_MAX) return SITE_BUILDER_AMENITY_OVERRIDE_MAX;
      return raw;
    }
  }
  return effectiveAmenityCostPerUnit(slug, dbCostPerUnit);
}

function parseOverrideRecord(raw: unknown): Record<string, number> | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (typeof key !== 'string' || !key.trim()) continue;
    const slug = key.trim();
    const n = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(n)) continue;
    if (n < 0 || n > SITE_BUILDER_AMENITY_OVERRIDE_MAX) continue;
    out[slug] = n;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseAmenityCostOverridesFromBody(body: unknown): Record<string, number> | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const raw = (body as { amenityCostOverrides?: unknown }).amenityCostOverrides;
  return parseOverrideRecord(raw);
}

/**
 * Parallel array to `configs` (same length). When valid, the API uses only these
 * per-row maps (legacy `amenityCostOverrides` is ignored).
 */
export function parseAmenityCostOverridesPerConfigFromBody(
  body: unknown,
  expectedLength: number
): Record<string, number>[] | undefined {
  if (!body || typeof body !== 'object' || expectedLength < 0) return undefined;
  const raw = (body as { amenityCostOverridesPerConfig?: unknown }).amenityCostOverridesPerConfig;
  if (!Array.isArray(raw) || raw.length !== expectedLength) return undefined;
  const out: Record<string, number>[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object' || Array.isArray(item)) return undefined;
    const row: Record<string, number> = {};
    for (const [key, val] of Object.entries(item)) {
      if (typeof key !== 'string' || !key.trim()) continue;
      const slug = key.trim();
      const n = typeof val === 'number' ? val : Number(val);
      if (!Number.isFinite(n)) continue;
      if (n < 0 || n > SITE_BUILDER_AMENITY_OVERRIDE_MAX) continue;
      row[slug] = n;
    }
    out.push(row);
  }
  return out;
}

export interface SiteBuilderAmenityOverridePickOptions {
  amenityCostOverrides?: Record<string, number>;
  amenityCostOverridesPerConfig?: Record<string, number>[];
}

/** Effective override map for one config row (index-aligned with configs array). */
export function pickAmenityOverridesForConfig(
  options: SiteBuilderAmenityOverridePickOptions | undefined,
  configIndex: number
): Record<string, number> | undefined {
  if (!options) return undefined;
  const per = options.amenityCostOverridesPerConfig;
  if (per && configIndex >= 0 && configIndex < per.length) {
    const row = per[configIndex];
    return row && Object.keys(row).length > 0 ? row : undefined;
  }
  return options.amenityCostOverrides;
}
