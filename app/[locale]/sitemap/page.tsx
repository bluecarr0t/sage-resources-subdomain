import { Metadata } from "next";
import Link from "next/link";
import { getAllGuideSlugs, getGuideSync } from "@/lib/guides";
import { getAllGlossaryTerms } from "@/lib/glossary/index";
import { getTopStates, getTopCities, slugifyLocation, createCitySlug } from "@/lib/location-helpers";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { createLocaleLinks } from "@/lib/locale-links";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

interface PageProps {
  params: {
    locale: string;
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const pathname = `/${locale}/sitemap`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;
  const t = await getTranslations({ locale, namespace: "sitemap" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url,
      siteName: "Sage Outdoor Advisory",
      locale: getOpenGraphLocale(locale as Locale),
      type: "website",
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

export default async function SitemapPage({ params }: PageProps) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "sitemap" });
  const links = createLocaleLinks(locale);

  const [topStates, topCities] = await Promise.all([
    getTopStates(50),
    getTopCities(100),
  ]);

  const guideSlugs = getAllGuideSlugs();
  const guides = guideSlugs
    .map((slug) => getGuideSync(slug))
    .filter((g): g is NonNullable<typeof g> => g !== null);

  const glossaryTerms = getAllGlossaryTerms();

  return (
    <div className="min-h-screen bg-white">
      <FloatingHeader locale={locale} showSpacer={false} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">{t("title")}</h1>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            {t("mainPages")}
          </h2>
          <ul className="space-y-2">
            <li>
              <Link href={links.home} className="text-[#006b5f] hover:underline">
                Home
              </Link>
            </li>
            <li>
              <Link href={links.map} className="text-[#006b5f] hover:underline">
                Glamping Properties Map
              </Link>
            </li>
            <li>
              <Link href={links.guides} className="text-[#006b5f] hover:underline">
                Guides
              </Link>
            </li>
            <li>
              <Link href={links.glossary} className="text-[#006b5f] hover:underline">
                Glossary
              </Link>
            </li>
            <li>
              <Link href={links.partners} className="text-[#006b5f] hover:underline">
                Partners
              </Link>
            </li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            {t("guides")}
          </h2>
          <ul className="space-y-2 columns-1 md:columns-2 gap-4">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={links.guide(guide.slug)}
                  className="text-[#006b5f] hover:underline"
                >
                  {guide.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            {t("mapLocations")}
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                {t("states")}
              </h3>
              <ul className="space-y-2">
                {topStates.slice(0, 25).map((stateData) => (
                  <li key={stateData.state}>
                    <Link
                      href={`${links.map}/${slugifyLocation(stateData.state)}`}
                      className="text-[#006b5f] hover:underline"
                    >
                      {stateData.state}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">
                {t("cities")}
              </h3>
              <ul className="space-y-2">
                {topCities.slice(0, 25).map((cityData) => (
                  <li key={`${cityData.city}-${cityData.state}`}>
                    <Link
                      href={`${links.map}/${createCitySlug(cityData.city, cityData.state)}`}
                      className="text-[#006b5f] hover:underline"
                    >
                      {cityData.city}, {cityData.state}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-gray-600">
            <Link href={links.map} className="text-[#006b5f] font-semibold hover:underline">
              {t("exploreMap")} →
            </Link>
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
            {t("glossary")}
          </h2>
          <ul className="space-y-2 columns-1 md:columns-2 gap-4">
            {glossaryTerms.slice(0, 50).map((term) => (
              <li key={term.slug}>
                <Link
                  href={links.glossaryTerm(term.slug)}
                  className="text-[#006b5f] hover:underline"
                >
                  {term.term}
                </Link>
              </li>
            ))}
          </ul>
          {glossaryTerms.length > 50 && (
            <p className="mt-4">
              <Link href={links.glossary} className="text-[#006b5f] font-semibold hover:underline">
                View all {glossaryTerms.length} terms →
              </Link>
            </p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
