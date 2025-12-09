import { Metadata } from "next";
import { getGuide, getAllGuideSlugs } from "@/lib/guides";
import { notFound } from "next/navigation";
import PillarPageTemplate from "@/components/PillarPageTemplate";
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { getAvailableLocalesForContent } from "@/lib/i18n-content";

// ISR: Revalidate pages every 24 hours
export const revalidate = 86400;

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
  
  const guide = getGuide(slug);
  
  if (!guide) {
    return {
      title: "Guide Not Found | Sage Outdoor Advisory",
    };
  }

  const pathname = `/${locale}/guides/${guide.slug}`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;
  const imageUrl = `https://sageoutdooradvisory.com/og-image.jpg`;

  const publishDate = guide.lastModified || new Date().toISOString().split('T')[0];
  const modifiedDate = guide.lastModified || publishDate;

  return {
    title: guide.title,
    description: guide.metaDescription,
    keywords: guide.keywords?.join(", "),
    openGraph: {
      title: guide.title,
      description: guide.metaDescription,
      url,
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
      title: guide.title,
      description: guide.metaDescription,
      images: [imageUrl],
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
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default function GuidePage({ params }: PageProps) {
  const { locale, slug } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const guide = getGuide(slug);

  if (!guide) {
    notFound();
  }

  return <PillarPageTemplate content={guide} />;
}

