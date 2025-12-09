import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAllGlossaryTerms, getGlossaryTermsByCategory } from "@/lib/glossary/index";
import GlossaryIndex from "@/components/GlossaryIndex";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";
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
  
  // Ensure allTerms is an array
  if (!Array.isArray(allTerms)) {
    throw new Error('getAllGlossaryTerms() did not return an array');
  }
  
  // Filter out any invalid terms
  allTerms = allTerms.filter(term => 
    term && 
    typeof term === 'object' && 
    term.term && 
    typeof term.term === 'string' &&
    term.term.length > 0
  );
  
  // English category names (used for getGlossaryTermsByCategory)
  const englishCategories = [
    'Feasibility & Appraisal',
    'Glamping',
    'RV & Campground',
    'Financial',
    'Real Estate',
    'General'
  ] as const;
  
  // Get translated category names with error handling
  const translatedCategories = [
    t('categories.feasibilityAppraisal'),
    t('categories.glamping'),
    t('categories.rvCampground'),
    t('categories.financial'),
    t('categories.realEstate'),
    t('categories.general')
  ];
  
  // Map translated category names to original English category names
  // (getGlossaryTermsByCategory expects English category names)
  const categoryMap: Record<string, string> = {};
  englishCategories.forEach((englishCategory, index) => {
    const translatedCategory = translatedCategories[index];
    if (translatedCategory && typeof translatedCategory === 'string') {
      categoryMap[translatedCategory] = englishCategory;
    }
  });

  // Group terms by first letter for alphabetical navigation
  const termsByLetter: Record<string, typeof allTerms> = {};
  allTerms.forEach(term => {
    if (!term || !term.term || typeof term.term !== 'string') return; // Skip invalid terms
    const firstChar = term.term.trim().charAt(0);
    if (!firstChar) return; // Skip empty strings
    // Group all numeric terms (0-9) under "#"
    const letter = /[0-9]/.test(firstChar) ? "#" : firstChar.toUpperCase();
    if (!termsByLetter[letter]) {
      termsByLetter[letter] = [];
    }
    termsByLetter[letter].push(term);
  });

  // Sort terms alphabetically with safe comparison
  Object.keys(termsByLetter).forEach(letter => {
    termsByLetter[letter].sort((a, b) => {
      const aTerm = a?.term || '';
      const bTerm = b?.term || '';
      return aTerm.localeCompare(bTerm, locale, { sensitivity: 'base' });
    });
  });

  // Get terms by category - use translated category name as key, but fetch with English name
  const termsByCategory: Record<string, typeof allTerms> = {};
  translatedCategories.forEach((translatedCategory, index) => {
    if (translatedCategory && typeof translatedCategory === 'string' && translatedCategory.length > 0 && index < englishCategories.length) {
      const englishCategory = englishCategories[index];
      if (englishCategory) {
        try {
          const categoryTerms = getGlossaryTermsByCategory(englishCategory);
          if (Array.isArray(categoryTerms)) {
            // Filter out invalid terms
            termsByCategory[translatedCategory] = categoryTerms.filter(term => 
              term && 
              typeof term === 'object' && 
              term.term && 
              typeof term.term === 'string'
            );
          } else {
            termsByCategory[translatedCategory] = [];
          }
        } catch (error) {
          console.error(`Error getting terms for category ${englishCategory}:`, error);
          // If there's an error getting terms for a category, use empty array
          termsByCategory[translatedCategory] = [];
        }
      }
    }
  });
  
  // Filter out any undefined or invalid categories
  const validCategories = translatedCategories.filter((cat): cat is string => 
    typeof cat === 'string' && cat.length > 0
  );

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
        categories={validCategories}
        locale={locale}
      />

      {/* CTA Section */}
      <section className="bg-[#006b5f] py-16">
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

