import { MetadataRoute } from "next";
import { getAllLandingPageSlugs, getLandingPage } from "@/lib/landing-pages";
import { getAllGlossaryTerms } from "@/lib/glossary/index";
import { getAllGuideSlugs, getGuide } from "@/lib/guides";
import { getAllPropertySlugs } from "@/lib/properties";
import { locales } from "@/i18n";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://resources.sageoutdooradvisory.com";
  
  try {
    // Get all dynamic content
    const landingPageSlugs = getAllLandingPageSlugs();
    const glossaryTerms = getAllGlossaryTerms();
    const guideSlugs = getAllGuideSlugs();
    const propertySlugs = await getAllPropertySlugs();
  
  // Generate URLs for all locales
  const allUrls: MetadataRoute.Sitemap = [];

  // Generate landing pages for all locales (58 pages × 4 locales = 232 URLs)
  const landingPages: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const slug of landingPageSlugs) {
      const page = getLandingPage(slug);
      const lastModified = page?.lastModified 
        ? new Date(page.lastModified)
        : new Date("2025-01-01");
      
      landingPages.push({
        url: `${baseUrl}/${locale}/landing/${slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      });
    }
  }
  landingPages.sort((a, b) => a.url.localeCompare(b.url));

  // Generate glossary term pages for all locales (57 pages × 4 locales = 228 URLs)
  // Note: Glossary terms don't have lastModified field yet, using a reasonable default
  // Future enhancement: Add lastModified field to GlossaryTerm type
  const glossaryPages: MetadataRoute.Sitemap = [];
  const glossaryDefaultDate = new Date("2025-01-15"); // More recent default for glossary
  for (const locale of locales) {
    for (const term of glossaryTerms) {
      glossaryPages.push({
        url: `${baseUrl}/${locale}/glossary/${term.slug}`,
        lastModified: glossaryDefaultDate,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      });
    }
  }
  glossaryPages.sort((a, b) => a.url.localeCompare(b.url));

  // Generate guide pages for all locales (21 pages × 4 locales = 84 URLs)
  const guidePages: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const slug of guideSlugs) {
      const guide = getGuide(slug);
      const isPillarPage = slug.endsWith("-complete-guide");
      const lastModified = guide?.lastModified 
        ? new Date(guide.lastModified)
        : new Date("2025-01-15");
      
      guidePages.push({
        url: `${baseUrl}/${locale}/guides/${slug}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: isPillarPage ? (0.9 as const) : (0.8 as const),
      });
    }
  }
  // Sort: pillar pages first, then alphabetically
  guidePages.sort((a, b) => {
    const aIsPillar = a.url.includes("-complete-guide");
    const bIsPillar = b.url.includes("-complete-guide");
    if (aIsPillar && !bIsPillar) return -1;
    if (!aIsPillar && bIsPillar) return 1;
    return a.url.localeCompare(b.url);
  });

  // Generate property pages for all locales
  // Note: Using current date as default. Future enhancement: Fetch actual updated_at from database
  // for each property slug to provide accurate lastModified dates
  const propertyPages: MetadataRoute.Sitemap = [];
  const propertyDefaultDate = new Date(); // Use current date for property pages (they're dynamic)
  for (const locale of locales) {
    for (const item of propertySlugs) {
      propertyPages.push({
        url: `${baseUrl}/${locale}/property/${item.slug}`,
        lastModified: propertyDefaultDate,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      });
    }
  }
  propertyPages.sort((a, b) => a.url.localeCompare(b.url));

  // Build sitemap with proper ordering for all locales:
  // 1. Main pages (highest priority)
  // 2. Index pages (glossary, guides)
  // 3. Guide pages (pillar pages first)
  // 4. Map page
  // 5. Property pages
  // 6. Landing pages
  // 7. Glossary pages
  
  // Generate main pages for all locales
  for (const locale of locales) {
    // Main homepage
    allUrls.push({
      url: `${baseUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 1.0,
    });
    
    // Index pages (high priority navigation pages)
    allUrls.push({
      url: `${baseUrl}/${locale}/guides`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    });
    allUrls.push({
      url: `${baseUrl}/${locale}/glossary`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    });
    
    // Partners page
    allUrls.push({
      url: `${baseUrl}/${locale}/partners`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    });
    
    // Map page (high priority resource page)
    allUrls.push({
      url: `${baseUrl}/${locale}/map`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    });
  }
  
    // Add all dynamic pages (already include locale in URLs)
    allUrls.push(...guidePages);
    allUrls.push(...propertyPages);
    allUrls.push(...landingPages);
    allUrls.push(...glossaryPages);
    
    return allUrls;
  } catch (error) {
    // If sitemap generation fails, return at least the main pages
    console.error('Error generating sitemap:', error);
    const fallbackUrls: MetadataRoute.Sitemap = [];
    for (const locale of locales) {
      fallbackUrls.push({
        url: `${baseUrl}/${locale}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 1.0,
      });
    }
    return fallbackUrls;
  }
}

