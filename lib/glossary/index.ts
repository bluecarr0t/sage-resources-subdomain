import type { GlossaryTerm } from "./types";
import { feasibilityAppraisalTerms } from "./terms/feasibility-appraisal";
import { glampingTerms } from "./terms/glamping";
import { financialTerms } from "./terms/financial";
import { rvCampgroundTerms } from "./terms/rv-campground";
import { generalTerms } from "./terms/general";
import { realEstateTerms } from "./terms/real-estate";

// Combine all terms into a single object
export const glossaryTerms: Record<string, GlossaryTerm> = {
  ...feasibilityAppraisalTerms,
  ...glampingTerms,
  ...financialTerms,
  ...rvCampgroundTerms,
  ...generalTerms,
  ...realEstateTerms,
};

// Re-export types
export type { GlossaryTerm, GlossaryCategory } from "./types";

// Re-export helper functions
export {
  getGlossaryTerm,
  getAllGlossaryTerms,
  getGlossaryTermsByCategory,
  getRelatedTerms,
  searchGlossaryTerms,
} from "./utils";

