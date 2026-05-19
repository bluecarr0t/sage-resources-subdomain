/**
 * Canonical grouping key for one logical property in the Sage Data admin list.
 * Matches `all_glamping_properties_list_anchors` view logic.
 */

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
