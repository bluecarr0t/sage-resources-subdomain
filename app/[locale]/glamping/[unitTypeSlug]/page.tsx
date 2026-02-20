import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { generateHreflangAlternates, getOpenGraphLocale } from '@/lib/i18n-utils';
import {
  getUnitTypeConfigBySlug,
  getAllUnitTypeSlugs,
} from '@/lib/unit-type-config';
import { getPropertiesByUnitType } from '@/lib/unit-type-data';
import { slugifyPropertyName } from '@/lib/properties';
import { generateOrganizationSchema } from '@/lib/schema';
import GlampingByUnitTypeTemplate from '@/components/GlampingByUnitTypeTemplate';

export const revalidate = 86400;

interface PageProps {
  params: { locale: string; unitTypeSlug: string };
}

export async function generateStaticParams() {
  const slugs = getAllUnitTypeSlugs();
  const params: Array<{ locale: string; unitTypeSlug: string }> = [];

  for (const locale of locales) {
    for (const slug of slugs) {
      params.push({ locale, unitTypeSlug: slug });
    }
  }

  return params;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, unitTypeSlug } = params;

  if (!locales.includes(locale as Locale)) {
    return { title: 'Page Not Found | Sage Outdoor Advisory' };
  }

  const config = getUnitTypeConfigBySlug(unitTypeSlug);
  if (!config) {
    return { title: 'Page Not Found | Sage Outdoor Advisory' };
  }

  const pathname = `/${locale}/glamping/${unitTypeSlug}`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;

  return {
    title: `Glamping ${config.displayName} | Sage Outdoor Advisory`,
    description: `Find glamping properties with ${config.displayName.toLowerCase()} accommodations. Discover unique ${config.displayName.toLowerCase()} across the United States and Canada.`,
    keywords: [
      `glamping ${config.displayName.toLowerCase()}`,
      `${config.displayName.toLowerCase()} glamping`,
      `glamping accommodations`,
    ].join(', '),
    openGraph: {
      title: `Glamping ${config.displayName} | Sage Outdoor Advisory`,
      description: `Find glamping properties with ${config.displayName.toLowerCase()} accommodations. Discover unique outdoor stays.`,
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

export default async function GlampingByUnitTypePage({ params }: PageProps) {
  const { locale, unitTypeSlug } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const config = getUnitTypeConfigBySlug(unitTypeSlug);
  if (!config) {
    notFound();
  }

  const properties = await getPropertiesByUnitType(unitTypeSlug, 50);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://sageoutdooradvisory.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: `Glamping ${config.displayName}`,
        item: `https://resources.sageoutdooradvisory.com/${locale}/glamping/${unitTypeSlug}`,
      },
    ],
  };

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Glamping properties with ${config.displayName}`,
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
        name: `What is ${config.displayName.toLowerCase()} glamping?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${config.displayName} glamping combines the unique structure of ${config.displayName.toLowerCase()} with luxury amenities like real beds, electricity, and often private bathrooms. It offers an immersive outdoor experience with comfort.`,
        },
      },
      {
        '@type': 'Question',
        name: `Where can I find ${config.displayName.toLowerCase()} glamping?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The properties listed offer ${config.displayName.toLowerCase()} accommodations across the United States and Canada. Use the map to explore more options and filter by location.`,
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

      <GlampingByUnitTypeTemplate
        unitTypeConfig={config}
        properties={properties}
        locale={locale}
      />
    </>
  );
}
