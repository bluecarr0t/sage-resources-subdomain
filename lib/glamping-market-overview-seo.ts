import type { Metadata } from 'next';
import { generateEnOnlyHreflangAlternates } from '@/lib/i18n-utils';
import {
  generateFAQSchema,
  generateSageContentAuthorSchema,
  type FAQItem,
} from '@/lib/schema';

export const GLAMPING_MARKET_OVERVIEW_BASE_URL =
  'https://resources.sageoutdooradvisory.com';

export const GLAMPING_MARKET_OVERVIEW_OG_IMAGE = {
  url: 'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg',
  width: 1200,
  height: 630,
  alt: 'Glamping market overview — US and Canada private commercial glamping metrics by Sage Outdoor Advisory',
} as const;

export type GlampingMarketOverviewSeoVariant = 'overview' | 'brands';

const OVERVIEW_PATH = '/glamping-market-overview';
const BRANDS_PATH = '/glamping-market-overview/brands';

export function glampingMarketOverviewPathForVariant(
  variant: GlampingMarketOverviewSeoVariant
): string {
  return variant === 'brands' ? BRANDS_PATH : OVERVIEW_PATH;
}

export const GLAMPING_MARKET_OVERVIEW_KEYWORDS = [
  'glamping market overview',
  'glamping market data',
  'glamping industry statistics',
  'glamping ADR',
  'average daily rate glamping',
  'glamping supply data',
  'US glamping market',
  'Canada glamping market',
  'glamping property count',
  'outdoor hospitality market research',
  'glamping feasibility data',
  'glamping brand rankings',
] as const;

export const GLAMPING_MARKET_OVERVIEW_FAQS: FAQItem[] = [
  {
    question: 'What is the Sage Glamping Market Overview?',
    answer:
      'The Glamping Market Overview is Sage Outdoor Advisory’s research dashboard for private commercial glamping in the United States and Canada. It summarizes property counts, unit inventory, average retail daily rates (ADR), top unit types, state and province breakdowns, and an interactive US map. Access is free after a quick email sign-in.',
  },
  {
    question: 'Which properties are included in the glamping market snapshot?',
    answer:
      'The snapshot includes private commercial operators whose primary product is glamping — safari tents, cabins, tiny homes, domes, yurts, and similar unit types with at least three glamping units. It excludes RV parks, traditional campgrounds, hotels, OTA-only listings, and state or national park campgrounds.',
  },
  {
    question: 'What glamping metrics can I see after signing in?',
    answer:
      'Signed-in users see total glamping properties (open, under construction, and proposed), total glamping units, mean and median retail nightly rates, top unit types by share of inventory, top US states or Canadian provinces, and filters for rustic, core, and upscale market tiers.',
  },
  {
    question: 'How often is the glamping market data updated?',
    answer:
      'Sage refreshes the Glamping Market Overview on a rolling basis as new properties are researched and published in the Sage database. Each view shows a “Last updated” date so you know how current the snapshot is.',
  },
  {
    question: 'Who uses Sage glamping market data?',
    answer:
      'Developers, investors, lenders, brands, and consultants use Sage glamping market intelligence for feasibility studies, appraisals, competitive benchmarking, and site selection. The data supports underwriting assumptions on supply, ADR, and unit mix.',
  },
  {
    question: 'Is the Glamping Market Overview the same as the interactive map?',
    answer:
      'The public interactive map shows individual glamping properties with filters. The Market Overview aggregates that research into market-level totals, rate benchmarks, and geographic rankings — designed for market sizing rather than property-by-property discovery.',
  },
];

export const GLAMPING_MARKET_BRANDS_FAQS: FAQItem[] = [
  {
    question: 'What is the Top Glamping Brands ranking?',
    answer:
      'The Top Glamping Brands page ranks the largest multi-property glamping operators in the United States by published Glamping property count. Each row shows properties, glamping units, and average retail nightly rate where rates are published. Portfolio brands roll up sub-brand locations.',
  },
  {
    question: 'How does Sage define a glamping brand for this ranking?',
    answer:
      'Brands must have multiple published Glamping properties in the Sage database. Rankings use property type Glamping only, exclude public-land and marketplace-only operators, and attribute sub-brands to their portfolio parent where applicable.',
  },
  {
    question: 'How do I access the Top Glamping Brands list?',
    answer:
      'Request access on the Glamping Market Overview with your name and work email. Sage sends a secure magic-link sign-in — no password required. The same login unlocks market totals and the brand rankings.',
  },
];

