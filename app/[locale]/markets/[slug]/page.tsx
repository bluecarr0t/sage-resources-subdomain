import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EditorialMarketingLayout } from '@/components/editorial/EditorialMarketingLayout';
import { EditorialCtaBand } from '@/components/editorial/EditorialCtaBand';
import {
  EDITORIAL_BODY_CLASS,
  EDITORIAL_BUTTON_OUTLINE_CLASS,
  EDITORIAL_H2_CLASS,
  EDITORIAL_LINK_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { locales, type Locale } from '@/i18n';
import { generateHreflangAlternates, getOpenGraphLocale } from '@/lib/i18n-utils';
import { getStatePropertyStatistics } from '@/lib/map-data-utils';
import {
  buildMapDeepLinkPath,
  formatMarketLabel,
  getAllMapMarketSlugs,
  getMapMarketPage,
  MAP_MARKET_PAGES,
  type MapMarketPage,
} from '@/lib/map-market-pages';
import { resourcesContactUsUrl } from '@/lib/root-domain-attribution';

const OG_IMAGE =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg';

interface PageProps {
  params: { locale: string; slug: string };
}

export function generateStaticParams() {
  const slugs = getAllMapMarketSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = params;
  if (!locales.includes(locale as Locale)) notFound();

  const market = getMapMarketPage(slug);
  if (!market) notFound();

  const pathname = `/${locale}/markets/${slug}`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;

  return {
    title: market.metaTitle,
    description: market.metaDescription,
    keywords: [
      `${market.state} glamping`,
      'glamping market map',
      'glamping feasibility study',
      'campground appraisal',
      'outdoor hospitality comps',
    ],
    openGraph: {
      title: market.metaTitle,
      description: market.metaDescription,
      url,
      siteName: 'Sage Outdoor Advisory',
      locale: getOpenGraphLocale(locale as Locale),
      type: 'website',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: market.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: market.metaTitle,
      description: market.metaDescription,
      images: [OG_IMAGE],
    },
    alternates: {
      canonical: url,
      ...generateHreflangAlternates(pathname),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
      },
    },
  };
}

function studyFocusCopy(market: MapMarketPage): string {
  switch (market.studyFocus) {
    case 'feasibility':
      return 'feasibility';
    case 'appraisal':
      return 'appraisal';
    case 'both':
      return 'feasibility and appraisal';
    default: {
      const _exhaustive: never = market.studyFocus;
      return _exhaustive;
    }
  }
}

export default async function MarketPage({ params }: PageProps) {
  const { locale, slug } = params;
  if (!locales.includes(locale as Locale)) notFound();

  const market = getMapMarketPage(slug);
  if (!market) notFound();

  const t = await getTranslations({ locale, namespace: 'markets' });
  const stats = await getStatePropertyStatistics(market.state, locale);
  const mapHref = buildMapDeepLinkPath(locale, market);
  const attributionPath = `/markets/${market.slug}`;
  const contactHref = resourcesContactUsUrl(attributionPath);
  const related = MAP_MARKET_PAGES.filter(
    (p) => p.state === market.state && p.slug !== market.slug
  ).slice(0, 3);

  const adrLine =
    stats.averageRate != null
      ? t('adrSummary', {
          average: stats.averageRate,
          low: stats.lowRate ?? '—',
          high: stats.highRate ?? '—',
        })
      : t('adrSummaryFallback');

  return (
    <EditorialMarketingLayout
      locale={locale}
      title={market.title}
      subtitle={t('subtitle', { label: formatMarketLabel(market) })}
      footerVariant="full"
      topoOpacity={3}
    >
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-x-2 text-[11px] font-light uppercase tracking-widest text-neutral-500">
          <li>
            <Link href={`/${locale}`} className={EDITORIAL_LINK_CLASS}>
              {t('breadcrumb.home')}
            </Link>
          </li>
          <li aria-hidden="true" className="text-neutral-400">
            /
          </li>
          <li>
            <Link href={`/${locale}/markets`} className={EDITORIAL_LINK_CLASS}>
              {t('breadcrumb.markets')}
            </Link>
          </li>
          <li aria-hidden="true" className="text-neutral-400">
            /
          </li>
          <li className="text-neutral-700" aria-current="page">
            {formatMarketLabel(market)}
          </li>
        </ol>
      </nav>

      <p className={`max-w-2xl ${EDITORIAL_BODY_CLASS}`}>{market.intro}</p>

      <section className="mt-10 grid gap-6 border border-sage-200/80 bg-white/40 p-6 sm:grid-cols-3">
        <div>
          <p className="text-[11px] font-light uppercase tracking-widest text-neutral-500">
            {t('stats.comps')}
          </p>
          <p className="mt-2 text-2xl font-light tabular-nums text-neutral-900">
            {stats.uniqueProperties.toLocaleString()}
          </p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[11px] font-light uppercase tracking-widest text-neutral-500">
            {t('stats.adr')}
          </p>
          <p className={`mt-2 ${EDITORIAL_BODY_CLASS}`}>{adrLine}</p>
          <p className={`mt-2 text-sm ${EDITORIAL_BODY_CLASS}`}>{t('stats.occupancyNote')}</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className={EDITORIAL_H2_CLASS}>{t('studyHeading')}</h2>
        <p className={`mt-4 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>
          {t('studyBody', {
            market: formatMarketLabel(market),
            focus: studyFocusCopy(market),
            count: stats.uniqueProperties,
          })}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={mapHref} className={EDITORIAL_BUTTON_OUTLINE_CLASS}>
            {t('openMapCta')}
          </Link>
        </div>
      </section>

      {related.length > 0 ? (
        <section className="mt-12">
          <h2 className={EDITORIAL_H2_CLASS}>{t('relatedHeading')}</h2>
          <ul className="mt-4 space-y-2">
            {related.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/${locale}/markets/${page.slug}`}
                  className={EDITORIAL_LINK_CLASS}
                >
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <EditorialCtaBand
        title={t('ctaTitle')}
        description={t('ctaDescription')}
        buttonLabel={t('ctaButton')}
        buttonHref={contactHref}
        external
        buttonVariant="primary"
      />
    </EditorialMarketingLayout>
  );
}
