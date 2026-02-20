'use client';

import Link from 'next/link';
import { SageProperty } from '@/lib/types/sage';
import { slugifyPropertyName } from '@/lib/properties';
import { type UnitTypeConfig } from '@/lib/unit-type-config';
import FloatingHeader from './FloatingHeader';

interface GlampingByUnitTypeTemplateProps {
  unitTypeConfig: UnitTypeConfig;
  properties: SageProperty[];
  locale?: string;
}

export default function GlampingByUnitTypeTemplate({
  unitTypeConfig,
  properties,
  locale = 'en',
}: GlampingByUnitTypeTemplateProps) {
  const { displayName } = unitTypeConfig;
  const localePrefix = locale && locale !== 'en' ? `/${locale}` : '';

  return (
    <div className="min-h-screen bg-white">
      <FloatingHeader locale={locale} showFullNav={true} showSpacer={false} />

      {/* Breadcrumbs */}
      <nav className="bg-gray-50 border-b border-gray-200 py-3 pt-32 md:pt-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center flex-wrap gap-x-2 text-sm text-gray-600">
            <Link href={`${localePrefix}/`} className="hover:text-[#006b5f]">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">
              Glamping {displayName}
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Glamping {displayName}
          </h1>
          <p className="text-gray-700 max-w-3xl">
            Discover glamping properties that offer {displayName.toLowerCase()}{' '}
            accommodations. These unique structures combine outdoor immersion
            with comfort and style.
          </p>
        </section>

        {/* Property List */}
        <section className="mb-12" aria-labelledby="properties-heading">
          <h2
            id="properties-heading"
            className="text-2xl font-bold text-gray-900 mb-6"
          >
            Glamping Properties
          </h2>

          {properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => {
                const propertySlug =
                  property.slug?.trim() ||
                  (property.property_name
                    ? slugifyPropertyName(property.property_name)
                    : '');
                const propertyUrl = `${localePrefix}/property/${propertySlug}`;

                return (
                  <article
                    key={property.id || property.property_name}
                    className="border border-gray-200 rounded-lg p-6 hover:border-[#006b5f] hover:shadow-md transition-all"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {property.property_name || 'Unnamed Property'}
                    </h3>
                    {(property.city || property.state) && (
                      <p className="text-sm text-gray-600 mb-2">
                        {[property.city, property.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    {property.rate_category && (
                      <p className="text-sm text-gray-600 mb-4">
                        Rate: {property.rate_category}
                      </p>
                    )}
                    <Link
                      href={propertyUrl}
                      className="inline-block px-4 py-2 bg-[#007a6e] text-white rounded-lg hover:bg-[#006b5f] transition-colors text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-700 mb-4">
                No glamping properties found with {displayName.toLowerCase()}{' '}
                accommodations.
              </p>
              <Link
                href={`${localePrefix}/map`}
                className="inline-block px-6 py-2 bg-[#007a6e] text-white rounded-lg hover:bg-[#006b5f] transition-colors"
              >
                Explore Glamping Map
              </Link>
            </div>
          )}
        </section>

        {/* CTAs */}
        <section className="flex flex-wrap gap-4">
          <Link
            href={`${localePrefix}/map`}
            className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
          >
            View on Map
          </Link>
          <Link
            href={`${localePrefix}/glamping/near-national-parks`}
            className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Glamping Near National Parks
          </Link>
        </section>

        {/* FAQ Section */}
        <section
          className="mt-12 pt-8 border-t border-gray-200"
          aria-labelledby="faq-heading"
        >
          <h2
            id="faq-heading"
            className="text-2xl font-bold text-gray-900 mb-6"
          >
            Frequently Asked Questions
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold text-gray-900 mb-1">
                What is {displayName.toLowerCase()} glamping?
              </dt>
              <dd className="text-gray-700">
                {displayName} glamping combines the unique structure of{' '}
                {displayName.toLowerCase()} with luxury amenities like real beds,
                electricity, and often private bathrooms. It offers an immersive
                outdoor experience with comfort.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900 mb-1">
                Where can I find {displayName.toLowerCase()} glamping?
              </dt>
              <dd className="text-gray-700">
                The properties listed above offer {displayName.toLowerCase()}{' '}
                accommodations across the United States and Canada. Use the map
                to explore more options and filter by location.
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
