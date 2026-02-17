import { Metadata } from "next";
import { MapProvider } from '@/components/MapContext';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import MapLayout from '@/components/MapLayout';
import ResourceHints from '@/components/ResourceHints';
import {
  generateOrganizationSchema,
  generateMapSchema,
  generateMapItemListSchema,
  generateMapBreadcrumbSchema,
  generateMapFAQSchema,
  generatePropertyListLocalBusinessSchema,
  generateTouristAttractionSchema,
} from '@/lib/schema';
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import { 
  getTopCities, 
  getTopStates,
  parseCitySlug, 
  normalizeStateName, 
  normalizeCityName, 
  createCitySlug,
  slugifyLocation,
  getCityCoordinates,
} from '@/lib/location-helpers';
import {
  getCityPropertyStatistics,
  getStatePropertyStatistics,
  getFeaturedPropertiesForCity,
  getFeaturedPropertiesForState,
  getNearbyNationalParks,
} from '@/lib/map-data-utils';

interface PageProps {
  params: {
    locale: string;
    location: string;
  };
}

/**
 * Determine if location is a city or state and return appropriate params
 */
async function parseLocation(location: string): Promise<{ type: 'city' | 'state'; city?: string; state: string } | null> {
  // Try to parse as city slug first (format: "city-name-state-code")
  const cityParsed = parseCitySlug(location);
  if (cityParsed) {
    // Verify the city exists by checking coordinates
    const coords = await getCityCoordinates(cityParsed.city, cityParsed.state);
    if (coords) {
      return {
        type: 'city',
        city: cityParsed.city,
        state: cityParsed.state,
      };
    }
  }
  
  // Treat as state slug
  const normalizedState = normalizeStateName(location);
  return {
    type: 'state',
    state: normalizedState,
  };
}

export async function generateStaticParams() {
  const [topCities, topStates] = await Promise.all([
    getTopCities(100),
    getTopStates(50),
  ]);
  
  const params: Array<{ locale: string; location: string }> = [];
  
  for (const locale of locales) {
    // Add city params
    for (const cityData of topCities) {
      const citySlug = createCitySlug(cityData.city, cityData.state);
      params.push({
        locale,
        location: citySlug,
      });
    }
    
    // Add state params
    for (const stateData of topStates) {
      params.push({
        locale,
        location: slugifyLocation(stateData.state),
      });
    }
  }
  
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, location } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  // Parse location
  const parsed = await parseLocation(location);
  if (!parsed) {
    notFound();
  }
  
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const pathname = `/${locale}/map/${location}`;
  const url = `${baseUrl}${pathname}`;
  const imageUrl = "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg";
  
  if (parsed.type === 'city' && parsed.city) {
    const { city, state } = parsed;
    const normalizedCity = normalizeCityName(city, state);
    const normalizedState = normalizeStateName(state);
    
    // Get city coordinates for stats
    const coords = await getCityCoordinates(normalizedCity, normalizedState);
    if (!coords) {
      notFound();
    }
    
    const stats = await getCityPropertyStatistics(normalizedCity, normalizedState, locale);
    
    const title = `Glamping Near ${normalizedCity}, ${normalizedState} | Interactive Map`;
    const description = `Find ${stats.uniqueProperties}+ glamping properties within 25 miles of ${normalizedCity}, ${normalizedState}. Explore luxury tents, yurts, treehouses, and more.`;

    return {
      title,
      description,
      keywords: `glamping near ${normalizedCity} ${normalizedState}, glamping ${normalizedCity}, glamping properties ${normalizedState}`,
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
            alt: `Glamping properties near ${normalizedCity}, ${normalizedState}`,
          },
        ],
        locale: getOpenGraphLocale(locale as Locale),
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
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
  } else {
    // State page
    const { state } = parsed;
    const normalizedState = normalizeStateName(state);
    const stats = await getStatePropertyStatistics(normalizedState, locale);
    
    const t = await getTranslations({ locale, namespace: 'map.metadata' });
    
    const title = `Glamping Properties in ${normalizedState} | Interactive Map`;
    const description = `Discover ${stats.uniqueProperties}+ glamping properties in ${normalizedState}. Find luxury tents, yurts, treehouses, domes, and more on our interactive map.`;

    return {
      title,
      description,
      keywords: `glamping ${normalizedState}, glamping properties ${normalizedState}, glamping map ${normalizedState}, luxury camping ${normalizedState}`,
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
            alt: `Glamping properties map for ${normalizedState}`,
          },
        ],
        locale: getOpenGraphLocale(locale as Locale),
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
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
}

