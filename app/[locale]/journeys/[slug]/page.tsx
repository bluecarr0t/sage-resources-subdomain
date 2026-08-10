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
  EDITORIAL_SECTION_LABEL_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { locales, type Locale } from '@/i18n';
import { generateHreflangAlternates, getOpenGraphLocale } from '@/lib/i18n-utils';
import {
  buildJourneyMapHref,
  getAllJourneyCaseSlugs,
  getJourneyCasePage,
  JOURNEY_CASE_PAGES,
  type JourneyCasePage,
} from '@/lib/journey-case-pages';
import { localizeInternalHref } from '@/lib/locale-links';
import { resourcesContactUsUrl } from '@/lib/root-domain-attribution';

const OG_IMAGE =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg';

interface PageProps {
  params: { locale: string; slug: string };
}

function studyFocusLabel(journey: JourneyCasePage, t: Awaited<ReturnType<typeof getTranslations>>): string {
  switch (journey.studyFocus) {
    case 'feasibility':
      return t('focus.feasibility');
    case 'appraisal':
      return t('focus.appraisal');
    case 'both':
      return t('focus.both');
    default: {
      const _exhaustive: never = journey.studyFocus;
      return _exhaustive;
    }
  }
}

export function generateStaticParams() {
  const slugs = getAllJourneyCaseSlugs();
  return locales.flatMap((locale) => slugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = params;
  if (!locales.includes(locale as Locale)) notFound();

  const journey = getJourneyCasePage(slug);
  if (!journey) notFound();

  const pathname = `/${locale}/journeys/${slug}`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;

  return {
    title: journey.metaTitle,
    description: journey.metaDescription,
    keywords: [
      'glamping comps map',
      'feasibility study financing',
      'USPAP appraisal',
      'outdoor hospitality underwriting',
      'bank-ready feasibility study',
    ],
    openGraph: {
      title: journey.metaTitle,
      description: journey.metaDescription,
      url,
      siteName: 'Sage Outdoor Advisory',
      locale: getOpenGraphLocale(locale as Locale),
      type: 'article',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: journey.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: journey.metaTitle,
      description: journey.metaDescription,
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

export default async function JourneyCasePageRoute({ params }: PageProps) {
  const { locale, slug } = params;
  if (!locales.includes(locale as Locale)) notFound();

  const journey = getJourneyCasePage(slug);
  if (!journey) notFound();

  const t = await getTranslations({ locale, namespace: 'journeys' });
  const attributionPath = `/journeys/${journey.slug}`;
  const contactHref = resourcesContactUsUrl(attributionPath);
  const mapHref = buildJourneyMapHref(locale, journey);
  const related = JOURNEY_CASE_PAGES.filter((p) => p.slug !== journey.slug).slice(0, 3);

  return (
    <EditorialMarketingLayout
      locale={locale}
      title={journey.title}
      subtitle={journey.patternLabel}
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
            <Link href={`/${locale}/journeys`} className={EDITORIAL_LINK_CLASS}>
              {t('breadcrumb.journeys')}
            </Link>
          </li>
          <li aria-hidden="true" className="text-neutral-400">
            /
          </li>
          <li className="text-neutral-700" aria-current="page">
            {journey.title}
          </li>
        </ol>
      </nav>

      <p className={`max-w-2xl ${EDITORIAL_BODY_CLASS}`}>{journey.intro}</p>
      <p className="mt-4 max-w-2xl text-sm font-light italic leading-relaxed text-neutral-500">
        {journey.compositeNote}
      </p>

      <p className="mt-6 text-[11px] font-light uppercase tracking-widest text-neutral-500">
        {t('focusLabel')}: {studyFocusLabel(journey, t)}
      </p>

      <section className="mt-12 space-y-10">
        <h2 className={EDITORIAL_H2_CLASS}>{t('stepsHeading')}</h2>
        {journey.steps.map((step) => (
          <article key={step.title} className="border-t border-sage-200/70 pt-6">
            <h3 className="text-lg font-light text-neutral-900">{step.title}</h3>
            <p className={`mt-3 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>{step.body}</p>
            {step.href ? (
              <p className="mt-3">
                <Link
                  href={localizeInternalHref(step.href, locale)}
                  className={EDITORIAL_LINK_CLASS}
                >
                  {step.hrefLabel ?? t('learnMore')}
                </Link>
              </p>
            ) : null}
          </article>
        ))}
      </section>

      <section className="mt-12 border border-sage-200/80 bg-white/40 p-6">
        <p className={EDITORIAL_SECTION_LABEL_CLASS}>{t('outcomeHeading')}</p>
        <p className={`mt-3 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>{journey.outcome}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={mapHref} className={EDITORIAL_BUTTON_OUTLINE_CLASS}>
            {t('openMapCta')}
          </Link>
          {journey.marketSlug ? (
            <Link
              href={`/${locale}/markets/${journey.marketSlug}`}
              className={EDITORIAL_BUTTON_OUTLINE_CLASS}
            >
              {t('openMarketCta')}
            </Link>
          ) : null}
          <Link
            href={`/${locale}/landing/${journey.landingSlug}`}
            className={EDITORIAL_BUTTON_OUTLINE_CLASS}
          >
            {t('openLandingCta')}
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
                  href={`/${locale}/journeys/${page.slug}`}
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
