/**
 * English title/meta overrides for commercial landings (Google + Bing SERP).
 *
 * Goals for this pass:
 * - Front-load commercial intent (feasibility / appraisal / bank / USPAP / lender)
 * - Keep titles ~50–60 chars before trailing brand (Bing + Google truncation)
 * - Descriptions ~145–160 chars with lender language + clear next step
 * - Prefer USPAP (not misspelled USOB) on appraisal pages
 *
 * Applied in app/[locale]/landing/[slug]/page.tsx for locale === 'en'.
 */

export type LandingMetadataOverride = {
  title: string;
  description: string;
};

/** Core commercial landings — same set as sitemap priority 0.9 hubs. */
export const COMMERCIAL_LANDING_META_SLUGS = [
  'glamping-feasibility-study',
  'rv-resort-feasibility-study',
  'campground-feasibility-study',
  'glamping-appraisal',
  'rv-resort-appraisal',
  'campground-appraisal',
  'how-to-finance-glamping-resort',
  'feasibility-study-faq',
  'appraisal-faq',
] as const;

export type CommercialLandingMetaSlug = (typeof COMMERCIAL_LANDING_META_SLUGS)[number];

export const landingMetadataOverridesEn: Record<string, LandingMetadataOverride> = {
  'glamping-feasibility-study': {
    title: 'Glamping Feasibility Study for Bank Financing | Sage',
    description:
      'Bank-ready glamping feasibility studies: market comps, ADR & occupancy underwriting, and 10-year pro formas lenders use. Book a Sage introduction.',
  },
  'rv-resort-feasibility-study': {
    title: 'RV Resort Feasibility Study | Bank-Ready Analysis | Sage',
    description:
      'Lender-ready RV resort feasibility studies—competitive comps, occupancy & ADR framing, development costs, and ROI pro formas. Book a Sage introduction.',
  },
  'campground-feasibility-study': {
    title: 'Campground Feasibility Study | Lender-Ready | Sage',
    description:
      'Bank-ready campground feasibility studies: site-type mix, seasonal demand, comps, and underwriting pro formas for financing. Book a Sage introduction.',
  },
  'glamping-appraisal': {
    title: 'Glamping Appraisal | USPAP Bank Valuation | Sage',
    description:
      'USPAP-compliant glamping appraisals for bank financing, acquisitions & refinances—income, sales & cost approaches. Trusted by outdoor hospitality lenders.',
  },
  'rv-resort-appraisal': {
    title: 'RV Resort Appraisal | USPAP Bank Valuation | Sage',
    description:
      'USPAP-compliant RV park & resort appraisals for lenders—income, sales & cost approaches for financing, refinance, and acquisitions. Book Sage.',
  },
  'campground-appraisal': {
    title: 'Campground Appraisal | USPAP Bank Valuation | Sage',
    description:
      'USPAP-compliant campground appraisals for bank financing & acquisitions—seasonal income normalization and comps lenders trust. Book a Sage introduction.',
  },
  'how-to-finance-glamping-resort': {
    title: 'How to Finance a Glamping Resort | What Banks Require | Sage',
    description:
      'What banks require to finance a glamping resort: feasibility study, USPAP appraisal, projections, and underwriting docs. Partner guidance from Sage.',
  },
  'feasibility-study-faq': {
    title: 'Feasibility Study FAQ | Bank Requirements | Sage',
    description:
      'Answers on outdoor hospitality feasibility studies: bank requirements, timeline, cost, vs appraisal, and what lenders underwrite. From Sage Outdoor Advisory.',
  },
  'appraisal-faq': {
    title: 'Appraisal FAQ | USPAP Outdoor Hospitality | Sage',
    description:
      'FAQ on USPAP appraisals for glamping, RV resorts & campgrounds—methods, timelines, and what lenders need. Expert answers from Sage Outdoor Advisory.',
  },
};

/** Soft SERP limits used in tests (visible truncation, not hard engine caps). */
export const LANDING_TITLE_SOFT_MAX = 65;
export const LANDING_DESCRIPTION_SOFT_MIN = 120;
export const LANDING_DESCRIPTION_SOFT_MAX = 165;
