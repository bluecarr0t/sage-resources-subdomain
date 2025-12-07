import { Metadata } from "next";
import { getLandingPage, getAllLandingPageSlugs } from "@/lib/landing-pages";
import { notFound } from "next/navigation";
import LandingPageTemplate from "@/components/LandingPageTemplate";
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { generateGeoMetadata } from "@/lib/geo-metadata";

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
  
  // Generate params for all locales and slugs
  for (const locale of locales) {
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
  
  const page = getLandingPage(slug);
  
  if (!page) {
    return {
      title: "Page Not Found | Sage Outdoor Advisory",
    };
  }

  const pathname = `/${locale}/landing/${page.slug}`;
  const url = `https://resources.sageoutdooradvisory.com${pathname}`;
  const imageUrl = `https://sageoutdooradvisory.com/og-image.jpg`;

  const publishDate = page.lastModified || "2025-01-01";
  const modifiedDate = page.lastModified || publishDate;
  
  // Add geo-location metadata for location-based pages
  const geoMetadata = generateGeoMetadata(page.location, page.slug);

  return {
    title: page.title,
    description: page.metaDescription,
    keywords: page.keywords?.join(", "),
    ...geoMetadata,
    openGraph: {
      title: page.title,
      description: page.metaDescription,
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
      title: page.title,
      description: page.metaDescription,
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

export default function LandingPage({ params }: PageProps) {
  const { locale, slug } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const page = getLandingPage(slug);

  if (!page) {
    notFound();
  }

  return <LandingPageTemplate content={page} />;
}

