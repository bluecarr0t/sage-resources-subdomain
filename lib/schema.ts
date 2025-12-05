import { LandingPageContent } from "./landing-pages";
import { GuideContent } from "./guides/types";

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateOrganizationSchema(includeRating: boolean = true) {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sage Outdoor Advisory",
    "url": "https://sageoutdooradvisory.com",
    "foundingDate": "2015",
    "knowsAbout": [
      "Glamping Feasibility Studies",
      "RV Resort Appraisals",
      "Campground Market Analysis",
      "Outdoor Hospitality Consulting",
      "Feasibility Studies",
      "Property Appraisals",
      "Market Analysis"
    ],
    "sameAs": [
      "https://resources.sageoutdooradvisory.com"
    ],
    "logo": "https://sageoutdooradvisory.com/logo.png",
    "description": "Leading consultancy for feasibility studies and appraisals in the outdoor hospitality industry"
  };

  // Add aggregate rating to organization schema for rich results
  if (includeRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "127",
      "bestRating": "5",
      "worstRating": "1"
    };
  }

  return schema;
}

export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "name": "Sage Outdoor Advisory",
    "description": "Leading consultancy for feasibility studies and appraisals in the outdoor hospitality industry",
    "url": "https://sageoutdooradvisory.com",
    "logo": "https://sageoutdooradvisory.com/logo.png",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "5113 South Harper, Suite 2C – #4001",
      "addressLocality": "Chicago",
      "addressRegion": "Illinois",
      "postalCode": "60615",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "41.7897",
      "longitude": "-87.5994"
    },
    "areaServed": {
      "@type": "Country",
      "name": "United States"
    },
    "serviceType": [
      "Feasibility Studies",
      "Property Appraisals",
      "Market Analysis",
      "Outdoor Hospitality Consulting"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Outdoor Hospitality Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Glamping Feasibility Study",
            "description": "Expert glamping feasibility studies to validate your outdoor hospitality project"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "RV Resort Feasibility Study",
            "description": "Professional RV resort feasibility studies to guide your investment decisions"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Campground Feasibility Study",
            "description": "Professional campground feasibility studies with market analysis and financial projections"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Glamping Appraisal",
            "description": "Professional glamping property appraisals and valuations"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "RV Resort Appraisal",
            "description": "Professional RV resort appraisals and valuations for financing and investment decisions"
          }
        }
      ]
    }
  };
}

export function generateBreadcrumbSchema(slug: string, title: string) {
  return {
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
        "name": title,
        "item": `https://resources.sageoutdooradvisory.com/landing/${slug}`
      }
    ]
  };
}

export function generateGuideBreadcrumbSchema(slug: string, title: string) {
  return {
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
        "name": "Guides",
        "item": "https://resources.sageoutdooradvisory.com/guides"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": title,
        "item": `https://resources.sageoutdooradvisory.com/guides/${slug}`
      }
    ]
  };
}

export function generateFAQSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

export function generateServiceSchema(content: LandingPageContent) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": content.hero.headline,
    "description": content.metaDescription,
    "provider": {
      "@type": "ProfessionalService",
      "name": "Sage Outdoor Advisory",
      "url": "https://sageoutdooradvisory.com"
    },
    "areaServed": {
      "@type": "Country",
      "name": "United States"
    },
    "serviceType": content.hero.headline
  };
}

export function generateHowToSchema(steps: string[], title: string, description?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": title,
    "description": description || title,
    "step": steps.map((step, index) => {
      // Extract step name and text (format: "Step Name: Step description")
      const parts = step.split(':');
      const stepName = parts[0]?.trim() || `Step ${index + 1}`;
      const stepText = parts.slice(1).join(':').trim() || step;
      
      return {
        "@type": "HowToStep",
        "position": index + 1,
        "name": stepName,
        "text": stepText
      };
    })
  };
}

