import Link from 'next/link';
import FloatingHeader from '@/components/FloatingHeader';
import Footer from '@/components/Footer';
import BrandPropertyMap from '@/components/BrandPropertyMap';
import { EditorialCtaBand } from '@/components/editorial/EditorialCtaBand';
import {
  EditorialPageShell,
  EDITORIAL_H1_CLASS,
  EDITORIAL_LEAD_CLASS,
  EDITORIAL_LINK_CLASS,
  EDITORIAL_MAIN_WITH_HEADER_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { isUnitedStatesCountryFilterValue } from '@/lib/admin/glamping-sage-data-list';
import { createLocaleLinks } from '@/lib/locale-links';
import type {
  BrandMapPin,
  BrandPropertyListing,
  BrandPublicSummary,
} from '@/lib/brand-public-pages';

function listingIsOutsideUsa(country: string | null | undefined): boolean {
  const value = country?.trim();
  if (!value) return false;
  return !isUnitedStatesCountryFilterValue(value);
}

function formatLocation(listing: BrandPropertyListing): string {
  const parts = [listing.city, listing.state].filter(
    (p): p is string => typeof p === 'string' && p.trim().length > 0
  );
  if (parts.length > 0) return parts.join(', ');
  return listing.country?.trim() || '';
}

function formatUsd(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const n =
    typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);
}

export type BrandDetailTemplateProps = {
  locale: string;
  brand: BrandPublicSummary;
  parentBrand: BrandPublicSummary | null;
  subBrands: BrandPublicSummary[];
  listings: BrandPropertyListing[];
  mapPins: BrandMapPin[];
  includeSubBrandRollup: boolean;
};

export default function BrandDetailTemplate({
  locale,
  brand,
  parentBrand,
  subBrands,
  listings,
  mapPins,
  includeSubBrandRollup,
}: BrandDetailTemplateProps) {
  const links = createLocaleLinks(locale);
  const propertyCount = listings.length;
  const hasInternationalProperties = listings.some((l) =>
    listingIsOutsideUsa(l.country)
  );
  const states = [
    ...new Set(
      listings
        .filter((l) => {
          if (!hasInternationalProperties) return true;
          const country = l.country?.trim();
          return !country || isUnitedStatesCountryFilterValue(country);
        })
        .map((l) => l.state?.trim())
        .filter((s): s is string => Boolean(s))
    ),
  ].sort();
  const statesLabel = hasInternationalProperties ? 'US States' : 'States';
  const rateValues = listings
    .map((l) => {
      if (l.rate == null || l.rate === '') return null;
      const n =
        typeof l.rate === 'number'
          ? l.rate
          : Number(String(l.rate).replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n) ? n : null;
    })
    .filter((n): n is number => n != null);
  const minRate = rateValues.length > 0 ? Math.min(...rateValues) : null;

  const lead =
    propertyCount === 1
      ? `One published property in Sage Outdoor Advisory research for ${brand.display_name}.`
      : `${propertyCount} published properties in Sage research for ${brand.display_name}${states.length > 0 ? ` across ${states.length} ${states.length === 1 ? 'state' : 'states'}` : ''}.`;

  return (
    <EditorialPageShell solidPageBackground>
      <FloatingHeader locale={locale} showFullNav showSpacer={false} />
      <main className={EDITORIAL_MAIN_WITH_HEADER_CLASS}>
        <nav aria-label="Breadcrumb" className="mb-8 text-xs font-light text-neutral-500">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href={links.home} className={EDITORIAL_LINK_CLASS}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={links.map} className={EDITORIAL_LINK_CLASS}>
                Map
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/brands" className={EDITORIAL_LINK_CLASS}>
                Brands
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-neutral-800">{brand.display_name}</li>
          </ol>
        </nav>

        <header className="max-w-3xl">
          <p className={EDITORIAL_SECTION_LABEL_CLASS}>Glamping brand</p>
          <h1 className={`mt-3 ${EDITORIAL_H1_CLASS}`}>{brand.display_name}</h1>
          <p className={`mt-6 ${EDITORIAL_LEAD_CLASS}`}>{lead}</p>
          {parentBrand ? (
            <p className="mt-4 text-sm font-light text-neutral-600">
              Part of{' '}
              <Link href={links.brand(parentBrand.slug)} className={EDITORIAL_LINK_CLASS}>
                {parentBrand.display_name}
              </Link>
            </p>
          ) : null}
          {brand.website_url ? (
            <p className="mt-4 text-sm font-light">
              <a
                href={brand.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className={EDITORIAL_LINK_CLASS}
              >
                Official website →
              </a>
            </p>
          ) : null}
        </header>

        <dl className="mt-12 grid gap-10 border-t border-sage-200/90 pt-12 sm:grid-cols-3">
          <div>
            <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Properties</dt>
            <dd className="mt-2 text-3xl font-light tabular-nums text-neutral-900">
              {propertyCount}
            </dd>
          </div>
          {states.length > 0 ? (
            <div>
              <dt className={EDITORIAL_SECTION_LABEL_CLASS}>{statesLabel}</dt>
              <dd className="mt-2 text-3xl font-light tabular-nums text-neutral-900">
                {states.length}
              </dd>
            </div>
          ) : null}
          {minRate != null ? (
            <div>
              <dt className={EDITORIAL_SECTION_LABEL_CLASS}>Rates Starting From</dt>
              <dd className="mt-2 text-lg font-light text-neutral-900">
                {formatUsd(minRate)}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-16">
          <BrandPropertyMap pins={mapPins} locale={locale} brandName={brand.display_name} />
        </div>

        {includeSubBrandRollup && subBrands.length > 0 ? (
          <section className="mt-16" aria-labelledby="sub-brands-heading">
            <h2 id="sub-brands-heading" className={EDITORIAL_SECTION_LABEL_CLASS}>
              Sub-brands included
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {subBrands.map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={links.brand(sub.slug)}
                    className="inline-block border border-sage-200/90 bg-white/50 px-3 py-1.5 text-sm font-light text-neutral-800 transition-colors hover:border-sage-300 hover:bg-white"
                  >
                    {sub.display_name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-16" aria-labelledby="brand-properties-heading">
          <h2 id="brand-properties-heading" className={EDITORIAL_SECTION_LABEL_CLASS}>
            All locations
          </h2>
          <ul className="mt-8 divide-y divide-sage-200/90 border border-sage-200/90 bg-white/30">
            {listings.map((listing) => {
              const location = formatLocation(listing);
              const rate = formatUsd(listing.rate);
              return (
                <li key={listing.groupKey} className="px-5 py-5 sm:px-6">
                  <Link
                    href={links.property(listing.publicSlug)}
                    className="group block"
                  >
                    <p className="text-base font-medium text-neutral-900 transition-colors group-hover:text-sage-teal-text">
                      {listing.propertyName}
                    </p>
                    {location ? (
                      <p className="mt-1 text-sm font-light text-neutral-600">{location}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-light text-neutral-500">
                      {listing.unitTypes.length > 0 ? (
                        <span>{listing.unitTypes.join(' · ')}</span>
                      ) : null}
                      {rate ? <span>From {rate}/night (research)</span> : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <EditorialCtaBand
          title="Explore the full glamping map"
          description="Compare rates, unit types, and amenities across every published property in Sage Outdoor Advisory research."
          buttonLabel="Open interactive map"
          buttonHref={links.map}
        />
      </main>
      <Footer locale={locale} />
    </EditorialPageShell>
  );
}
