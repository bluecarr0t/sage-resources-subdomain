import type { GlossaryTerm } from "./types";
import { feasibilityAppraisalTerms } from "./terms/feasibility-appraisal";
import { glampingTerms } from "./terms/glamping";
import { financialTerms } from "./terms/financial";
import { rvCampgroundTerms } from "./terms/rv-campground";
import { generalTerms } from "./terms/general";
import { realEstateTerms } from "./terms/real-estate";

// Combine all terms into a single object
const glossaryTerms: Record<string, GlossaryTerm> = {
  ...feasibilityAppraisalTerms,
  ...glampingTerms,
  ...financialTerms,
  ...rvCampgroundTerms,
  ...generalTerms,
  ...realEstateTerms,
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
 * Get glossary term content with optional locale support
 * If locale is provided and not 'en', will attempt to load translations
 * and merge them with the base English content
 */
export async function getGlossaryTerm(slug: string, locale?: string): Promise<GlossaryTerm | null> {
  const baseTerm = glossaryTerms[slug];
  if (!baseTerm) {
    return null;
  }

  // If English or no locale specified, return base content
  if (!locale || locale === 'en') {
    return baseTerm;
  }

  // For other locales, try to load translations
  try {
    const messages = (await import(`../../messages/${locale}.json`)).default;
    const translationKey = slugToKey(slug);
    const translations = messages?.glossary?.terms?.[translationKey];
    
    if (translations) {
      // Merge translations with base content
      return {
        ...baseTerm,
        term: translations.term || baseTerm.term,
        definition: translations.definition || baseTerm.definition,
        extendedDefinition: translations.extendedDefinition || baseTerm.extendedDefinition,
        examples: translations.examples || baseTerm.examples,
        useCases: translations.useCases || baseTerm.useCases,
        seoKeywords: translations.seoKeywords || baseTerm.seoKeywords,
        faqs: translations.faqs || baseTerm.faqs,
        // Keep category, relatedTerms, internalLinks, image, images, imageAltTexts from base
        // as these are typically structural and don't need translation
      };
    }
  } catch (error) {
    // If translation file doesn't exist or has errors, fall back to English
    console.warn(`Translation not found for glossary term ${slug} in locale ${locale}, using English`);
  }

  return baseTerm;
}

/**
 * Synchronous version for backward compatibility
 * Use getGlossaryTerm() with await for locale support
 * @deprecated Use async getGlossaryTerm() instead
 */
export function getGlossaryTermSync(slug: string): GlossaryTerm | null {
  return glossaryTerms[slug] || null;
}

export function getAllGlossaryTerms(): GlossaryTerm[] {
  return Object.values(glossaryTerms);
}

export function getGlossaryTermsByCategory(category: string): GlossaryTerm[] {
  return Object.values(glossaryTerms).filter(term => term.category === category);
}

export async function getRelatedTerms(term: GlossaryTerm, locale?: string): Promise<GlossaryTerm[]> {
  const relatedTermPromises = term.relatedTerms.map(slug => getGlossaryTerm(slug, locale));
  const relatedTerms = await Promise.all(relatedTermPromises);
  return relatedTerms.filter((term): term is GlossaryTerm => term !== null);
}

/**
 * Synchronous version for backward compatibility
 * @deprecated Use async getRelatedTerms() instead
 */
export function getRelatedTermsSync(term: GlossaryTerm): GlossaryTerm[] {
  return term.relatedTerms
    .map(slug => getGlossaryTermSync(slug))
    .filter((term): term is GlossaryTerm => term !== null);
}

export function searchGlossaryTerms(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(glossaryTerms).filter(term =>
    term.term.toLowerCase().includes(lowerQuery) ||
    term.definition.toLowerCase().includes(lowerQuery) ||
    term.seoKeywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
  );
}

// Export glossaryTerms for use in other modules
export { glossaryTerms };