export function generateArticleSchema(content: GuideContent) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const url = `${baseUrl}/guides/${content.slug}`;
  const publishDate = content.lastModified || new Date().toISOString().split('T')[0];
  
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": content.title,
    "description": content.metaDescription,
    "url": url,
    "datePublished": publishDate,
    "dateModified": content.lastModified || publishDate,
    "author": {
      "@type": "Organization",
      "name": "Sage Outdoor Advisory",
      "url": "https://sageoutdooradvisory.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Sage Outdoor Advisory",
      "url": "https://sageoutdooradvisory.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://sageoutdooradvisory.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    },
    "articleSection": content.category === 'feasibility' ? 'Feasibility Studies' : 
                      content.category === 'appraisal' ? 'Property Appraisals' : 
                      'Industry Guides',
    "keywords": content.keywords?.join(", ") || ""
  };
}

export function generateLandingPageArticleSchema(content: LandingPageContent) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const url = `${baseUrl}/landing/${content.slug}`;
  // Use lastModified if available, otherwise default to a recent date for existing content
  const publishDate = content.lastModified || "2025-01-01";
  const modifiedDate = content.lastModified || publishDate;
  
  // Determine article section based on content
  let articleSection = "Outdoor Hospitality Services";
  if (content.slug.includes("feasibility")) {
    articleSection = "Feasibility Studies";
  } else if (content.slug.includes("appraisal")) {
    articleSection = "Property Appraisals";
  } else if (content.slug.includes("how-to") || content.slug.includes("finance")) {
    articleSection = "Industry Guides";
  }
  
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": content.hero.headline,
    "description": content.metaDescription,
    "url": url,
    "datePublished": publishDate,
    "dateModified": modifiedDate,
    "author": {
      "@type": "Organization",
      "name": "Sage Outdoor Advisory",
      "url": "https://sageoutdooradvisory.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Sage Outdoor Advisory",
      "url": "https://sageoutdooradvisory.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://sageoutdooradvisory.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    },
    "articleSection": articleSection,
    "keywords": content.keywords?.join(", ") || ""
  };
}

export function generateItemListSchema(items: string[], name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": name,
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item
    }))
  };
}

export function generateSpeakableSchema(selectors: string[] = [".speakable-answer", "h1", "h2"]) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": selectors,
      "xpath": []
    }
  };
}

export function generateReviewSchema(review: {
  author: string;
  rating: number;
  reviewBody: string;
  datePublished?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "author": {
      "@type": "Person",
      "name": review.author
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": review.rating.toString(),
      "bestRating": "5",
      "worstRating": "1"
    },
    "reviewBody": review.reviewBody,
    "datePublished": review.datePublished || new Date().toISOString().split('T')[0],
    "itemReviewed": {
      "@type": "Service",
      "name": "Sage Outdoor Advisory",
      "provider": {
        "@type": "Organization",
        "name": "Sage Outdoor Advisory"
      }
    }
  };
}

export function generateAggregateRatingSchema(ratingValue: number, reviewCount: number) {
  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    "ratingValue": ratingValue.toString(),
    "reviewCount": reviewCount.toString(),
    "bestRating": "5",
    "worstRating": "1"
  };
}

export function generateMapSchema() {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  return {
    "@context": "https://schema.org",
    "@type": "Map",
    "name": "Glamping Properties Interactive Map",
    "description": "Interactive map showing glamping properties across the United States and Canada",
    "mapType": "InteractiveMap",
    "url": `${baseUrl}/map`,
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 38.5,
      "longitude": -96.0
    }
  };
}

export function generateMapItemListSchema(propertyCount: number) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Glamping Properties Map",
    "description": `Interactive map of ${propertyCount}+ glamping properties across the United States and Canada`,
    "numberOfItems": propertyCount,
    "url": `${baseUrl}/map`,
    "itemListElement": {
      "@type": "ListItem",
      "position": 1,
      "name": "Glamping Properties",
      "description": `Explore ${propertyCount}+ glamping properties on an interactive map`
    }
  };
}

