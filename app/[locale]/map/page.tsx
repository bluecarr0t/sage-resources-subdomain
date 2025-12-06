import { Metadata } from "next";
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapProvider } from '@/components/MapContext';
import { createServerClient } from '@/lib/supabase';
import {
  generateOrganizationSchema,
  generateMapSchema,
  generateMapItemListSchema,
  generateMapWebApplicationSchema,
  generateMapBreadcrumbSchema,
} from '@/lib/schema';
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { notFound } from "next/navigation";

// Dynamically import Google Maps component to prevent SSR issues and reduce initial bundle size
const DynamicGooglePropertyMap = dynamic(() => import('@/components/GooglePropertyMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00b6a6] mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

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
  
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const pathname = `/${locale}/map`;
  const url = `${baseUrl}${pathname}`;
  const imageUrl = `${baseUrl}/og-map-image.jpg`;

  return {
    title: "Interactive Glamping Properties Map | 470+ Locations | Sage Outdoor Advisory",
    description: "Explore 470+ glamping properties across the United States and Canada on our interactive map. Filter by location, unit type, and price range. Find the perfect glamping destination.",
    keywords: "glamping properties map, glamping locations, glamping sites by state, interactive glamping map, glamping near me, glamping properties USA, glamping properties Canada, glamping map North America",
    openGraph: {
      title: "Interactive Glamping Properties Map | Sage Outdoor Advisory",
      description: "Explore 470+ glamping properties across the United States and Canada on our interactive map. Filter by location, unit type, and price range.",
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
      locale: getOpenGraphLocale(locale as Locale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Interactive Glamping Properties Map",
      description: "Explore 470+ glamping properties across the United States and Canada",
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
  try {
    const supabase = createServerClient();
    
    // Get all properties to count unique property names
    const { data: properties, error } = await supabase
      .from('sage-glamping-data')
      .select('property_name, state, country');

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
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-gray-50">
          {/* Left Sidebar - Narrow Column */}
          <aside className="w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex flex-col overflow-y-auto shadow-sm relative z-20 md:max-h-screen">
            <div className="p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="mb-4">
                <ol className="flex items-center gap-1.5 text-sm text-gray-600">
                  <li>
                    <Link
                      href="https://sageoutdooradvisory.com/"
                      className="hover:text-gray-900 transition-colors"
                    >
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true" className="text-gray-400">/</li>
                  <li className="text-gray-900 font-medium" aria-current="page">
                    Map
                  </li>
                </ol>
              </nav>
              
              {/* SEO Content Section */}
              <section className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Glamping Properties Map
                </h1>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                  Explore {stats.uniqueProperties}+ glamping properties across {stats.states} US states and {stats.provinces} Canadian provinces. Click on markers to view property details, photos, and amenities.
                </p>
              </section>
            </div>
            
            {/* Filters Section */}
            <section className="p-4 md:p-6 space-y-6 flex-1 relative overflow-visible md:overflow-y-auto">
              <DynamicGooglePropertyMap showMap={false} />
            </section>
            
            {/* Footer */}
            <div className="p-4 md:p-6 border-t border-gray-200 mt-auto">
              <p className="text-xs text-gray-500 text-center">
                Powered by{' '}
                <a
                  href="https://sageoutdooradvisory.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-gray-900 underline transition-colors"
                >
                  Sage Outdoor Advisory
                </a>
              </p>
            </div>
          </aside>

          {/* Right Column - Map (Full Height) */}
          <main className="flex-1 relative overflow-hidden">
            <DynamicGooglePropertyMap showMap={true} />
          </main>
        </div>
      </MapProvider>
    </>
  );
}
