import { Metadata } from "next";
import { cache } from "react";
import { getAllPropertySlugs, getPropertiesBySlug, getNearbyProperties } from "@/lib/properties";
import { getAllNationalParkSlugs, getNationalParkBySlug, getSlugType } from "@/lib/national-parks";
import { parseCoordinates } from "@/lib/types/sage";
import { notFound } from "next/navigation";
import PropertyDetailTemplate from "@/components/PropertyDetailTemplate";
import NationalParkDetailTemplate from "@/components/NationalParkDetailTemplate";
import { generatePropertyBreadcrumbSchema, generatePropertyLocalBusinessSchema, generatePropertyFAQSchema, generatePropertyAmenitiesSchema } from "@/lib/schema";
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { fetchGooglePlacesDataCached } from "@/lib/google-places-cache";

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateStaticParams() {
  // Get slugs from both glamping properties and national parks
  const [propertySlugs, nationalParkSlugs] = await Promise.all([
    getAllPropertySlugs(),
    getAllNationalParkSlugs(),
  ]);
  
  const params: Array<{ locale: string; slug: string }> = [];
  
  // Property pages are data-driven and don't need localization
  // Only generate for default locale (en) to reduce build time and page count
  const defaultLocale = 'en';
  
  // Add glamping property slugs
  for (const item of propertySlugs) {
    params.push({ locale: defaultLocale, slug: item.slug });
  }
  
  // Add national park slugs
  for (const item of nationalParkSlugs) {
    params.push({ locale: defaultLocale, slug: item.slug });
  }
  
  return params;
}

/**
 * Helper function to get Google Places data with request-level memoization
 * This ensures that within a single request, both generateMetadata and the page component
 * share the same promise, eliminating duplicate API calls.
 */
const getGooglePlacesDataForProperty = cache(async (
  propertyName: string,
  city: string | null,
  state: string | null,
  address: string | null
) => {
  return fetchGooglePlacesDataCached(propertyName, city, state, address);
});

