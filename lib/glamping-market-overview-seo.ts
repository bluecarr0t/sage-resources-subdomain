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
  alt: '2026 glamping market data: US and Canada private commercial supply, rates, and brand rankings by Sage Outdoor Advisory',
} as const;

/** Calendar year surfaced in titles/snippets for SERP freshness vs dated blog posts. */
export const GLAMPING_MARKET_OVERVIEW_SEO_YEAR = 2026;

export type GlampingMarketOverviewSeoVariant = 'overview' | 'brands';

const OVERVIEW_PATH = '/glamping-market-overview';
const BRANDS_PATH = '/glamping-market-overview/brands';

export function glampingMarketOverviewPathForVariant(
  variant: GlampingMarketOverviewSeoVariant
): string {
  return variant === 'brands' ? BRANDS_PATH : OVERVIEW_PATH;
}

export const GLAMPING_MARKET_OVERVIEW_KEYWORDS = [
  'glamping data',
  'glamping market data',
  'glamping market data 2026',
  'glamping statistics',
  'glamping industry report',
  'glamping market size',
  'glamping market overview',
  'glamping industry statistics',
  'glamping ARDR',
  'average retail daily rate glamping',
  'glamping supply data',
  'US glamping market',
  'Canada glamping market',
  'North American glamping data',
  'glamping property count',
  'outdoor hospitality market research',
  'glamping feasibility data',
  'glamping brand rankings',
  'top glamping brands',
  'largest glamping companies',
] as const;

export const GLAMPING_MARKET_OVERVIEW_FAQS: FAQItem[] = [
  {
    question: 'Where can I find current glamping market data for 2026?',
    answer:
      'Sage Outdoor Advisory’s Glamping Market Overview is a live 2026 research dashboard for private commercial glamping in the United States and Canada. It covers property counts, unit inventory, average retail daily rates (ARDR), unit-type mix, and state or province rankings—updated on a rolling basis, not a one-time annual PDF.',
  },
  {
    question: 'What is the Sage Glamping Market Overview?',
    answer:
      'The Glamping Market Overview is Sage Outdoor Advisory’s research dashboard for private commercial glamping in the United States and Canada. It summarizes property counts, unit inventory, average retail daily rates (ARDR), top unit types, state and province breakdowns, and interactive US and Canada maps. Access is free after a quick email sign-in.',
  },
  {
    question: 'Which properties are included in the glamping market snapshot?',
    answer:
      'The snapshot includes private commercial operators whose primary product is glamping: safari tents, cabins, tiny homes, domes, yurts, and similar unit types, as classified in Sage research. It excludes RV parks, traditional campgrounds, hotels, OTA-only listings, and state or national park campgrounds. Newer discovery prefers multi-unit operators when inventory is known; this overview does not enforce a hard unit-count floor.',
  },
  {
    question: 'What glamping metrics can I see after signing in?',
    answer:
      'Signed-in users see total glamping properties (open, under construction, and proposed), total glamping units, mean and median retail nightly rates, top unit types by share of inventory, top US states or Canadian provinces, and filters for rustic, core, and upscale market tiers.',
  },
  {
    question: 'How often is the glamping market data updated?',
    answer:
      'Sage refreshes the Glamping Market Overview on a rolling basis as new properties are researched and published in the Sage database. Each view shows a “Last updated” date so you know how current the 2026 snapshot is—unlike static annual trend posts.',
  },
  {
    question: 'Who uses Sage glamping market data?',
    answer:
      'Developers, investors, lenders, brands, and consultants use Sage glamping market intelligence for feasibility studies, appraisals, competitive benchmarking, and site selection. The data supports underwriting assumptions on supply, avg. retail daily rate (ARDR), and unit mix.',
  },
  {
    question: 'Is the Glamping Market Overview the same as the interactive map?',
    answer:
      'The public interactive map shows individual glamping properties with filters. The Market Overview aggregates that research into market-level totals, rate benchmarks, and geographic rankings with US state and Canada province maps, designed for market sizing rather than property-by-property discovery.',
  },
];

