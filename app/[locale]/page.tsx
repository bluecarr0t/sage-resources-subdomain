import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import dynamic from 'next/dynamic';

const HOME_HERO_IMAGE_URL =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/tipi.jpg';
const HOME_HERO_IMAGE_ALT =
  'Glamping accommodation at dusk—representing outdoor hospitality supply and market research resources for developers and investors';
import { getAllGuideSlugs, getGuideSync } from "@/lib/guides";
import { getAllGlossaryTerms } from "@/lib/glossary/index";
import { getGlossaryCategoryAccent } from "@/lib/glossary-category-accent";
import { generateOrganizationSchema, generateItemListSchemaWithUrls, generateFAQSchema, type FAQItem } from "@/lib/schema";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import CountUpMetric from "@/components/editorial/CountUpMetric";
import { EditorialPageShell } from "@/components/editorial/EditorialPageShell";
import {
  EDITORIAL_BODY_CLASS,
  EDITORIAL_BUTTON_OUTLINE_CLASS,
  EDITORIAL_BUTTON_PRIMARY_CLASS,
  EDITORIAL_CARD_CLASS,
  EDITORIAL_GLOSSARY_TERM_TITLE_CLASS,
  EDITORIAL_H2_CLASS,
  EDITORIAL_METRIC_VALUE_CLASS,
  EDITORIAL_SECTION_LABEL_CLASS,
} from "@/components/editorial/EditorialPageShell";
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { createLocaleLinks } from "@/lib/locale-links";
import { getPublicMapDisplayedPropertyCount } from "@/lib/public-map-property-count";
import { roundDownToStep } from "@/lib/round-down-to-step";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createServerClientWithCookies } from "@/lib/supabase-server";

// Dynamically import LocationSearch to prevent SSR issues
const DynamicLocationSearch = dynamic(() => import('@/components/LocationSearch'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-2xl">
      <div className="animate-pulse rounded-2xl border border-white/20 bg-white/95 p-4 shadow-2xl backdrop-blur-sm">
        <div className="h-14 rounded-xl bg-neutral-200/60" />
      </div>
    </div>
  ),
});

