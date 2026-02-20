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

/**
 * Extract HowTo steps from a guide content object
 * First checks for explicit howToSteps field, then looks for sections with "Step X:" pattern
 */
export function extractHowToStepsFromGuide(guide: GuideContent): string[] | null {
  // If guide has explicit howToSteps field, use that
  if (guide.howToSteps && guide.howToSteps.length > 0) {
    return guide.howToSteps;
  }

  // Look for sections with titles matching "Step X:" pattern
  const stepSections = guide.sections.filter(section => {
    const title = section.title.trim();
    // Match patterns like "Step 1:", "Step 1:", "Step 7: Design and Construction", etc.
    return /^Step\s+\d+:/i.test(title);
  });

  if (stepSections.length === 0) {
    return null;
  }

  // Extract steps from section titles and content
  const steps: string[] = stepSections.map(section => {
    const title = section.title.trim();
    // Extract step name (everything after "Step X:")
    const stepNameMatch = title.match(/^Step\s+\d+:\s*(.+)$/i);
    const stepName = stepNameMatch ? stepNameMatch[1].trim() : title;

    // Extract a brief description from the content (first paragraph or first sentence)
    let stepDescription = '';
    if (section.content) {
      // Remove HTML tags and get first sentence or first 200 characters
      const textContent = section.content
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Get first sentence or first 200 characters
      const firstSentence = textContent.match(/^[^.!?]+[.!?]/);
      if (firstSentence) {
        stepDescription = firstSentence[0].trim();
      } else {
        stepDescription = textContent.substring(0, 200).trim();
        if (textContent.length > 200) {
          stepDescription += '...';
        }
      }
    }

    // Format as "Step Name: Step description"
    return stepDescription 
      ? `${stepName}: ${stepDescription}`
      : stepName;
  });

  return steps.length > 0 ? steps : null;
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
  
  // Estimate word count from content sections
  const allContent = [
    content.hero.subheadline,
    ...(content.sections?.map(s => s.content) || []),
    content.metaDescription
  ].join(" ");
  const wordCount = allContent.split(/\s+/).length;
  
  // Use OG image for article image
  const imageUrl = "https://sageoutdooradvisory.com/og-image.jpg";
  
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
        "url": "https://sageoutdooradvisory.com/logo.png",
        "width": 600,
        "height": 600
      }
    },
    "image": {
      "@type": "ImageObject",
      "url": imageUrl,
      "width": 1200,
      "height": 630,
      "alt": content.hero.headline
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    },
    "articleSection": articleSection,
    "keywords": content.keywords?.join(", ") || "",
    "wordCount": wordCount,
    "inLanguage": "en-US",
    "isAccessibleForFree": true
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

/**
 * Generate ItemList schema with URLs for carousel eligibility
 * Each item must have a URL for Google to recognize it as a carousel
 */
export function generateItemListSchemaWithUrls(items: Array<{ name: string; url: string }>, name: string) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": name,
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url.startsWith("http") ? item.url : `${baseUrl}${item.url}`
    }))
  };
}

export function generateCourseSchema(content: GuideContent) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const url = `${baseUrl}/guides/${content.slug}`;
  
  // Determine what the course teaches based on category and content
  const teaches: string[] = [];
  if (content.category === 'feasibility') {
    teaches.push("Feasibility Analysis", "Market Research", "Financial Projections", "Outdoor Hospitality Feasibility Studies");
  } else if (content.category === 'appraisal') {
    teaches.push("Property Valuation", "Real Estate Appraisal Methods", "Outdoor Hospitality Property Appraisal");
  } else if (content.category === 'industry') {
    teaches.push("Outdoor Hospitality Industry", "Glamping Industry", "RV Resort Industry", "Industry Analysis");
  }
  
  // Add keywords as additional topics taught
  if (content.keywords && content.keywords.length > 0) {
    teaches.push(...content.keywords.slice(0, 5)); // Limit to 5 additional keywords
  }
  
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": content.title,
    "description": content.metaDescription,
    "url": url,
    "provider": {
      "@type": "Organization",
      "name": "Sage Outdoor Advisory",
      "url": "https://sageoutdooradvisory.com",
      "sameAs": "https://resources.sageoutdooradvisory.com"
    },
    "educationalLevel": "Professional",
    "teaches": teaches.length > 0 ? teaches : ["Outdoor Hospitality", "Feasibility Studies", "Property Appraisals"],
    "courseCode": content.slug,
    "inLanguage": "en-US",
    "isAccessibleForFree": true,
    "learningResourceType": {
      "@type": "DefinedTerm",
      "name": "Guide",
      "inDefinedTermSet": {
        "@type": "DefinedTermSet",
        "name": "Learning Resource Types"
      }
    }
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

