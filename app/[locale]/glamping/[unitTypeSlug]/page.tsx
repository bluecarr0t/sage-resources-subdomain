import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { generateEnOnlyHreflangAlternates, getOpenGraphLocale } from '@/lib/i18n-utils';
import {
  getUnitTypeConfigBySlug,
  getAllUnitTypeSlugs,
} from '@/lib/unit-type-config';
import { getPropertiesByUnitType } from '@/lib/unit-type-data';
import { slugifyPropertyName } from '@/lib/properties';
import { generateOrganizationSchema } from '@/lib/schema';
import GlampingByUnitTypeTemplate from '@/components/GlampingByUnitTypeTemplate';
import { getAvailableLocalesForContent } from '@/lib/i18n-content';

export const revalidate = 86400;

interface PageProps {
  params: { locale: string; unitTypeSlug: string };
}

export async function generateStaticParams() {
  const slugs = getAllUnitTypeSlugs();
  const params: Array<{ locale: string; unitTypeSlug: string }> = [];
  const availableLocales = getAvailableLocalesForContent('glamping');

  for (const locale of availableLocales) {
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

  const primaryKw = config.primaryKeyword ?? `${config.displayName.toLowerCase()} glamping`;
  const title = `${config.displayName} Glamping Properties | US & Canada | Sage Outdoor Advisory`;
  const description =
    config.quickAnswer ??
    `Directory of glamping properties featuring ${config.displayName.toLowerCase()} accommodations across the US and Canada. Compare options for travel or outdoor hospitality market research.`;

  const keywordList = [
    primaryKw,
    ...(config.secondaryKeywords ?? []),
    'glamping accommodations',
    'outdoor hospitality',
  ].join(', ');

  return {
    title,
    description,
    keywords: keywordList,
    openGraph: {
      title: `${config.displayName} Glamping | Sage Outdoor Advisory`,
      description,
      url,
      siteName: 'Sage Outdoor Advisory',
      locale: getOpenGraphLocale(locale as Locale),
      type: 'website',
    },
    alternates: {
      canonical: url,
      ...generateEnOnlyHreflangAlternates(pathname),
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

  // Use per-type FAQs if configured, otherwise fall back to generic questions.
  const faqPairs: Array<{ question: string; answer: string }> =
    config.faqs && config.faqs.length > 0
      ? config.faqs
      : [
          {
            question: `What is ${config.displayName.toLowerCase()} glamping?`,
            answer: `${config.displayName} glamping combines the unique structure of ${config.displayName.toLowerCase()} with luxury amenities like real beds, electricity, and often private bathrooms. It offers an immersive outdoor experience with comfort.`,
          },
          {
            question: `Where can I find ${config.displayName.toLowerCase()} glamping?`,
            answer: `The properties listed offer ${config.displayName.toLowerCase()} accommodations across the United States and Canada. Use the map to explore more options and filter by location.`,
          },
        ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqPairs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
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
        faqs={faqPairs}
      />
    </>
  );
}
