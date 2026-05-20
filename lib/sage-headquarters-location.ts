import {
  buildPropertyGoogleMapsUrl,
  buildPropertyMapEmbedUrl,
} from '@/lib/property-map-embed-url';

/** Sage Outdoor Advisory HQ — NAP + map embed (footer, schema). */
export const SAGE_HQ_BUSINESS_NAME = 'Sage Outdoor Advisory';

export const SAGE_HQ_STREET_ADDRESS = '5113 South Harper, Suite 2C – #4001';

export const SAGE_HQ_ADDRESS_LINE = `${SAGE_HQ_STREET_ADDRESS}, Chicago, Illinois 60615`;

export const SAGE_HQ_PLACE_QUERY = `${SAGE_HQ_BUSINESS_NAME}, ${SAGE_HQ_STREET_ADDRESS}, Chicago, IL 60615`;

/** Matches `generateLocalBusinessSchema` geo coordinates. */
export const SAGE_HQ_LAT = 41.7897;

export const SAGE_HQ_LON = -87.5994;

export const SAGE_HQ_MAP_ZOOM = 15;

/**
 * Canonical Google Maps / Business Profile link.
 * Override with NEXT_PUBLIC_SAGE_GOOGLE_MAPS_URL when you have a stable place or CID URL.
 */
export function getSageHqGoogleMapsUrl(): string {
  const override = process.env.NEXT_PUBLIC_SAGE_GOOGLE_MAPS_URL?.trim();
  if (override) return override;

  return buildPropertyGoogleMapsUrl({ placeQuery: SAGE_HQ_PLACE_QUERY });
}

export function getSageHqMapEmbedUrl(): string | null {
  return buildPropertyMapEmbedUrl({
    lat: SAGE_HQ_LAT,
    lon: SAGE_HQ_LON,
    propertyName: SAGE_HQ_BUSINESS_NAME,
    addressLine: SAGE_HQ_ADDRESS_LINE,
    placeQuery: SAGE_HQ_PLACE_QUERY,
    zoom: SAGE_HQ_MAP_ZOOM,
  });
}