export const GLAMPING_MARKET_BRANDS_FAQS: FAQItem[] = [
  {
    question: 'What is the Top Glamping Brands ranking?',
    answer:
      'The Top Glamping Brands page ranks the largest multi-property glamping operators in the United States by published Glamping property count. Each row shows properties, glamping units, and average retail nightly rate where rates are published. Portfolio brands roll up sub-brand locations. Rankings refresh with Sage’s 2026 market research.',
  },
  {
    question: 'How does Sage define a glamping brand for this ranking?',
    answer:
      'Brands must have multiple published Glamping properties in the Sage database. Rankings use property type Glamping only, exclude public-land and marketplace-only operators, and attribute sub-brands to their portfolio parent where applicable.',
  },
  {
    question: 'How do I access the Top Glamping Brands list?',
    answer:
      'Request access on the Glamping Market Overview with your name and work email. Sage sends a secure magic-link sign-in; no password required. The same login unlocks market totals and the brand rankings.',
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
    const title = `Top Glamping Brands ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR} | US Rankings & Rates | Sage`;
    const description = `Compare the largest US glamping brands by property count, units, and average retail rates. Live ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR} Sage market data for developers and investors—free email access.`;
    return {
      title,
      description,
      keywords: [...GLAMPING_MARKET_OVERVIEW_KEYWORDS],
      openGraph: {
        title: `Top Glamping Brands ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR} | Sage Outdoor Advisory`,
        description,
        url: canonicalUrl,
        siteName: 'Sage Outdoor Advisory',
        type: 'website',
        images: [GLAMPING_MARKET_OVERVIEW_OG_IMAGE],
      },
      twitter: {
        card: 'summary_large_image',
        title: `Top Glamping Brands ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR} | US Rankings`,
        description: `US glamping brand rankings by property count, units, and avg. retail daily rate (ARDR). Live ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR} Sage market data.`,
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
          'max-video-preview': -1,
        },
      },
    };
  }

  // Lead with "Glamping Market Data YYYY" to match high-intent SERP queries (e.g. "glamping data")
  // and outrank dated annual blog posts that still hold positions for those terms.
  const title = `Glamping Market Data ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR} | US & Canada Supply & Rates | Sage`;
  const description = `Live ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR} glamping market data for the US & Canada: property counts, unit inventory, average retail daily rates (ARDR), unit-type mix, and state maps. Free email access.`;
  return {
    title,
    description,
    keywords: [...GLAMPING_MARKET_OVERVIEW_KEYWORDS],
    openGraph: {
      title: `Glamping Market Data ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR} | Sage Outdoor Advisory`,
      description,
      url: canonicalUrl,
      siteName: 'Sage Outdoor Advisory',
      type: 'website',
      images: [GLAMPING_MARKET_OVERVIEW_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Glamping Market Data ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR}: US & Canada`,
      description: `Live glamping supply, ARDR benchmarks, and geographic rankings from Sage Outdoor Advisory. Sign in free to unlock ${GLAMPING_MARKET_OVERVIEW_SEO_YEAR} metrics.`,
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
        'max-video-preview': -1,
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
  const year = GLAMPING_MARKET_OVERVIEW_SEO_YEAR;
  const name = isBrands
    ? `Top Glamping Brands ${year}: United States Rankings`
    : `Glamping Market Data ${year}: US & Canada`;
  const description = isBrands
    ? `Live ${year} rankings of the largest United States glamping brands by published property count, glamping units, and average retail nightly rates from Sage Outdoor Advisory research.`
    : `Live ${year} glamping market data for private commercial operators in the United States and Canada, including property counts, unit inventory, avg. retail daily rate (ARDR) benchmarks, and geographic breakdowns.`;

  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url,
    inLanguage: 'en-US',
    dateModified: `${year}-01-01`,
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
      name: 'Glamping market data',
      description:
        'Market-level data on glamping supply, rates, brands, and geography for outdoor hospitality research.',
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

  const year = GLAMPING_MARKET_OVERVIEW_SEO_YEAR;

  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: isBrands
      ? `US Top Glamping Brands Rankings ${year}`
      : `North America Glamping Market Data ${year}`,
    description: isBrands
      ? `Ranked list of the largest US glamping operators by published Glamping property count, with unit totals and average retail nightly rates from Sage Outdoor Advisory ${year} research.`
      : `Live ${year} glamping market data: aggregated counts of private commercial glamping properties and units, retail ARDR benchmarks, unit-type mix, and US state / Canadian province breakdowns maintained by Sage Outdoor Advisory.`,
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
    temporalCoverage: `${year}-01-01/..`,
    isAccessibleForFree: false,
    distribution: {
      '@type': 'DataDownload',
      contentUrl: url,
      encodingFormat: 'text/html',
      description: 'Interactive research dashboard (email sign-in required)',
    },
    license: {
      '@type': 'CreativeWork',
      name: 'All Rights Reserved, Sage Outdoor Advisory',
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
      name: 'Glamping Market Data',
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
