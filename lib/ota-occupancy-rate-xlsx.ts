import { homedir } from 'os';
import { mkdirSync } from 'fs';
import { resolve } from 'path';
import ExcelJS, { type Cvfo } from 'exceljs';
import {
  OTA_MONTHLY_EXPORT_COLUMNS,
  type OtaMonthlyExportRow,
  type OtaMonthlySource,
} from '@/lib/ota-monthly-radius-export';

export const OCCUPANCY_COLOR_SCALE = {
  low: 'FFCC4125',
  mid: 'FFFFFFFF',
  high: 'FF6AA84F',
} as const;

export type HeatmapMetric = 'occupancy' | 'rate';
export type HeatmapSource = OtaMonthlySource | 'all';
export type HeatmapSheetOrder = 'occupancy-first' | 'rate-first';

export type OccupancyHeatmapRow = Pick<
  OtaMonthlyExportRow,
  | 'property_name'
  | 'year'
  | 'month'
  | 'avg_occupancy_rate_pct'
  | 'median_retail_daily_rate'
  | 'distance_miles'
>;

export const HEATMAP_MONTH_ABBR = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;

export function heatmapMonthHeader(month: number): string {
  const label = HEATMAP_MONTH_ABBR[month - 1];
  if (!label) throw new Error(`Invalid heatmap month: ${month}`);
  return label;
}

export const HEATMAP_DISTANCE_HEADER = 'distance_in_miles';

export type OccupancyRateXlsxNotes = Array<{ field: string; value: string }>;

export type OccupancyRateXlsxInput = {
  years: number[];
  monthlyRows: OtaMonthlyExportRow[];
  heatmapSource: HeatmapSource;
  notes: OccupancyRateXlsxNotes;
  fileStem: string;
};

type PivotGrid = {
  names: string[];
  months: number[];
  values: Map<string, Map<number, number>>;
};

export type HeatmapUniverse = 'comp' | 'market';

export function occupancyRateHeatmapSheetName(
  metric: HeatmapMetric,
  year: number,
  universe: HeatmapUniverse = 'market',
): string {
  let prefix: string;
  switch (universe) {
    case 'comp':
      prefix = 'Comp';
      break;
    case 'market':
      prefix = 'Market';
      break;
    default: {
      const exhaustive: never = universe;
      throw new Error(`Unsupported heatmap universe: ${String(exhaustive)}`);
    }
  }
  switch (metric) {
    case 'occupancy':
      return `${prefix} Occupancy ${year}`.slice(0, 31);
    case 'rate':
      return `${prefix} Rate ${year}`.slice(0, 31);
    default: {
      const exhaustive: never = metric;
      throw new Error(`Unsupported heatmap metric: ${String(exhaustive)}`);
    }
  }
}

export function occupancyRateHeatmapSpecs(
  years: number[],
  order: HeatmapSheetOrder = 'occupancy-first',
  universe: HeatmapUniverse = 'market',
): Array<{
  sheetName: string;
  year: number;
  metric: HeatmapMetric;
}> {
  const occupancy = years.map((year) => ({
    sheetName: occupancyRateHeatmapSheetName('occupancy', year, universe),
    year,
    metric: 'occupancy' as const,
  }));
  const rate = years.map((year) => ({
    sheetName: occupancyRateHeatmapSheetName('rate', year, universe),
    year,
    metric: 'rate' as const,
  }));
  switch (order) {
    case 'occupancy-first':
      return [...occupancy, ...rate];
    case 'rate-first':
      return [...rate, ...occupancy];
    default: {
      const exhaustive: never = order;
      throw new Error(`Unsupported heatmap order: ${String(exhaustive)}`);
    }
  }
}

