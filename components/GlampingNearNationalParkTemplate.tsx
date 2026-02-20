'use client';

import Link from 'next/link';
import { NationalPark } from '@/lib/types/national-parks';
import { SageProperty } from '@/lib/types/sage';
import { slugifyPropertyName } from '@/lib/properties';
import FloatingHeader from './FloatingHeader';

interface GlampingNearNationalParkTemplateProps {
  park: NationalPark;
  properties: Array<SageProperty & { distance: number }>;
  locale?: string;
}

export default function GlampingNearNationalParkTemplate({
  park,
  properties,
  locale = 'en',
}: GlampingNearNationalParkTemplateProps) {
  const parkName = park.name || 'National Park';
  const locationParts: string[] = [];
  if (park.state) locationParts.push(park.state);
  const location = locationParts.join(', ');
  const mapLink =
    park.latitude && park.longitude
      ? `/map?lat=${park.latitude}&lon=${park.longitude}&zoom=10`
      : '/map';
  const localePrefix = locale && locale !== 'en' ? `/${locale}` : '';

  return (
    <div className="min-h-screen bg-white">
      <FloatingHeader locale={locale} showFullNav={true} showSpacer={false} />

      {/* Breadcrumbs */}
      <nav className="bg-gray-50 border-b border-gray-200 py-3 pt-32 md:pt-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center flex-wrap gap-x-2 text-sm text-gray-600">
            <Link
              href={`${localePrefix}/`}
              className="hover:text-[#006b5f]"
            >
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link
              href={`${localePrefix}/glamping/near-national-parks`}
              className="hover:text-[#006b5f]"
            >
              Glamping Near National Parks
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{parkName}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Glamping Near {parkName}
          </h1>
          {location && (
            <p className="text-xl text-gray-600 mb-4">{location}</p>
          )}
          <p className="text-gray-700 max-w-3xl">
            Discover glamping properties within 75 miles of {parkName}. These
            unique accommodations offer a comfortable base for exploring the
            park while enjoying the outdoors.
          </p>
        </section>

        {/* Property List */}
        <section className="mb-12" aria-labelledby="properties-heading">
          <h2 id="properties-heading" className="text-2xl font-bold text-gray-900 mb-6">
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
                    <p className="text-sm text-gray-600 mb-2">
                      {Math.round(property.distance)} miles from {parkName}
                    </p>
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
                No glamping properties found within 75 miles of {parkName}.
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
            href={`${localePrefix}/property/${park.slug || parkName.toLowerCase().replace(/\s+/g, '-')}`}
            className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Learn About {parkName}
          </Link>
          <Link
            href={mapLink}
            className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
          >
            View on Map
          </Link>
          <Link
            href={`${localePrefix}/glamping/near-national-parks`}
            className="px-6 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors"
          >
            All National Parks
          </Link>
        </section>

        {/* FAQ Section */}
        <section className="mt-12 pt-8 border-t border-gray-200" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-2xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold text-gray-900 mb-1">
                How far are glamping properties from {parkName}?
              </dt>
              <dd className="text-gray-700">
                All properties listed are within 75 miles of {parkName}. Distances
                are calculated from the park center and shown for each property.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900 mb-1">
                What types of glamping are available near {parkName}?
              </dt>
              <dd className="text-gray-700">
                Properties near {parkName} include a variety of accommodations
                such as safari tents, yurts, cabins, and more. Click on any
                property to see unit types and amenities.
              </dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  );
}
