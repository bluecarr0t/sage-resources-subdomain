import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { generateHreflangAlternates, getOpenGraphLocale } from '@/lib/i18n-utils';
import { getNationalParkBySlug, getNationalParksWithCoordinates } from '@/lib/national-parks';
import { getPropertiesNearNationalPark } from '@/lib/map-data-utils';
import { slugifyPropertyName } from '@/lib/properties';
import { generateOrganizationSchema } from '@/lib/schema';
import GlampingNearNationalParkTemplate from '@/components/GlampingNearNationalParkTemplate';

export const revalidate = 86400;

interface PageProps {
  params: { locale: string; parkSlug: string };
}

export async function generateStaticParams() {
  const parks = await getNationalParksWithCoordinates();
  const params: Array<{ locale: string; parkSlug: string }> = [];

  for (const locale of locales) {
    for (const park of parks) {
      if (park.slug) {
        params.push({ locale, parkSlug: park.slug });
      }
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, parkSlug } = params;

  if (!locales.includes(locale as Locale)) {
    return { title: 'Page Not Found | Sage Outdoor Advisory' };
  }

  const park = await getNationalParkBySlug(parkSlug);
  if (!park || park.latitude == null || park.longitude == null) {
    return { title: 'Page Not Found | Sage Outdoor Advisory' };
  }

  const parkName = park.name || 'National Park';
  const pathname = `/${locale}/glamping/near-national-parks/${parkSlug}`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;

  return {
    title: `Glamping Near ${parkName} | Sage Outdoor Advisory`,
    description: `Find glamping properties within 75 miles of ${parkName}. Discover unique accommodations near ${park.state || 'the park'} for your outdoor adventure.`,
    keywords: [
      `glamping near ${parkName}`,
      `glamping ${park.state || ''}`,
      parkName,
    ]
      .filter(Boolean)
      .join(', '),
    openGraph: {
      title: `Glamping Near ${parkName} | Sage Outdoor Advisory`,
      description: `Find glamping properties within 75 miles of ${parkName}. Discover unique accommodations for your outdoor adventure.`,
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

export default async function GlampingNearParkPage({ params }: PageProps) {
  const { locale, parkSlug } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const park = await getNationalParkBySlug(parkSlug);
  if (!park) {
    notFound();
  }

  if (park.latitude == null || park.longitude == null) {
    notFound();
  }

  const properties = await getPropertiesNearNationalPark(
    Number(park.latitude),
    Number(park.longitude),
    parkSlug,
    75,
    20
  );

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://sageoutdooradvisory.com' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Glamping Near National Parks',
        item: `https://resources.sageoutdooradvisory.com/${locale}/glamping/near-national-parks`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: park.name,
        item: `https://resources.sageoutdooradvisory.com/${locale}/glamping/near-national-parks/${parkSlug}`,
      },
    ],
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Glamping properties near ${park.name}`,
    numberOfItems: properties.length,
    itemListElement: properties
      .filter((prop) => prop.slug || prop.property_name)
      .map((prop, index) => {
        const slug =
          prop.slug?.trim() ||
          (prop.property_name ? slugifyPropertyName(prop.property_name) : '');
        return {
          '@type': 'ListItem',
          position: index + 1,
          name: prop.property_name || 'Unnamed Property',
          url: slug
            ? `https://resources.sageoutdooradvisory.com/${locale}/property/${slug}`
            : undefined,
        };
      })
      .filter((item) => item.url),
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How far are glamping properties from ${park.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `All properties listed are within 75 miles of ${park.name}. Distances are calculated from the park center and shown for each property.`,
        },
      },
      {
        '@type': 'Question',
        name: `What types of glamping are available near ${park.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Properties near ${park.name} include a variety of accommodations such as safari tents, yurts, cabins, and more. Click on any property to see unit types and amenities.`,
        },
      },
    ],
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />

      <GlampingNearNationalParkTemplate
        park={park}
        properties={properties}
        locale={locale}
      />
    </>
  );
}