export function generateMapSchema(locale?: string) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const mapPath = `/${locale || 'en'}/map`;
  return {
    "@context": "https://schema.org",
    "@type": "Map",
    "name": "Glamping Properties Interactive Map",
    "description": "Interactive map showing glamping properties across the United States and Canada",
    "mapType": "InteractiveMap",
    "url": `${baseUrl}${mapPath}`,
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 38.5,
      "longitude": -96.0
    }
  };
}

export function generateMapItemListSchema(propertyCount: number, locale?: string) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const mapPath = `/${locale || 'en'}/map`;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Glamping Properties Map",
    "description": `Interactive map of ${propertyCount}+ glamping properties across the United States and Canada`,
    "numberOfItems": propertyCount,
    "url": `${baseUrl}${mapPath}`,
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Glamping Properties",
        "item": `${baseUrl}${mapPath}`,
        "description": `Explore ${propertyCount}+ glamping properties on an interactive map`
      }
    ]
  };
}

export function generateMapWebApplicationSchema(locale?: string) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const mapPath = `/${locale || 'en'}/map`;
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Glamping Properties Map",
    "applicationCategory": "TravelApplication",
    "operatingSystem": "Web",
    "url": `${baseUrl}${mapPath}`,
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

export function generateMapBreadcrumbSchema(locale?: string) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const mapPath = `/${locale || 'en'}/map`;
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
        "item": `${baseUrl}${mapPath}`
      }
    ]
  };
}

/**
 * Generate Dataset schema for glamping properties database
 * Enables dataset discovery in Google Dataset Search and data-rich results
 */
