import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { EditorialMarketingLayout } from '@/components/editorial/EditorialMarketingLayout';
import {
  EDITORIAL_BODY_CLASS,
  EDITORIAL_H2_CLASS,
  EDITORIAL_LINK_CLASS,
} from '@/components/editorial/EditorialPageShell';
import { locales, type Locale } from '@/i18n';
import { generateHreflangAlternates, getOpenGraphLocale } from '@/lib/i18n-utils';
import { JOURNEY_CASE_PAGES } from '@/lib/journey-case-pages';

const OG_IMAGE =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg';

interface PageProps {
  params: { locale: string };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = params;
  if (!locales.includes(locale as Locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'journeys' });
  const pathname = `/${locale}/journeys`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;

  return {
    title: t('index.metaTitle'),
    description: t('index.metaDescription'),
    openGraph: {
      title: t('index.metaTitle'),
      description: t('index.metaDescription'),
      url,
      siteName: 'Sage Outdoor Advisory',
      locale: getOpenGraphLocale(locale as Locale),
      type: 'website',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: t('index.title') }],
    },
    twitter: {
      card: 'summary_large_image',
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

export default async function JourneysIndexPage({ params }: PageProps) {
  const { locale } = params;
  if (!locales.includes(locale as Locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'journeys' });

  return (
    <EditorialMarketingLayout
      locale={locale}
      title={t('index.title')}
      subtitle={t('index.subtitle')}
      footerVariant="full"
      topoOpacity={3}
    >
      <p className={`max-w-2xl ${EDITORIAL_BODY_CLASS}`}>{t('index.intro')}</p>
      <p className="mt-4 max-w-2xl text-sm font-light italic leading-relaxed text-neutral-500">
        {t('index.compositeNote')}
      </p>

      <section className="mt-12">
        <h2 className={EDITORIAL_H2_CLASS}>{t('index.listHeading')}</h2>
        <ul className="mt-6 divide-y divide-sage-200/70 border-y border-sage-200/70">
          {JOURNEY_CASE_PAGES.map((journey) => (
            <li key={journey.slug} className="py-5">
              <Link href={`/${locale}/journeys/${journey.slug}`} className="group block">
                <span className="text-lg font-light text-neutral-900 group-hover:text-sage-800">
                  {journey.title}
                </span>
                <span className="mt-1 block text-xs font-light uppercase tracking-widest text-neutral-500">
                  {journey.patternLabel}
                </span>
                <p className={`mt-2 max-w-2xl text-sm ${EDITORIAL_BODY_CLASS}`}>
                  {journey.metaDescription}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </EditorialMarketingLayout>
  );
}
