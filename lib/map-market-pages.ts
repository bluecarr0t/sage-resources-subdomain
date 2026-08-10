/**
 * Indexable market landing pages that deep-link into /map filter state.
 * Slugs like colorado-glamping → ?state=Colorado for Organic entry (not SPA-only).
 */

import { slugifyLocation } from '@/lib/slugify-location';

export type MapMarketPage = {
  slug: string;
  /** Display label for H1 / cards */
  title: string;
  metaTitle: string;
  metaDescription: string;
  /** Intro for developers / lenders */
  intro: string;
  /** Full state/province name as stored on properties */
  state: string;
  /** Optional unit-type filters applied on the map deep-link */
  unitTypes?: string[];
  /** Primary product framing for CTAs */
  studyFocus: 'feasibility' | 'appraisal' | 'both';
};

/**
 * Curated commercial markets — high-intent Organic targets aligned with
 * resources→booked funnel paths (map research + appraisal/feasibility).
 */
export const MAP_MARKET_PAGES: readonly MapMarketPage[] = [
  {
    slug: 'colorado-glamping',
    title: 'Colorado Glamping Market',
    metaTitle: 'Colorado Glamping Market Map | Feasibility & Appraisal Data | Sage',
    metaDescription:
      'Explore Colorado glamping comps on an interactive map—ADR bands, unit mix, and supply density for Rocky Mountain feasibility studies and appraisals.',
    intro:
      'Colorado glamping competes on ski access, hiking, and mountain-town demand. Use this market view to size competitor supply and rate positioning before a bank-ready feasibility study or appraisal.',
    state: 'Colorado',
    studyFocus: 'both',
  },
  {
    slug: 'california-glamping',
    title: 'California Glamping Market',
    metaTitle: 'California Glamping Market Map | Comps & ADR | Sage Outdoor Advisory',
    metaDescription:
      'California glamping market map with coastal, wine country, and desert comps—filter unit types and rates for feasibility and development research.',
    intro:
      'California has one of North America’s densest glamping markets. Benchmark competitors and nightly rate bands here when underwriting a new resort or expansion.',
    state: 'California',
    studyFocus: 'both',
  },
  {
    slug: 'texas-glamping',
    title: 'Texas Glamping Market',
    metaTitle: 'Texas Glamping Market Map | Hill Country & Desert Comps | Sage',
    metaDescription:
      'Texas glamping comps on an interactive map—Hill Country, West Texas, and lake markets with unit-type and ADR filters for outdoor hospitality studies.',
    intro:
      'Texas glamping spans Hill Country retreats, desert stargazing, and lakefront concepts. Compare supply density and pricing before modeling a new development.',
    state: 'Texas',
    studyFocus: 'both',
  },
  {
    slug: 'florida-glamping',
    title: 'Florida Glamping Market',
    metaTitle: 'Florida Glamping Market Map | Coastal & Springs Comps | Sage',
    metaDescription:
      'Florida glamping market research map—coastal, springs, and year-round operating comps for feasibility studies and appraisals.',
    intro:
      'Florida’s longer season and tourism corridors change occupancy assumptions. Use this map to assemble a defensible competitor set for feasibility or appraisal work.',
    state: 'Florida',
    studyFocus: 'both',
  },
  {
    slug: 'north-carolina-glamping',
    title: 'North Carolina Glamping Market',
    metaTitle: 'North Carolina Glamping Market Map | Blue Ridge Comps | Sage',
    metaDescription:
      'North Carolina glamping map near the Blue Ridge and coast—interactive comps for Southeast feasibility and appraisal research.',
    intro:
      'North Carolina glamping clusters along the Blue Ridge and coastal drive markets. Filter this view to align comps with your proposed site’s catchment.',
    state: 'North Carolina',
    studyFocus: 'both',
  },
  {
    slug: 'utah-glamping',
    title: 'Utah Glamping Market',
    metaTitle: 'Utah Glamping Market Map | National Park Corridor Comps | Sage',
    metaDescription:
      'Utah glamping near Zion, Moab, and ski corridors—map of domes and luxury tents with rate context for park-adjacent development studies.',
    intro:
      'Utah demand tracks national-park and recreation visitation. Benchmark Moab-, Zion-, and ski-corridor supply when modeling seasonal rates and unit mix.',
    state: 'Utah',
    studyFocus: 'both',
  },
  {
    slug: 'oregon-glamping',
    title: 'Oregon Glamping Market',
    metaTitle: 'Oregon Glamping Market Map | Coast & Wine Country Comps | Sage',
    metaDescription:
      'Oregon glamping comps across coast, wine country, and forest markets—interactive map for outdoor hospitality feasibility research.',
    intro:
      'Oregon mixes coastal seasonality, wine-country weekends, and forest retreats. Use this market page to frame competitor ADR bands for a lender-ready study.',
    state: 'Oregon',
    studyFocus: 'feasibility',
  },
  {
    slug: 'arizona-glamping',
    title: 'Arizona Glamping Market',
    metaTitle: 'Arizona Glamping Market Map | Desert Dome Comps | Sage',
    metaDescription:
      'Arizona desert glamping and dome comps on an interactive map—Southwest supply and rate context for feasibility and appraisal.',
    intro:
      'Arizona concepts often emphasize desert domes and winter snowbird demand. Compare Sonoran and high-country supply before locking underwriting assumptions.',
    state: 'Arizona',
    studyFocus: 'both',
  },
  {
    slug: 'tennessee-glamping',
    title: 'Tennessee Glamping Market',
    metaTitle: 'Tennessee Glamping Market Map | Smokies Drive Markets | Sage',
    metaDescription:
      'Tennessee glamping near the Smokies and Nashville drive markets—comps map for Southeast feasibility studies and appraisals.',
    intro:
      'Tennessee benefits from Smokies visitation and Nashville weekend demand. Assemble comps here when testing a new glamping or mixed outdoor hospitality concept.',
    state: 'Tennessee',
    studyFocus: 'both',
  },
  {
    slug: 'colorado-domes',
    title: 'Colorado Dome Glamping Market',
    metaTitle: 'Colorado Dome Glamping Map | Unit-Type Comps | Sage',
    metaDescription:
      'Colorado glamping domes on an interactive map—filter mountain-market comps by dome inventory for feasibility and appraisal research.',
    intro:
      'Dome inventory is a common premium format in Colorado mountain markets. This view isolates dome comps so you can compare rate bands and supply before a focused feasibility scope.',
    state: 'Colorado',
    unitTypes: ['Dome'],
    studyFocus: 'feasibility',
  },
  {
    slug: 'california-yurts',
    title: 'California Yurt Glamping Market',
    metaTitle: 'California Yurt Glamping Map | Comps & Rates | Sage',
    metaDescription:
      'California yurt glamping comps on an interactive map—coastal and inland supply for outdoor hospitality market studies.',
    intro:
      'Yurts remain a high-search unit type for California outdoor stays. Use this filtered market view to size yurt supply and nightly rate positioning for a study.',
    state: 'California',
    unitTypes: ['Yurt'],
    studyFocus: 'feasibility',
  },
  {
    slug: 'campground-appraisal-markets',
    title: 'Campground Appraisal Market Research',
    metaTitle: 'Campground Appraisal Market Map | Comps Research | Sage',
    metaDescription:
      'Start campground and outdoor hospitality appraisal research from the Sage comps map—then book a bank-ready appraisal conversation.',
    intro:
      'Appraisers and lenders need a clear competitor set and rate evidence. Explore national glamping comps on the map, then request a USPAP-aligned campground or outdoor hospitality appraisal.',
    state: 'Colorado',
    studyFocus: 'appraisal',
  },
] as const;

