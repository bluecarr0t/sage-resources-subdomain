import { Metadata } from "next";
import { MapProvider } from '@/components/MapContext';
import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';
import MapLayoutNoLocale from '@/components/MapLayoutNoLocale';
import { createServerClient } from '@/lib/supabase';
import { getCache, setCache } from '@/lib/redis';
import {
  generateOrganizationSchema,
  generateMapSchema,
  generateMapItemListSchema,
  generateMapWebApplicationSchema,
  generateMapBreadcrumbSchema,
} from '@/lib/schema';

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const url = `${baseUrl}/map`;
  const imageUrl = "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg";

  return {
    title: "Glamping Properties Map | 500+ Locations | Sage Outdoor Advisory",
    description: "Explore 500+ glamping properties across the US and Canada on our interactive map. Compare glamping locations with population growth data to identify high-growth markets. Filter by location, unit type, and price range.",
    keywords: "glamping properties map, glamping locations, glamping sites by state, interactive glamping map, glamping near me, glamping properties USA, glamping properties Canada, glamping map North America",
    openGraph: {
      title: "Glamping Properties Map | 500+ Locations | Sage",
      description: "Explore 500+ glamping properties across the US and Canada on our interactive map. Compare glamping locations with population growth data to identify high-growth markets.",
      url,
      siteName: "Sage Outdoor Advisory",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Interactive glamping properties map showing locations across USA and Canada",
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Glamping Properties Map | 500+ Locations",
      description: "Explore 500+ glamping properties and compare with population growth data to identify high-growth markets",
      images: [imageUrl],
    },
    alternates: {
      canonical: url,
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
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published');

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

export default async function MapPage() {
  const stats = await getPropertyStatistics();

  // Generate structured data (use 'en' - non-locale map page)
  const organizationSchema = generateOrganizationSchema();
  const mapSchema = generateMapSchema('en');
  const itemListSchema = generateMapItemListSchema(stats.uniqueProperties, 'en');
  const webApplicationSchema = generateMapWebApplicationSchema('en');
  const breadcrumbSchema = generateMapBreadcrumbSchema('en');

  return (
    <>
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

      <GoogleMapsProvider>
        <MapProvider>
          <MapLayoutNoLocale />
        </MapProvider>
      </GoogleMapsProvider>
    </>
  );
}
