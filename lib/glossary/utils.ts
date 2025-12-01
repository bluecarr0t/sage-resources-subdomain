import type { GlossaryTerm } from "./types";
import { glossaryTerms } from "./index";

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