export function generateDatasetSchema(
  propertyCount: number,
  stats?: { states?: number; countries?: number; provinces?: number },
  locale?: string
) {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const mapPath = `/${locale || 'en'}/map`;
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Build spatial coverage description
  const spatialCoverage: string[] = [];
  if (stats?.countries) {
    spatialCoverage.push(`${stats.countries} ${stats.countries === 1 ? 'country' : 'countries'}`);
  }
  if (stats?.states) {
    spatialCoverage.push(`${stats.states} US ${stats.states === 1 ? 'state' : 'states'}`);
  }
  if (stats?.provinces) {
    spatialCoverage.push(`${stats.provinces} Canadian ${stats.provinces === 1 ? 'province' : 'provinces'}`);
  }
  
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "name": "Glamping Properties Database",
    "description": `Comprehensive database of ${propertyCount}+ glamping properties across North America and Europe. Includes property details, locations, amenities, pricing, ratings, and operational information for glamping resorts, RV parks, and outdoor hospitality properties.`,
    "keywords": [
      "glamping properties",
      "glamping resorts",
      "outdoor hospitality",
      "RV parks",
      "campgrounds",
      "glamping locations",
      "glamping database",
      "glamping data",
      "outdoor recreation properties",
      "tent camping",
      "luxury camping"
    ],
    "creator": {
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
    "datePublished": "2024-01-01",
    "dateModified": currentDate,
    "version": "1.0",
    "distribution": {
      "@type": "DataDownload",
      "contentUrl": `${baseUrl}${mapPath}`,
      "encodingFormat": "application/json",
      "description": "Interactive map interface for exploring glamping properties"
    },
    "spatialCoverage": {
      "@type": "Place",
      "name": spatialCoverage.length > 0 
        ? spatialCoverage.join(', ')
        : "United States, Canada, Europe"
    },
    "temporalCoverage": "2024-01-01/..",
    "numberOfItems": propertyCount,
    "license": {
      "@type": "CreativeWork",
      "name": "All Rights Reserved",
      "url": "https://resources.sageoutdooradvisory.com"
    },
    "includedInDataCatalog": {
      "@type": "DataCatalog",
      "name": "Sage Outdoor Advisory Resources",
      "url": baseUrl
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": "Glamping Properties",
      "numberOfItems": propertyCount,
      "itemListElement": {
        "@type": "ListItem",
        "position": 1,
        "item": {
          "@type": "LocalBusiness",
          "name": "Glamping Properties Database",
          "description": `Database containing ${propertyCount}+ glamping properties`
        }
      }
    }
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
  
  // Helper function to normalize country to ISO 3166-1 alpha-2 code
  const normalizeCountryCode = (country: string | null | undefined): string | undefined => {
    if (!country) return undefined;
    const countryUpper = country.toUpperCase().trim();
    
    // Map common country names/variations to ISO codes
    const countryMap: Record<string, string> = {
      'UNITED STATES': 'US',
      'USA': 'US',
      'UNITED STATES OF AMERICA': 'US',
      'CANADA': 'CA',
      'GERMANY': 'DE',
      'DEUTSCHLAND': 'DE',
      'MEXICO': 'MX',
      'MÉXICO': 'MX',
      'FRANCE': 'FR',
      'SPAIN': 'ES',
      'ESPAÑA': 'ES',
    };
    
    // Check if already an ISO code (2 letters)
    if (countryUpper.length === 2 && /^[A-Z]{2}$/.test(countryUpper)) {
      return countryUpper;
    }
    
    // Check country map
    return countryMap[countryUpper] || countryUpper;
  };
  
  // Helper function to get full country name for areaServed
  const getCountryName = (country: string | null | undefined): string | undefined => {
    if (!country) return undefined;
    const countryUpper = country.toUpperCase().trim();
    
    const countryNameMap: Record<string, string> = {
      'US': 'United States',
      'USA': 'United States',
      'UNITED STATES': 'United States',
      'UNITED STATES OF AMERICA': 'United States',
      'CA': 'Canada',
      'CANADA': 'Canada',
      'DE': 'Germany',
      'GERMANY': 'Germany',
      'DEUTSCHLAND': 'Germany',
      'MX': 'Mexico',
      'MEXICO': 'Mexico',
      'MÉXICO': 'Mexico',
      'FR': 'France',
      'FRANCE': 'France',
      'ES': 'Spain',
      'SPAIN': 'Spain',
      'ESPAÑA': 'Spain',
    };
    
    // If it's already a full name, return it
    if (countryNameMap[countryUpper]) {
      return countryNameMap[countryUpper];
    }
    
    // If it's an ISO code, convert to name
    if (countryUpper.length === 2) {
      return countryNameMap[countryUpper] || country;
    }
    
    return country;
  };
  
  const countryCode = normalizeCountryCode(property.country);
  const countryName = getCountryName(property.country);
  
  // Add address
  if (addressParts.length > 0) {
    schema.address = {
      "@type": "PostalAddress",
      "streetAddress": property.address || undefined,
      "addressLocality": property.city || undefined,
      "addressRegion": property.state || undefined,
      "postalCode": property.zip_code || undefined,
      "addressCountry": countryCode || property.country || undefined, // Use ISO code when available
    };
  }
  
  // Add areaServed for country-specific geo-targeting (important for international SEO)
  if (countryName) {
    schema.areaServed = {
      "@type": "Country",
      "name": countryName
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
  rate_avg_retail_daily_rate: string | number | null;
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
    const months = String(property.operating_season_months).trim();
    const seasonText = months === '12' ? 'year-round' : `${months} months per year`;
    faqs.push({
      question: `When is ${propertyName} open for bookings?`,
      answer: `${propertyName} operates ${seasonText}. Check availability and book directly through the property's website.`
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
  if (property.rate_avg_retail_daily_rate) {
    faqs.push({
      question: `What are the rates at ${propertyName}?`,
      answer: `Rates at ${propertyName} start from $${property.rate_avg_retail_daily_rate} per night. Rates may vary by season and unit type. Check the property's website for current pricing and availability.`
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
  private_bathroom?: string | null;
  shower?: string | null;
  water?: string | null;
  picnic_table?: string | null;
  laundry?: string | null;
  unit_campfires?: string | null;
  playground?: string | null;
  sage_p_amenity_restaurant?: string | null;
  sage_p_amenity_waterfront?: string | null;
}): any {
  const propertyName = property.property_name || 'this property';
  const amenities: string[] = [];
  
  if (hasAmenity(property.pool)) amenities.push('Pool');
  if (hasAmenity(property.hot_tub_sauna)) amenities.push('Hot Tub / Sauna');
  if (hasAmenity(property.wifi)) amenities.push('Wi-Fi');
  if (hasAmenity(property.pets)) amenities.push('Pets Allowed');
  if (hasAmenity(property.private_bathroom)) amenities.push('Private Bathroom');
  if (hasAmenity(property.shower)) amenities.push('Showers');
  if (hasAmenity(property.water)) amenities.push('Water Access');
  if (hasAmenity(property.picnic_table)) amenities.push('Picnic Tables');
  if (hasAmenity(property.laundry)) amenities.push('Laundry Facilities');
  if (hasAmenity(property.unit_campfires)) amenities.push('Campfires Allowed');
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

/**
 * Generate TouristAttraction schema for national parks
 * Helps Google understand national parks as tourist attractions for rich results
 */
export function generateTouristAttractionSchema(parks: Array<{
  name: string;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  date_established?: string | null;
  recreation_visitors_2023?: string | null;
  recreation_visitors_2022?: string | null;
  recreation_visitors_2021?: string | null;
  operating_months?: string | null;
  best_time_to_visit?: string | null;
  state?: string | null;
  slug?: string | null;
}>): any {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  
  // Generate schemas for each park
  return parks.map((park) => {
    const schema: any = {
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      "name": park.name,
    };
    
    // Add description
    if (park.description) {
      schema.description = park.description;
    }
    
    // Add geo coordinates
    if (park.latitude !== null && park.longitude !== null && 
        !isNaN(Number(park.latitude)) && !isNaN(Number(park.longitude))) {
      schema.geo = {
        "@type": "GeoCoordinates",
        "latitude": Number(park.latitude).toString(),
        "longitude": Number(park.longitude).toString(),
      };
    }
    
    // Add address (state)
    if (park.state) {
      schema.address = {
        "@type": "PostalAddress",
        "addressRegion": park.state,
        "addressCountry": "US",
      };
    }
    
    // Add URL if slug exists
    if (park.slug) {
      schema.url = `${baseUrl}/national-park/${park.slug}`;
    }
    
    // Add date established
    if (park.date_established) {
      schema.openingDate = park.date_established;
    }
    
    // Add visitor statistics (use most recent available)
    const visitorCount = park.recreation_visitors_2023 || 
                        park.recreation_visitors_2022 || 
                        park.recreation_visitors_2021;
    if (visitorCount) {
      // Parse visitor count (may be in format like "1,234,567" or "1.2M")
      const cleanedCount = visitorCount.toString().replace(/,/g, '').replace(/[^\d.]/g, '');
      const numericCount = parseFloat(cleanedCount);
      if (!isNaN(numericCount)) {
        schema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": "5",
          "bestRating": "5",
          "worstRating": "1",
        };
        // Note: visitor count can't be directly added to TouristAttraction schema
        // but we can add it as a note in description if needed
      }
    }
    
    // Add operating months
    if (park.operating_months) {
      schema.openingHoursSpecification = {
        "@type": "OpeningHoursSpecification",
        "description": park.operating_months,
      };
    }
    
    // Add best time to visit
    if (park.best_time_to_visit) {
      if (!schema.description) {
        schema.description = '';
      }
      schema.description = `${schema.description} Best time to visit: ${park.best_time_to_visit}.`.trim();
    }
    
    return schema;
  });
}

/**
 * Generate FAQPage schema for map pages
 * Creates rich snippet opportunities for common map and location questions
 */
export function generateMapFAQSchema(
  propertyCount: number,
  location?: string,
  locationStats?: {
    averageRate?: number | null;
    unitTypes?: Array<{ type: string; count: number }>;
  }
): any {
  const faqs: Array<{ question: string; answer: string }> = [];

  if (location) {
    // Location-specific FAQs first (more valuable for rich snippets)
    faqs.push({
      question: `How many glamping properties are in ${location}?`,
      answer: `Our database contains ${propertyCount}+ glamping properties in ${location}. Explore the interactive map to find luxury tents, yurts, treehouses, domes, and other unique accommodations.`
    });

    if (locationStats?.unitTypes && locationStats.unitTypes.length > 0) {
      const topTypes = locationStats.unitTypes.slice(0, 5).map(t => t.type).join(', ');
      faqs.push({
        question: `What types of glamping are available in ${location}?`,
        answer: `Glamping properties in ${location} offer a variety of accommodation types including ${topTypes}. Use the unit type filter on the map to narrow your search.`
      });
    }

    if (locationStats?.averageRate) {
      faqs.push({
        question: `What do glamping properties cost in ${location}?`,
        answer: `The average nightly rate for glamping in ${location} is approximately $${locationStats.averageRate}. Rates vary by season, unit type, and amenities. Use the rate filter on the map to find options within your budget.`
      });
    }

    faqs.push({
      question: `What are the best glamping properties in ${location}?`,
      answer: `Explore the map to discover top-rated glamping properties in ${location}. Filter by unit type, price range, and amenities to find accommodations that match your preferences.`
    });

    faqs.push({
      question: `What national parks are near glamping in ${location}?`,
      answer: `Toggle the 'National Parks' overlay on the map to see nearby parks. Many glamping properties in ${location} are within driving distance of popular national parks, making them ideal bases for outdoor adventures.`
    });
  } else {
    // Generic map FAQs for the main /map page
    faqs.push({
      question: `How many glamping properties are on the map?`,
      answer: `Our interactive map features ${propertyCount}+ glamping properties across the United States, Canada, and Europe. Filter by location, unit type, or price to find your perfect glamping experience.`
    });
  }

  faqs.push({
    question: "How do I use the glamping map?",
    answer: "Use the interactive map to explore glamping properties across North America. Click on map markers to view property details, use filters to narrow down by location, unit type, or price range, and zoom in to see properties in specific areas."
  });

  faqs.push({
    question: "What filters are available on the map?",
    answer: "You can filter glamping properties by country (United States, Canada), state or province, unit type (tents, yurts, treehouses, domes, etc.), and average daily rate range. Toggle overlays to see national parks, population data, and economic indicators."
  });

  faqs.push({
    question: "How do I view property details?",
    answer: "Click on any property marker on the map to see a property card with photos, description, amenities, rates, and links to the property's website. You can also click 'View Details' to see the full property page."
  });

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
 * Generate LocalBusiness schemas for a list of properties
 * Used on location pages to provide rich results for featured properties
 * Limits to top properties to avoid payload size issues
 */
export function generatePropertyListLocalBusinessSchema(
  properties: Array<{
    property_name: string | null;
    slug?: string | null;
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
    google_photos?: Array<{ name: string }> | null | string;
    description?: string | null;
  }>
): any[] {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  
  // Limit to top 20 properties to avoid payload size issues
  const limitedProperties = properties.slice(0, 20);
  
  return limitedProperties
    .filter((property) => property.property_name && property.property_name.trim())
    .map((property) => {
      const propertyName = property.property_name?.trim() || 'Unnamed Property';
      const slug = property.slug?.trim();
      const url = slug ? `${baseUrl}/property/${slug}` : null;
      
      const schema: any = {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": propertyName,
      };
      
      // Add URL
      if (url) {
        schema.url = url;
      }
      
      // Add description
      if (property.description) {
        schema.description = property.description;
      } else {
        schema.description = `Information about ${propertyName} glamping property`;
      }
      
      // Add address
      const addressParts: string[] = [];
      if (property.address) addressParts.push(property.address);
      if (property.city) addressParts.push(property.city);
      if (property.state) addressParts.push(property.state);
      if (property.zip_code) addressParts.push(property.zip_code);
      
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
      
      // Add rating
      if (property.google_rating !== null && property.google_rating !== undefined) {
        schema.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": property.google_rating.toString(),
          "reviewCount": property.google_user_rating_total?.toString() || "0",
          "bestRating": "5",
          "worstRating": "1",
        };
      }
      
      // Add image if available
      if (property.google_photos) {
        let photos: Array<{ name: string }> = [];
        if (typeof property.google_photos === 'string') {
          try {
            photos = JSON.parse(property.google_photos);
          } catch (e) {
            // Ignore parse errors
          }
        } else if (Array.isArray(property.google_photos)) {
          photos = property.google_photos;
        }
        
        if (photos.length > 0) {
          const firstPhoto = photos[0];
          const encodedPhotoName = encodeURIComponent(firstPhoto.name);
          schema.image = `${baseUrl}/api/google-places-photo?photoName=${encodedPhotoName}&maxWidthPx=1200&maxHeightPx=630`;
        }
      }
      
      return schema;
    })
    .filter((schema) => schema !== null);
}
