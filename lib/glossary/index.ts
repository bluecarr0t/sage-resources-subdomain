// Re-export types
export type { GlossaryTerm, GlossaryCategory } from "./types";

// Re-export helper functions and glossaryTerms
export {
  getGlossaryTerm,
  getAllGlossaryTerms,
  getGlossaryTermsByCategory,
  getRelatedTerms,
  searchGlossaryTerms,
  glossaryTerms,
} from "./utils";

