import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { generateHreflangAlternates, getOpenGraphLocale } from '@/lib/i18n-utils';
import { getNationalParksWithCoordinates } from '@/lib/national-parks';
import { generateOrganizationSchema } from '@/lib/schema';
import FloatingHeader from '@/components/FloatingHeader';

export const revalidate = 86400;

interface PageProps {
  params: { locale: string };
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) {
    return { title: 'Page Not Found | Sage Outdoor Advisory' };
  }

  const pathname = `/${locale}/glamping/near-national-parks`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;

  return {
    title: 'Glamping Near National Parks | Sage Outdoor Advisory',
    description:
      'Find glamping properties near Yellowstone, Yosemite, Great Smoky Mountains, and more. Discover unique outdoor accommodations within 75 miles of your favorite national parks.',
    keywords: [
      'glamping near national parks',
      'glamping near Yellowstone',
      'glamping near Yosemite',
      'glamping near Great Smoky Mountains',
      'glamping accommodations',
    ].join(', '),
    openGraph: {
      title: 'Glamping Near National Parks | Sage Outdoor Advisory',
      description:
        'Find glamping properties near Yellowstone, Yosemite, and more. Discover unique outdoor accommodations within 75 miles of national parks.',
      url,
      siteName: 'Sage Outdoor Advisory',
      locale: getOpenGraphLocale(locale as Locale),
      type: 'website',
    },
    alternates: {
      canonical: url,
      ...generateHreflangAlternates(pathname),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function GlampingNearNationalParksIndexPage({
  params,
}: PageProps) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const parks = await getNationalParksWithCoordinates();
  const localePrefix = locale && locale !== 'en' ? `/${locale}` : '';
  const pathname = `/${locale}/glamping/near-national-parks`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sageoutdooradvisory.com' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Glamping Near National Parks',
        item: `https://resources.sageoutdooradvisory.com${pathname}`,
      },
    ],
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Glamping Near National Parks',
    description: 'National parks with nearby glamping properties',
    numberOfItems: parks.length,
    itemListElement: parks.slice(0, 50).map((park, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: park.name,
      url: `https://resources.sageoutdooradvisory.com${localePrefix}/glamping/near-national-parks/${park.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateOrganizationSchema()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema),
        }}
      />

      <div className="min-h-screen bg-white">
        <FloatingHeader locale={locale} showFullNav={true} showSpacer={false} />

        <nav className="bg-gray-50 border-b border-gray-200 py-3 pt-32 md:pt-36">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-x-2 text-sm text-gray-600">
              <Link href={`${localePrefix}/`} className="hover:text-[#006b5f]">
                Home
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">
                Glamping Near National Parks
              </span>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <section className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Glamping Near National Parks
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl">
              Find glamping properties within 75 miles of your favorite national
              parks. Each park page lists nearby accommodations to help you plan
              your outdoor adventure.
            </p>
          </section>

          <section aria-labelledby="parks-heading">
            <h2 id="parks-heading" className="text-2xl font-bold text-gray-900 mb-6">
              National Parks
            </h2>

            {parks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {parks.map((park) => (
                  <Link
                    key={park.id}
                    href={`${localePrefix}/glamping/near-national-parks/${park.slug}`}
                    className="block border border-gray-200 rounded-lg p-6 hover:border-[#006b5f] hover:shadow-md transition-all"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {park.name}
                    </h3>
                    {park.state && (
                      <p className="text-sm text-gray-600">{park.state}</p>
                    )}
                    <span className="inline-block mt-2 text-[#006b5f] font-medium text-sm">
                      View glamping properties →
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-700">No national parks found.</p>
            )}
          </section>

          <section className="mt-12 pt-8 border-t border-gray-200">
            <Link
              href={`${localePrefix}/map`}
              className="inline-block px-6 py-2 bg-[#007a6e] text-white rounded-lg hover:bg-[#006b5f] transition-colors"
            >
              Explore Glamping Map
            </Link>
          </section>
        </main>
      </div>
    </>
  );
}
