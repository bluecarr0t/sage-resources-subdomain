/**
 * Per-slug SEO overrides (English) for high-impression guide pages.
 */
export const guideMetadataOverridesEn: Record<
  string,
  { title: string; description?: string }
> = {
  'feasibility-study-process-timeline': {
    title:
      'How Long Does a Feasibility Study Take? (6–8 Weeks) | Sage Outdoor Advisory',
    description:
      'Feasibility study timeline for glamping, RV resorts & campgrounds: week-by-week phases from kickoff to bank-ready report. Typical 6–8 weeks with Sage Outdoor Advisory.',
  },
  'feasibility-study-vs-appraisal': {
    title:
      'Feasibility Study vs Appraisal: Differences & When You Need Each | Sage',
    description:
      'Compare feasibility studies vs property appraisals for outdoor hospitality. Learn timing, lender requirements, and when development projects need both.',
  },
};

/** Canonical path prefix for English-only guide articles. */
export const GUIDE_CANONICAL_BASE = 'https://resources.sageoutdooradvisory.com/en/guides';

export function getGuideCanonicalUrl(slug: string): string {
  return `${GUIDE_CANONICAL_BASE}/${slug}`;
}