function colLetter(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function toNumber(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function rowsForHeatmap(
  rows: OtaMonthlyExportRow[],
  heatmapSource: HeatmapSource,
): OtaMonthlyExportRow[] {
  if (heatmapSource === 'all') return rows;
  return rows.filter((row) => row.source === heatmapSource);
}

function pivotMetric(
  rows: OccupancyHeatmapRow[],
  year: number,
  metric: HeatmapMetric,
): PivotGrid {
  const byName = new Map<string, Map<number, number[]>>();
  const monthsPresent = new Set<number>();
  for (const row of rows) {
    if (Number(row.year) !== year) continue;
    const month = Number(row.month);
    if (!Number.isFinite(month)) continue;
    const value =
      metric === 'occupancy'
        ? toNumber(row.avg_occupancy_rate_pct)
        : toNumber(row.median_retail_daily_rate);
    if (value == null) continue;
    monthsPresent.add(month);
    let byMonth = byName.get(row.property_name);
    if (!byMonth) {
      byMonth = new Map();
      byName.set(row.property_name, byMonth);
    }
    const existing = byMonth.get(month) ?? [];
    existing.push(value);
    byMonth.set(month, existing);
  }

  const months = [...monthsPresent].sort((a, b) => a - b);
  const names = [...byName.keys()].sort((a, b) => a.localeCompare(b));
  const values = new Map<string, Map<number, number>>();
  for (const name of names) {
    const averaged = new Map<number, number>();
    const byMonth = byName.get(name)!;
    for (const month of months) {
      const m = mean(byMonth.get(month) ?? []);
      if (m != null) averaged.set(month, m);
    }
    values.set(name, averaged);
  }
  return { names, months, values };
}

export function addColorScale(
  ws: ExcelJS.Worksheet,
  ref: string,
  metric: HeatmapMetric,
  priority = 1,
) {
  let cfvo: Cvfo[];
  switch (metric) {
    case 'occupancy':
      cfvo = [
        { type: 'formula', value: 0 },
        { type: 'percentile', value: 50 },
        { type: 'formula', value: 100 },
      ];
      break;
    case 'rate':
      cfvo = [
        { type: 'min' },
        { type: 'percentile', value: 50 },
        { type: 'max' },
      ];
      break;
    default: {
      const exhaustive: never = metric;
      throw new Error(`Unsupported heatmap metric: ${String(exhaustive)}`);
    }
  }
  ws.addConditionalFormatting({
    ref,
    rules: [
      {
        type: 'colorScale',
        priority,
        cfvo,
        color: [
          { argb: OCCUPANCY_COLOR_SCALE.low },
          { argb: OCCUPANCY_COLOR_SCALE.mid },
          { argb: OCCUPANCY_COLOR_SCALE.high },
        ],
      },
    ],
  });
}

function distanceMilesByName(rows: OccupancyHeatmapRow[]): Map<string, number> {
  const distances = new Map<string, number>();
  for (const row of rows) {
    if (distances.has(row.property_name)) continue;
    const miles = toNumber(row.distance_miles);
    if (miles != null) distances.set(row.property_name, miles);
  }
  return distances;
}

function addHeatmapSheet(
  wb: ExcelJS.Workbook,
  rows: OccupancyHeatmapRow[],
  year: number,
  metric: HeatmapMetric,
  universe: HeatmapUniverse,
) {
  const grid = pivotMetric(rows, year, metric);
  const distances = distanceMilesByName(rows);
  const sheetName = occupancyRateHeatmapSheetName(metric, year, universe);
  const ws = wb.addWorksheet(sheetName);
  ws.views = [{ showGridLines: false, state: 'frozen', ySplit: 2, xSplit: 2 }];
  ws.properties.defaultColWidth = 12.63;
  ws.getColumn(1).width = 28.75;
  ws.getColumn(2).width = 18;

  const title =
    metric === 'occupancy'
      ? 'AVERAGE of avg_occupancy_rate_pct'
      : 'AVERAGE of median_retail_daily_rate';
  ws.getCell('A1').value = title;
  ws.getCell('C1').value = 'month';
  ws.getCell('A2').value = 'property_name';
  ws.getCell('B2').value = HEATMAP_DISTANCE_HEADER;
  if (grid.months.length === 0) {
    ws.getCell('A3').value = 'No monthly data for this year after filters.';
    return;
  }
  grid.months.forEach((month, idx) => {
    ws.getCell(2, idx + 3).value = heatmapMonthHeader(month);
  });

  grid.names.forEach((name, rowIdx) => {
    const excelRow = rowIdx + 3;
    ws.getCell(excelRow, 1).value = name;
    const miles = distances.get(name);
    if (miles != null) {
      const distanceCell = ws.getCell(excelRow, 2);
      distanceCell.value = miles;
      distanceCell.numFmt = '0.0';
    }
    const byMonth = grid.values.get(name)!;
    grid.months.forEach((month, monthIdx) => {
      const value = byMonth.get(month);
      if (value == null) return;
      const cell = ws.getCell(excelRow, monthIdx + 3);
      cell.value = value;
      cell.numFmt = metric === 'rate' ? '$#,##0.00' : '0.00';
    });
  });

  const totalRow = grid.names.length + 3;
  ws.getCell(totalRow, 1).value = 'Grand Total';
  ws.getCell(totalRow, 1).font = { bold: true };
  grid.months.forEach((month, monthIdx) => {
    const colValues: number[] = [];
    for (const name of grid.names) {
      const v = grid.values.get(name)?.get(month);
      if (v != null) colValues.push(v);
    }
    const avg = mean(colValues);
    if (avg == null) return;
    const cell = ws.getCell(totalRow, monthIdx + 3);
    cell.value = avg;
    cell.font = { bold: true };
    cell.numFmt = metric === 'rate' ? '$#,##0.00' : '0.00';
  });

  const lastColLetter = grid.months.length >= 12 ? 'Z' : colLetter(2 + grid.months.length);
  addColorScale(ws, `C3:${lastColLetter}1000`, metric);
}

export function removeOccupancyRateHeatmapSheets(
  wb: ExcelJS.Workbook,
  years: number[],
): void {
  const names = new Set([
    ...occupancyRateHeatmapSpecs(years, 'rate-first', 'market').map((spec) => spec.sheetName),
    ...occupancyRateHeatmapSpecs(years, 'rate-first', 'comp').map((spec) => spec.sheetName),
    ...years.flatMap((year) => [`Rate ${year}`, `Occupancy ${year}`]),
  ]);
  for (const ws of [...wb.worksheets]) {
    if (names.has(ws.name)) wb.removeWorksheet(ws.id);
  }
}

export function addOccupancyRateHeatmapSheets(
  wb: ExcelJS.Workbook,
  rows: OccupancyHeatmapRow[],
  years: number[],
  options?: { order?: HeatmapSheetOrder; universe?: HeatmapUniverse },
): void {
  const order = options?.order ?? 'occupancy-first';
  const universe = options?.universe ?? 'market';
  for (const spec of occupancyRateHeatmapSpecs(years, order, universe)) {
    addHeatmapSheet(wb, rows, spec.year, spec.metric, universe);
  }
}

function addMonthlySheet(wb: ExcelJS.Workbook, name: string, rows: OtaMonthlyExportRow[]) {
  const ws = wb.addWorksheet(name.slice(0, 31));
  const columns = [...OTA_MONTHLY_EXPORT_COLUMNS];
  ws.addRow(columns);
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { wrapText: true, vertical: 'middle' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  };
  for (const row of rows) {
    ws.addRow(
      columns.map((col) => {
        const raw = row[col];
        if (raw == null || raw === '') return '';
        const numeric = Number(raw);
        return Number.isFinite(numeric) && raw.trim() !== '' && /^-?\d/.test(raw) ? numeric : raw;
      }),
    );
  }
  columns.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = Math.min(36, Math.max(12, col.length + 2));
  });
}

