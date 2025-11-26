import { MetadataRoute } from "next";
import { getAllLandingPageSlugs, getLandingPage } from "@/lib/landing-pages";
import { getAllGlossaryTerms } from "@/lib/glossary";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const landingPageSlugs = getAllLandingPageSlugs();
  const glossaryTerms = getAllGlossaryTerms();

  const landingPages = landingPageSlugs.map((slug) => {
    const page = getLandingPage(slug);
    // Use lastModified date if provided, otherwise use a default date (content creation date)
    const lastModified = page?.lastModified 
      ? new Date(page.lastModified)
      : new Date("2025-01-01"); // Default to a recent date for existing content
    
    return {
      url: `${baseUrl}/landing/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    };
  });

  const glossaryPages = glossaryTerms.map((term) => ({
    url: `${baseUrl}/glossary/${term.slug}`,
    lastModified: new Date("2025-01-01"), // Glossary terms - update when terms are added/modified
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(), // Homepage - updates frequently
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: new Date(), // Glossary index - updates when terms added
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...landingPages,
    ...glossaryPages,
  ];
}

