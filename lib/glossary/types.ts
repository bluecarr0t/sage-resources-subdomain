export interface GlossaryTerm {
  slug: string;
  term: string;
  definition: string; // Short definition for featured snippet
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
}

export type GlossaryCategory = GlossaryTerm["category"];

