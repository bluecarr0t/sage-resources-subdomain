/**
 * Internal Linking Utilities
 * Helper functions for automatic contextual link insertion and discovery
 */

import { getAllGlossaryTerms } from "./glossary/index";
import { getAllLandingPageSlugs, getLandingPage } from "./landing-pages";
import { getAllGuideSlugs, getGuide } from "./guides";

/**
 * Find glossary terms mentioned in content
 * Returns terms that appear in the text with their slugs for linking
 */
export function findMentionedGlossaryTerms(content: string): Array<{ term: string; slug: string }> {
  const allTerms = getAllGlossaryTerms();
  const mentioned: Array<{ term: string; slug: string }> = [];
  const lowerContent = content.toLowerCase();

  allTerms.forEach((term) => {
    // Check if term name appears in content (case-insensitive)
    if (lowerContent.includes(term.term.toLowerCase())) {
      mentioned.push({ term: term.term, slug: term.slug });
    }
  });

  return mentioned;
}

/**
 * Find related landing pages based on keywords or content similarity
 */
export function findRelatedLandingPages(
  keywords: string[] | undefined,
  slug: string,
  maxResults: number = 4
): Array<{ slug: string; title: string }> {
  if (!keywords || keywords.length === 0) {
    return [];
  }

  const allPages = getAllLandingPageSlugs()
    .map((s) => {
      const page = getLandingPageSync(s);
      if (!page || page.slug === slug) return null;
      return { slug: page.slug, title: page.title, keywords: page.keywords || [] };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // Score pages based on keyword overlap
  const scored = allPages.map((page) => {
    const matchingKeywords = keywords.filter((kw) =>
      page.keywords.some((pk) => pk.toLowerCase().includes(kw.toLowerCase()) ||
                                  kw.toLowerCase().includes(pk.toLowerCase()))
    );
    return {
      ...page,
      score: matchingKeywords.length,
    };
  });

  // Sort by score and return top results
  return scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ slug, title }) => ({ slug, title }));
}

/**
 * Find related guides based on category or keywords
 */
export function findRelatedGuides(
  category: string | undefined,
  keywords: string[] | undefined,
  excludeSlug: string,
  maxResults: number = 3
): Array<{ slug: string; title: string }> {
  const allGuides = getAllGuideSlugs()
    .map((s) => {
      const guide = getGuide(s);
      if (!guide || guide.slug === excludeSlug) return null;
      return guide;
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);

  // Filter by category first if provided
  let filtered = allGuides;
  if (category) {
    filtered = allGuides.filter((g) => g.category === category);
  }

  // Score by keyword overlap if keywords provided
  if (keywords && keywords.length > 0) {
    const scored = filtered.map((guide) => {
      const matchingKeywords = keywords.filter((kw) =>
        guide.keywords?.some((gk) => gk.toLowerCase().includes(kw.toLowerCase()) ||
                                      kw.toLowerCase().includes(gk.toLowerCase()))
      );
      return {
        ...guide,
        score: matchingKeywords.length,
      };
    });

    return scored
      .filter((g) => g.score > 0 || !category) // Include all if no keywords match
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(({ slug, title }) => ({ slug, title }));
  }

  return filtered.slice(0, maxResults).map(({ slug, title }) => ({ slug, title }));
}

/**
 * Generate link suggestions for content editors
 * Returns an array of suggested links with anchor text and URLs
 */
export function generateLinkSuggestions(
  content: string,
  currentSlug: string,
  contentType: 'landing' | 'guide' | 'glossary' = 'landing'
): Array<{ anchorText: string; url: string; type: 'glossary' | 'landing' | 'guide' }> {
  const suggestions: Array<{ anchorText: string; url: string; type: 'glossary' | 'landing' | 'guide' }> = [];

  // Find glossary terms to link
  const mentionedTerms = findMentionedGlossaryTerms(content);
  mentionedTerms.forEach(({ term, slug }) => {
    suggestions.push({
      anchorText: term,
      url: `/glossary/${slug}`,
      type: 'glossary',
    });
  });

  return suggestions.slice(0, 10); // Limit to 10 suggestions
}