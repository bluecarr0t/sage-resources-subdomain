/**
 * Build Google Maps embed iframe URLs for property listing pages.
 * Prefers Maps Embed API when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set.
 */

export type PropertyMapEmbedParams = {
  lat?: number | null;
  lon?: number | null;
  propertyName?: string | null;
  addressLine?: string | null;
  /** Full place string (used when lat/lon missing) */
  placeQuery?: string | null;
  zoom?: number;
};

function hasValidCoordinates(lat: number | null | undefined, lon: number | null | undefined): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat! < -90 || lat! > 90 || lon! < -180 || lon! > 180) return false;
  return true;
}

function buildQueryLabel(params: PropertyMapEmbedParams): string | null {
  if (params.placeQuery?.trim()) return params.placeQuery.trim();

  const parts: string[] = [];
  if (params.propertyName?.trim()) parts.push(params.propertyName.trim());
  if (params.addressLine?.trim()) parts.push(params.addressLine.trim());
  if (parts.length > 0) return parts.join(', ');

  if (hasValidCoordinates(params.lat, params.lon)) {
    return `${params.lat},${params.lon}`;
  }

  return null;
}

/** Public Google Maps URL (coordinates or place search). */
export function buildPropertyGoogleMapsUrl(
  coords: { lat: number; lon: number; zoom?: number } | { placeQuery: string }
): string {
  if ('placeQuery' in coords) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords.placeQuery)}`;
  }
  const zoom = coords.zoom ?? 15;
  return `https://www.google.com/maps?q=${coords.lat},${coords.lon}&z=${zoom}`;
}

/**
 * iframe src for an embedded map. Works with coordinates and/or a place query
 * (needed when DB lat/lon are empty).
 */
export function buildPropertyMapEmbedUrl(params: PropertyMapEmbedParams): string | null {
  const label = buildQueryLabel(params);
  const hasCoords = hasValidCoordinates(params.lat, params.lon);
  if (!label && !hasCoords) return null;

  const zoom = params.zoom ?? 14;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const q = encodeURIComponent(label ?? `${params.lat},${params.lon}`);

  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${q}&zoom=${zoom}&maptype=roadmap`;
  }

  if (hasCoords) {
    return `https://www.google.com/maps?q=${params.lat},${params.lon}&z=${zoom}&output=embed`;
  }

  return `https://www.google.com/maps?q=${q}&output=embed`;
}
