import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllGlossaryTerms, getGlossaryTermsByCategory } from "@/lib/glossary/index";
import GlossaryIndex from "@/components/GlossaryIndex";
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
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const pathname = `/${locale}/glossary`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;
  
  return {
    title: "Outdoor Hospitality Glossary | Terms & Definitions | Sage Outdoor Advisory",
    description: "Comprehensive glossary of outdoor hospitality terms. Learn definitions for glamping, RV resorts, feasibility studies, appraisals, and more.",
    keywords: "outdoor hospitality glossary, glamping terms, RV resort definitions, feasibility study terms, hospitality industry glossary",
    openGraph: {
      title: "Outdoor Hospitality Glossary | Sage Outdoor Advisory",
      description: "Comprehensive glossary of outdoor hospitality industry terms and definitions",
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
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const t = await getTranslations({ locale, namespace: 'glossary' });
  
  const allTerms = getAllGlossaryTerms();
  
  // Map translated category names to original English category names
  // (getGlossaryTermsByCategory expects English category names)
  const categoryMap: Record<string, string> = {
    [t('categories.feasibilityAppraisal')]: 'Feasibility & Appraisal',
    [t('categories.glamping')]: 'Glamping',
    [t('categories.rvCampground')]: 'RV & Campground',
    [t('categories.financial')]: 'Financial',
    [t('categories.realEstate')]: 'Real Estate',
    [t('categories.general')]: 'General'
  };
  
  const categories = [
    t('categories.feasibilityAppraisal'),
    t('categories.glamping'),
    t('categories.rvCampground'),
    t('categories.financial'),
    t('categories.realEstate'),
    t('categories.general')
  ];

  // Group terms by first letter for alphabetical navigation
  const termsByLetter: Record<string, typeof allTerms> = {};
  allTerms.forEach(term => {
    const firstChar = term.term.charAt(0);
    // Group all numeric terms (0-9) under "#"
    const letter = /[0-9]/.test(firstChar) ? "#" : firstChar.toUpperCase();
    if (!termsByLetter[letter]) {
      termsByLetter[letter] = [];
    }
    termsByLetter[letter].push(term);
  });

  // Sort terms alphabetically
  Object.keys(termsByLetter).forEach(letter => {
    termsByLetter[letter].sort((a, b) => a.term.localeCompare(b.term));
  });

  // Get terms by category - use translated category name as key, but fetch with English name
  const termsByCategory: Record<string, typeof allTerms> = {};
  categories.forEach(translatedCategory => {
    const englishCategory = categoryMap[translatedCategory];
    termsByCategory[translatedCategory] = getGlossaryTermsByCategory(englishCategory as any);
  });

  const links = createLocaleLinks(locale);

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Header */}
      <FloatingHeader locale={locale} showSpacer={false} />

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-36 pb-32 md:pb-40 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/forest-scene.jpg"
            alt="Outdoor hospitality glossary background featuring natural landscape gradient"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={90}
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-indigo-900/40" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
              {t('title')}
            </h1>
            <p className="text-xl text-white/95 max-w-3xl mx-auto drop-shadow-md">
              {t('subtitle')}
            </p>
          </div>
        </div>
      </section>

      <main>
      {/* Glossary Index Component */}
      <GlossaryIndex
        allTerms={allTerms}
        termsByLetter={termsByLetter}
        termsByCategory={termsByCategory}
        categories={categories}
        locale={locale}
      />

      {/* CTA Section */}
      <section className="bg-[#00b6a6] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t('cta.description')}
          </p>
          <Link
            href="https://sageoutdooradvisory.com/contact-us/"
            className="inline-block px-8 py-4 bg-white text-[#006b5f] text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
          >
            {t('cta.button')}
          </Link>
        </div>
      </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

