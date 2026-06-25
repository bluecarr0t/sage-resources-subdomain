import type { sheets_v4 } from 'googleapis';

export const PROJECT_PIPELINE_SEGMENTS = ['Outdoor', 'Commercial'] as const;

export type ProjectPipelineSegment = (typeof PROJECT_PIPELINE_SEGMENTS)[number];

export const DEFAULT_PROJECT_PIPELINE_SEGMENT_FILTER: ProjectPipelineSegment = 'Outdoor';

/** Tailwind background class for the segment indicator dot beside job numbers. */
export function getProjectPipelineSegmentDotClassName(
  segment: string | null | undefined
): string | null {
  if (segment === 'Outdoor') return 'bg-[#4a624a]';
  if (segment === 'Commercial') return 'bg-amber-400';
  return null;
}

/** Columns used to detect whole-row green fill (excludes status / pill columns). */
export const ROW_HIGHLIGHT_COLUMN_INDICES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

type RgbColor = sheets_v4.Schema$Color;

/** True when a cell uses the light-green row highlight from the pipeline sheet. */
export function isGreenHighlightBackground(color: RgbColor | null | undefined): boolean {
  if (!color) return false;

  const r = color.red ?? 1;
  const g = color.green ?? 1;
  const b = color.blue ?? 1;

  // Default / white rows
  if (r > 0.98 && g > 0.98 && b > 0.98) return false;

  // Neutral gray rows
  if (Math.abs(r - g) < 0.05 && Math.abs(g - b) < 0.05 && r > 0.9) return false;

  // Typical sheet greens (#d9ead3, #b7e1cd): green is clearly dominant over red/blue.
  return g >= 0.85 && g - r >= 0.05 && g - b >= 0.03;
}

export function inferSegmentFromGridRow(
  cells: sheets_v4.Schema$CellData[] | null | undefined
): ProjectPipelineSegment {
  if (!cells?.length) return 'Commercial';

  for (const index of ROW_HIGHLIGHT_COLUMN_INDICES) {
    const cell = cells[index];
    if (cell && isGreenHighlightBackground(cell.effectiveFormat?.backgroundColor)) {
      return 'Outdoor';
    }
  }

  return 'Commercial';
}

export function normalizeCommercialOutdoor(value: string): ProjectPipelineSegment | '' {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('outdoor')) return 'Outdoor';
  return 'Commercial';
}

/** Normalize any stored sheet/mirror value to Outdoor or Commercial. */
export function resolveProjectPipelineJobSegment(
  value: string | null | undefined
): ProjectPipelineSegment {
  return normalizeCommercialOutdoor(value ?? '') || 'Commercial';
}

export function jobMatchesProjectPipelineSegment(
  value: string | null | undefined,
  segmentFilter: ProjectPipelineSegment
): boolean {
  return resolveProjectPipelineJobSegment(value) === segmentFilter;
}

/** When the sheet only has the division label, defer to row highlight inference. */
export function stripProjectPipelineSegmentColumnLabel(commercialOutdoor: string): string {
  const trimmed = commercialOutdoor.trim();
  if (trimmed === 'Outdoor' || trimmed === 'Commercial') return '';
  return trimmed;
}

export function resolveCommercialOutdoor(
  columnValue: string,
  fromHighlight: ProjectPipelineSegment
): ProjectPipelineSegment {
  return normalizeCommercialOutdoor(stripProjectPipelineSegmentColumnLabel(columnValue)) || fromHighlight;
}

/** Fallback when row highlight metadata is unavailable. */
export function resolveCommercialOutdoorWithoutHighlight(
  columnValue: string
): ProjectPipelineSegment {
  return normalizeCommercialOutdoor(columnValue) || 'Commercial';
}

/** Infer division from service when the sheet column / row highlight is ambiguous. */
export function inferProjectPipelineSegmentFromService(
  service: string | null | undefined
): ProjectPipelineSegment | null {
  const normalized = service?.trim().toLowerCase() ?? '';
  if (!normalized) return null;
  if (normalized.includes('appraisal')) return 'Commercial';
  if (normalized === 'feasibility study') return 'Outdoor';
  return null;
}

/** Resolve Outdoor vs Commercial using stored column value plus service hints. */
export function resolveProjectPipelineJobCommercialOutdoor(input: {
  commercialOutdoor: string;
  service?: string | null;
}): ProjectPipelineSegment {
  const fromStored = resolveProjectPipelineJobSegment(input.commercialOutdoor);
  const fromService = inferProjectPipelineSegmentFromService(input.service);
  if (fromService === 'Commercial' && fromStored === 'Outdoor') return 'Commercial';
  return fromStored;
}
