import { GLAMPING_SERVICE_TIERS, isGlampingServiceTier } from '@/lib/glamping-service-tier';
import type { PipelineQuarterlyPropertyRow } from './fetch-status-breakdown';

export type PipelinePropertySortColumn =
  | 'property'
  | 'state'
  | 'unitType'
  | 'units'
  | 'acres'
  | 'tier'
  | 'brand'
  | 'avgRate'
  | 'plannedOpen';

export type SortDirection = 'asc' | 'desc';

export const PIPELINE_PROPERTY_DEFAULT_SORT_DIRECTION: Record<
  PipelinePropertySortColumn,
  SortDirection
> = {
  property: 'asc',
  state: 'asc',
  unitType: 'asc',
  units: 'desc',
  acres: 'desc',
  tier: 'asc',
  brand: 'asc',
  avgRate: 'desc',
  plannedOpen: 'asc',
};

export const PIPELINE_PROPERTY_INITIAL_SORT: {
  column: PipelinePropertySortColumn;
  direction: SortDirection;
} = {
  column: 'property',
  direction: PIPELINE_PROPERTY_DEFAULT_SORT_DIRECTION.property,
};

export type PipelinePropertySortState = {
  column: PipelinePropertySortColumn;
  direction: SortDirection;
};

export function getPipelinePropertyInitialSort(
  statusSlug?: string
): PipelinePropertySortState {
  if (statusSlug === 'under-construction') {
    return {
      column: 'plannedOpen',
      direction: PIPELINE_PROPERTY_DEFAULT_SORT_DIRECTION.plannedOpen,
    };
  }

  return PIPELINE_PROPERTY_INITIAL_SORT;
}

function compareStrings(a: string | null | undefined, b: string | null | undefined): number {
  return (a ?? '').localeCompare(b ?? '', undefined, { sensitivity: 'base' });
}

function isBlankSortableValue(value: string | null | undefined): boolean {
  return value == null || String(value).trim() === '';
}

function compareNullableNumbers(
  a: number | null | undefined,
  b: number | null | undefined,
  sortDir: SortDirection
): number {
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  const cmp = a - b;
  return sortDir === 'asc' ? cmp : -cmp;
}

/** ISO date strings (`YYYY-MM-DD`); unknown values always sort last. */
function compareNullableIsoDateStrings(
  a: string | null | undefined,
  b: string | null | undefined,
  sortDir: SortDirection
): number {
  const aBlank = isBlankSortableValue(a);
  const bBlank = isBlankSortableValue(b);
  if (aBlank && bBlank) return 0;
  if (aBlank) return 1;
  if (bBlank) return -1;
  const cmp = String(a).localeCompare(String(b));
  return sortDir === 'asc' ? cmp : -cmp;
}

function tierRank(tier: string | null | undefined): number {
  if (!tier?.trim()) return GLAMPING_SERVICE_TIERS.length;
  const normalized = tier.trim().toLowerCase();
  if (!isGlampingServiceTier(normalized)) return GLAMPING_SERVICE_TIERS.length + 1;
  return GLAMPING_SERVICE_TIERS.indexOf(normalized);
}

function comparePipelinePropertyRows(
  a: PipelineQuarterlyPropertyRow,
  b: PipelineQuarterlyPropertyRow,
  column: PipelinePropertySortColumn,
  sortDir: SortDirection
): number {
  switch (column) {
    case 'property':
      return compareStrings(a.propertyName, b.propertyName);
    case 'state':
      return compareStrings(a.stateAbbr ?? a.state, b.stateAbbr ?? b.state);
    case 'unitType':
      return compareStrings(a.unitType, b.unitType);
    case 'units':
      return compareNullableNumbers(a.units, b.units, sortDir);
    case 'acres':
      return compareNullableNumbers(a.acres, b.acres, sortDir);
    case 'tier':
      return tierRank(a.serviceTier) - tierRank(b.serviceTier);
    case 'brand':
      return compareStrings(a.brandName, b.brandName);
    case 'avgRate':
      return compareNullableNumbers(a.avgRetailDailyRate, b.avgRetailDailyRate, sortDir);
    case 'plannedOpen':
      return compareNullableIsoDateStrings(
        a.plannedOpenDate,
        b.plannedOpenDate,
        sortDir
      );
    default: {
      const _exhaustive: never = column;
      return _exhaustive;
    }
  }
}

function applyStringSortDirection(value: number, sortDir: SortDirection): number {
  return sortDir === 'asc' ? value : -value;
}

export function sortPipelineQuarterlyProperties(
  rows: readonly PipelineQuarterlyPropertyRow[],
  sortBy: PipelinePropertySortColumn,
  sortDir: SortDirection
): PipelineQuarterlyPropertyRow[] {
  const isDirectCompareColumn =
    sortBy === 'units' ||
    sortBy === 'acres' ||
    sortBy === 'avgRate' ||
    sortBy === 'plannedOpen';

  return [...rows].sort((left, right) => {
    const raw = comparePipelinePropertyRows(left, right, sortBy, sortDir);
    const primary = isDirectCompareColumn
      ? raw
      : applyStringSortDirection(raw, sortDir);
    if (primary !== 0) return primary;

    const propertyName = compareStrings(left.propertyName, right.propertyName);
    if (propertyName !== 0) return propertyName;

    return left.id - right.id;
  });
}

export function nextPipelinePropertySortState(
  current: { column: PipelinePropertySortColumn; direction: SortDirection },
  clickedColumn: PipelinePropertySortColumn
): { column: PipelinePropertySortColumn; direction: SortDirection } {
  if (current.column === clickedColumn) {
    return {
      column: clickedColumn,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    };
  }

  return {
    column: clickedColumn,
    direction: PIPELINE_PROPERTY_DEFAULT_SORT_DIRECTION[clickedColumn],
  };
}
