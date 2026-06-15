import type { PipelineQuarterlyPropertyRow } from './fetch-status-breakdown';
import type { PipelineQuarterlyUnitMixLine } from './unit-mix';

export const PIPELINE_QUARTERLY_PROPERTY_EXPORT_COLUMNS = [
  'property_name',
  'address',
  'city',
  'state',
  'zip_code',
  'country',
  'is_open',
  'glamping_service_tier',
  'Brand',
  'acres',
  'total_units',
  'distinct_unit_types',
  'planned_open_date',
  'rate_avg_retail_daily_rate',
] as const;

export const PIPELINE_QUARTERLY_UNIT_MIX_EXPORT_COLUMNS = [
  'property_name',
  'state',
  'country',
  'is_open',
  'Brand',
  'unit_type',
  'units',
  'rate_avg_retail_daily_rate',
] as const;

/** @deprecated Use PIPELINE_QUARTERLY_PROPERTY_EXPORT_COLUMNS */
export const PIPELINE_QUARTERLY_EXPORT_COLUMNS = PIPELINE_QUARTERLY_PROPERTY_EXPORT_COLUMNS;

export type PipelineQuarterlyPropertyExportColumn =
  (typeof PIPELINE_QUARTERLY_PROPERTY_EXPORT_COLUMNS)[number];

export type PipelineQuarterlyUnitMixExportColumn =
  (typeof PIPELINE_QUARTERLY_UNIT_MIX_EXPORT_COLUMNS)[number];

/** @deprecated Use PipelineQuarterlyPropertyExportColumn */
export type PipelineQuarterlyExportColumn = PipelineQuarterlyPropertyExportColumn;

export type PipelineQuarterlyExportOptions = {
  /** Omit planned open date (e.g. Open status exports). */
  hidePlannedOpenDate?: boolean;
};

export type PipelineQuarterlyExportBundle = {
  properties: Record<string, unknown>[];
  unitMix: Record<string, unknown>[];
  propertyColumns: PipelineQuarterlyPropertyExportColumn[];
  unitMixColumns: PipelineQuarterlyUnitMixExportColumn[];
};

export const PIPELINE_QUARTERLY_EXPORT_PROPERTY_SHEET_NAME = 'Properties';
export const PIPELINE_QUARTERLY_EXPORT_UNIT_MIX_SHEET_NAME = 'Unit mix';

function pickColumns<T extends string>(
  row: Record<string, unknown>,
  columns: readonly T[]
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const column of columns) {
    picked[column] = row[column];
  }
  return picked;
}

function unitMixLinesForProperty(
  row: PipelineQuarterlyPropertyRow
): readonly PipelineQuarterlyUnitMixLine[] {
  if (row.unitMix.length > 0) return row.unitMix;
  if (!row.unitType?.trim() && row.units <= 0) return [];
  return [
    {
      unitType: row.unitType?.trim() || 'Unspecified',
      units: row.units,
      avgRetailDailyRate: row.avgRetailDailyRate,
    },
  ];
}

function buildPipelineQuarterlyPropertyExportRow(
  row: PipelineQuarterlyPropertyRow
): Record<PipelineQuarterlyPropertyExportColumn, unknown> {
  const unitMix = unitMixLinesForProperty(row);

  return {
    property_name: row.propertyName,
    address: row.address ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    zip_code: row.zipCode ?? '',
    country: row.country ?? '',
    is_open: row.isOpenLabel,
    glamping_service_tier: row.serviceTier ?? '',
    Brand: row.brandName ?? '',
    acres: row.acres ?? '',
    total_units: row.units,
    distinct_unit_types: unitMix.length,
    planned_open_date: row.plannedOpenDate ?? '',
    rate_avg_retail_daily_rate: row.avgRetailDailyRate ?? '',
  };
}

function buildPipelineQuarterlyUnitMixExportRow(
  row: PipelineQuarterlyPropertyRow,
  line: PipelineQuarterlyUnitMixLine
): Record<PipelineQuarterlyUnitMixExportColumn, unknown> {
  return {
    property_name: row.propertyName,
    state: row.state ?? '',
    country: row.country ?? '',
    is_open: row.isOpenLabel,
    Brand: row.brandName ?? '',
    unit_type: line.unitType,
    units: line.units,
    rate_avg_retail_daily_rate: line.avgRetailDailyRate ?? '',
  };
}

export function getPipelineQuarterlyPropertyExportColumns(
  options: PipelineQuarterlyExportOptions = {}
): PipelineQuarterlyPropertyExportColumn[] {
  if (options.hidePlannedOpenDate) {
    return PIPELINE_QUARTERLY_PROPERTY_EXPORT_COLUMNS.filter(
      (column) => column !== 'planned_open_date'
    );
  }
  return [...PIPELINE_QUARTERLY_PROPERTY_EXPORT_COLUMNS];
}

export function getPipelineQuarterlyUnitMixExportColumns(): PipelineQuarterlyUnitMixExportColumn[] {
  return [...PIPELINE_QUARTERLY_UNIT_MIX_EXPORT_COLUMNS];
}

/** @deprecated Use getPipelineQuarterlyPropertyExportColumns */
export function getPipelineQuarterlyExportColumns(
  options: PipelineQuarterlyExportOptions = {}
): PipelineQuarterlyPropertyExportColumn[] {
  return getPipelineQuarterlyPropertyExportColumns(options);
}

export function pipelineQuarterlyPropertyRowsToExport(
  rows: readonly PipelineQuarterlyPropertyRow[],
  options: PipelineQuarterlyExportOptions = {}
): Record<string, unknown>[] {
  const columns = getPipelineQuarterlyPropertyExportColumns(options);
  return rows.map((row) =>
    pickColumns(buildPipelineQuarterlyPropertyExportRow(row), columns)
  );
}

export function pipelineQuarterlyUnitMixRowsToExport(
  rows: readonly PipelineQuarterlyPropertyRow[]
): Record<string, unknown>[] {
  const columns = getPipelineQuarterlyUnitMixExportColumns();
  const exported: Record<string, unknown>[] = [];

  for (const row of rows) {
    for (const line of unitMixLinesForProperty(row)) {
      exported.push(pickColumns(buildPipelineQuarterlyUnitMixExportRow(row, line), columns));
    }
  }

  return exported;
}

export function buildPipelineQuarterlyExportBundle(
  rows: readonly PipelineQuarterlyPropertyRow[],
  options: PipelineQuarterlyExportOptions = {}
): PipelineQuarterlyExportBundle {
  return {
    properties: pipelineQuarterlyPropertyRowsToExport(rows, options),
    unitMix: pipelineQuarterlyUnitMixRowsToExport(rows),
    propertyColumns: getPipelineQuarterlyPropertyExportColumns(options),
    unitMixColumns: getPipelineQuarterlyUnitMixExportColumns(),
  };
}

/** @deprecated Use pipelineQuarterlyPropertyRowsToExport */
export function pipelineQuarterlyRowsToExport(
  rows: readonly PipelineQuarterlyPropertyRow[],
  options: PipelineQuarterlyExportOptions = {}
): Record<string, unknown>[] {
  return pipelineQuarterlyPropertyRowsToExport(rows, options);
}
