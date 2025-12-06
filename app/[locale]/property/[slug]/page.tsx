import { Metadata } from "next";
import { getAllPropertySlugs, getPropertiesBySlug, getNearbyProperties } from "@/lib/properties";
import { parseCoordinates } from "@/lib/types/sage";
import { notFound } from "next/navigation";
import PropertyDetailTemplate from "@/components/PropertyDetailTemplate";
import { generatePropertyBreadcrumbSchema, generatePropertyLocalBusinessSchema, generatePropertyFAQSchema, generatePropertyAmenitiesSchema } from "@/lib/schema";
import { locales, type Locale } from "@/i18n";
import { generateHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";

interface PageProps {
  params: {
    locale: string;
    slug: string;
  };
}

export async function generateStaticParams() {
  const slugs = await getAllPropertySlugs();
  const params: Array<{ locale: string; slug: string }> = [];
  
  // Generate params for all locales and slugs
  for (const locale of locales) {
    for (const item of slugs) {
      params.push({ locale, slug: item.slug });
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
  
  const properties = await getPropertiesBySlug(slug);
  
  if (!properties || properties.length === 0) {
    return {
      title: "Property Not Found | Sage Outdoor Advisory",
    };
  }

  const firstProperty = properties[0];
  const propertyName = firstProperty.property_name || "Unnamed Property";
  
  // Build location string
  const locationParts: string[] = [];
  if (firstProperty.city) locationParts.push(firstProperty.city);
  if (firstProperty.state) locationParts.push(firstProperty.state);
  if (firstProperty.country) locationParts.push(firstProperty.country);
  const location = locationParts.join(", ") || "";
  
  // Build optimized description with key information
  const descriptionParts: string[] = [];
  
  // Add rating if available
  if (firstProperty.google_rating && firstProperty.google_user_rating_total) {
    descriptionParts.push(`${firstProperty.google_rating.toFixed(1)}★ from ${firstProperty.google_user_rating_total} reviews`);
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
  
  // Get first photo for OG image if available
  let imageUrl = `${baseUrl}/og-map-image.jpg`; // Fallback image
  if (firstProperty.google_photos) {
    let photos: any = firstProperty.google_photos;
    if (typeof photos === 'string') {
      try {
        photos = JSON.parse(photos);
      } catch (e) {
        // Ignore parse errors
      }
    }
    if (Array.isArray(photos) && photos.length > 0) {
      const photo = photos[0];
      if (photo?.name) {
        const maxWidth = photo.widthPx ? Math.min(photo.widthPx, 1200) : 1200;
        const maxHeight = photo.heightPx ? Math.min(photo.heightPx, 630) : 630;
        const encodedPhotoName = encodeURIComponent(photo.name);
        imageUrl = `${baseUrl}/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
      }
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
  
  const properties = await getPropertiesBySlug(slug);

  if (!properties || properties.length === 0) {
    notFound();
  }

  const firstProperty = properties[0];
  const propertyName = firstProperty.property_name || "Unnamed Property";
  
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
  
  // Generate structured data
  const breadcrumbSchema = generatePropertyBreadcrumbSchema(slug, propertyName);
  const localBusinessSchema = generatePropertyLocalBusinessSchema({
    ...firstProperty,
    slug: slug,
  });
  const faqSchema = generatePropertyFAQSchema({
    property_name: firstProperty.property_name,
    unit_type: firstProperty.unit_type,
    city: firstProperty.city,
    state: firstProperty.state,
    operating_season_months: firstProperty.operating_season_months,
    minimum_nights: firstProperty.minimum_nights,
    pets: firstProperty.pets,
    avg_retail_daily_rate_2024: firstProperty.avg_retail_daily_rate_2024,
    google_rating: firstProperty.google_rating || null,
    google_user_rating_total: firstProperty.google_user_rating_total || null,
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
      />
    </>
  );
}