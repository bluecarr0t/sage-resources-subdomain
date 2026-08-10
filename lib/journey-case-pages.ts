/**
 * Case-style journey pages: comps map research → bank-ready study.
 * Composite narratives matching the Organic → map/markets → contact path
 * observed in quality booked meetings — anonymized, no named prospects,
 * no invented financing outcomes.
 */

export type JourneyCaseStep = {
  title: string;
  body: string;
  /** Optional internal path (locale prefix added at render) */
  href?: string;
  hrefLabel?: string;
};

export type JourneyCasePage = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  /** Short eyebrow / pattern label */
  patternLabel: string;
  intro: string;
  /** Honest disclaimer — composite path, not a named client testimonial */
  compositeNote: string;
  steps: JourneyCaseStep[];
  outcome: string;
  /** Map deep-link query (no leading ?) */
  mapQuery?: string;
  marketSlug?: string;
  landingSlug: string;
  studyFocus: 'feasibility' | 'appraisal' | 'both';
};

export const JOURNEY_CASE_PAGES: readonly JourneyCasePage[] = [
  {
    slug: 'from-comps-map-to-financed-study',
    title: 'From Comps Map to Financed Study',
    metaTitle: 'From Comps Map to Financed Study | Sage Journey',
    metaDescription:
      'How outdoor hospitality developers use the Sage comps map—then book a bank-ready feasibility study or USPAP appraisal. The research path that leads to financed projects.',
    patternLabel: 'The core path',
    intro:
      'Quality introductions rarely start on a contact form cold. They start with comps: filtering the interactive map by state and unit type, framing ADR bands, then asking Sage to turn that research into a lender-ready feasibility study or appraisal.',
    compositeNote:
      'This is a composite journey based on how Organic Search visitors research on resources before booking a Sage Introduction—not a named client case study, and not a promised financing outcome.',
    steps: [
      {
        title: '1. Land on comps research',
        body: 'Organic search brings developers and operators to the glamping map or a market page—not a tourism guide. The question is supply density, unit mix, and rate positioning in a specific catchment.',
        href: '/map',
        hrefLabel: 'Open the comps map',
      },
      {
        title: '2. Filter the competitive set',
        body: 'State and unit-type filters shrink the map to a defensible comps universe. That filtered view is what “What Sage would study here” summarizes: comps in view, retail rate bands, and why occupancy is modeled in a formal study—not guessed from the public map.',
        href: '/markets',
        hrefLabel: 'Browse market pages',
      },
      {
        title: '3. Hand off for underwriting depth',
        body: 'When the map has done its job, the next step is a Sage Introduction: bank-ready feasibility (forward-looking pro forma) or a USPAP appraisal (collateral value)—documents lenders actually underwrite.',
        href: '/landing/glamping-feasibility-study',
        hrefLabel: 'Glamping feasibility study',
      },
    ],
    outcome:
      'The financed-study path is research → comps → introduction → scoped engagement. Sage does not publish invented loan amounts here; the deliverable is evidence lenders recognize: competitive set, ADR and occupancy underwriting, and a clear narrative for your site.',
    landingSlug: 'glamping-feasibility-study',
    studyFocus: 'both',
  },
  {
    slug: 'colorado-comps-to-feasibility',
    title: 'Colorado Comps Map → Feasibility Study',
    metaTitle: 'Colorado Glamping Comps to Feasibility Study | Sage',
    metaDescription:
      'How mountain-market developers use Colorado glamping comps on the Sage map, then request a bank-ready feasibility study for financing and site underwriting.',
    patternLabel: 'Mountain / Front Range research path',
    intro:
      'Colorado is a high-intent comps market: ski access, hiking catchments, and dense mountain-town glamping supply. Developers often start by filtering Colorado on the map—sometimes narrowing to domes—then book a feasibility conversation once the competitive set is visible.',
    compositeNote:
      'Composite journey for Colorado / Front Range–style Organic research. No named prospect; no claimed loan close.',
    steps: [
      {
        title: '1. Open Colorado on the map',
        body: 'Filter to Colorado to see published glamping comps across mountain and Front Range markets. Unit-type filters (for example, domes) refine the set before you scope a study.',
        href: '/map?state=Colorado',
        hrefLabel: 'Colorado comps map',
      },
      {
        title: '2. Use the Colorado market page',
        body: 'The indexable Colorado glamping market URL deep-links into the same filters—so Organic landings are crawlable intent pages, not SPA-only state.',
        href: '/markets/colorado-glamping',
        hrefLabel: 'Colorado glamping market',
      },
      {
        title: '3. Scope a bank-ready feasibility study',
        body: 'Sage turns that comps view into market demand analysis, ADR and occupancy underwriting, development costs, and a 10-year pro forma built for lender review.',
        href: '/landing/glamping-feasibility-study',
        hrefLabel: 'Bank-ready glamping feasibility',
      },
    ],
    outcome:
      'Outcome of this path: a Colorado-scoped competitive set on the map, then a feasibility engagement that underwrites seasonality and mountain-market demand—ready for financing conversations.',
    mapQuery: 'state=Colorado',
    marketSlug: 'colorado-glamping',
    landingSlug: 'glamping-feasibility-study',
    studyFocus: 'feasibility',
  },
  {
    slug: 'california-comps-to-appraisal',
    title: 'California Comps Map → Bank Appraisal',
    metaTitle: 'California Glamping Comps to USPAP Appraisal | Sage',
    metaDescription:
      'How California outdoor hospitality buyers use comps-map research, then request a USPAP bank appraisal for financing, acquisition, or refinance.',
    patternLabel: 'Coastal / inland California research path',
    intro:
      'California’s dense glamping inventory makes comps research essential before an acquisition or refinance. Operators and investors often assemble a competitive set on the map, then need a USPAP appraisal lenders will accept—not a generic hotel template.',
    compositeNote:
      'Composite journey for California-style Organic comps → appraisal intent. Anonymized; no named deal.',
    steps: [
      {
        title: '1. Filter California comps',
        body: 'State (and optional unit-type) filters surface coastal, wine-country, and inland supply so you can see rate bands and density before scoping valuation.',
        href: '/map?state=California',
        hrefLabel: 'California comps map',
      },
      {
        title: '2. Confirm the market view',
        body: 'Use the California market page when you want a crawlable entry URL that opens the same map state—useful for sharing research with partners or lenders.',
        href: '/markets/california-glamping',
        hrefLabel: 'California glamping market',
      },
      {
        title: '3. Request a USPAP bank appraisal',
        body: 'Sage appraisals use income, sales comparison, and cost approaches tailored to outdoor hospitality—reports banks use for financing, acquisitions, and refinances.',
        href: '/landing/glamping-appraisal',
        hrefLabel: 'USPAP glamping appraisal',
      },
    ],
    outcome:
      'Outcome of this path: a California comps set from the map, then a USPAP appraisal scoped for lender underwriting—not a tourist listing page.',
    mapQuery: 'state=California',
    marketSlug: 'california-glamping',
    landingSlug: 'glamping-appraisal',
    studyFocus: 'appraisal',
  },
  {
    slug: 'campground-comps-to-financed-appraisal',
    title: 'Campground Comps → Financed Appraisal',
    metaTitle: 'Campground Comps Map to Bank Appraisal | Sage',
    metaDescription:
      'How campground owners and buyers use Sage comps research, then book a USPAP campground appraisal for bank financing and acquisitions.',
    patternLabel: 'Campground / lender appraisal path',
    intro:
      'Campground financing and acquisitions hinge on seasonal income normalization and a clear competitive set. Map research establishes comps density; a USPAP campground appraisal turns that into collateral value lenders recognize.',
    compositeNote:
      'Composite journey aligned with appraisal-intent Organic paths (including campground appraisal landings). Not a named borrower story.',
    steps: [
      {
        title: '1. Research comps on the map',
        body: 'Start with national or state-filtered comps to understand nearby outdoor hospitality supply—even when your asset is a traditional campground, the competitive set often includes glamping and RV inventory.',
        href: '/map',
        hrefLabel: 'Open comps map',
      },
      {
        title: '2. Read what lenders require',
        body: 'Pair map research with campground appraisal and feasibility FAQ pages so the introduction call is about scope, timeline, and underwriting—not basics.',
        href: '/landing/campground-appraisal',
        hrefLabel: 'Campground appraisal',
      },
      {
        title: '3. Book a Sage Introduction',
        body: 'Hand off with clear market context from your comps view. Sage scopes a USPAP campground appraisal (or feasibility, if the project is proposed) for financing or acquisition.',
        href: '/landing/appraisal-faq',
        hrefLabel: 'Appraisal FAQ for lenders',
      },
    ],
    outcome:
      'Outcome of this path: comps-informed market context plus a bank-ready campground appraisal scope—built for financing and acquisition underwriting.',
    landingSlug: 'campground-appraisal',
    studyFocus: 'appraisal',
  },
] as const;

const BY_SLUG = new Map(JOURNEY_CASE_PAGES.map((p) => [p.slug, p]));

export function getJourneyCasePage(slug: string): JourneyCasePage | null {
  return BY_SLUG.get(slug) ?? null;
}

export function getAllJourneyCaseSlugs(): string[] {
  return JOURNEY_CASE_PAGES.map((p) => p.slug);
}

export function buildJourneyMapHref(locale: string, journey: JourneyCasePage): string {
  if (journey.mapQuery) {
    return `/${locale}/map?${journey.mapQuery}`;
  }
  return `/${locale}/map`;
}
