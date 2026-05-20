'use client';

import { buildPropertyGoogleMapsUrl, buildPropertyMapEmbedUrl } from '@/lib/property-map-embed-url';

export type PropertyLocationMapEmbedProps = {
  lat?: number | null;
  lon?: number | null;
  propertyName: string;
  addressLine?: string | null;
  placeQuery?: string | null;
  /** Locale-aware link to the Sage interactive map */
  sageMapHref: string;
  zoom?: number;
  /** Compact square embed for property sidebar */
  variant?: 'default' | 'sidebar';
};

export default function PropertyLocationMapEmbed({
  lat,
  lon,
  propertyName,
  addressLine,
  placeQuery,
  sageMapHref,
  zoom = 14,
  variant = 'default',
}: PropertyLocationMapEmbedProps) {
  const embedSrc = buildPropertyMapEmbedUrl({
    lat,
    lon,
    propertyName,
    addressLine,
    placeQuery,
    zoom,
  });

  if (!embedSrc) return null;

  const hasCoords =
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon);

  const googleMapsUrl = hasCoords
    ? buildPropertyGoogleMapsUrl({ lat, lon, zoom })
    : buildPropertyGoogleMapsUrl({
        placeQuery: placeQuery?.trim() || [propertyName, addressLine].filter(Boolean).join(', '),
      });

  const iframeTitle = addressLine?.trim()
    ? `Map showing ${propertyName} at ${addressLine}`
    : `Map showing location of ${propertyName}`;

  if (variant === 'sidebar') {
    return (
      <div className="mt-4 w-full max-w-[16rem]" aria-labelledby="property-location-map-heading">
        <h2 id="property-location-map-heading" className="sr-only">
          Location map
        </h2>
        <div className="overflow-hidden border border-sage-200/90 bg-neutral-100/30">
          <iframe
            title={iframeTitle}
            src={embedSrc}
            className="aspect-square w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <p className="mt-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-light uppercase tracking-wider text-neutral-500 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-800"
          >
            Open in Google Maps
          </a>
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="property-location-map-heading" className="mt-8">
      <h2 id="property-location-map-heading" className="sr-only">
        Location map
      </h2>
      {addressLine?.trim() ? (
        <p className="mb-3 text-sm font-light text-neutral-600">{addressLine}</p>
      ) : null}
      <div className="overflow-hidden border border-sage-200/90 bg-neutral-100/30">
        <iframe
          title={iframeTitle}
          src={embedSrc}
          className="aspect-[4/3] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <ul className="mt-3 space-y-2 text-[11px] font-light uppercase tracking-wider text-neutral-500">
        <li>
          <a
            href={sageMapHref}
            className="text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900"
          >
            View on Sage map
          </a>
        </li>
        <li>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-700 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900"
          >
            Open in Google Maps
          </a>
        </li>
      </ul>
    </section>
  );
}
