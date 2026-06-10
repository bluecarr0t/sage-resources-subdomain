import type { GlampingIsOpenValue } from '@/lib/glamping-is-open';

export type PipelineSegment = 'glamping' | 'rv';

/** Stored on new glamping rows from the weekly pipeline sync. */
export const PIPELINE_DISCOVERY_SOURCE = 'weekly_pipeline_sync';

/** Stored on new RV rows from the weekly pipeline sync. */
export const PIPELINE_RV_DISCOVERY_SOURCE = 'weekly_pipeline_sync_rv';

/** RV-segment property types: parks, resorts, and RV-primary campgrounds (≥20 sites). */
export const PIPELINE_RV_PROPERTY_TYPES = [
  'RV Park',
  'RV Resort',
  'Campground',
] as const;

export type PipelineRvPropertyType = (typeof PIPELINE_RV_PROPERTY_TYPES)[number];

/** Minimum RV / campground site count for pipeline inserts (user-confirmed). */
export const PIPELINE_MIN_RV_SITES = 20;

export function isPipelineRvSegmentPropertyType(
  propertyType: string | null | undefined
): boolean {
  return (PIPELINE_RV_PROPERTY_TYPES as readonly string[]).includes(
    (propertyType ?? '').trim()
  );
}

export const PIPELINE_PROCESSED_URLS_TABLE = 'glamping_pipeline_processed_urls';
export const PIPELINE_RUNS_TABLE = 'glamping_pipeline_discovery_runs';
export const PIPELINE_STATUS_HISTORY_TABLE = 'glamping_pipeline_status_history';

/** Stages eligible for new pipeline inserts. */
export const PIPELINE_IS_OPEN_VALUES = [
  'Proposed Development',
  'Under Construction',
] as const satisfies readonly GlampingIsOpenValue[];

/** Stages included in the weekly status watch list (incl. terminal Cancelled). */
export const PIPELINE_WATCH_IS_OPEN_VALUES = [
  'Proposed Development',
  'Under Construction',
  'Cancelled',
] as const satisfies readonly GlampingIsOpenValue[];

/** Terminal pipeline outcome when a project will not open. */
export const PIPELINE_CANCELLED_IS_OPEN = 'Cancelled' as const satisfies GlampingIsOpenValue;

export type PipelineIsOpenValue = (typeof PIPELINE_IS_OPEN_VALUES)[number];

export const PIPELINE_STATUS_CHANGE_SOURCES = [
  'weekly_pipeline_sync',
  'admin_patch',
  'planned_open_cron',
  'initial_backfill',
  'manual_script',
] as const;

export type PipelineStatusChangeSource =
  (typeof PIPELINE_STATUS_CHANGE_SOURCES)[number];