export function glampingMarketOverviewFaqsForVariant(
  variant: GlampingMarketOverviewSeoVariant
): FAQItem[] {
  return variant === 'brands'
    ? [...GLAMPING_MARKET_BRANDS_FAQS, ...GLAMPING_MARKET_OVERVIEW_FAQS.slice(0, 2)]
    : GLAMPING_MARKET_OVERVIEW_FAQS;
}

export function buildGlampingMarketOverviewMetadata(
  variant: GlampingMarketOverviewSeoVariant
): Metadata {
  const path = glampingMarketOverviewPathForVariant(variant);
  const canonicalUrl = `${GLAMPING_MARKET_OVERVIEW_BASE_URL}${path}`;

  if (variant === 'brands') {
    const title = 'Top Glamping Brands in the US | Rankings & ADR | Sage';
    const description =
      'Rank the largest US glamping brands by property count, glamping units, and average nightly rates. Sage research for developers, investors, and lenders — free access with email sign-in.';
    return {
      title,
      description,
      keywords: [...GLAMPING_MARKET_OVERVIEW_KEYWORDS, 'top glamping brands', 'largest glamping companies'],
      openGraph: {
        title: 'Top Glamping Brands | Sage Outdoor Advisory',
        description,
        url: canonicalUrl,
        siteName: 'Sage Outdoor Advisory',
        type: 'website',
        images: [GLAMPING_MARKET_OVERVIEW_OG_IMAGE],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Top Glamping Brands in the US',
        description:
          'US glamping brand rankings by property count, units, and ADR — Sage Outdoor Advisory market research.',
        images: [GLAMPING_MARKET_OVERVIEW_OG_IMAGE.url],
      },
      alternates: {
        canonical: canonicalUrl,
        ...generateEnOnlyHreflangAlternates(path),
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    };
  }

  const title = 'Glamping Market Overview | US & Canada Supply, ADR & Unit Data | Sage';
  const description =
    'Research-grade glamping market snapshot for the US and Canada: property counts, unit inventory, mean and median ADR, top unit types, and state maps. Private commercial glamping only — free access with email sign-in.';
  return {
    title,
    description,
    keywords: [...GLAMPING_MARKET_OVERVIEW_KEYWORDS],
    openGraph: {
      title: 'Glamping Market Overview | Sage Outdoor Advisory',
      description,
      url: canonicalUrl,
      siteName: 'Sage Outdoor Advisory',
      type: 'website',
      images: [GLAMPING_MARKET_OVERVIEW_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Glamping Market Overview — US & Canada',
      description:
        'Glamping supply, ADR benchmarks, and geographic rankings from Sage Outdoor Advisory. Sign in free to unlock full metrics.',
      images: [GLAMPING_MARKET_OVERVIEW_OG_IMAGE.url],
    },
    alternates: {
      canonical: canonicalUrl,
      ...generateEnOnlyHreflangAlternates(path),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export function generateGlampingMarketOverviewWebPageSchema(
  variant: GlampingMarketOverviewSeoVariant
) {
  const path = glampingMarketOverviewPathForVariant(variant);
  const url = `${GLAMPING_MARKET_OVERVIEW_BASE_URL}${path}`;
  const isBrands = variant === 'brands';
  const name = isBrands
    ? 'Top Glamping Brands — United States Rankings'
    : 'Glamping Market Overview — US & Canada';
  const description = isBrands
    ? 'Rankings of the largest United States glamping brands by published property count, glamping units, and average retail nightly rates from Sage Outdoor Advisory research.'
    : 'Aggregated glamping market metrics for private commercial operators in the United States and Canada, including property counts, unit inventory, ADR benchmarks, and geographic breakdowns.';

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
    inLanguage: 'en-US',
    isAccessibleForFree: false,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Sage Outdoor Advisory Resources',
      url: GLAMPING_MARKET_OVERVIEW_BASE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sage Outdoor Advisory',
      url: 'https://sageoutdooradvisory.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://sageoutdooradvisory.com/logo.png',
      },
    },
    author: generateSageContentAuthorSchema(),
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['.speakable-answer', '#glamping-market-public-seo h1', '#glamping-market-public-seo h2'],
    },
    about: {
      '@type': 'Thing',
      name: 'Glamping market intelligence',
      description:
        'Market-level data on glamping supply, rates, and geography for outdoor hospitality research.',
    },
    spatialCoverage: [
      { '@type': 'Country', name: 'United States' },
      { '@type': 'Country', name: 'Canada' },
    ],
  };
}

export function generateGlampingMarketOverviewDatasetSchema(
  variant: GlampingMarketOverviewSeoVariant
) {
  const path = glampingMarketOverviewPathForVariant(variant);
  const url = `${GLAMPING_MARKET_OVERVIEW_BASE_URL}${path}`;
  const isBrands = variant === 'brands';

  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: isBrands
      ? 'US Top Glamping Brands Rankings'
      : 'North America Glamping Market Snapshot',
    description: isBrands
      ? 'Ranked list of the largest US glamping operators by published Glamping property count, with unit totals and average retail nightly rates from Sage Outdoor Advisory.'
      : 'Aggregated counts of private commercial glamping properties and units, retail ADR benchmarks, unit-type mix, and US state / Canadian province breakdowns maintained by Sage Outdoor Advisory.',
    keywords: GLAMPING_MARKET_OVERVIEW_KEYWORDS,
    creator: {
      '@type': 'Organization',
      name: 'Sage Outdoor Advisory',
      url: 'https://sageoutdooradvisory.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Sage Outdoor Advisory',
      url: 'https://sageoutdooradvisory.com',
    },
    spatialCoverage: {
      '@type': 'Place',
      name: 'United States and Canada',
    },
    temporalCoverage: '2024-01-01/..',
    isAccessibleForFree: false,
    distribution: {
      '@type': 'DataDownload',
      contentUrl: url,
      encodingFormat: 'text/html',
      description: 'Interactive research dashboard (email sign-in required)',
    },
    license: {
      '@type': 'CreativeWork',
      name: 'All Rights Reserved — Sage Outdoor Advisory',
      url: GLAMPING_MARKET_OVERVIEW_BASE_URL,
    },
  };
}

