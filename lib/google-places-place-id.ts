/**
 * Normalize optional Place IDs for Places API (New).
 * Stored rows typically use the bare ID (e.g. ChIJ…); the JS client expects resource-like IDs.
 */

export function normalizePlacesApiPlaceId(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t || t.length > 280) return null;

  const withoutPrefix = t.startsWith('places/') ? t.slice('places/'.length) : t;
  const idPart = withoutPrefix.trim();
  if (!idPart || idPart.length > 270) return null;

  if (!/^[A-Za-z0-9_-]+$/.test(idPart)) return null;

  return `places/${idPart}`;
}
