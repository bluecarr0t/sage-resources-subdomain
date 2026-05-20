import { Metadata } from "next";
import { getGuide, getAllGuideSlugs } from "@/lib/guides";
import { notFound } from "next/navigation";
import PillarPageTemplate from "@/components/PillarPageTemplate";
import { locales, type Locale } from "@/i18n";
import { getOpenGraphLocale } from "@/lib/i18n-utils";
import { getAvailableLocalesForContent } from "@/lib/i18n-content";
import {
  getGuideCanonicalUrl,
  guideMetadataOverridesEn,
} from "@/lib/guides-metadata-overrides";

// ISR: Revalidate pages every 24 hours
export const revalidate = 86400;

// Allow dynamic params for locales not in generateStaticParams
// This allows /es/guides/[slug], /de/guides/[slug], etc. to work
// without generating static pages for each locale
export const dynamicParams = true;

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateStaticParams() {
  const slugs = getAllGuideSlugs();
  // Only generate for locales that have translations (currently only 'en')
  const availableLocales = getAvailableLocalesForContent('guide');
  const params: Array<{ locale: string; slug: string }> = [];
  
  // Generate params only for available locales
  for (const locale of availableLocales) {
    for (const slug of slugs) {
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
  
  const guide = await getGuide(slug, locale);
  
  if (!guide) {
    return {
      title: "Guide Not Found | Sage Outdoor Advisory",
    };
  }

  const canonicalUrl = getGuideCanonicalUrl(guide.slug);
  const pathname = `/${locale}/guides/${guide.slug}`;
  const imageUrl =
    guide.hero.backgroundImage ?? `https://sageoutdooradvisory.com/og-image.jpg`;

  const publishDate = guide.lastModified || new Date().toISOString().split('T')[0];
  const modifiedDate = guide.lastModified || publishDate;
  const override = locale === 'en' ? guideMetadataOverridesEn[guide.slug] : undefined;
  const title = override?.title ?? guide.title;
  const description = override?.description ?? guide.metaDescription;

  return {
    title,
    description,
    keywords: guide.keywords?.join(", "),
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Sage Outdoor Advisory",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: guide.hero.headline,
        },
      ],
      locale: getOpenGraphLocale(locale as Locale),
      type: "article",
      publishedTime: publishDate,
      modifiedTime: modifiedDate,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: canonicalUrl,
        'x-default': canonicalUrl,
      },
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

export default async function GuidePage({ params }: PageProps) {
  const { locale, slug } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const guide = await getGuide(slug, locale);

  if (!guide) {
    notFound();
  }

  return <PillarPageTemplate content={guide} locale={locale} />;
}

