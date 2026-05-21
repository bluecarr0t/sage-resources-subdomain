import Image from 'next/image';
import type { SageProperty } from '@/lib/types/sage';
import type { GlampingPropertyPublicImages } from '@/lib/fetch-glamping-property-public-images';
import {
  EDITORIAL_H1_CLASS,
  EDITORIAL_METRIC_VALUE_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';

type PropertyDetailServerSummaryProps = {
  propertyName: string;
  property: SageProperty;
  propertyImages?: GlampingPropertyPublicImages;
  /** Visible FAQ copy (aligned with JSON-LD) */
  propertyFaqs?: Array<{ question: string; answer: string }>;
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

function buildDescription(property: SageProperty): string | null {
  const raw =
    property.description?.trim() ||
    property.google_description?.trim() ||
    null;
  if (!raw || raw.length < 40) return null;
  return raw.length > 500 ? `${raw.slice(0, 497)}...` : raw;
}

/** Crawler-visible property facts (SSR) — interactive UI loads in PropertyDetailTemplate. */
export default function PropertyDetailServerSummary({
  propertyName,
  property,
  propertyImages,
  propertyFaqs = [],
}: PropertyDetailServerSummaryProps) {
  const location = buildLocation(property);
  const rate = formatUsd(property.rate_avg_retail_daily_rate);
  const description = buildDescription(property);
  const heroUrl = propertyImages?.heroUrl ?? propertyImages?.galleryUrls?.[0] ?? null;
  const unitType = property.unit_type?.trim();

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

      {property.address ? (
        <p className="mt-1 max-w-xl text-[11px] font-light leading-relaxed text-neutral-500">
          {property.address}
          {property.city || property.state
            ? `, ${[property.city, property.state, property.zip_code].filter(Boolean).join(', ')}`
            : ''}
        </p>
      ) : null}

      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-[11px] font-light text-neutral-600">
        {rate ? (
          <div>
            <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Avg. nightly rate</dt>
            <dd className={`mt-1 ${EDITORIAL_METRIC_VALUE_CLASS}`}>{rate}</dd>
          </div>
        ) : null}
        {unitType ? (
          <div>
            <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Unit type</dt>
            <dd className="mt-1 text-neutral-800">{unitType}</dd>
          </div>
        ) : null}
        {property.property_type ? (
          <div>
            <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Property type</dt>
            <dd className="mt-1 text-neutral-800">{property.property_type}</dd>
          </div>
        ) : null}
      </dl>

      {description ? (
        <p className="mt-6 max-w-3xl text-sm font-light leading-relaxed text-neutral-700">
          {description}
        </p>
      ) : null}

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

      {propertyFaqs.length > 0 ? (
        <div className="mt-10 max-w-3xl">
          <h2 className={EDITORIAL_SECTION_LABEL_CLASS}>Frequently asked questions</h2>
          <dl className="mt-4 space-y-4">
            {propertyFaqs.map((faq) => (
              <div key={faq.question}>
                <dt className="text-sm font-medium text-neutral-900">{faq.question}</dt>
                <dd className="mt-1 text-sm font-light leading-relaxed text-neutral-700">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
