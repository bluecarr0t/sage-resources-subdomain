import type { GlampingUsStateMetricRow } from '@/lib/fetch-glamping-industry-us-state-metrics';
import {
  pipelineQuarterlyStatusPath,
  type PipelineQuarterlyStatusSlug,
} from '@/lib/pipeline-quarterly/status-slugs';

export type PipelineUsStateHighlight = 'none' | 'proposed' | 'under_construction' | 'both';

export type PipelineMapStageFilter =
  | 'all-pre-opening'
  | 'proposed-development'
  | 'under-construction';

export function pipelineUsStateHighlight(
  row: GlampingUsStateMetricRow | undefined
): PipelineUsStateHighlight {
  if (!row) return 'none';
  const hasProposed = row.proposedDevelopmentProperties > 0;
  const hasUnderConstruction = row.underConstructionProperties > 0;
  if (hasProposed && hasUnderConstruction) return 'both';
  if (hasProposed) return 'proposed';
  if (hasUnderConstruction) return 'under_construction';
  return 'none';
}

export function pipelineUsStateHighlightForFilter(
  row: GlampingUsStateMetricRow | undefined,
  filter: PipelineMapStageFilter
): PipelineUsStateHighlight {
  if (!row) return 'none';
  if (filter === 'all-pre-opening') return pipelineUsStateHighlight(row);

  const hasProposed = row.proposedDevelopmentProperties > 0;
  const hasUnderConstruction = row.underConstructionProperties > 0;

  if (filter === 'proposed-development') {
    if (!hasProposed) return 'none';
    return hasUnderConstruction ? 'both' : 'proposed';
  }

  if (!hasUnderConstruction) return 'none';
  return hasProposed ? 'both' : 'under_construction';
}

/**
 * Status drill-down path for a map-selected state, respecting the active stage filter.
 * Returns null when the state has no matching pipeline activity for the filter.
 */
export function pipelineMapStateDetailPath(
  stateAbbr: string,
  stageFilter: PipelineMapStageFilter,
  proposed: number,
  underConstruction: number
): string | null {
  const state = stateAbbr.trim().toUpperCase();
  if (!state) return null;

  let slug: PipelineQuarterlyStatusSlug | null = null;

  if (stageFilter === 'proposed-development') {
    if (proposed > 0) slug = 'proposed-development';
  } else if (stageFilter === 'under-construction') {
    if (underConstruction > 0) slug = 'under-construction';
  } else if (underConstruction > 0) {
    slug = 'under-construction';
  } else if (proposed > 0) {
    slug = 'proposed-development';
  }

  if (!slug) return null;
  return pipelineQuarterlyStatusPath(slug, { state });
}

const DEFAULT_PIPELINE_MAP_SELECTED_ABBR = 'CA';

/** Default map selection — California when present, else first state with pre-opening activity. */
export function defaultPipelineMapSelectedAbbr(
  byState: Record<string, GlampingUsStateMetricRow>
): string | null {
  if (byState[DEFAULT_PIPELINE_MAP_SELECTED_ABBR]) {
    return DEFAULT_PIPELINE_MAP_SELECTED_ABBR;
  }
  const abbrs = Object.keys(byState).sort((a, b) => a.localeCompare(b));
  for (const abbr of abbrs) {
    if (pipelineUsStateHighlight(byState[abbr]) !== 'none') return abbr;
  }
  return null;
}