export function generateMapWebApplicationSchema() {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Glamping Properties Map",
    "applicationCategory": "TravelApplication",
    "operatingSystem": "Web",
    "url": `${baseUrl}/map`,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "featureList": [
      "Interactive map with glamping properties",
      "Filter by location, unit type, and price",
      "Property details and photos",
      "Google Places integration"
    ],
    "browserRequirements": "Requires JavaScript. Requires HTML5.",
    "softwareHelp": {
      "@type": "CreativeWork",
      "text": "Use the filters on the left to narrow down properties by location, unit type, or price range. Click on map markers to view property details."
    }
  };
}

export function generateMapBreadcrumbSchema() {
  return {
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
        "item": "https://resources.sageoutdooradvisory.com/map"
      }
    ]
  };
}

export function generatePropertyBreadcrumbSchema(slug: string, propertyName: string) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  return {
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
        "name": "Map",
        "item": `${baseUrl}/map`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": propertyName,
        "item": `${baseUrl}/property/${slug}`
      }
    ]
  };
}

export function generatePropertyLocalBusinessSchema(property: {
  property_name: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
  lat?: string | number | null;
  lon?: string | number | null;
  google_phone_number?: string | null;
  google_website_uri?: string | null;
  url?: string | null;
  google_rating?: number | null;
  google_user_rating_total?: number | null;
  google_photos?: Array<{
    name: string;
    widthPx?: number;
    heightPx?: number;
  }> | null | string;
  google_opening_hours?: {
    weekdayDescriptions?: string[];
  } | null;
  slug: string;
}) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const propertyName = property.property_name || "Unnamed Property";
  const url = `${baseUrl}/property/${property.slug}`;
  
  // Parse photos if string
  let photos: Array<{ name: string; widthPx?: number; heightPx?: number }> = [];
  if (property.google_photos) {
    if (typeof property.google_photos === 'string') {
      try {
        photos = JSON.parse(property.google_photos);
      } catch (e) {
        // Ignore parse errors
      }
    } else if (Array.isArray(property.google_photos)) {
      photos = property.google_photos;
    }
  }
  
  // Build address
  const addressParts: string[] = [];
  if (property.address) addressParts.push(property.address);
  if (property.city) addressParts.push(property.city);
  if (property.state) addressParts.push(property.state);
  if (property.zip_code) addressParts.push(property.zip_code);
  if (property.country) addressParts.push(property.country);
  
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": propertyName,
    "url": url,
    "description": `Information about ${propertyName} glamping property`,
  };
  
  // Add address
  if (addressParts.length > 0) {
    schema.address = {
      "@type": "PostalAddress",
      "streetAddress": property.address || undefined,
      "addressLocality": property.city || undefined,
      "addressRegion": property.state || undefined,
      "postalCode": property.zip_code || undefined,
      "addressCountry": property.country || undefined,
    };
  }
  
  // Add geo coordinates
  const lat = property.lat ? (typeof property.lat === 'string' ? parseFloat(property.lat) : property.lat) : null;
  const lon = property.lon ? (typeof property.lon === 'string' ? parseFloat(property.lon) : property.lon) : null;
  if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
    schema.geo = {
      "@type": "GeoCoordinates",
      "latitude": lat.toString(),
      "longitude": lon.toString(),
    };
  }
  
  // Add phone
  if (property.google_phone_number) {
    schema.telephone = property.google_phone_number;
  }
  
  // Add website
  const websiteUrl = property.google_website_uri || property.url;
  if (websiteUrl) {
    schema.sameAs = [websiteUrl];
  }
  
  // Add rating with enhanced review schema
  if (property.google_rating !== null && property.google_rating !== undefined) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": property.google_rating.toString(),
      "reviewCount": property.google_user_rating_total?.toString() || "0",
      "bestRating": "5",
      "worstRating": "1",
    };
    
    // Add review link if website URI is available (links to Google reviews)
    const websiteUrl = property.google_website_uri || property.url;
    if (websiteUrl && property.google_user_rating_total && property.google_user_rating_total > 0) {
      schema.review = [{
        "@type": "Review",
        "author": {
          "@type": "Organization",
          "name": "Google Reviews"
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": property.google_rating.toString(),
          "bestRating": "5",
          "worstRating": "1"
        },
        "reviewBody": `See ${property.google_user_rating_total} ${property.google_user_rating_total === 1 ? 'review' : 'reviews'} on Google for ${propertyName}`,
        "datePublished": new Date().toISOString().split('T')[0],
        "url": websiteUrl
      }];
    }
  }
  
  // Add photos
  if (photos.length > 0) {
    schema.image = photos.slice(0, 5).map((photo) => {
      const maxWidth = photo.widthPx ? Math.min(photo.widthPx, 1200) : 1200;
      const maxHeight = photo.heightPx ? Math.min(photo.heightPx, 630) : 630;
      const encodedPhotoName = encodeURIComponent(photo.name);
      return `${baseUrl}/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=${maxWidth}&maxHeightPx=${maxHeight}`;
    });
  }
  
  // Add opening hours
  if (property.google_opening_hours?.weekdayDescriptions && property.google_opening_hours.weekdayDescriptions.length > 0) {
    schema.openingHoursSpecification = property.google_opening_hours.weekdayDescriptions.map((description: string) => {
      // Try to parse common formats like "Monday: 9:00 AM – 5:00 PM"
      const match = description.match(/(\w+day):\s*(.+)/);
      if (match) {
        const day = match[1];
        const hours = match[2];
        // Map day name to schema.org day
        const dayMap: Record<string, string> = {
          'Monday': 'Monday',
          'Tuesday': 'Tuesday',
          'Wednesday': 'Wednesday',
          'Thursday': 'Thursday',
          'Friday': 'Friday',
          'Saturday': 'Saturday',
          'Sunday': 'Sunday',
        };
        if (dayMap[day]) {
          return {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": dayMap[day],
            "description": hours,
          };
        }
      }
      return null;
    }).filter((item: any) => item !== null);
  }
  
  return schema;
}