interface PageProps {
  params: {
    locale: string;
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { locale } = params;
    
    // Validate locale
    if (!locales.includes(locale as Locale)) {
      notFound();
    }
    
    const pathname = `/${locale}`;
    const url = `https://resources.sageoutdooradvisory.com${pathname}`;
    
    // Load translations for metadata
    let t;
    try {
      t = await getTranslations({ locale, namespace: 'home' });
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to English metadata if translations fail
      t = await getTranslations({ locale: 'en', namespace: 'home' });
    }
    
    const title = t('metadata.title');
    const description = t('metadata.description');
    const keywords = t('metadata.keywords');
    
    let hreflangAlternates: Metadata['alternates'] = {};
    try {
      hreflangAlternates = generateHreflangAlternates(pathname);
    } catch (error) {
      console.error('Error generating hreflang alternates:', error);
      hreflangAlternates = {};
    }
    
    let openGraphLocale = 'en_US';
    try {
      openGraphLocale = getOpenGraphLocale(locale as Locale);
    } catch (error) {
      console.error('Error getting OpenGraph locale:', error);
    }
    
    return {
      title,
      description,
      keywords,
      openGraph: {
        title,
        description,
        url,
        siteName: "Sage Outdoor Advisory",
        locale: openGraphLocale,
        type: "website",
        images: [
          {
            url: "https://sageoutdooradvisory.com/og-image.jpg",
            width: 1200,
            height: 630,
            alt: "Sage Outdoor Advisory - Outdoor Hospitality Resources",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ["https://sageoutdooradvisory.com/og-image.jpg"],
      },
      alternates: {
        canonical: url,
        ...hreflangAlternates,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    // Return basic metadata as fallback
    return {
      title: "Sage Outdoor Advisory - Outdoor Hospitality Resources",
      description: "Comprehensive resources for the outdoor hospitality industry.",
    };
  }
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = params;
  
  // Check if user is authenticated and redirect to admin if so
  // This handles OAuth redirects that land on home page instead of /admin
  const supabase = await createServerClientWithCookies();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    // Check if user has access (domain + managed_users)
    const { isManagedUser, isAllowedEmailDomain } = await import('@/lib/auth-helpers');
    if (isAllowedEmailDomain(session.user.email) && await isManagedUser(session.user.id)) {
      redirect('/admin/dashboard');
    }
  }
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  try {
    // Load translations
    const t = await getTranslations({ locale, namespace: 'home' });
    
    // Create locale-aware links
    const links = createLocaleLinks(locale);
    
    // Get featured content for homepage with error handling
    let allGuides: Array<NonNullable<ReturnType<typeof getGuideSync>>> = [];
    try {
      const guideSlugs = getAllGuideSlugs();
      allGuides = guideSlugs
        .map(slug => {
          try {
            return getGuideSync(slug);
          } catch (error) {
            console.error(`Error loading guide ${slug}:`, error);
            return null;
          }
        })
        .filter((guide): guide is NonNullable<typeof guide> => guide !== null);
    } catch (error) {
      console.error('Error loading guides:', error);
      allGuides = [];
    }
    
    const pillarGuides = allGuides.filter(guide => guide?.slug.endsWith("-complete-guide")).slice(0, 3);
    
    let glossaryTerms: ReturnType<typeof getAllGlossaryTerms> = [];
    try {
      glossaryTerms = getAllGlossaryTerms();
    } catch (error) {
      console.error('Error loading glossary terms:', error);
      glossaryTerms = [];
    }
    const featuredTerms = glossaryTerms.slice(0, 12); // Top 12 terms

    const mapPropertyCount = await getPublicMapDisplayedPropertyCount();
    const benchmarkCountDisplay = roundDownToStep(mapPropertyCount, 25);

    // Homepage FAQs from translations
    const homepageFAQs: FAQItem[] = t.raw('faq.items') as FAQItem[];

    // Generate schema markup
    const organizationSchema = generateOrganizationSchema();
    // Generate ItemList with URLs for carousel eligibility
    const guidesListSchema = generateItemListSchemaWithUrls(
      pillarGuides
        .filter((guide): guide is NonNullable<typeof guide> => guide !== null)
        .map(guide => ({
          name: guide.hero.headline,
          url: links.guide(guide.slug)
        })),
      "Featured Guides"
    );
    // Generate FAQPage schema
    const faqSchema = generateFAQSchema(homepageFAQs);

    return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guidesListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <GoogleMapsProvider>
        <EditorialPageShell footer={null}>
          <FloatingHeader locale={locale} showFullNav showSpacer={false} />

          <section className="relative min-h-[min(100svh,52rem)] w-full">
            <Image
              src={HOME_HERO_IMAGE_URL}
              alt={HOME_HERO_IMAGE_ALT}
              fill
              className="object-cover"
              priority
              fetchPriority="high"
              quality={90}
              sizes="100vw"
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-neutral-900/55 via-sage-900/45 to-sage-800/50"
              aria-hidden
            />
            <div className="relative z-10 flex min-h-[min(100svh,52rem)] flex-col items-center justify-center px-4 pb-20 pt-28 sm:pt-36">
              <div className="mx-auto w-full max-w-4xl text-center text-white">
                <h1 className="text-4xl font-bold tracking-tight drop-shadow-md sm:text-5xl md:text-6xl lg:text-7xl">
                  {t('hero.headline')}
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-white/95 drop-shadow sm:text-xl md:text-2xl">
                  {t('hero.subheadline', { count: benchmarkCountDisplay })}
                </p>
                <div className="mx-auto mt-10 max-w-2xl">
                  <DynamicLocationSearch locale={locale} variant="default" />
                </div>
                <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] font-light uppercase tracking-widest text-white/85">
                  <li>{t('hero.quickStats.properties', { count: mapPropertyCount })}</li>
                  <li>{t('hero.quickStats.usCanada')}</li>
                  <li>{t('hero.quickStats.verified')}</li>
                </ul>
              </div>
            </div>
          </section>

          <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-x-visible px-6 pb-20 pt-14 sm:pb-28">
            <section className="grid gap-10 border-b border-sage-200/80 pb-14 sm:grid-cols-3">
              <div>
                <p className={EDITORIAL_SECTION_LABEL_CLASS}>{t('stats.properties')}</p>
                <CountUpMetric
                  value={mapPropertyCount}
                  className={EDITORIAL_METRIC_VALUE_CLASS}
                  durationMs={2500}
                />
              </div>
              <div>
                <p className={EDITORIAL_SECTION_LABEL_CLASS}>{t('stats.guides')}</p>
                <CountUpMetric value={21} className={EDITORIAL_METRIC_VALUE_CLASS} durationMs={2500} />
              </div>
              <div>
                <p className={EDITORIAL_SECTION_LABEL_CLASS}>{t('stats.glossary')}</p>
                <CountUpMetric
                  value={57}
                  className={EDITORIAL_METRIC_VALUE_CLASS}
                  durationMs={2500}
                />
              </div>
            </section>

            {pillarGuides.length > 0 && (
              <section className="mt-14 border-b border-sage-200/80 pb-14">
                <h2 className={EDITORIAL_H2_CLASS}>{t('sections.guides.title')}</h2>
                <p className={`mt-4 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>
                  {t('sections.guides.description')}
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  {pillarGuides.map((guide) => {
                    if (!guide) return null;
                    const categoryLabel =
                      guide.category === 'feasibility'
                        ? 'Feasibility'
                        : guide.category === 'appraisal'
                          ? 'Appraisal'
                          : 'Industry';
                    return (
                      <Link
                        key={guide.slug}
                        href={links.guide(guide.slug)}
                        className={`${EDITORIAL_CARD_CLASS} group`}
                      >
                        <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                          {categoryLabel}
                        </span>
                        <h3 className={`mt-2 ${EDITORIAL_GLOSSARY_TERM_TITLE_CLASS} group-hover:text-sage-800`}>
                          {guide.hero.headline}
                        </h3>
                        {guide.hero.subheadline ? (
                          <p className="mt-2 line-clamp-2 text-xs font-light leading-relaxed text-neutral-600">
                            {guide.hero.subheadline}
                          </p>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-8">
                  <Link href={links.guides} className={EDITORIAL_BUTTON_OUTLINE_CLASS}>
                    {t('sections.guides.cta')}
                  </Link>
                </div>
              </section>
            )}

            <section className="mt-14 border-b border-sage-200/80 pb-14">
              <h2 className={EDITORIAL_H2_CLASS}>{t('sections.map.title')}</h2>
              <p className={`mt-4 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>{t('sections.map.description')}</p>
              <Link href={links.map} className={`${EDITORIAL_BUTTON_PRIMARY_CLASS} mt-6`}>
                {t('sections.map.cta')}
              </Link>
            </section>

            {featuredTerms.length > 0 && (
              <section className="mt-14 border-b border-sage-200/80 pb-14">
                <h2 className={EDITORIAL_H2_CLASS}>{t('sections.glossary.title')}</h2>
                <p className={`mt-4 max-w-2xl ${EDITORIAL_BODY_CLASS}`}>
                  {t('sections.glossary.description')}
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {featuredTerms.slice(0, 8).map((term) => {
                    const accent = getGlossaryCategoryAccent(term.category);
                    return (
                      <Link
                        key={term.slug}
                        href={links.glossaryTerm(term.slug)}
                        className={`${EDITORIAL_CARD_CLASS} group ${accent.card}`}
                      >
                        <span
                          className={`text-[10px] font-medium uppercase tracking-wider ${accent.label}`}
                        >
                          {term.category}
                        </span>
                        <h3
                          className={`mt-2 ${EDITORIAL_GLOSSARY_TERM_TITLE_CLASS} transition-colors group-hover:text-sage-800`}
                        >
                          {term.term}
                        </h3>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-8">
                  <Link href={links.glossary} className={EDITORIAL_BUTTON_OUTLINE_CLASS}>
                    {t('sections.glossary.cta')}
                  </Link>
                </div>
              </section>
            )}

            <section className="mt-14 border border-sage-200/90 bg-white/40 px-6 py-10 sm:px-8">
              <h2 className={EDITORIAL_H2_CLASS}>{t('sections.cta.title')}</h2>
              <p className={`mt-4 max-w-xl ${EDITORIAL_BODY_CLASS}`}>{t('sections.cta.description')}</p>
              <a
                href="https://sageoutdooradvisory.com/contact-us/"
                target="_blank"
                rel="noopener noreferrer"
                className={`${EDITORIAL_BUTTON_OUTLINE_CLASS} mt-6`}
              >
                {t('sections.cta.button')}
              </a>
            </section>

            <section className="mt-14">
              <h2 className={EDITORIAL_H2_CLASS}>{t('faq.title')}</h2>
              <p className={`mt-4 ${EDITORIAL_BODY_CLASS}`}>{t('faq.subtitle')}</p>
              <dl className="mt-8 space-y-8">
                {homepageFAQs.map((faq, index) => (
                  <div key={index}>
                    <dt className="text-sm font-bold text-neutral-900">{faq.question}</dt>
                    <dd className={`mt-2 border-l border-sage-200 pl-4 ${EDITORIAL_BODY_CLASS}`}>
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          </main>
          <Footer locale={locale} />
        </EditorialPageShell>
      </GoogleMapsProvider>
    </>
    );
  } catch (error) {
    // Log the error for debugging
    console.error('Error rendering home page:', error);
    
    // Re-throw the error to trigger the error boundary
    throw error;
  }
}