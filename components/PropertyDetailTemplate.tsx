'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SageProperty } from '@/lib/types/sage';
import { parseCoordinates } from '@/lib/types/sage';
import RelatedPropertiesCarousel from '@/components/RelatedPropertiesCarousel';
import FloatingHeader from '@/components/FloatingHeader';
import {
  EditorialMetricLeader,
  EditorialPageShell,
  EDITORIAL_H1_CLASS,
  EDITORIAL_METRIC_VALUE_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { createLocaleLinks } from '@/lib/locale-links';
import { formatGlampingIsOpenPublicLabel } from '@/lib/glamping-is-open';
import { getPropertyOtaListings } from '@/lib/property-ota-listings';
import PropertyLocationMapEmbed from '@/components/PropertyLocationMapEmbed';
import { buildPropertyMapEmbedUrl } from '@/lib/property-map-embed-url';
import { buildPropertyMapQueryLabel } from '@/lib/property-map-location';
import type { GlampingPropertyPublicImages } from '@/lib/fetch-glamping-property-public-images';
import { GooglePlacesData } from '@/lib/google-places';
import { useDeferredGooglePlacesFetch } from '@/lib/hooks/useDeferredGooglePlacesFetch';

interface PropertyDetailTemplateProps {
  properties: SageProperty[];
  slug: string;
  propertyName: string;
  nearbyProperties?: SageProperty[];
  googlePlacesData?: GooglePlacesData | null;
  /** Skips Places Text Search when set (from DB `google_place_id`) */
  googlePlaceId?: string | null;
  /** When true, do not fetch or display Google ratings, reviews, or photos */
  skipGooglePlaces?: boolean;
  /** Sage Storage URLs (e.g. Hipcamp-sourced); preferred over Google Places photos */
  propertyImages?: GlampingPropertyPublicImages;
  locale?: string;
  /** Visible FAQ copy aligned with JSON-LD (buildPropertyFaqEntries) */
  propertyFaqs?: Array<{ question: string; answer: string }>;
  /** Server-resolved coordinates when DB lat/lon are empty */
  mapCoordinates?: [number, number] | null;
  /** Linked public brand page when property has brand_id */
  brandPage?: { slug: string; displayName: string } | null;
}

function getGooglePhotoUrl(
  photo: { name: string; widthPx?: number; heightPx?: number },
  maxWidth: number = 1200,
  maxHeight: number = 800
): string {
  if (!photo?.name) return '';
  const width = photo.widthPx ? Math.min(photo.widthPx, maxWidth) : maxWidth;
  const height = photo.heightPx ? Math.min(photo.heightPx, maxHeight) : maxHeight;
  return `/api/google-places-photo?photoName=${encodeURIComponent(photo.name)}&maxWidthPx=${width}&maxHeightPx=${height}`;
}

function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/^\+1\s*/, '').replace(/[\s-]/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)})-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatUsd(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatInt(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
}

function groupProperties(properties: SageProperty[]) {
  const grouped: Record<string, SageProperty[]> = {};
  properties.forEach((prop) => {
    const locationKey = `${prop.city || 'Unknown'}, ${prop.state || 'Unknown'}`;
    if (!grouped[locationKey]) grouped[locationKey] = [];
    grouped[locationKey].push(prop);
  });
  return grouped;
}

const EDITORIAL_LINK_CLASS =
  'text-neutral-700 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-900 hover:decoration-neutral-500';

/** Main column padding when the floating site header is shown above editorial content */
const EDITORIAL_MAIN_WITH_HEADER_CLASS =
  'relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-x-visible px-6 pt-32 pb-24 sm:pt-36 sm:pb-32 md:pt-40';

export default function PropertyDetailTemplate({
  properties,
  propertyName,
  nearbyProperties = [],
  googlePlacesData: initialGooglePlacesData,
  googlePlaceId,
  skipGooglePlaces = false,
  propertyImages,
  locale = 'en',
  propertyFaqs = [],
  mapCoordinates: mapCoordinatesProp = null,
  brandPage = null,
}: PropertyDetailTemplateProps) {
  const firstProperty = properties[0];
  const links = useMemo(() => createLocaleLinks(locale), [locale]);
  const otaListings = useMemo(() => getPropertyOtaListings(properties), [properties]);
  const hipcampListingUrl = useMemo(
    () => otaListings.find((l) => l.platform === 'hipcamp')?.url ?? null,
    [otaListings]
  );

  const sagePhotoUrls = useMemo(() => {
    const urls: string[] = [];
    if (propertyImages?.heroUrl) urls.push(propertyImages.heroUrl);
    for (const u of propertyImages?.galleryUrls ?? []) {
      if (u && !urls.includes(u)) urls.push(u);
    }
    return urls;
  }, [propertyImages]);

  const useSagePhotos = sagePhotoUrls.length > 0;

  const deferredPlacesParams = useMemo(
    () =>
      skipGooglePlaces || useSagePhotos
        ? null
        : {
            propertyName,
            city: firstProperty.city ?? null,
            state: firstProperty.state ?? null,
            address: firstProperty.address ?? null,
            placeId: googlePlaceId ?? null,
          },
    [
      skipGooglePlaces,
      useSagePhotos,
      propertyName,
      firstProperty.city,
      firstProperty.state,
      firstProperty.address,
      googlePlaceId,
    ]
  );

  const { googlePlacesData, phase: placesFetchPhase } = useDeferredGooglePlacesFetch(
    skipGooglePlaces ? null : (initialGooglePlacesData ?? undefined),
    deferredPlacesParams
  );

  const googlePhotoUrls =
    !skipGooglePlaces && placesFetchPhase === 'complete' && googlePlacesData?.photos?.length
      ? googlePlacesData.photos
          .map((p) => getGooglePhotoUrl(p, 1200, 800))
          .filter((url) => url.length > 0)
      : [];

  const galleryUrls = useSagePhotos ? sagePhotoUrls : googlePhotoUrls;
  const showPhotoSkeleton = !useSagePhotos && !skipGooglePlaces && placesFetchPhase !== 'complete';
  const showPhotos = galleryUrls.length > 0;
  const showGoogleReviews =
    !skipGooglePlaces && !!(googlePlacesData?.rating || googlePlacesData?.userRatingCount);

  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [propertyName, galleryUrls.length, placesFetchPhase]);

  const handlePhotoKeyDown = (e: React.KeyboardEvent) => {
    if (galleryUrls.length <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : galleryUrls.length - 1));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setCurrentPhotoIndex((prev) => (prev < galleryUrls.length - 1 ? prev + 1 : 0));
    }
  };

  const locationParts: string[] = [];
  if (firstProperty.city) locationParts.push(firstProperty.city);
  if (firstProperty.state) locationParts.push(firstProperty.state);
  if (firstProperty.country) locationParts.push(firstProperty.country);
  const location = locationParts.join(', ');

  const addressParts: string[] = [];
  if (firstProperty.address) addressParts.push(firstProperty.address);
  if (firstProperty.city) addressParts.push(firstProperty.city);
  if (firstProperty.state) addressParts.push(firstProperty.state);
  if (firstProperty.zip_code) addressParts.push(firstProperty.zip_code);
  const fullAddress = addressParts.join(', ');

  const groupedProperties = groupProperties(properties);
  const websiteUrl = googlePlacesData?.websiteUri || firstProperty.url;
  const coordinates =
    mapCoordinatesProp ?? parseCoordinates(firstProperty.lat, firstProperty.lon);
  const mapPlaceQuery = useMemo(
    () => buildPropertyMapQueryLabel(firstProperty),
    [firstProperty]
  );
  const mapAddressLine =
    fullAddress.trim() ||
    [propertyName, location].filter(Boolean).join(', ') ||
    null;
  const mapLink = coordinates
    ? `${links.map}?lat=${coordinates[0]}&lon=${coordinates[1]}&zoom=15`
    : links.map;
  const showLocationMap = useMemo(
    () =>
      buildPropertyMapEmbedUrl({
        lat: coordinates?.[0],
        lon: coordinates?.[1],
        propertyName,
        addressLine: mapAddressLine,
        placeQuery: mapPlaceQuery,
      }) != null,
    [coordinates, propertyName, mapAddressLine, mapPlaceQuery]
  );

  const unitTypes = Array.from(
    new Set(
      properties
        .map((p) => p.unit_type)
        .filter((type): type is string => type !== null && type !== undefined && type.trim() !== '')
    )
  ).sort();

  const hasMultipleLocations = Object.keys(groupedProperties).length > 1;
  const avgRate = firstProperty.rate_avg_retail_daily_rate;

  return (
    <EditorialPageShell>
      <FloatingHeader locale={locale} showFullNav showSpacer={false} />
      <main className={EDITORIAL_MAIN_WITH_HEADER_CLASS}>
        <nav
          className="mb-10 text-[11px] font-light uppercase tracking-widest text-neutral-500"
          aria-label="Breadcrumb"
        >
          <Link href={links.map} className="transition-colors hover:text-neutral-900">
            Map
          </Link>
          <span className="mx-2 text-neutral-400" aria-hidden>
            /
          </span>
          <span className="text-neutral-700">{propertyName}</span>
        </nav>

        <h1 className={EDITORIAL_H1_CLASS}>{propertyName}</h1>

        {location ? (
          <p className="mt-3 text-sm font-light leading-relaxed text-neutral-600">{location}</p>
        ) : null}

        {firstProperty.address && fullAddress ? (
          <p className="mt-1 max-w-xl text-[11px] font-light leading-relaxed text-neutral-500">
            {fullAddress}
          </p>
        ) : null}

        {showGoogleReviews && (
          <p className="mt-3 text-[11px] font-light tabular-nums text-neutral-500">
            {googlePlacesData?.rating ? (
              <span className="text-neutral-700">{googlePlacesData.rating.toFixed(1)}</span>
            ) : null}
            {googlePlacesData?.rating && googlePlacesData?.userRatingCount ? (
              <span className="text-neutral-400"> · </span>
            ) : null}
            {googlePlacesData?.userRatingCount ? (
              <span>
                {googlePlacesData.userRatingCount.toLocaleString()}{' '}
                {googlePlacesData.userRatingCount === 1 ? 'review' : 'reviews'} on Google
              </span>
            ) : null}
          </p>
        )}

        <section className="mt-10" aria-label={`Photos of ${propertyName}`}>
          {showPhotos ? (
            <div
              className="relative aspect-[16/10] w-full overflow-hidden border border-sage-200/80 bg-neutral-100/60"
              role="region"
              aria-label={`Photo gallery for ${propertyName}`}
              aria-live="polite"
              id="property-photos"
              tabIndex={galleryUrls.length > 1 ? 0 : -1}
              onKeyDown={handlePhotoKeyDown}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={galleryUrls[currentPhotoIndex]}
                alt={`${propertyName} — photo ${currentPhotoIndex + 1} of ${galleryUrls.length}`}
                className="h-full w-full object-cover"
                loading={currentPhotoIndex === 0 ? 'eager' : 'lazy'}
                fetchPriority={currentPhotoIndex === 0 ? 'high' : 'auto'}
                width={1200}
                height={800}
                decoding="async"
              />
              {galleryUrls.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev > 0 ? prev - 1 : galleryUrls.length - 1
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 border border-neutral-200/90 bg-[#faf9f3]/90 px-2 py-2 text-neutral-700 transition-colors hover:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    aria-label="Previous photo"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPhotoIndex((prev) =>
                        prev < galleryUrls.length - 1 ? prev + 1 : 0
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 border border-neutral-200/90 bg-[#faf9f3]/90 px-2 py-2 text-neutral-700 transition-colors hover:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-400"
                    aria-label="Next photo"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div
                    className="absolute bottom-3 right-3 bg-[#faf9f3]/90 px-2 py-0.5 text-[10px] tabular-nums text-neutral-600"
                    role="status"
                    aria-live="polite"
                  >
                    {currentPhotoIndex + 1} / {galleryUrls.length}
                  </div>
                </>
              )}
            </div>
          ) : showPhotoSkeleton ? (
            <div
              className="aspect-[16/10] w-full animate-pulse border border-sage-200/60 bg-neutral-200/40"
              aria-busy="true"
              aria-label={`Loading photos for ${propertyName}`}
            />
          ) : (
            <div
              className="flex aspect-[16/10] w-full items-center justify-center border border-dashed border-neutral-300 bg-neutral-100/40 text-xs font-light text-neutral-500"
              role="img"
              aria-label={`No photos available for ${propertyName}`}
            >
              No photos available
            </div>
          )}
          {useSagePhotos && hipcampListingUrl ? (
            <p className="mt-2 text-[10px] font-light text-neutral-500">
              Photos from{' '}
              <a
                href={hipcampListingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-800"
              >
                Hipcamp listing
              </a>
            </p>
          ) : null}
        </section>

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:items-start lg:gap-x-16">
          <dl className="space-y-12">
            {avgRate != null && avgRate !== '' ? (
              <div>
                <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Avg. retail daily rate</dt>
                <dd className={EDITORIAL_METRIC_VALUE_CLASS}>{formatUsd(avgRate)}</dd>
                <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-neutral-500">
                  Published nightly rate from Sage research; confirm on the operator&apos;s site before booking.
                </p>
              </div>
            ) : null}

            {unitTypes.length > 0 ? (
              <div>
                <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Unit types</dt>
                <dd className="mt-3">
                  <ul className="space-y-2 border-l border-sage-200 pl-4 text-sm font-light text-neutral-700">
                    {unitTypes.map((type) => (
                      <li key={type}>{type}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}

            {firstProperty.description?.trim() ? (
              <div>
                <dt className={EDITORIAL_SECTION_LABEL_CLASS}>About</dt>
                <dd className="mt-4 max-w-prose text-sm font-light leading-relaxed text-neutral-700 whitespace-pre-line">
                  {firstProperty.description}
                </dd>
              </div>
            ) : null}

            <div>
              <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Property details</dt>
              <dd className="mt-3">
                <ul className="space-y-2 border-l border-sage-200 pl-4 text-sm font-light">
                  {brandPage ? (
                    <li>
                      <span className="text-neutral-500">Brand</span>{' '}
                      <Link href={links.brand(brandPage.slug)} className={EDITORIAL_LINK_CLASS}>
                        {brandPage.displayName}
                      </Link>
                    </li>
                  ) : null}
                  {firstProperty.is_open ? (
                    <li>
                      <span className="text-neutral-500">Status</span>{' '}
                      <span className="text-neutral-800">
                        {formatGlampingIsOpenPublicLabel(firstProperty.is_open)}
                      </span>
                    </li>
                  ) : null}
                  {unitTypes.length > 0 ? (
                    <li>
                      <span className="text-neutral-500">Unit types</span>{' '}
                      <span className="text-neutral-800">{unitTypes.join(', ')}</span>
                    </li>
                  ) : null}
                  {otaListings.length > 0 ? (
                    <li>
                      <span className="text-neutral-500">Third-Party Listing Platforms</span>
                      <ul className="mt-1.5 space-y-2 pl-0">
                        {otaListings.map((listing) => (
                          <li key={listing.platform}>
                            <a
                              href={listing.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={EDITORIAL_LINK_CLASS}
                            >
                              {listing.label}
                            </a>
                            {listing.siteNames && listing.siteNames.length > 0 ? (
                              <span className="mt-0.5 block text-xs font-light text-neutral-500">
                                {listing.siteNames.join(' · ')}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ) : null}
                  {firstProperty.property_total_sites != null &&
                  firstProperty.property_total_sites !== '' ? (
                    <li>
                      <span className="text-neutral-500">Total sites</span>{' '}
                      <span className="tabular-nums text-neutral-800">
                        {formatInt(firstProperty.property_total_sites)}
                      </span>
                    </li>
                  ) : null}
                  {firstProperty.glamping_service_tier ? (
                    <li>
                      <span className="text-neutral-500">Service tier</span>{' '}
                      <span className="capitalize text-neutral-800">
                        {firstProperty.glamping_service_tier}
                      </span>
                    </li>
                  ) : null}
                  {firstProperty.year_site_opened ? (
                    <li>
                      <span className="text-neutral-500">Year opened</span>{' '}
                      <span className="tabular-nums text-neutral-800">
                        {firstProperty.year_site_opened}
                      </span>
                    </li>
                  ) : null}
                  {firstProperty.operating_season_months ? (
                    <li>
                      <span className="text-neutral-500">Operating season</span>{' '}
                      <span className="text-neutral-800">{firstProperty.operating_season_months}</span>
                    </li>
                  ) : null}
                  {firstProperty.minimum_nights ? (
                    <li>
                      <span className="text-neutral-500">Minimum nights</span>{' '}
                      <span className="tabular-nums text-neutral-800">{firstProperty.minimum_nights}</span>
                    </li>
                  ) : null}
                </ul>
              </dd>
            </div>

            {propertyFaqs.length > 0 ? (
              <div aria-labelledby="property-faq-heading">
                <dt id="property-faq-heading" className={EDITORIAL_SECTION_LABEL_CLASS}>
                  Questions
                </dt>
                <dd className="mt-6 space-y-8">
                  {propertyFaqs.map((item) => (
                    <div key={item.question}>
                      <p className="text-sm font-medium text-neutral-800">{item.question}</p>
                      <p className="mt-2 text-sm font-light leading-relaxed text-neutral-600">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>

          <aside className="space-y-10 lg:border-l lg:border-sage-200 lg:pl-10">
            <div>
              <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>Visit</h2>
              <ul className="mt-6 space-y-3 text-sm font-light">
                {brandPage ? (
                  <li>
                    <Link href={links.brand(brandPage.slug)} className={EDITORIAL_LINK_CLASS}>
                      All {brandPage.displayName} locations
                    </Link>
                  </li>
                ) : null}
                {websiteUrl ? (
                  <li>
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={EDITORIAL_LINK_CLASS}
                    >
                      Visit website
                    </a>
                  </li>
                ) : null}
                {otaListings.map((listing) => (
                  <li key={`visit-${listing.platform}`}>
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={EDITORIAL_LINK_CLASS}
                    >
                      {listing.label}
                      {listing.siteNames && listing.siteNames.length > 0
                        ? ` (${listing.siteNames.join(', ')})`
                        : ''}
                    </a>
                  </li>
                ))}
                {firstProperty.phone_number ? (
                  <li>
                    <span className="text-neutral-500">Phone</span>{' '}
                    <a href={`tel:${firstProperty.phone_number}`} className={EDITORIAL_LINK_CLASS}>
                      {formatPhoneNumber(firstProperty.phone_number)}
                    </a>
                  </li>
                ) : null}
              </ul>

              {showLocationMap ? (
                <PropertyLocationMapEmbed
                  lat={coordinates?.[0]}
                  lon={coordinates?.[1]}
                  propertyName={propertyName}
                  addressLine={mapAddressLine}
                  placeQuery={mapPlaceQuery}
                  sageMapHref={mapLink}
                  zoom={14}
                  variant="sidebar"
                />
              ) : null}
            </div>

            {hasMultipleLocations ? (
              <div>
                <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>Locations &amp; units</h2>
                <p className="mt-2 max-w-xs text-[10px] leading-relaxed text-neutral-500">
                  Multiple inventory rows for this property in Sage data.
                </p>
                <ul className="mt-6 space-y-6 text-sm">
                  {Object.entries(groupedProperties).map(([locationKey, props]) => (
                    <li key={locationKey}>
                      <p className="font-medium text-neutral-800">{locationKey}</p>
                      <ul className="mt-3 space-y-2">
                        {props.map((prop) => {
                          const propCoords = parseCoordinates(prop.lat, prop.lon);
                          const unitLabel = prop.site_name || prop.unit_type || 'Unit';
                          return (
                            <li
                              key={prop.id}
                              className="flex min-w-0 items-baseline gap-x-2 font-light"
                            >
                              <span className="shrink-0 text-neutral-700">{unitLabel}</span>
                              <EditorialMetricLeader />
                              {prop.rate_avg_retail_daily_rate ? (
                                <span className="shrink-0 tabular-nums text-neutral-900">
                                  {formatUsd(prop.rate_avg_retail_daily_rate)}
                                </span>
                              ) : propCoords ? (
                                <Link
                                  href={`${links.map}?lat=${propCoords[0]}&lon=${propCoords[1]}&zoom=15`}
                                  className="shrink-0 text-[11px] uppercase tracking-wider text-neutral-500 hover:text-neutral-800"
                                >
                                  Map
                                </Link>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {showGoogleReviews && (
              <div>
                <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>Google reviews</h2>
                <p className="mt-4 font-light text-3xl tabular-nums tracking-tight text-neutral-900">
                  {googlePlacesData?.rating?.toFixed(1) ?? '—'}
                </p>
                {googlePlacesData?.userRatingCount ? (
                  <p className="mt-2 text-xs font-light text-neutral-500">
                    {googlePlacesData.userRatingCount.toLocaleString()}{' '}
                    {googlePlacesData.userRatingCount === 1 ? 'review' : 'reviews'}
                  </p>
                ) : null}
              </div>
            )}
          </aside>
        </div>

        {nearbyProperties.length > 0 ? (
          <RelatedPropertiesCarousel
            properties={nearbyProperties}
            currentPropertyName={propertyName}
            locale={locale}
            variant="editorial"
          />
        ) : null}
      </main>
    </EditorialPageShell>
  );
}