/**
 * Helper function to check if an amenity is available
 */
function hasAmenity(value: string | null | undefined): boolean {
  if (!value) return false;
  const lower = String(value).toLowerCase().trim();
  return lower === 'yes' || lower === 'y' || lower === 'true' || lower === '1';
}

/**
 * Generate FAQ schema for property pages
 * Creates rich snippet opportunities for common property questions
 */
export function generatePropertyFAQSchema(property: {
  property_name: string | null;
  unit_type: string | null;
  city: string | null;
  state: string | null;
  operating_season_months: string | null;
  minimum_nights: string | null;
  pets: string | null;
  avg_retail_daily_rate_2024: string | null;
  google_rating: number | null;
  google_user_rating_total: number | null;
}): any {
  const propertyName = property.property_name || 'This property';
  const location = property.city && property.state 
    ? `${property.city}, ${property.state}` 
    : property.city || property.state || '';
  
  const faqs: Array<{ question: string; answer: string }> = [];
  
  // Question 1: What type of units are available?
  if (property.unit_type) {
    faqs.push({
      question: `What type of glamping units are available at ${propertyName}?`,
      answer: `${propertyName} offers ${property.unit_type} accommodations. View all available unit types, amenities, and rates on the property page.`
    });
  }
  
  // Question 2: When is the property open?
  if (property.operating_season_months) {
    faqs.push({
      question: `When is ${propertyName} open for bookings?`,
      answer: `${propertyName} operates during ${property.operating_season_months}. Check availability and book directly through the property's website.`
    });
  }
  
  // Question 3: What is the minimum stay?
  if (property.minimum_nights) {
    faqs.push({
      question: `What is the minimum stay requirement at ${propertyName}?`,
      answer: `The minimum stay at ${propertyName} is ${property.minimum_nights} nights.`
    });
  }
  
  // Question 4: Are pets allowed?
  if (property.pets) {
    const petAnswer = hasAmenity(property.pets) 
      ? `Yes, ${propertyName} welcomes pets. Please check the property's pet policy for specific details and restrictions.`
      : `No, ${propertyName} does not allow pets.`;
    faqs.push({
      question: `Are pets allowed at ${propertyName}?`,
      answer: petAnswer
    });
  }
  
  // Question 5: What are the rates?
  if (property.avg_retail_daily_rate_2024) {
    faqs.push({
      question: `What are the rates at ${propertyName}?`,
      answer: `Rates at ${propertyName} start from $${property.avg_retail_daily_rate_2024} per night. Rates may vary by season and unit type. Check the property's website for current pricing and availability.`
    });
  }
  
  // Question 6: What is the property's rating?
  if (property.google_rating !== null && property.google_rating !== undefined && property.google_rating >= 4.0) {
    const reviewCount = property.google_user_rating_total || 0;
    faqs.push({
      question: `What is ${propertyName}'s rating?`,
      answer: `${propertyName} has a ${property.google_rating.toFixed(1)}-star rating from ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}, indicating high satisfaction among visitors.`
    });
  }
  
  // Question 7: Where is the property located?
  if (location) {
    faqs.push({
      question: `Where is ${propertyName} located?`,
      answer: `${propertyName} is located in ${location}. View the property on our interactive map for exact location and nearby attractions.`
    });
  }
  
  if (faqs.length === 0) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

/**
 * Generate ItemList schema for property amenities
 * Helps Google understand amenities as structured data for rich results
 */
export function generatePropertyAmenitiesSchema(property: {
  property_name: string | null;
  pool?: string | null;
  hot_tub_sauna?: string | null;
  wifi?: string | null;
  pets?: string | null;
  toilet?: string | null;
  shower?: string | null;
  water?: string | null;
  trash?: string | null;
  cooking_equipment?: string | null;
  picnic_table?: string | null;
  laundry?: string | null;
  campfires?: string | null;
  playground?: string | null;
  sage_p_amenity_restaurant?: string | null;
  sage_p_amenity_waterfront?: string | null;
}): any {
  const propertyName = property.property_name || 'this property';
  const amenities: string[] = [];
  
  // Collect all available amenities
  if (hasAmenity(property.pool)) amenities.push('Pool');
  if (hasAmenity(property.hot_tub_sauna)) amenities.push('Hot Tub / Sauna');
  if (hasAmenity(property.wifi)) amenities.push('Wi-Fi');
  if (hasAmenity(property.pets)) amenities.push('Pets Allowed');
  if (hasAmenity(property.toilet)) amenities.push('Restrooms');
  if (hasAmenity(property.shower)) amenities.push('Showers');
  if (hasAmenity(property.water)) amenities.push('Water Access');
  if (hasAmenity(property.trash)) amenities.push('Trash Service');
  if (hasAmenity(property.cooking_equipment)) amenities.push('Cooking Equipment');
  if (hasAmenity(property.picnic_table)) amenities.push('Picnic Tables');
  if (hasAmenity(property.laundry)) amenities.push('Laundry Facilities');
  if (hasAmenity(property.campfires)) amenities.push('Campfires Allowed');
  if (hasAmenity(property.playground)) amenities.push('Playground');
  if (hasAmenity(property.sage_p_amenity_restaurant)) amenities.push('Restaurant');
  if (hasAmenity(property.sage_p_amenity_waterfront)) amenities.push('Waterfront');
  
  if (amenities.length === 0) return null;
  
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Amenities",
    "description": `Amenities available at ${propertyName}`,
    "itemListElement": amenities.map((amenity, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": amenity
    }))
  };
}

