import { Metadata } from "next";
import { getGlossaryTerm, getAllGlossaryTerms, getRelatedTerms } from "@/lib/glossary/index";
import { notFound } from "next/navigation";
import GlossaryTermTemplate from "@/components/GlossaryTermTemplate";
import Link from "next/link";
import { locales, localeMetadata, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { getAvailableLocalesForContent } from "@/lib/i18n-content";

// ISR: Revalidate pages every 24 hours
export const revalidate = 86400;

// Helper function to determine if a term needs "an" instead of "a"
function getArticle(term: string): string {
  const firstChar = term.trim().charAt(0).toLowerCase();
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  return vowels.includes(firstChar) ? 'an' : 'a';
}

interface PageProps {
  params: {
    locale: string;
    term: string;
  };
}

export async function generateStaticParams() {
  const terms = getAllGlossaryTerms();
  // Only generate for locales that have translations (currently only 'en')
  const availableLocales = getAvailableLocalesForContent('glossary');
  const params: Array<{ locale: string; term: string }> = [];
  
  // Generate params only for available locales
  for (const locale of availableLocales) {
    for (const term of terms) {
      params.push({ locale, term: term.slug });
    }
  }
  
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, term } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const glossaryTerm = await getGlossaryTerm(term, locale);
  
  if (!glossaryTerm) {
    return {
      title: "Glossary Term Not Found | Sage Outdoor Advisory",
    };
  }

  const pathname = `/${locale}/glossary/${glossaryTerm.slug}`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;
  const baseTitle = `What is ${getArticle(glossaryTerm.term)} ${glossaryTerm.term}? | Definition & Guide | Sage Outdoor Advisory`;
  const title = locale === 'en' ? baseTitle : `${baseTitle} (${localeMetadata[locale as Locale].nativeName})`;
  const description = `${glossaryTerm.definition} Learn more about ${glossaryTerm.term.toLowerCase()} in outdoor hospitality.`;

  const openGraphImages = glossaryTerm.image 
    ? [{
        url: `https://resources.sageoutdooradvisory.com${glossaryTerm.image}`,
        width: 1200,
        height: 630,
        alt: `${glossaryTerm.term} - ${glossaryTerm.definition.substring(0, 100)}`,
      }]
    : undefined;

  // Generate hreflang tags: include all locales with content + current locale for self-referencing (required by Google)
  const availableLocales = getAvailableLocalesForContent('glossary');
  const hreflangAlternates: Metadata['alternates'] = {
    languages: {},
  };
  
  availableLocales.forEach((availableLocale) => {
    const localePath = pathname.replace(/^\/[a-z]{2}(\/|$)/, `/${availableLocale}$1`);
    hreflangAlternates.languages![availableLocale] = `https://resources.sageoutdooradvisory.com${localePath}`;
  });
  
  // Always include current locale for self-referencing hreflang (fixes SEMrush "No self-referencing hreflang" errors)
  if (!hreflangAlternates.languages![locale]) {
    hreflangAlternates.languages![locale] = url;
  }
  
  // Add x-default pointing to default locale
  const defaultPath = pathname.replace(/^\/[a-z]{2}(\/|$)/, `/en$1`);
  hreflangAlternates.languages!['x-default'] = `https://resources.sageoutdooradvisory.com${defaultPath}`;

  return {
    title,
    description,
    keywords: glossaryTerm.seoKeywords.join(", "),
    openGraph: {
      title,
      description,
      url,
      siteName: "Sage Outdoor Advisory",
      locale: getOpenGraphLocale(locale as Locale),
      type: "article",
      images: openGraphImages,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: openGraphImages ? [openGraphImages[0].url] : undefined,
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
}

export default async function GlossaryTermPage({ params }: PageProps) {
  const { locale, term } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const glossaryTerm = await getGlossaryTerm(term, locale);

  if (!glossaryTerm) {
    notFound();
  }

  const relatedTerms = await getRelatedTerms(glossaryTerm, locale);

  return (
    <>
      <GlossaryTermTemplate term={glossaryTerm} relatedTerms={relatedTerms} />
    </>
  );
}

