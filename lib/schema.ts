import { LandingPageContent } from "./landing-pages";

export interface FAQItem {
  question: string;
  answer: string;
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Sage Outdoor Advisory",
    "url": "https://sageoutdooradvisory.com",
    "sameAs": [
      "https://resources.sageoutdooradvisory.com"
    ],
    "logo": "https://sageoutdooradvisory.com/logo.png"
  };
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

