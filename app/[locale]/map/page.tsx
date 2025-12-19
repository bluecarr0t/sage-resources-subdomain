import { Metadata } from "next";
import { MapProvider } from '@/components/MapContext';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import MapLayout from '@/components/MapLayout';
import ResourceHints from '@/components/ResourceHints';
import { createServerClient } from '@/lib/supabase';
import { getCache, setCache } from '@/lib/redis';
import {
  generateOrganizationSchema,
  generateMapSchema,
  generateMapItemListSchema,
  generateMapWebApplicationSchema,
  generateMapBreadcrumbSchema,
  generateDatasetSchema,
} from '@/lib/schema';
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';

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
  
  const t = await getTranslations({ locale, namespace: 'map.metadata' });
  
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const pathname = `/${locale}/map`;
  const url = `${baseUrl}${pathname}`;
  const imageUrl = `${baseUrl}/og-map-image.jpg`;

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    openGraph: {
      title: t('openGraph.title'),
      description: t('openGraph.description'),
      url,
      siteName: "Sage Outdoor Advisory",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: t('openGraph.imageAlt'),
        },
      ],
      locale: getOpenGraphLocale(locale as Locale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t('twitter.title'),
      description: t('twitter.description'),
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
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

async function getPropertyStatistics() {
  const cacheKey = 'property-statistics';
  const ttlSeconds = 1209600; // 14 days

  // Try to get from Redis cache first
  const cachedStats = await getCache<{
    uniqueProperties: number;
    states: number;
    provinces: number;
    countries: number;
  }>(cacheKey);

  if (cachedStats) {
    return cachedStats;
  }

  // Cache miss - fetch from database
  try {
    const supabase = createServerClient();
    
    // Get all glamping properties to count unique property names
    // Exclude closed properties
    const { data: properties, error } = await supabase
      .from('all_glamping_properties')
      .select('property_name, state, country')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes');

    if (error) {
      console.error('Error fetching property count:', error);
      return { uniqueProperties: 1266, states: 43, provinces: 5, countries: 2 }; // Fallback values
    }

    // Count unique property names
    const uniquePropertyNames = new Set<string>();
    const uniqueStates = new Set<string>();
    const uniqueProvinces = new Set<string>();
    const uniqueCountries = new Set<string>();

    properties?.forEach((prop: { property_name?: string | null; state?: string | null; country?: string | null }) => {
      // Count unique property names (non-null, non-empty)
      if (prop.property_name && prop.property_name.trim()) {
        uniquePropertyNames.add(prop.property_name.trim());
      }
      
      if (prop.country) {
        uniqueCountries.add(prop.country);
      }
      if (prop.state) {
        // Check if it's a Canadian province
        const canadianProvinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
        if (canadianProvinces.includes(prop.state)) {
          uniqueProvinces.add(prop.state);
        } else {
          uniqueStates.add(prop.state);
        }
      }
    });

    const stats = {
      uniqueProperties: uniquePropertyNames.size || 1266,
      states: uniqueStates.size,
      provinces: uniqueProvinces.size,
      countries: uniqueCountries.size,
    };

    // Store in Redis cache (non-blocking - don't wait for it)
    setCache(cacheKey, stats, ttlSeconds).catch((err) => {
      console.error('Failed to cache property statistics:', err);
    });

    return stats;
  } catch (error) {
    console.error('Error in getPropertyStatistics:', error);
    return { uniqueProperties: 1266, states: 43, provinces: 5, countries: 2 }; // Fallback values
  }
}

export default async function MapPage({ params }: PageProps) {
  const { locale } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  const stats = await getPropertyStatistics();

  // Generate structured data
  const organizationSchema = generateOrganizationSchema();
  const mapSchema = generateMapSchema();
  const itemListSchema = generateMapItemListSchema(stats.uniqueProperties);
  const webApplicationSchema = generateMapWebApplicationSchema();
  const breadcrumbSchema = generateMapBreadcrumbSchema();
  const datasetSchema = generateDatasetSchema(
    stats.uniqueProperties,
    { states: stats.states, countries: stats.countries, provinces: stats.provinces }
  );

  return (
    <>
      {/* Resource Hints for Performance */}
      <ResourceHints />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mapSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetSchema) }}
      />

      <GoogleMapsProvider>
        <MapProvider>
          <MapLayout locale={locale} />
        </MapProvider>
      </GoogleMapsProvider>
    </>
  );
}
