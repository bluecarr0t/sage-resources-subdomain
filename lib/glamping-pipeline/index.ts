export {
  PIPELINE_DISCOVERY_SOURCE,
  PIPELINE_RV_DISCOVERY_SOURCE,
  PIPELINE_IS_OPEN_VALUES,
  PIPELINE_WATCH_IS_OPEN_VALUES,
  PIPELINE_CANCELLED_IS_OPEN,
  PIPELINE_RV_PROPERTY_TYPES,
  PIPELINE_PROCESSED_URLS_TABLE,
  PIPELINE_RUNS_TABLE,
  PIPELINE_STATUS_HISTORY_TABLE,
} from './constants';

export type { PipelineSegment, PipelineRvPropertyType } from './constants';

export {
  PIPELINE_DISCOVERY_QUERIES,
  PIPELINE_RV_DISCOVERY_QUERIES,
  searchPipelineRvNews,
  searchPipelineAllSegmentsNews,
} from './tavily-search';

export {
  passesRvPipelineInclusionCriteria,
  passesRvPipelinePostEnrichmentCriteria,
} from './rv-inclusion-filter';

export type { PipelineStatusChangeSource } from './constants';

export {
  normalizeGlampingIsOpenLabel,
  isPipelineTrackedIsOpen,
  todayUtcDateString,
} from './normalize-is-open';

export {
  applyIsOpenChangeWithHistory,
  openInitialPipelineStatusHistory,
  computeStintDays,
} from './status-history';
export type {
  ApplyIsOpenChangeParams,
  ApplyIsOpenChangeResult,
  StatusStintDuration,
} from './status-history';

export { searchPipelineGlampingNews } from './tavily-search';
export { extractPipelineFromArticle } from './extract-from-article';
export { processPipelineArticle } from './process-article';
export { matchStatusUpdatesToProperties } from './match-status-updates';
export { toPipelineInsertRow } from './to-insert-row';
export { runWeeklyPipelineSync } from './run-weekly-sync';

export type {
  PipelineArticleExtraction,
  PipelineExtractedProperty,
  PipelinePropertyRef,
  PipelineStatusUpdate,
  PipelineWeeklyRunMetrics,
} from './types';
