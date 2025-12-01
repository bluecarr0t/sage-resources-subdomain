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

