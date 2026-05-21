import { Metadata } from "next";
import { getAllGuideSlugs, getGuidesByCategory, getGuideSync } from "@/lib/guides";
import GuidesIndex from "@/components/GuidesIndex";
import { GuidesEnglishNotice } from "@/components/guides/GuidesEnglishNotice";
import { EditorialCtaBand } from "@/components/editorial/EditorialCtaBand";
import { EditorialMarketingLayout } from "@/components/editorial/EditorialMarketingLayout";
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
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

  const t = await getTranslations({ locale, namespace: "guides.metadata" });
  const pathname = `/${locale}/guides`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
    openGraph: {
      title: t("openGraph.title"),
      description: t("openGraph.description"),
      url,
      siteName: "Sage Outdoor Advisory",
      locale: getOpenGraphLocale(locale as Locale),
      type: "website",
      images: [
        {
          url: "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg",
          width: 1920,
          height: 1080,
          alt: "Outdoor hospitality guides background featuring scenic landscape gradient",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: ["https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg"],
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
        "max-image-preview": "large",
      },
    },
  };
}

export default async function GuidesPage({ params }: PageProps) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'guides' });

  const allGuides = getAllGuideSlugs()
    .map((slug) => getGuideSync(slug))
    .filter((guide): guide is NonNullable<typeof guide> => guide !== null);
  const feasibilityGuides = getGuidesByCategory("feasibility");
  const appraisalGuides = getGuidesByCategory("appraisal");
  const industryGuides = getGuidesByCategory("industry");

  const categories = [
    {
      id: "feasibility",
      name: t('categories.feasibility.name'),
      description: t('categories.feasibility.description'),
      guides: feasibilityGuides,
      pillarPages: feasibilityGuides.filter((guide) =>
        guide.slug.endsWith("-complete-guide")
      ),
      clusterPages: feasibilityGuides.filter(
        (guide) => !guide.slug.endsWith("-complete-guide")
      ),
    },
    {
      id: "appraisal",
      name: t('categories.appraisal.name'),
      description: t('categories.appraisal.description'),
      guides: appraisalGuides,
      pillarPages: appraisalGuides.filter((guide) =>
        guide.slug.endsWith("-complete-guide")
      ),
      clusterPages: appraisalGuides.filter(
        (guide) => !guide.slug.endsWith("-complete-guide")
      ),
    },
    {
      id: "industry",
      name: t('categories.industry.name'),
      description: t('categories.industry.description'),
      guides: industryGuides,
      pillarPages: industryGuides.filter((guide) =>
        guide.slug.endsWith("-complete-guide")
      ),
      clusterPages: industryGuides.filter(
        (guide) => !guide.slug.endsWith("-complete-guide")
      ),
    },
  ];

  const tNotice = await getTranslations({ locale, namespace: "guides.englishNotice" });

  return (
    <EditorialMarketingLayout locale={locale} title={t('title')} subtitle={t('subtitle')} topoOpacity={2}>
      <GuidesEnglishNotice
        locale={locale}
        message={tNotice("message")}
        linkLabel={tNotice("link")}
      />
      <GuidesIndex allGuides={allGuides} categories={categories} locale={locale} />
      <EditorialCtaBand
        title={t('cta.title')}
        description={t('cta.description')}
        buttonLabel={t('cta.button')}
        buttonHref="https://sageoutdooradvisory.com/contact-us/"
        external
      />
    </EditorialMarketingLayout>
  );
}
