/**
 * Structured observability for comps-v2 Tavily + Firecrawl gap fill (API + UI).
 */

export interface TavilyGapStats {
  apiConfigured: boolean;
  queriesPlanned: number;
  queriesCompleted: number;
  /** Total search result rows returned by Tavily across queries (before relevance filter). */
  rawResultRowsFromApi: number;
  /** Rows that passed topical relevance and specific-property heuristics (before name dedupe). */
  afterRelevanceRows: number;
  /** SERP rows skipped as listicles, roundups, or directory hubs (not a single property). */
  skippedAggregatePages: number;
  /** Rows emitted from Tavily fetch (unique property names in this fetch). */
  tavilyRowsEmitted: number;
  queryErrors: string[];
  maxGapCompsCap: number;
  /** Budgeted distinct Tavily search calls this run (1–10). */
  maxQueriesBudget: number;
  /** Max raw SERP rows requested per Tavily call (1–10). */
  maxResultsPerQueryBudget: number;
}

export interface FirecrawlGapStats {
  apiConfigured: boolean;
  attempted: number;
  enriched: number;
  blockedByPolicy: number;
  failedOrEmpty: number;
}

export interface WebResearchDiagnostics {
  ran: boolean;
  tavily: TavilyGapStats;
  firecrawl: FirecrawlGapStats;
  /** New rows produced by gap-fill before merging with DB list (after name/url skip vs existing set). */
  pipelineOutputCount: number;
  skippedDuplicateName: number;
  skippedDuplicateUrl: number;
  /** After API route property / ADR / tier / glamping filters. */
  addedAfterFilters?: number;
  /** City string used in Tavily radius queries (may differ from structured form when anchor was resolved). */
  anchorCityForQueries?: string;
  /** Nominatim geocode attempts for web rows missing distance (capped per run). */
  webDistanceGeocodeAttempts?: number;
  /** Successful geocodes that produced a distance from the discovery anchor. */
  webDistanceGeocodeHits?: number;
  /** Outbound Google Geocoding API attempts during web row enrichment (per query tried). */
  googleGeocodeCalls?: number;
  /** Nominatim requests during web row enrichment. */
  nominatimGeocodeCalls?: number;
}

export function emptyWebResearchDiagnostics(ran: boolean): WebResearchDiagnostics {
  return {
    ran,
    tavily: {
      apiConfigured: false,
      queriesPlanned: 0,
      queriesCompleted: 0,
      rawResultRowsFromApi: 0,
      afterRelevanceRows: 0,
      skippedAggregatePages: 0,
      tavilyRowsEmitted: 0,
      queryErrors: [],
      maxGapCompsCap: 0,
      maxQueriesBudget: 0,
      maxResultsPerQueryBudget: 0,
    },
    firecrawl: {
      apiConfigured: false,
      attempted: 0,
      enriched: 0,
      blockedByPolicy: 0,
      failedOrEmpty: 0,
    },
    pipelineOutputCount: 0,
    skippedDuplicateName: 0,
    skippedDuplicateUrl: 0,
    googleGeocodeCalls: 0,
    nominatimGeocodeCalls: 0,
  };
}
