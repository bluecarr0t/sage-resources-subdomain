/**
 * Glamping discovery pipeline - RSS feeds, article extraction, enrichment, insert
 */

export { GLAMPING_RSS_FEEDS } from './feeds';
export type { RssFeedConfig } from './feeds';
export { fetchArticleContent } from './fetch-article';
export type { FetchArticleOptions } from './fetch-article';
export { extractPropertiesFromArticle } from './extract-properties';
export type { ExtractedProperty } from './extract-properties';
export {
  passesInclusionCriteria,
  passesPostEnrichmentUnitCriteria,
} from './inclusion-filter';
export type { InclusionResult } from './inclusion-filter';
export {
  normalizePropertyName,
  getDatabasePropertyNames,
  propertyExistsInDb,
  filterNewProperties,
} from './deduplicate';
export {
  enrichProperty,
  toInsertRow,
  insertProperties,
} from './enrich-and-insert';
export type { InsertRow } from './enrich-and-insert';
export { searchGlampingNews, DISCOVERY_QUERIES_CANADA } from './tavily-search';
export type { TavilyArticleResult, GlampingTavilyQuerySet } from './tavily-search';
export {
  processDiscoveryArticle,
  type ProcessDiscoveryArticleParams,
  type ProcessDiscoveryArticleResult,
} from './process-discovery-article';
export {
  routeDiscoveryFailuresToCandidates,
  GLAMPING_DISCOVERY_CANDIDATES_TABLE,
} from './route-discovery-failures-to-candidates';