const getGooglePlacesDataForPark = cache(async (
  parkName: string,
  state: string | null
) => {
  return fetchGooglePlacesDataCached(parkName, null, state, null);
});

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  // Determine if this is a national park or glamping property
  const slugType = await getSlugType(slug);
  
  // Handle national parks
  if (slugType === 'national-park') {
    const park = await getNationalParkBySlug(slug);
    
    if (!park) {
      return {
        title: "Park Not Found | Sage Outdoor Advisory",
      };
    }
    
    const parkName = park.name || "National Park";
    
    // Fetch Google Places data for metadata (cached and memoized per request)
    const googlePlacesData = await getGooglePlacesDataForPark(
      parkName,
      park.state || null
    );
    
    const baseUrl = "https://resources.sageoutdooradvisory.com";
    const pathname = `/${locale}/property/${slug}`;
    const url = `${baseUrl}${pathname}`;
    
    // Build description
    const descriptionParts: string[] = [];
    if (park.state) descriptionParts.push(`in ${park.state}`);
    if (park.date_established) descriptionParts.push(`established ${park.date_established}`);
    if (googlePlacesData?.rating && googlePlacesData?.userRatingCount) {
      descriptionParts.push(`${googlePlacesData.rating.toFixed(1)}★ from ${googlePlacesData.userRatingCount} reviews`);
    }
    
    let description = parkName;
    if (descriptionParts.length > 0) {
      description += `: ${descriptionParts.join(' • ')}.`;
    }
    description += ` View photos, details, and visitor information.`;
    
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }
    
    // Get first photo for OG image if available
    let imageUrl = `${baseUrl}/og-map-image.jpg`;
    if (googlePlacesData?.photos && googlePlacesData.photos.length > 0) {
      const photo = googlePlacesData.photos[0];
      if (photo?.name) {
        const maxWidth = photo.widthPx ? Math.min(photo.widthPx, 1200) : 1200;
        const maxHeight = photo.heightPx ? Math.min(photo.heightPx, 630) : 630;
        const encodedPhotoName = encodeURIComponent(photo.name);
        imageUrl = `${baseUrl}/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
      }
    }
    
    return {
      title: `${parkName} | National Park | Sage Outdoor Advisory`,
      description,
      keywords: `${parkName}, national park, ${park.state || ""}, ${park.park_code || ""}`.trim(),
      openGraph: {
        title: parkName,
        description,
        url,
        siteName: "Sage Outdoor Advisory",
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: parkName,
          },
        ],
        locale: getOpenGraphLocale(locale as Locale),
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: parkName,
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
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
    };
  }
  
  // Handle glamping properties (existing logic)
  const properties = await getPropertiesBySlug(slug);
  
  if (!properties || properties.length === 0) {
    return {
      title: "Property Not Found | Sage Outdoor Advisory",
    };
  }

  const firstProperty = properties[0];
  const propertyName = firstProperty.property_name || "Unnamed Property";
  
  // Fetch Google Places data for metadata (cached and memoized per request)
  const googlePlacesData = await getGooglePlacesDataForProperty(
    propertyName,
    firstProperty.city || null,
    firstProperty.state || null,
    firstProperty.address || null
  );
  
  // Build location string
  const locationParts: string[] = [];
  if (firstProperty.city) locationParts.push(firstProperty.city);
  if (firstProperty.state) locationParts.push(firstProperty.state);
  if (firstProperty.country) locationParts.push(firstProperty.country);
  const location = locationParts.join(", ") || "";
  
  // Build optimized description with key information
  const descriptionParts: string[] = [];
  
  // Add rating if available (from Google Places API, not database)
  if (googlePlacesData?.rating && googlePlacesData?.userRatingCount) {
    descriptionParts.push(`${googlePlacesData.rating.toFixed(1)}★ from ${googlePlacesData.userRatingCount} reviews`);
  }
  
  // Add location
  if (location) {
    descriptionParts.push(`in ${location}`);
  }
  
  // Add price range if available
  if (firstProperty.avg_retail_daily_rate_2024) {
    descriptionParts.push(`from $${firstProperty.avg_retail_daily_rate_2024}/night`);
  }
  
  // Add key amenities
  const topAmenities: string[] = [];
  if (firstProperty.pool === 'yes' || firstProperty.pool === 'Yes' || firstProperty.pool === 'Y') topAmenities.push('pool');
  if (firstProperty.hot_tub_sauna === 'yes' || firstProperty.hot_tub_sauna === 'Yes' || firstProperty.hot_tub_sauna === 'Y') topAmenities.push('hot tub');
  if (firstProperty.wifi === 'yes' || firstProperty.wifi === 'Yes' || firstProperty.wifi === 'Y') topAmenities.push('WiFi');
  if (topAmenities.length > 0 && topAmenities.length <= 2) {
    descriptionParts.push(`with ${topAmenities.join(' & ')}`);
  }
  
  let description = propertyName;
  if (descriptionParts.length > 0) {
    description += `: ${descriptionParts.join(' • ')}.`;
  }
  description += ` View photos, amenities, rates, and book directly.`;
  
  // Ensure description is 150-160 characters (optimal length)
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }
  
  // Build optimized title for search intent
  // Format: Property Name - [Unit Type] in City, State | Rates & Reviews
  const unitType = firstProperty.unit_type || '';
  const cityState = location ? location.split(',').slice(0, 2).join(', ') : '';
  
  let title = propertyName;
  
  // Prioritize: Property Name - Unit Type in Location | Rates & Reviews
  if (unitType && cityState) {
    title = `${propertyName} - ${unitType} in ${cityState} | Rates & Reviews`;
  } else if (cityState) {
    title = `${propertyName} in ${cityState} | Rates & Reviews`;
  } else if (unitType) {
    title = `${propertyName} - ${unitType} | Glamping Property`;
  } else {
    title = `${propertyName} | Glamping Property`;
  }
  
  // Ensure title doesn't exceed 60 characters for optimal display
  if (title.length > 60) {
    // Try to truncate location first
    if (cityState && title.includes(cityState)) {
      const cityOnly = cityState.split(',')[0];
      if (cityOnly) {
        title = `${propertyName} - ${unitType || 'Glamping'} in ${cityOnly} | Rates & Reviews`;
        if (title.length > 60) {
          title = title.substring(0, 57) + '...';
        }
      } else {
        title = title.substring(0, 57) + '...';
      }
    } else {
      title = title.substring(0, 57) + '...';
    }
  }
  
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const pathname = `/${locale}/property/${slug}`;
  const url = `${baseUrl}${pathname}`;
  
  // Get first photo for OG image if available (from Google Places API)
  let imageUrl = `${baseUrl}/og-map-image.jpg`; // Fallback image
  if (googlePlacesData?.photos && googlePlacesData.photos.length > 0) {
    const photo = googlePlacesData.photos[0];
    if (photo?.name) {
      const maxWidth = photo.widthPx ? Math.min(photo.widthPx, 1200) : 1200;
      const maxHeight = photo.heightPx ? Math.min(photo.heightPx, 630) : 630;
      const encodedPhotoName = encodeURIComponent(photo.name);
      imageUrl = `${baseUrl}/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
    }
  }

  return {
    title,
    description,
    keywords: `${propertyName}, glamping, ${location}, ${firstProperty.property_type || ""}, glamping property, outdoor hospitality`.trim(),
    openGraph: {
      title: propertyName,
      description,
      url,
      siteName: "Sage Outdoor Advisory",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: propertyName,
        },
      ],
      locale: getOpenGraphLocale(locale as Locale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: propertyName,
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
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function PropertyPage({ params }: PageProps) {
  const { locale, slug } = params;
  
  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }
  
  // Determine if this is a national park or glamping property
  const slugType = await getSlugType(slug);
  
  // Handle national parks
  if (slugType === 'national-park') {
    const park = await getNationalParkBySlug(slug);
    
    if (!park || !park.name) {
      notFound();
    }
    
    // Fetch Google Places data (cached and memoized per request - same promise as generateMetadata)
    const googlePlacesData = await getGooglePlacesDataForPark(
      park.name,
      park.state || null
    );
    
    return (
      <NationalParkDetailTemplate
        park={park}
        slug={slug}
        googlePlacesData={googlePlacesData}
        locale={locale}
      />
    );
  }
  
  // Handle glamping properties (existing logic)
  const properties = await getPropertiesBySlug(slug);

  if (!properties || properties.length === 0) {
    notFound();
  }

  const firstProperty = properties[0];
  const propertyName = firstProperty.property_name || "Unnamed Property";
  
  // Fetch Google Places data (cached and memoized per request - same promise as generateMetadata)
  const googlePlacesData = await getGooglePlacesDataForProperty(
    propertyName,
    firstProperty.city || null,
    firstProperty.state || null,
    firstProperty.address || null
  );
  
  // Get coordinates for nearby properties search
  const coordinates = parseCoordinates(firstProperty.lat, firstProperty.lon);
  let nearbyProperties: any[] = [];
  
  // Fetch nearby properties if coordinates are available
  if (coordinates) {
    nearbyProperties = await getNearbyProperties(
      coordinates[0],
      coordinates[1],
      slug,
      50, // 50 mile radius
      6   // Limit to 6 properties
    );
  }
  
  // Merge Google Places data into property object for schema generation
  const propertyWithGoogleData = {
    ...firstProperty,
    slug: slug,
    // Override with Google Places API data (not from database)
    google_rating: googlePlacesData?.rating || null,
    google_user_rating_total: googlePlacesData?.userRatingCount || null,
    google_photos: googlePlacesData?.photos || null,
    google_website_uri: googlePlacesData?.websiteUri || null,
    // Use phone_number from database, not Google Places API
    google_phone_number: firstProperty.phone_number || null,
  };
  
  // Generate structured data
  const breadcrumbSchema = generatePropertyBreadcrumbSchema(slug, propertyName);
  const localBusinessSchema = generatePropertyLocalBusinessSchema(propertyWithGoogleData);
  const faqSchema = generatePropertyFAQSchema({
    property_name: firstProperty.property_name,
    unit_type: firstProperty.unit_type,
    city: firstProperty.city,
    state: firstProperty.state,
    operating_season_months: firstProperty.operating_season_months,
    minimum_nights: firstProperty.minimum_nights,
    pets: firstProperty.pets,
    avg_retail_daily_rate_2024: firstProperty.avg_retail_daily_rate_2024,
    google_rating: googlePlacesData?.rating || null,
    google_user_rating_total: googlePlacesData?.userRatingCount || null,
  });
  
  const amenitiesSchema = generatePropertyAmenitiesSchema({
    property_name: firstProperty.property_name,
    pool: firstProperty.pool,
    hot_tub_sauna: firstProperty.hot_tub_sauna,
    wifi: firstProperty.wifi,
    pets: firstProperty.pets,
    toilet: firstProperty.toilet,
    shower: firstProperty.shower,
    water: firstProperty.water,
    trash: firstProperty.trash,
    cooking_equipment: firstProperty.cooking_equipment,
    picnic_table: firstProperty.picnic_table,
    laundry: firstProperty.laundry,
    campfires: firstProperty.campfires,
    playground: firstProperty.playground,
    sage_p_amenity_restaurant: firstProperty.sage_p_amenity_restaurant,
    sage_p_amenity_waterfront: firstProperty.sage_p_amenity_waterfront,
  });

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {amenitiesSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(amenitiesSchema) }}
        />
      )}

      <PropertyDetailTemplate 
        properties={properties} 
        slug={slug}
        propertyName={propertyName}
        nearbyProperties={nearbyProperties}
        googlePlacesData={googlePlacesData}
        locale={locale}
      />
    </>
  );
}