'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SageProperty } from '@/lib/types/sage';
import {
  EditorialMetricLeader,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { createLocaleLinks } from '@/lib/locale-links';

interface RelatedPropertiesCarouselProps {
  properties: SageProperty[];
  currentPropertyName: string;
  locale?: string;
  variant?: 'default' | 'editorial';
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

export default function RelatedPropertiesCarousel({
  properties,
  currentPropertyName,
  locale = 'en',
  variant = 'default',
}: RelatedPropertiesCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const links = createLocaleLinks(locale);

  if (!properties || properties.length === 0) {
    return null;
  }

  const itemsPerView = variant === 'editorial' ? 5 : 3;
  const maxIndex = Math.max(0, properties.length - itemsPerView);
  const visibleProperties = properties.slice(currentIndex, currentIndex + itemsPerView);

  const goToPrevious = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const goToNext = () => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));

  if (variant === 'editorial') {
    return (
      <section className="mt-16 border-t border-sage-200 pt-10" aria-labelledby="related-properties-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="related-properties-heading" className={EDITORIAL_SECTION_LABEL_CLASS}>
            Nearby glamping
          </h2>
          {properties.length > itemsPerView ? (
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-neutral-500">
              <button
                type="button"
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="transition-colors hover:text-neutral-900 disabled:opacity-40"
                aria-label="Previous nearby properties"
              >
                Prev
              </button>
              <span className="tabular-nums" aria-live="polite">
                {currentIndex + 1}–{Math.min(currentIndex + itemsPerView, properties.length)} of{' '}
                {properties.length}
              </span>
              <button
                type="button"
                onClick={goToNext}
                disabled={currentIndex >= maxIndex}
                className="transition-colors hover:text-neutral-900 disabled:opacity-40"
                aria-label="Next nearby properties"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-neutral-500">
          Other properties within ~50 miles of {currentPropertyName}.
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          {visibleProperties.map((property) => {
            const propertyName = property.property_name || 'Unnamed Property';
            const slug = property.slug || '';
            const locationParts: string[] = [];
            if (property.city) locationParts.push(property.city);
            if (property.state) locationParts.push(property.state);
            const location = locationParts.join(', ');

            return (
              <li key={property.id} className="flex min-w-0 items-baseline gap-x-2 font-light">
                <Link
                  href={links.property(slug)}
                  className="shrink-0 text-neutral-800 underline decoration-neutral-300 underline-offset-2 transition-colors hover:text-neutral-900 hover:decoration-neutral-500"
                >
                  {propertyName}
                </Link>
                <EditorialMetricLeader />
                <span className="shrink-0 tabular-nums text-neutral-600">
                  {property.rate_avg_retail_daily_rate
                    ? formatUsd(property.rate_avg_retail_daily_rate)
                    : location || '—'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  return (
    <section className="mt-12 border-t border-gray-200 pt-8" aria-labelledby="related-properties-heading">
      <div className="flex items-center justify-between mb-6">
        <h2 id="related-properties-heading" className="text-2xl font-bold text-gray-900">
          Nearby Glamping Properties
        </h2>
        {properties.length > itemsPerView && (
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              disabled={currentIndex === 0}
              className="p-2 rounded-full border border-gray-300 hover:border-[#00b6a6] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2"
              aria-label={`Previous properties. Currently showing properties ${currentIndex + 1}-${Math.min(currentIndex + itemsPerView, properties.length)} of ${properties.length}`}
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center" aria-live="polite" aria-atomic="true">
              <span className="sr-only">Showing properties </span>
              {currentIndex + 1}-{Math.min(currentIndex + itemsPerView, properties.length)} of {properties.length}
            </span>
            <button
              onClick={goToNext}
              disabled={currentIndex >= maxIndex}
              className="p-2 rounded-full border border-gray-300 hover:border-[#00b6a6] hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-[#00b6a6] focus:ring-offset-2"
              aria-label={`Next properties. Currently showing properties ${currentIndex + 1}-${Math.min(currentIndex + itemsPerView, properties.length)} of ${properties.length}`}
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleProperties.map((property) => {
          const propertyName = property.property_name || 'Unnamed Property';
          const slug = property.slug || '';

          const locationParts: string[] = [];
          if (property.city) locationParts.push(property.city);
          if (property.state) locationParts.push(property.state);
          const location = locationParts.join(', ') || '';

          return (
            <Link
              key={property.id}
              href={links.property(slug)}
              className="group border border-gray-200 rounded-lg overflow-hidden hover:border-[#00b6a6] hover:shadow-lg transition-all"
            >
              <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <p className="text-gray-400 text-sm">View property for photos</p>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-[#00b6a6] transition-colors mb-1 line-clamp-2">
                  {propertyName}
                </h3>

                {location && <p className="text-sm text-gray-600 mb-2">{location}</p>}

                {property.unit_type && (
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">Unit Type:</span> {property.unit_type}
                  </p>
                )}

                {property.rate_avg_retail_daily_rate && (
                  <p className="text-sm text-gray-900 font-semibold mb-3">
                    From ${property.rate_avg_retail_daily_rate}/night
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-[#006b5f] group-hover:text-[#00b6a6] transition-colors">
                  <span>View Details</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