function addNotesSheet(wb: ExcelJS.Workbook, notes: OccupancyRateXlsxNotes) {
  const ws = wb.addWorksheet('Notes');
  ws.addRow(['field', 'value']);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  for (const note of notes) ws.addRow([note.field, note.value]);
  ws.getColumn(1).width = 32;
  ws.getColumn(2).width = 90;
}

export function occupancyXlsxFileName(fileStem: string): string {
  return `${fileStem} Occupancy.xlsx`;
}

export function occupancyXlsxPaths(fileStem: string): { downloads: string; reports: string } {
  const fileName = occupancyXlsxFileName(fileStem);
  return {
    downloads: resolve(homedir(), 'Downloads', fileName),
    reports: resolve(process.cwd(), 'reports', fileName),
  };
}

export async function writeOccupancyRateXlsx(input: OccupancyRateXlsxInput): Promise<{
  downloads: string;
  reports: string;
}> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sage Outdoor Advisory';
  wb.created = new Date();

  const monthlyName = `${input.fileStem}-monthly`.slice(0, 31);
  addMonthlySheet(wb, monthlyName, input.monthlyRows);

  const heatmapRows = rowsForHeatmap(input.monthlyRows, input.heatmapSource);
  addOccupancyRateHeatmapSheets(wb, heatmapRows, input.years, {
    order: 'occupancy-first',
  });
  addNotesSheet(wb, input.notes);

  const paths = occupancyXlsxPaths(input.fileStem);
  mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true });
  await wb.xlsx.writeFile(paths.downloads);
  await wb.xlsx.writeFile(paths.reports);
  return paths;
}
