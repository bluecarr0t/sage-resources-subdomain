// Re-export types
export type { GlossaryTerm, GlossaryCategory } from "./types";

// Re-export helper functions and glossaryTerms
export {
  getGlossaryTerm,
  getGlossaryTermSync,
  getAllGlossaryTerms,
  getGlossaryTermsByCategory,
  getRelatedTerms,
  getRelatedTermsSync,
  searchGlossaryTerms,
  glossaryTerms,
} from "./utils";

