/**
 * Helpers for grouping `all_glamping_properties` rows that represent one logical
 * property (multiple unit/site lines). Used by the Sage Data admin API.
 */

export const MAX_GLAMPING_SIBLING_ROWS = 50;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type SiblingFilterSpec =
  | { mode: 'property_id'; propertyId: string }
  | { mode: 'slug'; slug: string }
  | {
      mode: 'name_city_state';
      propertyName: string;
      city: string | null;
      state: string | null;
    };

/** Canonical grouping key when `property_id` is populated on the anchor row. */
export function normalizePropertyIdForSiblings(propertyId: unknown): string | null {
  if (typeof propertyId !== 'string') return null;
  const t = propertyId.trim();
  if (!UUID_RE.test(t)) return null;
  return t;
}

export function normalizeSlugForSiblings(slug: unknown): string | null {
  if (typeof slug !== 'string') return null;
  const t = slug.trim();
  return t.length > 0 ? t : null;
}

/**
 * Prefer `property_id` when set (canonical). Otherwise non-empty `slug`, else
 * exact `(property_name, city, state)` (null/empty city or state matches null or empty DB values).
 */
export function siblingFilterSpecFromAnchor(
  anchor: Record<string, unknown>
): SiblingFilterSpec {
  const propertyIdNorm = normalizePropertyIdForSiblings(anchor.property_id);
  if (propertyIdNorm) return { mode: 'property_id', propertyId: propertyIdNorm };

  const slugNorm = normalizeSlugForSiblings(anchor.slug);
  if (slugNorm) return { mode: 'slug', slug: slugNorm };

  const propertyName = String(anchor.property_name ?? '').trim();
  const cityRaw = anchor.city;
  const stateRaw = anchor.state;
  const city =
    cityRaw == null || (typeof cityRaw === 'string' && cityRaw.trim() === '')
      ? null
      : String(cityRaw).trim();
  const state =
    stateRaw == null || (typeof stateRaw === 'string' && stateRaw.trim() === '')
      ? null
      : String(stateRaw).trim();

  return {
    mode: 'name_city_state',
    propertyName,
    city,
    state,
  };
}

export function sortSiblingPropertyRows<T extends Record<string, unknown>>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const an = String(a.site_name ?? '');
    const bn = String(b.site_name ?? '');
    if (an !== bn) return an.localeCompare(bn, undefined, { sensitivity: 'base' });
    return String(a.id ?? '').localeCompare(String(b.id ?? ''), undefined, {
      numeric: true,
    });
  });
}

export function idsBelongToSiblingGroup(
  requestedIds: string[],
  siblingRows: Record<string, unknown>[]
): boolean {
  if (requestedIds.length === 0) return false;
  const allowed = new Set(siblingRows.map((r) => String(r.id)));
  return requestedIds.every((id) => allowed.has(id));
}
