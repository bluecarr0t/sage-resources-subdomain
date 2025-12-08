import { Metadata } from "next";
import { MapProvider } from '@/components/MapContext';
import MapLayoutNoLocale from '@/components/MapLayoutNoLocale';
import { createServerClient } from '@/lib/supabase';
import { unstable_cache } from 'next/cache';
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
  const imageUrl = `${baseUrl}/og-map-image.jpg`;

  return {
    title: "Glamping Properties Map | 500+ Locations | Sage Outdoor Advisory",
    description: "Explore 500+ glamping properties across the US and Canada on our interactive map. Filter by location, unit type, and price range. Find your perfect glamping destination.",
    keywords: "glamping properties map, glamping locations, glamping sites by state, interactive glamping map, glamping near me, glamping properties USA, glamping properties Canada, glamping map North America",
    openGraph: {
      title: "Glamping Properties Map | 500+ Locations | Sage",
      description: "Explore 500+ glamping properties across the US and Canada on our interactive map. Filter by location, unit type, and price range.",
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
      description: "Explore 500+ glamping properties across the US and Canada on our interactive map",
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
  // Use cached function - can be invalidated by revalidating 'properties' tag
  const cachedStats = unstable_cache(
    async () => {
      try {
        const supabase = createServerClient();
        
        // Get all glamping properties to count unique property names
        const { data: properties, error } = await supabase
          .from('sage-glamping-data')
          .select('property_name, state, country')
          .eq('is_glamping_property', 'Yes');

        if (error) {
          console.error('Error fetching property count:', error);
          return { uniqueProperties: 1266, states: 43, provinces: 5, countries: 2 }; // Fallback values
        }

        // Count unique property names
        const uniquePropertyNames = new Set<string>();
        const uniqueStates = new Set<string>();
        const uniqueProvinces = new Set<string>();
        const uniqueCountries = new Set<string>();

        properties?.forEach((prop) => {
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

        return {
          uniqueProperties: uniquePropertyNames.size || 1266,
          states: uniqueStates.size,
          provinces: uniqueProvinces.size,
          countries: uniqueCountries.size,
        };
      } catch (error) {
        console.error('Error in getPropertyStatistics:', error);
        return { uniqueProperties: 1266, states: 43, provinces: 5, countries: 2 }; // Fallback values
      }
    },
    ['property-statistics'],
    {
      tags: ['properties'],
      revalidate: false, // Cache until manually invalidated
    }
  );
  
  return await cachedStats();
}

export default async function MapPage() {
  const stats = await getPropertyStatistics();

  // Generate structured data
  const organizationSchema = generateOrganizationSchema();
  const mapSchema = generateMapSchema();
  const itemListSchema = generateMapItemListSchema(stats.uniqueProperties);
  const webApplicationSchema = generateMapWebApplicationSchema();
  const breadcrumbSchema = generateMapBreadcrumbSchema();

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

      <MapProvider>
        <MapLayoutNoLocale />
      </MapProvider>
    </>
  );
}
