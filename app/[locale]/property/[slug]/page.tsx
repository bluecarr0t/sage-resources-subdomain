import { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { getAllPropertySlugs, getPropertiesBySlug, getNearbyProperties } from "@/lib/properties";
import { getAllNationalParkSlugs, getNationalParkBySlug, getSlugType } from "@/lib/national-parks";
import { parseCoordinates } from "@/lib/types/sage";
import { notFound } from "next/navigation";
import PropertyDetailTemplate from "@/components/PropertyDetailTemplate";
import PropertyDetailServerFaqs from "@/components/PropertyDetailServerFaqs";
import PropertyDetailServerAddress from "@/components/PropertyDetailServerAddress";
import NationalParkDetailTemplate from "@/components/NationalParkDetailTemplate";
import { generatePropertyBreadcrumbSchema, generatePropertyLocalBusinessSchema, generatePropertyFAQSchema, generatePropertyAmenitiesSchema, buildPropertyFaqEntries } from "@/lib/schema";
import { getPropertyOtaListings } from "@/lib/property-ota-listings";
import { resolvePropertyMapCoordinates } from "@/lib/property-map-location";
import { locales, type Locale } from "@/i18n";
import { generateEnOnlyHreflangAlternates, getOpenGraphLocale } from "@/lib/i18n-utils";
import { evaluatePropertyIndexTier, propertyTierShouldIndex } from "@/lib/property-seo-index";
import { fetchGlampingPropertyPublicImages } from "@/lib/fetch-glamping-property-public-images";
import { shouldSkipGooglePlacesForPropertySlug } from "@/lib/property-google-places-policy";
import { normalizePlacesApiPlaceId } from "@/lib/google-places-place-id";
import { getBrandSummaryById } from "@/lib/brand-public-pages";
import {
  collectDistinctUnitTypes,
  formatUnitTypesDisplay,
} from "@/lib/property-unit-types";
import { buildPropertyPageMetaDescription } from "@/lib/property-page-meta-description";
import { buildPropertyPageTitle } from "@/lib/property-page-title";

// ISR: Revalidate pages every 24 hours
export const revalidate = 86400;

// Allow dynamic params for locales not in generateStaticParams
// This allows /es/property/[slug], /fr/property/[slug], etc. to work
// without generating static pages for each locale
export const dynamicParams = true;

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
  // Other locales (es, fr, de) will be rendered dynamically on-demand
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
    
    const baseUrl = "https://resources.sageoutdooradvisory.com";
    const pathname = `/${locale}/property/${slug}`;
    const url = `${baseUrl}${pathname}`;
    
    // Build description without Google Places data (fetched client-side)
    const descriptionParts: string[] = [];
    if (park.state) descriptionParts.push(`in ${park.state}`);
    if (park.date_established) descriptionParts.push(`established ${park.date_established}`);
    
    let description = parkName;
    if (descriptionParts.length > 0) {
      description += `: ${descriptionParts.join(' • ')}.`;
    }
    description += ` View photos, details, and visitor information.`;
    
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    }
    
    // Use fallback OG image (Google Places photos fetched client-side)
    const imageUrl = "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg";
    
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
        ...generateEnOnlyHreflangAlternates(pathname),
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
  const propertyUnitTypes = collectDistinctUnitTypes(properties);
  const propertyName = firstProperty.property_name || "Unnamed Property";
  
  const locationParts: string[] = [];
  if (firstProperty.city) locationParts.push(firstProperty.city);
  if (firstProperty.state) locationParts.push(firstProperty.state);
  if (firstProperty.country) locationParts.push(firstProperty.country);
  const location = locationParts.join(", ") || "";

  const description = buildPropertyPageMetaDescription({
    propertyName,
    propertyType: firstProperty.property_type,
    unitTypes: propertyUnitTypes,
    city: firstProperty.city,
    state: firstProperty.state,
    country: firstProperty.country,
    description: firstProperty.description,
    rateAvgRetailDailyRate: firstProperty.rate_avg_retail_daily_rate,
  });

  const title = buildPropertyPageTitle({
    propertyName,
    city: firstProperty.city,
    state: firstProperty.state,
    country: firstProperty.country,
    propertyType: firstProperty.property_type,
    unitTypes: propertyUnitTypes,
  });
  
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const pathname = `/${locale}/property/${slug}`;
  const url = `${baseUrl}${pathname}`;
  const indexTier = evaluatePropertyIndexTier(firstProperty);
  const shouldIndex = propertyTierShouldIndex(indexTier);

  // Use fallback OG image (Google Places photos fetched client-side)
  const imageUrl = "https://b0evzueuuq9l227n.public.blob.vercel-storage.com/glamping-units/mountain-view.jpg";

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
      ...generateEnOnlyHreflangAlternates(pathname),
    },
    robots: {
      index: shouldIndex,
      follow: true,
      googleBot: {
        index: shouldIndex,
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
    
    // Google Places data is now fetched client-side
    return (
      <NationalParkDetailTemplate
        park={park}
        slug={slug}
        googlePlacesData={null}
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
  const propertyUnitTypes = collectDistinctUnitTypes(properties);
  const propertyUnitTypesLabel = formatUnitTypesDisplay(propertyUnitTypes);
  const propertyName = firstProperty.property_name || "Unnamed Property";
  const skipGooglePlaces = shouldSkipGooglePlacesForPropertySlug(slug);
  const propertyRowId = typeof firstProperty.id === "number" ? firstProperty.id : Number(firstProperty.id);
  noStore();
  const propertyImages = Number.isFinite(propertyRowId)
    ? await fetchGlampingPropertyPublicImages(propertyRowId)
    : { heroUrl: null, galleryUrls: [] };

  const coordinates =
    (await resolvePropertyMapCoordinates(firstProperty)) ??
    parseCoordinates(firstProperty.lat, firstProperty.lon);

  let nearbyProperties: any[] = [];

  if (coordinates) {
    nearbyProperties = await getNearbyProperties(
      coordinates[0],
      coordinates[1],
      slug,
      50, // 50 mile radius
      6   // Limit to 6 properties
    );
  }
  
  // Property data for schema generation (Google Places data fetched client-side, not included in schema)
  const propertyForSchema = {
    ...firstProperty,
    slug: slug,
    ...(coordinates
      ? { lat: coordinates[0], lon: coordinates[1] }
      : {}),
    // Google Places data is not available at build time, so use null
    google_rating: null,
    google_user_rating_total: null,
    google_photos: null,
    google_website_uri: null,
    google_phone_number: firstProperty.phone_number || null,
  };
  
  // Generate structured data
  const brandSummary = await getBrandSummaryById(firstProperty.brand_id);
  const breadcrumbSchema = generatePropertyBreadcrumbSchema(slug, propertyName, locale);
  const thirdPartyListingUrls = getPropertyOtaListings(properties).map((l) => l.url);
  const localBusinessSchema = generatePropertyLocalBusinessSchema({
    ...propertyForSchema,
    thirdPartyListingUrls,
  });
  const faqSchema = generatePropertyFAQSchema({
    property_name: firstProperty.property_name,
    unit_type: propertyUnitTypesLabel,
    city: firstProperty.city,
    state: firstProperty.state,
    operating_season_months: firstProperty.operating_season_months,
    minimum_nights: firstProperty.minimum_nights,
    pets: firstProperty.unit_pets,
    rate_avg_retail_daily_rate: firstProperty.rate_avg_retail_daily_rate ?? null,
    // Google Places data lives in a separate table; fetched client-side, unavailable at SSG build time
    google_rating: null,
    google_user_rating_total: null,
  });

  const propertyFaqEntries = buildPropertyFaqEntries({
    property_name: firstProperty.property_name,
    unit_type: propertyUnitTypesLabel,
    city: firstProperty.city,
    state: firstProperty.state,
    operating_season_months: firstProperty.operating_season_months,
    minimum_nights: firstProperty.minimum_nights,
    pets: firstProperty.unit_pets,
    rate_avg_retail_daily_rate: firstProperty.rate_avg_retail_daily_rate ?? null,
    google_rating: null,
    google_user_rating_total: null,
  });
  
  const amenitiesSchema = generatePropertyAmenitiesSchema({
    property_name: firstProperty.property_name,
    pool: firstProperty.property_pool,
    hot_tub_sauna: firstProperty.unit_hot_tub_or_sauna,
    wifi: firstProperty.unit_wifi,
    pets: firstProperty.unit_pets,
    private_bathroom: firstProperty.unit_private_bathroom,
    shower: firstProperty.unit_shower,
    water: firstProperty.unit_water,
    picnic_table: firstProperty.unit_picnic_table,
    laundry: firstProperty.property_laundry,
    unit_campfires: firstProperty.unit_campfires,
    playground: firstProperty.property_playground,
    sage_p_amenity_restaurant: firstProperty.property_restaurant,
    sage_p_amenity_waterfront: firstProperty.property_waterfront,
  });

  const propertyGooglePlaceId = normalizePlacesApiPlaceId(firstProperty.google_place_id);

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
        googlePlacesData={null}
        googlePlaceId={propertyGooglePlaceId}
        skipGooglePlaces={skipGooglePlaces}
        propertyImages={propertyImages}
        locale={locale}
        mapCoordinates={coordinates}
        serverSummaryRendered
        serverFaqs={<PropertyDetailServerFaqs propertyFaqs={propertyFaqEntries} />}
        serverAddress={<PropertyDetailServerAddress property={firstProperty} />}
        brandPage={
          brandSummary
            ? { slug: brandSummary.slug, displayName: brandSummary.display_name }
            : null
        }
      />
    </>
  );
}