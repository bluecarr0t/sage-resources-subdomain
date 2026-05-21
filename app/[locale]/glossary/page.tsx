import { Metadata } from "next";
import { getAllGlossaryTerms, getGlossaryTermsByCategory } from "@/lib/glossary/index";
import GlossaryIndex from "@/components/GlossaryIndex";
import { GlossaryEnglishNotice } from "@/components/glossary/GlossaryEnglishNotice";
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

  const pathname = `/${locale}/glossary`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;
  const t = await getTranslations({ locale, namespace: 'glossary' });

  return {
    title: t('meta.title'),
    description: t('meta.description'),
    keywords: "outdoor hospitality glossary, glamping terms, RV resort definitions, feasibility study terms, hospitality industry glossary",
    openGraph: {
      title: t('meta.title'),
      description: t('meta.description'),
      url,
      siteName: "Sage Outdoor Advisory",
      locale: getOpenGraphLocale(locale as Locale),
      type: "website",
      images: [
        {
          url: "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg",
          width: 1920,
          height: 1080,
          alt: "Outdoor hospitality glossary background featuring natural landscape gradient",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: ["https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg"],
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

export default async function GlossaryPage({ params }: PageProps) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  let t;
  try {
    t = await getTranslations({ locale, namespace: 'glossary' });
  } catch (error) {
    console.error('Error loading translations:', error);
    throw new Error(`Failed to load translations for locale: ${locale}`);
  }

  let allTerms;
  try {
    allTerms = getAllGlossaryTerms();
  } catch (error) {
    console.error('Error loading glossary terms:', error);
    throw new Error('Failed to load glossary terms');
  }

  if (!Array.isArray(allTerms)) {
    throw new Error('getAllGlossaryTerms() did not return an array');
  }

  allTerms = allTerms.filter(term =>
    term &&
    typeof term === 'object' &&
    term.term &&
    typeof term.term === 'string' &&
    term.term.length > 0
  );

  const englishCategories = [
    'Feasibility & Appraisal',
    'Glamping',
    'RV & Campground',
    'Financial',
    'Real Estate',
    'General'
  ] as const;

  const translatedCategories = [
    t('categories.feasibilityAppraisal'),
    t('categories.glamping'),
    t('categories.rvCampground'),
    t('categories.financial'),
    t('categories.realEstate'),
    t('categories.general')
  ];

  const termsByLetter: Record<string, typeof allTerms> = {};
  allTerms.forEach(term => {
    if (!term?.term || typeof term.term !== 'string') return;
    const firstChar = term.term.trim().charAt(0);
    if (!firstChar) return;
    const letter = /[0-9]/.test(firstChar) ? "#" : firstChar.toUpperCase();
    if (!termsByLetter[letter]) {
      termsByLetter[letter] = [];
    }
    termsByLetter[letter].push(term);
  });

  Object.keys(termsByLetter).forEach(letter => {
    termsByLetter[letter].sort((a, b) => {
      const aTerm = a?.term || '';
      const bTerm = b?.term || '';
      return aTerm.localeCompare(bTerm, locale, { sensitivity: 'base' });
    });
  });

  const termsByCategory: Record<string, typeof allTerms> = {};
  translatedCategories.forEach((translatedCategory, index) => {
    if (translatedCategory && typeof translatedCategory === 'string' && translatedCategory.length > 0 && index < englishCategories.length) {
      const englishCategory = englishCategories[index];
      if (englishCategory) {
        try {
          const categoryTerms = getGlossaryTermsByCategory(englishCategory);
          termsByCategory[translatedCategory] = Array.isArray(categoryTerms)
            ? categoryTerms.filter(term =>
                term &&
                typeof term === 'object' &&
                term.term &&
                typeof term.term === 'string'
              )
            : [];
        } catch (error) {
          console.error(`Error getting terms for category ${englishCategory}:`, error);
          termsByCategory[translatedCategory] = [];
        }
      }
    }
  });

  const validCategories = translatedCategories.filter((cat): cat is string =>
    typeof cat === 'string' && cat.length > 0
  );

  return (
    <EditorialMarketingLayout
      locale={locale}
      title={t('title')}
      subtitle={t('subtitle')}
      solidPageBackground
    >
      <GlossaryEnglishNotice
        locale={locale}
        message={t('englishNotice.message')}
        linkLabel={t('englishNotice.link')}
      />
      <GlossaryIndex
        allTerms={allTerms}
        termsByLetter={termsByLetter}
        termsByCategory={termsByCategory}
        categories={validCategories}
        locale={locale}
      />
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
