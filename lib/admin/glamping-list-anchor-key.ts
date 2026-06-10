/**
 * Canonical grouping key for one logical property in the Sage Data admin list.
 * Matches `all_sage_data_list_anchors` view logic.
 */

function legacyPropertyListGroupKey(row: {
  property_name?: unknown;
  city?: unknown;
  state?: unknown;
}): string {
  const name = String(row.property_name ?? '')
    .trim()
    .toLowerCase();
  const city = String(row.city ?? '')
    .trim()
    .toLowerCase();
  const state = String(row.state ?? '')
    .trim()
    .toLowerCase();
  return `legacy:${name}|${city}|${state}`;
}

export function propertyListGroupKey(row: {
  property_id?: unknown;
  slug?: unknown;
  property_name?: unknown;
  city?: unknown;
  state?: unknown;
}): string {
  const pid = row.property_id;
  if (typeof pid === 'string' && pid.trim().length > 0) {
    return `pid:${pid.trim()}`;
  }
  const slug = typeof row.slug === 'string' ? row.slug.trim() : '';
  if (slug) return `slug:${slug.toLowerCase()}`;

  return legacyPropertyListGroupKey(row);
}

/**
 * Group key for brand pages and portfolio counts: one location per name+city+state.
 * Ignores unit-level `property_id` / `slug` rows (e.g. Timberline Glamping at …).
 */
export function propertyOutpostGroupKey(row: {
  property_name?: unknown;
  city?: unknown;
  state?: unknown;
}): string {
  return legacyPropertyListGroupKey(row);
}

/** Keep lowest `id` row per logical property (anchor row). */
export function dedupeRowsToPropertyAnchors<T extends Record<string, unknown>>(
  rows: T[]
): T[] {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const key = propertyListGroupKey(row);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const rowId = Number(row.id);
    const existingId = Number(existing.id);
    if (Number.isFinite(rowId) && Number.isFinite(existingId) && rowId < existingId) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()];
}

/** One anchor per outpost/location (name + city + state), lowest `id` wins. */
export function dedupeRowsToOutpostAnchors<T extends Record<string, unknown>>(
  rows: T[]
): T[] {
  const byOutpost = new Map<string, T>();
  for (const row of rows) {
    const key = propertyOutpostGroupKey(row);
    const existing = byOutpost.get(key);
    if (!existing) {
      byOutpost.set(key, row);
      continue;
    }
    const rowId = Number(row.id);
    const existingId = Number(existing.id);
    if (Number.isFinite(rowId) && Number.isFinite(existingId) && rowId < existingId) {
      byOutpost.set(key, row);
    }
  }
  return [...byOutpost.values()];
}