const BY_SLUG = new Map(MAP_MARKET_PAGES.map((p) => [p.slug, p]));

export function getMapMarketPage(slug: string): MapMarketPage | null {
  return BY_SLUG.get(slug) ?? null;
}

export function getAllMapMarketSlugs(): string[] {
  return MAP_MARKET_PAGES.map((p) => p.slug);
}

/** Query string for /[locale]/map deep-link (no leading ?). */
export function buildMapDeepLinkQuery(market: MapMarketPage): string {
  const params = new URLSearchParams();
  params.append('state', market.state);
  for (const unit of market.unitTypes ?? []) {
    params.append('unitType', unit);
  }
  return params.toString();
}

export function buildMapDeepLinkPath(locale: string, market: MapMarketPage): string {
  const q = buildMapDeepLinkQuery(market);
  return `/${locale}/map?${q}`;
}

/**
 * Compact utm_content path for map lead CTAs (query strings are stripped by
 * root-domain attribution normalization).
 */
export function buildMapLeadAttributionPath(input: {
  states?: string[];
  unitTypes?: string[];
  marketSlug?: string;
}): string {
  if (input.marketSlug) {
    return `/markets/${input.marketSlug}`;
  }
  const states = (input.states ?? []).map((s) => slugifyLocation(s)).filter(Boolean);
  const units = (input.unitTypes ?? [])
    .map((u) => slugifyLocation(u))
    .filter(Boolean);
  if (states.length === 0 && units.length === 0) return '/map';
  const parts = [...states.slice(0, 3), ...units.slice(0, 2)];
  return `/map/${parts.join('+')}`.slice(0, 120);
}

export function formatMarketLabel(market: MapMarketPage): string {
  if (market.unitTypes?.length) {
    return `${market.state} · ${market.unitTypes.join(', ')}`;
  }
  return market.state;
}

/** Match curated market pages to active map filters (state ± unit type). */
export function findMapMarketPagesForFilters(
  states: string[],
  unitTypes: string[]
): MapMarketPage[] {
  if (states.length === 0 && unitTypes.length === 0) return [];

  const stateSet = new Set(states.map((s) => s.toLowerCase()));
  const unitSet = new Set(unitTypes.map((u) => u.toLowerCase()));

  return MAP_MARKET_PAGES.filter((market) => {
    const stateOk =
      states.length === 0 || stateSet.has(market.state.toLowerCase());
    if (!stateOk) return false;

    if (!market.unitTypes?.length) {
      // State-wide page: prefer when no unit filter, or always as secondary match
      return unitTypes.length === 0 || market.studyFocus !== 'appraisal';
    }

    return market.unitTypes.some((u) => unitSet.has(u.toLowerCase()));
  }).sort((a, b) => {
    // Prefer unit-specific matches when unit filters are active
    const aSpecific = a.unitTypes?.length ? 1 : 0;
    const bSpecific = b.unitTypes?.length ? 1 : 0;
    if (unitTypes.length > 0 && aSpecific !== bSpecific) {
      return bSpecific - aSpecific;
    }
    return a.slug.localeCompare(b.slug);
  });
}
