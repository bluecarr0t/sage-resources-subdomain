'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import type { SageProperty } from '@/lib/types/sage';
import type { GlampingPropertyPublicImages } from '@/lib/fetch-glamping-property-public-images';
import {
  EDITORIAL_H1_CLASS,
  EDITORIAL_METRIC_VALUE_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';
import StarRatingDisplay from '@/components/property/StarRatingDisplay';
import { getPropertyTypeDotColor } from '@/lib/property-type-dot-color';
import { getUnitTypeDotColor } from '@/lib/unit-type-dot-color';
import { collectDistinctUnitTypes } from '@/lib/property-unit-types';

function SummaryMetricDotValue({
  children,
  dotColor,
}: {
  children: ReactNode;
  dotColor: string;
}) {
  return (
    <div className="flex items-center gap-2 text-neutral-800">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span>{children}</span>
    </div>
  );
}

type PropertyDetailServerSummaryProps = {
  propertyName: string;
  property: SageProperty;
  /** All published rows for the property; used to show every unit type when set */
  properties?: SageProperty[];
  propertyImages?: GlampingPropertyPublicImages;
  showGoogleRating?: boolean;
  googleRating?: number | null;
  googleReviewCount?: number | null;
};

function formatUsd(value: string | number | null | undefined): string | null {
  if (value == null || value === '') return null;
  const n =
    typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

function buildLocation(property: SageProperty): string {
  const parts: string[] = [];
  if (property.city) parts.push(property.city);
  if (property.state) parts.push(property.state);
  if (property.country) parts.push(property.country);
  return parts.join(', ');
}

/** Crawler-visible property facts (SSR) — interactive UI loads in PropertyDetailTemplate. */
export default function PropertyDetailServerSummary({
  propertyName,
  property,
  properties,
  propertyImages,
  showGoogleRating = false,
  googleRating = null,
  googleReviewCount = null,
}: PropertyDetailServerSummaryProps) {
  const location = buildLocation(property);
  const rate = formatUsd(property.rate_avg_retail_daily_rate);
  const heroUrl = propertyImages?.heroUrl ?? propertyImages?.galleryUrls?.[0] ?? null;
  const unitTypes = collectDistinctUnitTypes(properties ?? [property]);
  const propertyType = property.property_type?.trim();
  const propertyTypeDotColor = propertyType ? getPropertyTypeDotColor(propertyType) : null;

  return (
    <section
      id="property-summary"
      aria-label="Property overview"
      className="border-b border-neutral-200/80 pb-10"
    >
      <h1 className={EDITORIAL_H1_CLASS}>{propertyName}</h1>

      {location ? (
        <p className="mt-3 text-sm font-light leading-relaxed text-neutral-600">{location}</p>
      ) : null}

      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-light text-neutral-600">
        {rate ? (
          <div>
            <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Avg. nightly rate</dt>
            <dd className={`mt-1 ${EDITORIAL_METRIC_VALUE_CLASS}`}>{rate}</dd>
          </div>
        ) : null}
        {unitTypes.length > 0 ? (
          <div>
            <dt className={EDITORIAL_SECTION_LABEL_CLASS}>
              {unitTypes.length === 1 ? 'Unit type' : 'Unit types'}
            </dt>
            <dd className="mt-1 space-y-1.5">
              {unitTypes.map((unitType) => (
                <SummaryMetricDotValue
                  key={unitType}
                  dotColor={getUnitTypeDotColor(unitType)}
                >
                  {unitType}
                </SummaryMetricDotValue>
              ))}
            </dd>
          </div>
        ) : null}
        {propertyType && propertyTypeDotColor ? (
          <div>
            <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Property type</dt>
            <dd className="mt-1">
              <SummaryMetricDotValue dotColor={propertyTypeDotColor}>
                {propertyType}
              </SummaryMetricDotValue>
            </dd>
          </div>
        ) : null}
        {showGoogleRating && (googleRating != null || googleReviewCount != null) ? (
          <div>
            <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Google rating</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-light tabular-nums text-neutral-500">
              {googleRating != null ? (
                <>
                  <StarRatingDisplay rating={googleRating} />
                  <span className="text-neutral-700">{googleRating.toFixed(1)}</span>
                </>
              ) : null}
              {googleRating != null && googleReviewCount != null ? (
                <span className="text-neutral-400"> · </span>
              ) : null}
              {googleReviewCount != null ? (
                <span>
                  {googleReviewCount.toLocaleString()}{' '}
                  {googleReviewCount === 1 ? 'review' : 'reviews'} on Google
                </span>
              ) : null}
            </dd>
          </div>
        ) : null}
      </dl>

      {heroUrl ? (
        <div className="relative mt-8 aspect-[16/10] w-full max-w-3xl overflow-hidden border border-neutral-200/90 bg-neutral-100">
          <Image
            src={heroUrl}
            alt={`${propertyName} glamping property`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 672px"
            priority
          />
        </div>
      ) : null}
    </section>
  );
}
