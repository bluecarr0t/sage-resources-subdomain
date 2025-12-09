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

// Helper functions for working with glossary terms
export function getGlossaryTerm(slug: string): GlossaryTerm | null {
  return glossaryTerms[slug] || null;
}

export function getAllGlossaryTerms(): GlossaryTerm[] {
  return Object.values(glossaryTerms);
}

export function getGlossaryTermsByCategory(category: string): GlossaryTerm[] {
  return Object.values(glossaryTerms).filter(term => term.category === category);
}

export function getRelatedTerms(term: GlossaryTerm): GlossaryTerm[] {
  return term.relatedTerms
    .map(slug => getGlossaryTerm(slug))
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

