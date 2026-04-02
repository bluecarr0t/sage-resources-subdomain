/**
 * Limits for comps-v2 coverage (multi-state / all-US) discovery.
 * Radius mode keeps using rowLimitPerTable defaults from the API (e.g. 400).
 */

/** Max rows returned per market table when `coverageAllUs` is true (before in-memory filters). */
export const COMPS_V2_COVERAGE_ALL_US_MAX_PER_TABLE = 1500;

/** Upper bound for `maxResults` when running all-US coverage (API may clamp). */
export const COMPS_V2_COVERAGE_MAX_RESULTS_CAP = 5000;

/** Default `maxResults` when client omits it in all-US coverage. */
export const COMPS_V2_COVERAGE_ALL_US_DEFAULT_MAX_RESULTS = 3000;
