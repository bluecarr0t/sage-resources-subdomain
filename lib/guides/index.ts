import { GuideContent } from "./types";
import { feasibilityGuides } from "./feasibility";
import { appraisalGuides } from "./appraisal";
import { industryGuides } from "./industry";

// Comprehensive guide content for all pillar pages and cluster pages
// Each pillar page contains 4000-6000 words of detailed, comprehensive content
// Guides are organized by category in separate files for better maintainability

export const guides: Record<string, GuideContent> = {
  ...feasibilityGuides,
  ...appraisalGuides,
  ...industryGuides,
};

/**
 * Convert kebab-case slug to camelCase key for translation files
 */
function slugToKey(slug: string): string {
  return slug.split('-').map((word, index) => 
    index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
}

/**
 * Get guide content with optional locale support
 * If locale is provided and not 'en', will attempt to load translations
 * and merge them with the base English content
 */
export async function getGuide(slug: string, locale?: string): Promise<GuideContent | null> {
  const baseGuide = guides[slug];
  if (!baseGuide) {
    return null;
  }

  // If English or no locale specified, return base content
  if (!locale || locale === 'en') {
    return baseGuide;
  }

  // For other locales, try to load translations
  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    const translationKey = slugToKey(slug);
    const translations = messages?.guides?.[translationKey];
    
    if (translations) {
      // Merge translations with base content
      return {
        ...baseGuide,
        title: translations.title || baseGuide.title,
        metaDescription: translations.metaDescription || baseGuide.metaDescription,
        hero: translations.hero ? {
          ...baseGuide.hero,
          ...translations.hero,
        } : baseGuide.hero,
        sections: translations.sections || baseGuide.sections,
        faqs: translations.faqs || baseGuide.faqs,
        keywords: translations.keywords || baseGuide.keywords,
        cta: translations.cta ? {
          ...baseGuide.cta,
          ...translations.cta,
        } : baseGuide.cta,
        relatedServices: translations.relatedServices ? {
          ...baseGuide.relatedServices,
          ...translations.relatedServices,
        } : baseGuide.relatedServices,
      };
    }
  } catch (error) {
    // If translation file doesn't exist or has errors, fall back to English
    console.warn(`Translation not found for guide ${slug} in locale ${locale}, using English`);
  }

  return baseGuide;
}

/**
 * Synchronous version for backward compatibility
 * Use getGuide() with await for locale support
 */
export function getGuideSync(slug: string): GuideContent | null {
  return guides[slug] || null;
}

export function getAllGuideSlugs(): string[] {
  return Object.keys(guides);
}

export function getGuidesByCategory(category: 'feasibility' | 'appraisal' | 'industry'): GuideContent[] {
  return Object.values(guides).filter((guide) => guide.category === category);
}

// Export types for use in other files
export type { GuideContent, GuideCategory, FAQItem, TableOfContentsItem, GuideSection, ClusterPage } from "./types";
