import { Metadata } from "next";
import { getLandingPage, getAllLandingPageSlugs } from "@/lib/landing-pages";
import { notFound } from "next/navigation";
import LandingPageTemplate from "@/components/LandingPageTemplate";
import { locales, type Locale } from "@/i18n";
import {
  generateHreflangAlternatesForLocales,
  getOpenGraphLocale,
} from "@/lib/i18n-utils";
import { generateGeoMetadata } from "@/lib/geo-metadata";
import { getAvailableLocalesForLandingSlug } from "@/lib/i18n-content";
import { landingSlugHasLocaleTranslation } from "@/lib/landing-i18n";
import { landingMetadataOverridesEn } from "@/lib/landing-metadata-overrides";

// ISR: Revalidate pages every 24 hours
export const revalidate = 86400;

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateStaticParams() {
  const slugs = getAllLandingPageSlugs();
  const params: Array<{ locale: string; slug: string }> = [];

  for (const slug of slugs) {
    for (const locale of getAvailableLocalesForLandingSlug(slug)) {
      params.push({ locale, slug });
    }
  }

  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const page = await getLandingPage(slug, locale);
  
  if (!page) {
    return {
      title: "Page Not Found | Sage Outdoor Advisory",
    };
  }

  const translatedLocales = getAvailableLocalesForLandingSlug(page.slug);
  const isIndexable = landingSlugHasLocaleTranslation(page.slug, locale as Locale);
  const canonicalLocale = 'en';
  const pathname = `/${locale}/landing/${page.slug}`;
  const canonicalPath = `/${canonicalLocale}/landing/${page.slug}`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;
  const canonicalUrl = `https://resources.sageoutdooradvisory.com${canonicalPath}`;
  const imageUrl = `https://sageoutdooradvisory.com/og-image.jpg`;

  const publishDate = page.lastModified || "2025-01-01";
  const modifiedDate = page.lastModified || publishDate;
  const override = locale === 'en' ? landingMetadataOverridesEn[page.slug] : undefined;
  const title = override?.title ?? page.title;
  const description = override?.description ?? page.metaDescription;

  // Add geo-location metadata for location-based pages
  const geoMetadata = generateGeoMetadata(page.location, page.slug);

  return {
    title,
    description,
    keywords: page.keywords?.join(", "),
    ...geoMetadata,
    openGraph: {
      title,
      description,
      url,
      siteName: "Sage Outdoor Advisory",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: page.hero.headline,
        },
      ],
      locale: getOpenGraphLocale(locale as Locale),
      type: "article",
      publishedTime: publishDate,
      modifiedTime: modifiedDate,
      ...geoMetadata,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: canonicalUrl,
      ...generateHreflangAlternatesForLocales(canonicalPath, translatedLocales),
    },
    robots: {
      index: isIndexable,
      follow: true,
      googleBot: {
        index: isIndexable,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function LandingPage({ params }: PageProps) {
  const { locale, slug } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const page = await getLandingPage(slug, locale);

  if (!page) {
    notFound();
  }

  return <LandingPageTemplate content={page} locale={locale} />;
}

