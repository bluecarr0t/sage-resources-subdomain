import { MetadataRoute } from "next";
import { getAllLandingPageSlugs, getLandingPage } from "@/lib/landing-pages";
import { getAllGlossaryTerms } from "@/lib/glossary/index";
import { getAllGuideSlugs, getGuide } from "@/lib/guides";
import { getAllPropertySlugs } from "@/lib/properties";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  
  // Get all dynamic content
  const landingPageSlugs = getAllLandingPageSlugs();
  const glossaryTerms = getAllGlossaryTerms();
  const guideSlugs = getAllGuideSlugs();
  const propertySlugs = await getAllPropertySlugs();

  // Generate landing pages (58 pages - includes 49 location-based pages)
  const landingPages = landingPageSlugs
    .map((slug) => {
      const page = getLandingPage(slug);
      const lastModified = page?.lastModified 
        ? new Date(page.lastModified)
        : new Date("2025-01-01");
      
      return {
        url: `${baseUrl}/landing/${slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      };
    })
    .sort((a, b) => a.url.localeCompare(b.url)); // Sort alphabetically

  // Generate glossary term pages (57 pages)
  const glossaryPages = glossaryTerms
    .map((term) => ({
      url: `${baseUrl}/glossary/${term.slug}`,
      lastModified: new Date("2025-01-01"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }))
    .sort((a, b) => a.url.localeCompare(b.url)); // Sort alphabetically

  // Generate guide pages (21 pages)
  // Separate pillar pages (higher priority) from cluster pages and sort
  const guidePagesWithType = guideSlugs.map((slug) => {
    const guide = getGuide(slug);
    const isPillarPage = slug.endsWith("-complete-guide");
    const lastModified = guide?.lastModified 
      ? new Date(guide.lastModified)
      : new Date("2025-01-15");
    
    return {
      url: `${baseUrl}/guides/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: isPillarPage ? (0.9 as const) : (0.8 as const),
      isPillarPage,
    };
  });

  // Sort: pillar pages first, then alphabetically within each group
  const guidePages = guidePagesWithType
    .sort((a, b) => {
      if (a.isPillarPage && !b.isPillarPage) return -1;
      if (!a.isPillarPage && b.isPillarPage) return 1;
      return a.url.localeCompare(b.url);
    })
    .map(({ isPillarPage, ...page }) => page);

  // Generate property pages
  const propertyPages = propertySlugs
    .map((item) => ({
      url: `${baseUrl}/property/${item.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }))
    .sort((a, b) => a.url.localeCompare(b.url)); // Sort alphabetically

  // Build sitemap with proper ordering:
  // 1. Main pages (highest priority)
  // 2. Index pages (glossary, guides)
  // 3. Guide pages (pillar pages first)
  // 4. Map page
  // 5. Property pages
  // 6. Landing pages
  // 7. Glossary pages
  return [
    // Main homepage
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1.0,
    },
    
    // Index pages (high priority navigation pages)
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    
    // Partners page
    {
      url: `${baseUrl}/partners`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    
    // Map page (high priority resource page)
    {
      url: `${baseUrl}/map`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    
    // Guide pages (organized by priority - pillar pages first)
    ...guidePages,
    
    // Property pages (dynamic pages for each property)
    ...propertyPages,
    
    // Landing pages (service and location-based)
    ...landingPages,
    
    // Glossary term pages
    ...glossaryPages,
  ];
}

