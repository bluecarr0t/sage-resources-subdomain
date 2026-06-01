/**
 * RV Industry Overview chart modules must not export standalone table scanners.
 * All production data flows through `getCampspotRvOverviewPageData()` only.
 *
 * @see lib/rv-industry-overview/README.md
 * @see lib/rv-industry-overview/campspot-rv-overview-page-data.ts
 */

export const RV_OVERVIEW_UNIFIED_DATA_ENTRYPOINT =
  'getCampspotRvOverviewPageData' as const;

/** Forbidden export name prefixes in `campspot-*-chart-data.ts` (Campspot-only legacy scanners). */
export const RV_OVERVIEW_FORBIDDEN_CHART_DATA_EXPORTS = [
  'fetchCampspot',
  'getCampspot',
] as const;
