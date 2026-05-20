export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string; // Short definition for featured snippet
  /** Outdoor-hospitality-first context when the term has other common meanings (SEO disambiguation). */
  disambiguation?: {
    heading: string;
    body: string; // HTML allowed; localized at render time via prefixInternalResourceHrefsInHtml
  };
  extendedDefinition: string; // Detailed explanation (300-500 words)
  category: "Feasibility & Appraisal" | "Glamping" | "RV & Campground" | "Financial" | "Real Estate" | "General";
  relatedTerms: string[]; // Slugs of related terms
  examples?: string[];
  useCases?: string[];
  seoKeywords: string[];
  internalLinks?: {
    text: string;
    url: string;
  }[];
  faqs?: {
    question: string;
    answer: string;
  }[];
  image?: string; // Path to main image for this glossary term
  images?: string[]; // Array of additional images for gallery display
  imageAltTexts?: string[]; // Optional array of alt text for gallery images (should match images array length)
}

export type GlossaryCategory = GlossaryTerm["category"];