export function generateGlampingMarketOverviewBreadcrumbSchema(
  variant: GlampingMarketOverviewSeoVariant
) {
  const items = [
    {
      '@type': 'ListItem' as const,
      position: 1,
      name: 'Resources',
      item: GLAMPING_MARKET_OVERVIEW_BASE_URL,
    },
    {
      '@type': 'ListItem' as const,
      position: 2,
      name: 'Glamping Market Overview',
      item: `${GLAMPING_MARKET_OVERVIEW_BASE_URL}${OVERVIEW_PATH}`,
    },
  ];

  if (variant === 'brands') {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: 'Top Glamping Brands',
      item: `${GLAMPING_MARKET_OVERVIEW_BASE_URL}${BRANDS_PATH}`,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

export function generateGlampingMarketOverviewJsonLd(
  variant: GlampingMarketOverviewSeoVariant
) {
  const faqs = glampingMarketOverviewFaqsForVariant(variant);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      generateGlampingMarketOverviewWebPageSchema(variant),
      generateGlampingMarketOverviewDatasetSchema(variant),
      generateGlampingMarketOverviewBreadcrumbSchema(variant),
      generateFAQSchema(faqs),
    ],
  };
}

export function resolveGlampingMarketOverviewSeoVariant(
  pathname: string | null | undefined
): GlampingMarketOverviewSeoVariant {
  if (pathname?.includes('/brands')) return 'brands';
  return 'overview';
}
