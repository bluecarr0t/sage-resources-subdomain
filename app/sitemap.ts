import { MetadataRoute } from "next";
import { getAllLandingPageSlugs } from "@/lib/landing-pages";
import { getAllGlossaryTerms } from "@/lib/glossary";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  const landingPageSlugs = getAllLandingPageSlugs();
  const glossaryTerms = getAllGlossaryTerms();

  const landingPages = landingPageSlugs.map((slug) => ({
    url: `${baseUrl}/landing/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const glossaryPages = glossaryTerms.map((term) => ({
    url: `${baseUrl}/glossary/${term.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...landingPages,
    ...glossaryPages,
  ];
}

