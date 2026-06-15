import type { GlampingUsStateMetricsMap } from '@/lib/fetch-glamping-industry-us-state-metrics';
import {
  pipelineUsStateHighlightForFilter,
  type PipelineMapStageFilter,
  type PipelineUsStateHighlight,
} from '@/lib/pipeline-quarterly/us-state-pipeline-highlight';
import {
  PIPELINE_BOTH_STAGES_COLORS,
  PIPELINE_PROPOSED_COLORS,
  PIPELINE_UNDER_CONSTRUCTION_COLORS,
} from '@/lib/pipeline-quarterly/stage-colors';

export type PipelineMapGradientRamp = {
  min: string;
  max: string;
};

export type PipelineMapGradientRanges = Record<
  PipelineUsStateHighlight,
  { min: number; max: number }
>;

function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function toHexByte(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0');
}

/** Linear blend between two hex colors; `t` is clamped to [0, 1]. */
export function interpolateHexColor(min: string, max: string, t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const [r1, g1, b1] = parseHexColor(min);
  const [r2, g2, b2] = parseHexColor(max);
  const r = r1 + (r2 - r1) * clamped;
  const g = g1 + (g2 - g1) * clamped;
  const b = b1 + (b2 - b1) * clamped;
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`;
}

export function pipelineMapGradientRamp(
  highlight: PipelineUsStateHighlight
): PipelineMapGradientRamp {
  switch (highlight) {
    case 'proposed':
      return {
        min: PIPELINE_PROPOSED_COLORS.mapFillMin,
        max: PIPELINE_PROPOSED_COLORS.mapFillSelected,
      };
    case 'under_construction':
      return {
        min: PIPELINE_UNDER_CONSTRUCTION_COLORS.mapFillMin,
        max: PIPELINE_UNDER_CONSTRUCTION_COLORS.mapFillSelected,
      };
    case 'both':
      return {
        min: PIPELINE_BOTH_STAGES_COLORS.mapFillMin,
        max: PIPELINE_BOTH_STAGES_COLORS.mapFillSelected,
      };
    case 'none':
      return { min: '#f6f7f6', max: '#f6f7f6' };
    default: {
      const exhaustive: never = highlight;
      return exhaustive;
    }
  }
}

/** Which stage ramp to use for fills, given the active map filter. */
export function pipelineMapRampHighlight(
  highlight: PipelineUsStateHighlight,
  stageFilter: PipelineMapStageFilter
): PipelineUsStateHighlight {
  if (highlight === 'none') return 'none';
  if (stageFilter === 'proposed-development') return 'proposed';
  if (stageFilter === 'under-construction') return 'under_construction';
  return highlight;
}

export function pipelineMapPropertyCount(
  row: { proposedDevelopmentProperties: number; underConstructionProperties: number } | undefined,
  highlight: PipelineUsStateHighlight,
  stageFilter: PipelineMapStageFilter
): number {
  if (!row || highlight === 'none') return 0;

  if (stageFilter === 'proposed-development') {
    return row.proposedDevelopmentProperties;
  }
  if (stageFilter === 'under-construction') {
    return row.underConstructionProperties;
  }

  switch (highlight) {
    case 'proposed':
      return row.proposedDevelopmentProperties;
    case 'under_construction':
      return row.underConstructionProperties;
    case 'both':
      return row.proposedDevelopmentProperties + row.underConstructionProperties;
    default: {
      const exhaustive: never = highlight;
      return exhaustive;
    }
  }
}

export function pipelineMapGradientT(
  count: number,
  minCount: number,
  maxCount: number
): number {
  if (count <= 0) return 0;
  if (maxCount <= minCount) return 1;
  return (count - minCount) / (maxCount - minCount);
}

export function buildPipelineMapGradientRanges(
  byState: GlampingUsStateMetricsMap,
  stageFilter: PipelineMapStageFilter
): PipelineMapGradientRanges {
  const counts: Record<PipelineUsStateHighlight, number[]> = {
    none: [],
    proposed: [],
    under_construction: [],
    both: [],
  };

  for (const abbr of Object.keys(byState)) {
    const row = byState[abbr];
    const highlight = pipelineUsStateHighlightForFilter(row, stageFilter);
    if (highlight === 'none') continue;
    const rampHighlight = pipelineMapRampHighlight(highlight, stageFilter);
    counts[rampHighlight].push(
      pipelineMapPropertyCount(row, highlight, stageFilter)
    );
  }

  const rangeFor = (values: number[]) => ({
    min: values.length > 0 ? Math.min(...values) : 1,
    max: values.length > 0 ? Math.max(...values) : 1,
  });

  return {
    none: { min: 0, max: 0 },
    proposed: rangeFor(counts.proposed),
    under_construction: rangeFor(counts.under_construction),
    both: rangeFor(counts.both),
  };
}

export function pipelineMapGradientFill(
  highlight: PipelineUsStateHighlight,
  count: number,
  ranges: PipelineMapGradientRanges,
  stageFilter: PipelineMapStageFilter
): { fill: string; fillHover: string; fillSelected: string } {
  const rampHighlight = pipelineMapRampHighlight(highlight, stageFilter);
  const ramp = pipelineMapGradientRamp(rampHighlight);
  const range = ranges[rampHighlight];
  const t = pipelineMapGradientT(count, range.min, range.max);
  const fill = interpolateHexColor(ramp.min, ramp.max, t);
  const fillHover = interpolateHexColor(ramp.min, ramp.max, Math.min(1, t + 0.15));
  return {
    fill,
    fillHover,
    fillSelected: ramp.max,
  };
}
