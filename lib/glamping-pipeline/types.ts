import type { GlampingIsOpenValue } from '@/lib/glamping-is-open';
import type { ExtractedProperty } from '@/lib/glamping-discovery/extract-properties';

export type PipelineExtractedProperty = ExtractedProperty & {
  is_open: PipelineTrackedIsOpen;
};

export type PipelineTrackedIsOpen =
  | 'Proposed Development'
  | 'Under Construction';

export type PipelineStatusUpdate = {
  property_name: string;
  is_open: GlampingIsOpenValue;
  confidence: 'high' | 'medium' | 'low';
  evidence?: string | null;
};

export type PipelineArticleExtraction = {
  new_properties: PipelineExtractedProperty[];
  status_updates: PipelineStatusUpdate[];
};

export type PipelineSegmentMetrics = {
  propertiesExtracted: number;
  propertiesNew: number;
  propertiesInserted: number;
  statusUpdatesDetected: number;
  statusUpdatesApplied: number;
};

export type PipelineWeeklyRunMetrics = {
  dryRun: boolean;
  startedAt: string;
  completedAt: string;
  articlesFound: number;
  articlesFetched: number;
  articlesFailed: number;
  propertiesExtracted: number;
  propertiesNew: number;
  propertiesInserted: number;
  statusUpdatesDetected: number;
  statusUpdatesApplied: number;
  processedUrlsCount: number;
  runId?: string;
  glamping?: PipelineSegmentMetrics;
  rv?: PipelineSegmentMetrics;
};

export type PipelinePropertyRef = {
  id: number;
  slug: string;
  property_name: string;
  is_open: string | null;
};
