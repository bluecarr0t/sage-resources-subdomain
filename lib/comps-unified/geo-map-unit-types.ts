import { normalizeGlampingUnitTypeForDisplay } from '@/lib/glamping-unit-type-normalize';

/** Record separator for unit_type lists in geo map tuples (unlikely in labels). */
export const GEO_MAP_UNIT_TYPES_SEP = '\x1e';

export function encodeGeoMapUnitTypes(types: string[]): string | null {
  if (types.length === 0) return null;
  return types.join(GEO_MAP_UNIT_TYPES_SEP);
}

export function decodeGeoMapUnitTypes(encoded: string | null | undefined): string[] {
  if (!encoded?.trim()) return [];
  return encoded.split(GEO_MAP_UNIT_TYPES_SEP).map((s) => s.trim()).filter(Boolean);
}

/** Comma-separated display labels (normalized), deduped in encounter order. */
export function formatGeoMapUnitTypesDisplay(types: string[]): string | null {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const raw of types) {
    const label = normalizeGlampingUnitTypeForDisplay(raw)?.trim();
    if (!label || label === '-') continue;
    if (seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }
  return labels.length > 0 ? labels.join(', ') : null;
}