export default async function LocationMapPage({ params }: PageProps) {
  const { locale, location } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  // Parse location
  const parsed = await parseLocation(location);
  if (!parsed) {
    notFound();
  }
  
  // Generate structured data based on location type
  const organizationSchema = generateOrganizationSchema();
  const mapSchema = generateMapSchema(locale);
  
  let breadcrumbSchema: any;
  let faqSchema: any;
  let localBusinessSchemas: any[] = [];
  let touristAttractionSchemas: any[] = [];
  let itemListSchema: any;
  let stats: any;
  
  if (parsed.type === 'city' && parsed.city) {
    const { city, state } = parsed;
    const normalizedCity = normalizeCityName(city, state);
    const normalizedState = normalizeStateName(state);
    
    // Get city coordinates
    const coords = await getCityCoordinates(normalizedCity, normalizedState);
    if (!coords) {
      notFound();
    }
    
    // Fetch data
    const [cityStats, featuredProperties, nearbyParks] = await Promise.all([
      getCityPropertyStatistics(normalizedCity, normalizedState, locale),
      getFeaturedPropertiesForCity(normalizedCity, normalizedState, coords.lat, coords.lon, 20),
      getNearbyNationalParks(coords.lat, coords.lon, 100),
    ]);
    
    stats = cityStats;
    itemListSchema = generateMapItemListSchema(stats.uniqueProperties, locale);
    breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://sageoutdooradvisory.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Glamping Properties Map",
          "item": `https://resources.sageoutdooradvisory.com/${locale}/map`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": `${normalizedCity}, ${normalizedState}`,
          "item": `https://resources.sageoutdooradvisory.com/${locale}/map/${location}`
        }
      ]
    };
    faqSchema = generateMapFAQSchema(stats.uniqueProperties, `${normalizedCity}, ${normalizedState}`);
    localBusinessSchemas = generatePropertyListLocalBusinessSchema(featuredProperties);
    touristAttractionSchemas = nearbyParks.length > 0
      ? generateTouristAttractionSchema(nearbyParks.slice(0, 10))
      : [];
  } else {
    // State page
    const { state } = parsed;
    const normalizedState = normalizeStateName(state);
    
    // Fetch data
    const [stateStats, featuredProperties] = await Promise.all([
      getStatePropertyStatistics(normalizedState, locale),
      getFeaturedPropertiesForState(normalizedState, 20),
    ]);
    
    stats = stateStats;
    itemListSchema = generateMapItemListSchema(stats.uniqueProperties, locale);
    breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://sageoutdooradvisory.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Glamping Properties Map",
          "item": `https://resources.sageoutdooradvisory.com/${locale}/map`
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": normalizedState,
          "item": `https://resources.sageoutdooradvisory.com/${locale}/map/${location}`
        }
      ]
    };
    faqSchema = generateMapFAQSchema(stats.uniqueProperties, normalizedState);
    localBusinessSchemas = generatePropertyListLocalBusinessSchema(featuredProperties);
    
    // Get nearby parks using a sample property's coordinates
    let nearbyParks: Array<any & { distance: number }> = [];
    try {
      if (featuredProperties.length > 0 && featuredProperties[0].lat && featuredProperties[0].lon) {
        const centerLat = Number(featuredProperties[0].lat);
        const centerLon = Number(featuredProperties[0].lon);
        if (!isNaN(centerLat) && !isNaN(centerLon)) {
          nearbyParks = await getNearbyNationalParks(centerLat, centerLon, 100);
        }
      }
    } catch (error) {
      console.error('Error fetching nearby parks:', error);
    }
    
    touristAttractionSchemas = nearbyParks.length > 0
      ? generateTouristAttractionSchema(nearbyParks.slice(0, 10))
      : [];
  }

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {localBusinessSchemas.map((schema, index) => (
        <script
          key={`local-business-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      {touristAttractionSchemas.map((schema, index) => (
        <script
          key={`tourist-attraction-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      <GoogleMapsProvider>
        <MapProvider>
          <MapLayout locale={locale} />
        </MapProvider>
      </GoogleMapsProvider>
    </>
  );
}
