import { copyFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { resolve } from 'path';
import ExcelJS from 'exceljs';
import { isOtaPlaceholderRate } from '@/lib/ota-placeholder-rates';
import {
  isDestinationParkName,
  isSparseCoverageParkName,
  primarySetHeatmapPriority,
} from '@/lib/ota-comps-set-rules';
import {
  addColorScale,
  addOccupancyRateHeatmapSheets,
  occupancyRateHeatmapSheetName,
  occupancyRateHeatmapSpecs,
  removeOccupancyRateHeatmapSheets,
  type HeatmapMetric,
  type OccupancyHeatmapRow,
} from '@/lib/ota-occupancy-rate-xlsx';

export const COMPS_MONTH_BY_MONTH_YEARS = [2025, 2026] as const;
export const COMPS_SITE_YEAR = 2025;
export const COMPS_YEARLY_YEARS = [2023, 2024, 2025] as const;
export const COMPS_OPEN_MONTH_NUMS = [3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
/** Named competitive set — property-month occupancy, ADR, RevPAR (calendar years). */
export const COMPS_FOCUSED_PROPERTIES_SHEET = 'Comp Set Monthly';
export const COMPS_DESTINATION_SHEET = 'Destination Parks';
export const COMPS_BELL_TENT_SHEET = 'Bell Tent Comps';
export const MARKET_AVERAGE_MIN_OPEN_MONTHS = 6;
export const MARKET_AVERAGE_LABEL = 'MARKET AVERAGE (unweighted, ≥6 open mo)';
/** Named competitive set — site-level 2025 wide month columns. */
export const COMPS_FOCUSED_SITES_SHEET = 'Comp Set Sites 2025';
/** March–November unweighted season averages (not a rolling TTM). */
export const COMPS_SEASON_SUMMARY_SHEET = 'Season Summary Mar-Nov';
const EXCEL_SHEET_NAME_MAX = 31;
const LEGACY_FOCUSED_PROPERTIES_SHEETS = [
  'Properties',
  'Monthly Occupancy & Rates',
] as const;
const LEGACY_FOCUSED_SITES_SHEET = 'Sites';
const LEGACY_SEASON_SUMMARY_SHEET = '9-Month Trailing Summary';
const LEGACY_SEASON_PROPERTIES_SHEET = '9-Month Season Properties';
const LEGACY_YEARLY_RATES_SHEET = 'Rates 2023-2025';
const MIN_SITES_FOR_LOW_OCC_MONTH = 5;

export const COMPS_MONTHS = [
  { num: '1', name: 'january', display: 'January' },
  { num: '2', name: 'february', display: 'February' },
  { num: '3', name: 'march', display: 'March' },
  { num: '4', name: 'april', display: 'April' },
  { num: '5', name: 'may', display: 'May' },
  { num: '6', name: 'june', display: 'June' },
  { num: '7', name: 'july', display: 'July' },
  { num: '8', name: 'august', display: 'August' },
  { num: '9', name: 'september', display: 'September' },
  { num: '10', name: 'october', display: 'October' },
  { num: '11', name: 'november', display: 'November' },
  { num: '12', name: 'december', display: 'December' },
] as const;

export const COMPS_PROPERTY_COLUMNS = [
  'comp_set',
  'property_name',
  'property_url',
  'city',
  'state',
  'distance_miles',
  'year',
  'month',
  'month_name',
  'median_retail_daily_rate',
  'mean_retail_daily_rate',
  'avg_occupancy_rate_pct',
  'revpar',
  'min_price',
  'max_price',
  'site_count',
  'high_month',
  'low_month',
] as const;

export const FOCUSED_COLOR_SCALE_COLUMNS = [
  'median_retail_daily_rate',
  'mean_retail_daily_rate',
  'avg_occupancy_rate_pct',
] as const;

export const COMPS_SITE_COLUMNS = [
  'comp_set',
  'property_name',
  'site_url',
  'city',
  'state',
  'site_id',
  'unit_type',
  'site_name',
  'amenity_private_bathroom',
  'amenity_water',
  'amenity_sewer',
  'amenity_full_hookup',
  'amenity_50amp',
  'amenity_30amp',
  'amenity_20amp',
  'amenity_pull_through',
  'amenity_back_in',
  ...COMPS_MONTHS.flatMap((m) => [`rate_${m.name}`, `occupancy_${m.name}`] as const),
  'avg_occupancy',
  'avg_rate',
  'high_month_rate',
  'low_month_rate',
  'high_month_rate_name',
  'low_month_rate_name',
  'high_occupancy_rate',
  'low_occupancy_rate',
  'high_month_occupancy_name',
  'low_month_occupancy_name',
] as const;

export const COMPS_YEARLY_COLUMNS = [
  'property_name',
  'unit_type',
  'rate_2023',
  'rate_2024',
  'rate_2025',
  'rate_rolling_yoy',
  'occupancy_2023',
  'occupancy_2024',
  'occupancy_2025',
  'occupancy_rolling_yoy',
] as const;

export const COMPS_TRAILING_COLUMNS = [
  'comp_set',
  'property_name',
  'year',
  'property_url',
  'city',
  'state',
  'distance_miles',
  'site_count',
  'season_avg_occupancy',
  'season_median_rate',
  'season_mean_rate',
  'season_revpar',
  'high_month',
  'low_month',
  'open_months_with_occ_above_5',
] as const;

export type CompsPropertyRow = Record<(typeof COMPS_PROPERTY_COLUMNS)[number], string>;
export type CompsSiteRow = Record<string, string>;
export type CompsYearlyRow = Record<(typeof COMPS_YEARLY_COLUMNS)[number], string>;
export type CompsTrailingRow = Record<(typeof COMPS_TRAILING_COLUMNS)[number], string>;

export type CompsPropertyQueryRow = {
  name: string;
  link: string;
  city: string;
  state: string;
  year: string;
  month: string;
  month_name: string;
  avg_occupancy_rate_pct: string;
  median_retail_daily_rate: string;
  mean_retail_daily_rate: string;
  revpar: string;
  min_price: string;
  max_price: string;
  site_count: string;
  sites_with_occ_above_5: string;
  high_month: string;
  low_month: string;
};

function excelSheetName(name: string): string {
  return name.slice(0, EXCEL_SHEET_NAME_MAX);
}

export function compsRangeSheetNames(radiusMiles: number): {
  properties: string;
  sites: string;
} {
  return {
    properties: excelSheetName(`Market Monthly ${radiusMiles}mi`),
    sites: excelSheetName(`Market Sites 2025 ${radiusMiles}mi`),
  };
}

export function compsLegacyRangeSheetNames(radiusMiles: number): {
  properties: string;
  sites: string;
} {
  return {
    properties: excelSheetName(`${radiusMiles} Mile Range Properties`),
    sites: excelSheetName(`${radiusMiles} Mile Range Sites`),
  };
}

export function compsMonthByMonthFileName(opts: {
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  includeRv?: boolean;
}): string {
  const loc = [opts.city?.trim(), opts.state?.trim(), opts.zip?.trim()]
    .filter((part): part is string => Boolean(part))
    .join(' ');
  const label = loc || 'Market';
  const rv = opts.includeRv ? ' RV' : '';
  return `Data — ${label}${rv} Comps — 2025 Month by Month.xlsx`;
}

export function compsWorkbookPaths(fileName: string): { downloads: string; reports: string } {
  return {
    downloads: resolve(homedir(), 'Downloads', fileName),
    reports: resolve(process.cwd(), 'reports', fileName),
  };
}

export function rollingYoy(end: string, start: string): string {
  const a = parseFloat(end);
  const b = parseFloat(start);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return '';
  return (a / b - 1).toFixed(3);
}

export function mapCompsPropertyRows(rows: CompsPropertyQueryRow[]): CompsPropertyRow[] {
  return rows.map((r) => {
    const occ = parseFloat(r.avg_occupancy_rate_pct ?? '0');
    const sitesAbove5 = parseInt(r.sites_with_occ_above_5 ?? '0', 10);
    const hasValidRates =
      !isOtaPlaceholderRate(r.median_retail_daily_rate) &&
      (r.median_retail_daily_rate ?? '').trim() !== '';
    const showRates = occ > 5 || (sitesAbove5 >= MIN_SITES_FOR_LOW_OCC_MONTH && hasValidRates);
    const median =
      showRates && !isOtaPlaceholderRate(r.median_retail_daily_rate)
        ? (r.median_retail_daily_rate ?? '')
        : '';
    const mean =
      showRates && !isOtaPlaceholderRate(r.mean_retail_daily_rate)
        ? (r.mean_retail_daily_rate ?? '')
        : '';
    const minPrice = showRates && !isOtaPlaceholderRate(r.min_price) ? (r.min_price ?? '') : '';
    const maxPrice = showRates && !isOtaPlaceholderRate(r.max_price) ? (r.max_price ?? '') : '';
    const medianNum = parseFloat(median);
    const revpar =
      median !== '' && Number.isFinite(occ) && Number.isFinite(medianNum)
        ? ((occ * medianNum) / 100).toFixed(2)
        : '';
    return {
      comp_set: '',
      property_name: r.name,
      property_url: r.link,
      city: r.city,
      state: r.state,
      distance_miles: '',
      year: String(parseInt(String(r.year), 10)),
      month: String(parseInt(String(r.month), 10)),
      month_name: r.month_name,
      median_retail_daily_rate: median,
      mean_retail_daily_rate: mean,
      avg_occupancy_rate_pct: r.avg_occupancy_rate_pct,
      revpar,
      min_price: minPrice,
      max_price: maxPrice,
      site_count: r.site_count,
      high_month: r.high_month || '',
      low_month: r.low_month || '',
    };
  });
}

export function computeCompsSiteHighLow(
  row: Record<string, string>,
  monthNums: readonly number[],
): Record<string, string> {
  const allowed = new Set(monthNums.map((n) => String(n)));
  const rateEntries: { val: number; month: string }[] = [];
  const occEntries: { val: number; month: string }[] = [];
  const occForMean: number[] = [];
  const rateForMean: number[] = [];
  for (const m of COMPS_MONTHS) {
    if (!allowed.has(m.num)) continue;
    const rate = row[`rate_${m.name}`];
    const occ = row[`occupancy_${m.name}`];
    if (rate?.trim() && !isOtaPlaceholderRate(rate)) {
      const n = parseFloat(rate);
      if (!Number.isNaN(n)) {
        rateEntries.push({ val: n, month: m.display });
        rateForMean.push(n);
      }
    }
    if (occ?.trim()) {
      const n = parseFloat(occ);
      if (!Number.isNaN(n) && n > 0) occEntries.push({ val: n, month: m.display });
      if (!Number.isNaN(n)) occForMean.push(n);
    }
  }
  const highRate = rateEntries.length ? rateEntries.reduce((a, b) => (a.val >= b.val ? a : b)) : null;
  const lowRate = rateEntries.length ? rateEntries.reduce((a, b) => (a.val <= b.val ? a : b)) : null;
  const highOcc = occEntries.length ? occEntries.reduce((a, b) => (a.val >= b.val ? a : b)) : null;
  const lowOcc = occEntries.length ? occEntries.reduce((a, b) => (a.val <= b.val ? a : b)) : null;
  return {
    avg_occupancy:
      occForMean.length > 0
        ? (occForMean.reduce((a, b) => a + b, 0) / occForMean.length).toFixed(2)
        : '',
    avg_rate:
      rateForMean.length > 0
        ? (rateForMean.reduce((a, b) => a + b, 0) / rateForMean.length).toFixed(2)
        : '',
    high_month_rate: highRate?.val.toString() ?? '',
    high_month_rate_name: highRate?.month ?? '',
    low_month_rate: lowRate?.val.toString() ?? '',
    low_month_rate_name: lowRate?.month ?? '',
    high_occupancy_rate: highOcc?.val.toString() ?? '',
    high_month_occupancy_name: highOcc?.month ?? '',
    low_occupancy_rate: lowOcc?.val.toString() ?? '',
    low_month_occupancy_name: lowOcc?.month ?? '',
  };
}

export function impliedRevpar(occupancyPct: string, medianRate: string): string {
  const occ = parseFloat(occupancyPct);
  const rate = parseFloat(medianRate);
  if (!Number.isFinite(occ) || !Number.isFinite(rate) || medianRate.trim() === '') return '';
  return ((occ * rate) / 100).toFixed(2);
}

export function stampCompSet(
  rows: CompsPropertyRow[],
  compSet: string,
  milesByName?: Map<string, string>,
): CompsPropertyRow[] {
  return rows.map((row) => ({
    ...row,
    comp_set: compSet,
    distance_miles: milesByName?.get(row.property_name) ?? row.distance_miles ?? '',
  }));
}

export function stampSiteCompSet(rows: CompsSiteRow[], compSet: string): CompsSiteRow[] {
  return rows.map((row) => ({ ...row, comp_set: compSet }));
}

export function sortCompsPropertyRowsByName(rows: CompsPropertyRow[]): CompsPropertyRow[] {
  return [...rows].sort((a, b) => {
    const name = a.property_name.localeCompare(b.property_name, undefined, { sensitivity: 'base' });
    if (name !== 0) return name;
    const year = a.year.localeCompare(b.year, undefined, { numeric: true });
    if (year !== 0) return year;
    return Number(a.month) - Number(b.month);
  });
}

export function dedupePrimaryHeatmapRows(rows: CompsPropertyRow[]): CompsPropertyRow[] {
  const best = new Map<string, CompsPropertyRow>();
  for (const row of rows) {
    const key = `${row.property_name}::${row.year}::${row.month}`;
    const current = best.get(key);
    if (!current) {
      best.set(key, row);
      continue;
    }
    if (primarySetHeatmapPriority(row.comp_set) < primarySetHeatmapPriority(current.comp_set)) {
      best.set(key, row);
    }
  }
  return [...best.values()];
}

export function excludeFromMarketAverage(row: CompsTrailingRow): boolean {
  const openMonths = parseInt(row.open_months_with_occ_above_5, 10);
  if (!Number.isFinite(openMonths) || openMonths < MARKET_AVERAGE_MIN_OPEN_MONTHS) return true;
  if (isSparseCoverageParkName(row.property_name)) return true;
  if (isDestinationParkName(row.property_name)) return true;
  return false;
}

export function seasonPropertyRows(rows: CompsPropertyRow[]): CompsPropertyRow[] {
  const seasonMonths = new Set(COMPS_OPEN_MONTH_NUMS.map(String));
  return rows.filter((r) => seasonMonths.has(r.month));
}

export function trailingFromMonthly(
  rows: CompsPropertyRow[],
  compSet: string,
  milesByName: Map<string, string>,
): CompsTrailingRow[] {
  const byPropYear = new Map<string, CompsPropertyRow[]>();
  for (const row of rows) {
    const key = `${row.property_name}::${row.year}`;
    const list = byPropYear.get(key) ?? [];
    list.push(row);
    byPropYear.set(key, list);
  }
  const out: CompsTrailingRow[] = [];
  for (const [, list] of [...byPropYear.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const occMonths = list.filter((r) => parseFloat(r.avg_occupancy_rate_pct) > 5);
    const occs = occMonths
      .map((r) => parseFloat(r.avg_occupancy_rate_pct))
      .filter((n) => Number.isFinite(n));
    const rates = occMonths
      .map((r) => parseFloat(r.median_retail_daily_rate))
      .filter((n) => Number.isFinite(n) && n > 0);
    const revpars = occMonths
      .map((r) => impliedRevpar(r.avg_occupancy_rate_pct, r.median_retail_daily_rate))
      .map((value) => parseFloat(value))
      .filter((n) => Number.isFinite(n));
    const high = occMonths.reduce<CompsPropertyRow | null>((best, r) => {
      if (!best) return r;
      return parseFloat(r.avg_occupancy_rate_pct) > parseFloat(best.avg_occupancy_rate_pct) ? r : best;
    }, null);
    const low = occMonths.reduce<CompsPropertyRow | null>((best, r) => {
      if (!best) return r;
      return parseFloat(r.avg_occupancy_rate_pct) < parseFloat(best.avg_occupancy_rate_pct) ? r : best;
    }, null);
    const sample = list[0]!;
    const medianRate =
      rates.length === 0
        ? ''
        : [...rates].sort((a, b) => a - b)[Math.floor((rates.length - 1) / 2)]!.toFixed(2);
    out.push({
      comp_set: compSet,
      property_name: sample.property_name,
      year: sample.year,
      property_url: sample.property_url,
      city: sample.city,
      state: sample.state,
      distance_miles: milesByName.get(sample.property_name) ?? sample.distance_miles ?? '',
      site_count: sample.site_count,
      season_avg_occupancy:
        occs.length > 0 ? (occs.reduce((a, b) => a + b, 0) / occs.length).toFixed(2) : '',
      season_median_rate: medianRate,
      season_mean_rate:
        rates.length > 0 ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2) : '',
      season_revpar:
        revpars.length > 0 ? (revpars.reduce((a, b) => a + b, 0) / revpars.length).toFixed(2) : '',
      high_month: high?.month_name ?? '',
      low_month: low?.month_name ?? '',
      open_months_with_occ_above_5: String(occMonths.length),
    });
  }
  return out;
}

export function marketAverageTrailingRow(
  label: string,
  rows: CompsTrailingRow[],
  year: string,
  marketCity: string,
  marketState: string,
): CompsTrailingRow | null {
  const yearRows = rows.filter((r) => r.year === year && !excludeFromMarketAverage(r));
  if (yearRows.length === 0) return null;
  const occs = yearRows.map((r) => parseFloat(r.season_avg_occupancy)).filter((n) => Number.isFinite(n));
  const rates = yearRows.map((r) => parseFloat(r.season_median_rate)).filter((n) => Number.isFinite(n));
  const revpars = yearRows.map((r) => parseFloat(r.season_revpar)).filter((n) => Number.isFinite(n));
  return {
    comp_set: label,
    property_name: MARKET_AVERAGE_LABEL,
    year,
    property_url: '',
    city: marketCity,
    state: marketState,
    distance_miles: '',
    site_count: String(yearRows.length),
    season_avg_occupancy:
      occs.length > 0 ? (occs.reduce((a, b) => a + b, 0) / occs.length).toFixed(2) : '',
    season_median_rate:
      rates.length > 0
        ? [...rates].sort((a, b) => a - b)[Math.floor((rates.length - 1) / 2)]!.toFixed(2)
        : '',
    season_mean_rate:
      rates.length > 0 ? (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2) : '',
    season_revpar:
      revpars.length > 0 ? (revpars.reduce((a, b) => a + b, 0) / revpars.length).toFixed(2) : '',
    high_month: '',
    low_month: '',
    open_months_with_occ_above_5: String(MARKET_AVERAGE_MIN_OPEN_MONTHS),
  };
}

export type TrailingSetInput = {
  label: string;
  seasonRows: CompsPropertyRow[];
};

export function buildTrailingSummary(opts: {
  years: number[];
  sets: TrailingSetInput[];
  milesByName: Map<string, string>;
  marketCity: string;
  marketState: string;
}): CompsTrailingRow[] {
  const trailingBySet = opts.sets.map((set) => ({
    label: set.label,
    rows: trailingFromMonthly(set.seasonRows, set.label, opts.milesByName),
  }));
  const averages = opts.years.flatMap((year) => {
    const y = String(year);
    return trailingBySet
      .map((set) =>
        marketAverageTrailingRow(set.label, set.rows, y, opts.marketCity, opts.marketState),
      )
      .filter((row): row is CompsTrailingRow => row != null);
  });
  return [...averages, ...trailingBySet.flatMap((set) => set.rows)];
}

export function propertyRowsToHeatmapRows(
  rows: CompsPropertyRow[],
  milesByName?: Map<string, string>,
): OccupancyHeatmapRow[] {
  return rows.map((row) => ({
    property_name: row.property_name,
    year: row.year,
    month: row.month,
    avg_occupancy_rate_pct: row.avg_occupancy_rate_pct,
    median_retail_daily_rate: isOtaPlaceholderRate(row.median_retail_daily_rate)
      ? ''
      : row.median_retail_daily_rate,
    distance_miles: milesByName?.get(row.property_name) ?? row.distance_miles ?? '',
  }));
}

function compsNumericColumns(): Set<string> {
  return new Set([
    'year',
    'month',
    'site_id',
    'site_count',
    'median_retail_daily_rate',
    'mean_retail_daily_rate',
    'avg_occupancy_rate_pct',
    'revpar',
    'min_price',
    'max_price',
    'avg_occupancy',
    'avg_rate',
    'high_month_rate',
    'low_month_rate',
    'high_occupancy_rate',
    'low_occupancy_rate',
    'rate_2023',
    'rate_2024',
    'rate_2025',
    'rate_rolling_yoy',
    'occupancy_2023',
    'occupancy_2024',
    'occupancy_2025',
    'occupancy_rolling_yoy',
    'distance_miles',
    'season_avg_occupancy',
    'season_median_rate',
    'season_mean_rate',
    'season_revpar',
    'open_months_with_occ_above_5',
    ...COMPS_MONTHS.flatMap((m) => [`rate_${m.name}`, `occupancy_${m.name}`]),
  ]);
}

function toSheetCell(column: string, raw: string): string | number {
  if (raw == null || raw === '') return '';
  if (!compsNumericColumns().has(column)) return raw;
  const n = Number(raw);
  return Number.isFinite(n) ? n : raw;
}

function styleHeader(ws: ExcelJS.Worksheet, colCount: number) {
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { wrapText: true, vertical: 'middle' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: colCount },
  };
}

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: readonly string[],
  rows: Array<Record<string, string>>,
) {
  const ws = wb.addWorksheet(name.slice(0, 31));
  ws.addRow([...columns]);
  styleHeader(ws, columns.length);
  for (const row of rows) {
    ws.addRow(columns.map((c) => toSheetCell(c, row[c] ?? '')));
  }
  columns.forEach((col, idx) => {
    ws.getColumn(idx + 1).width = Math.min(36, Math.max(10, col.length + 2));
  });
}

export type CompsMonthByMonthWorkbookInput = {
  fileName: string;
  radiusMiles: number;
  years: number[];
  focusedProperties: CompsPropertyRow[];
  focusedSites?: CompsSiteRow[];
  rangeProperties: CompsPropertyRow[];
  rangeSites?: CompsSiteRow[];
  destinationProperties?: CompsPropertyRow[];
  bellTentRows?: Array<Record<string, string>>;
  bellTentColumns?: readonly string[];
  trailingSummary?: CompsTrailingRow[];
  milesByName: Map<string, string>;
  notes: Array<{ field: string; value: string }>;
};

export function compsSheetOrder(
  radiusMiles: number,
  years: number[] = [...COMPS_MONTH_BY_MONTH_YEARS],
): string[] {
  const range = compsRangeSheetNames(radiusMiles);
  return [
    COMPS_FOCUSED_PROPERTIES_SHEET,
    COMPS_DESTINATION_SHEET,
    ...occupancyRateHeatmapSpecs(years, 'rate-first', 'comp').map((spec) => spec.sheetName),
    ...occupancyRateHeatmapSpecs(years, 'rate-first', 'market').map((spec) => spec.sheetName),
    COMPS_BELL_TENT_SHEET,
    range.properties,
    'Notes',
  ];
}

type WorksheetWithOrder = ExcelJS.Worksheet & { orderNo: number };

function applyCompsSheetTabOrder(
  wb: ExcelJS.Workbook,
  radiusMiles: number,
  years: number[] = [...COMPS_MONTH_BY_MONTH_YEARS],
): void {
  const order = compsSheetOrder(radiusMiles, years);
  const indexByName = new Map(order.map((name, idx) => [name, idx + 1]));
  let extra = order.length + 1;
  for (const ws of wb.worksheets) {
    const named = ws as WorksheetWithOrder;
    const slot = indexByName.get(ws.name);
    named.orderNo = slot ?? extra++;
  }
}

function renameWorksheetIfFree(
  wb: ExcelJS.Workbook,
  ws: ExcelJS.Worksheet | undefined,
  nextName: string,
): void {
  if (!ws) return;
  const sliced = excelSheetName(nextName);
  if (ws.name === sliced) return;
  const existing = wb.getWorksheet(sliced);
  if (existing && existing !== ws) return;
  ws.name = sliced;
}

function firstWorksheetNamed(
  wb: ExcelJS.Workbook,
  names: readonly string[],
): ExcelJS.Worksheet | undefined {
  for (const name of names) {
    const ws = wb.getWorksheet(name);
    if (ws) return ws;
  }
  return undefined;
}

function renameLegacyHeatmapSheets(wb: ExcelJS.Workbook): void {
  for (const ws of [...wb.worksheets]) {
    const rate = /^Rate (\d{4})$/.exec(ws.name);
    if (rate) {
      renameWorksheetIfFree(
        wb,
        ws,
        occupancyRateHeatmapSheetName('rate', Number(rate[1])),
      );
      continue;
    }
    const occupancy = /^Occupancy (\d{4})$/.exec(ws.name);
    if (occupancy) {
      renameWorksheetIfFree(
        wb,
        ws,
        occupancyRateHeatmapSheetName('occupancy', Number(occupancy[1])),
      );
    }
  }
}

function remapCompsNotesText(raw: string, radiusMiles: number): string {
  const range = compsRangeSheetNames(radiusMiles);
  const legacy = compsLegacyRangeSheetNames(radiusMiles);
  let next = raw;
  next = next.replaceAll('Properties / 9-Month Season Properties', COMPS_FOCUSED_PROPERTIES_SHEET);
  next = next.replaceAll('Monthly Occupancy & Rates', COMPS_FOCUSED_PROPERTIES_SHEET);
  next = next.replaceAll(LEGACY_SEASON_SUMMARY_SHEET, COMPS_SEASON_SUMMARY_SHEET);
  next = next.replaceAll('9-Month Season Properties', COMPS_FOCUSED_PROPERTIES_SHEET);
  next = next.replaceAll(
    'Rate 2025/2026 and Occupancy 2025/2026',
    'Market Rate 2025/2026 and Market Occupancy 2025/2026',
  );
  next = next.replaceAll(legacy.properties, range.properties);
  next = next.replaceAll(legacy.sites, range.sites);
  return next;
}

function remapCompsNotesField(field: string, radiusMiles: number): string {
  if (
    field === 'Properties / 9-Month Season Properties' ||
    field === 'Monthly Occupancy & Rates' ||
    field === 'Properties'
  ) {
    return COMPS_FOCUSED_PROPERTIES_SHEET;
  }
  if (field === 'Sites sheets' || field === LEGACY_FOCUSED_SITES_SHEET) {
    return COMPS_FOCUSED_SITES_SHEET;
  }
  if (field === LEGACY_SEASON_SUMMARY_SHEET) {
    return COMPS_SEASON_SUMMARY_SHEET;
  }
  if (
    field === `${radiusMiles} Mile Range sheets` ||
    field === '100 Mile Range sheets'
  ) {
    return `Market sheets ${radiusMiles}mi`;
  }
  return field;
}

function removeWorksheetsNamed(wb: ExcelJS.Workbook, names: readonly string[]): void {
  for (const name of names) {
    const ws = wb.getWorksheet(excelSheetName(name));
    if (ws) wb.removeWorksheet(ws.id);
  }
}

export function applyCompsWorkbookLayout(
  wb: ExcelJS.Workbook,
  radiusMiles = 100,
): void {
  const season = wb.getWorksheet(LEGACY_SEASON_PROPERTIES_SHEET);
  if (season) wb.removeWorksheet(season.id);
  const yearly = wb.getWorksheet(LEGACY_YEARLY_RATES_SHEET);
  if (yearly) wb.removeWorksheet(yearly.id);

  const range = compsRangeSheetNames(radiusMiles);
  const legacyRange = compsLegacyRangeSheetNames(radiusMiles);
  renameWorksheetIfFree(
    wb,
    firstWorksheetNamed(wb, [
      ...LEGACY_FOCUSED_PROPERTIES_SHEETS,
      COMPS_FOCUSED_PROPERTIES_SHEET,
    ]),
    COMPS_FOCUSED_PROPERTIES_SHEET,
  );
  renameWorksheetIfFree(
    wb,
    firstWorksheetNamed(wb, [legacyRange.properties, range.properties]),
    range.properties,
  );
  renameLegacyHeatmapSheets(wb);
  removeWorksheetsNamed(wb, [
    LEGACY_FOCUSED_SITES_SHEET,
    COMPS_FOCUSED_SITES_SHEET,
    LEGACY_SEASON_SUMMARY_SHEET,
    COMPS_SEASON_SUMMARY_SHEET,
    legacyRange.sites,
    range.sites,
  ]);

  const focused = wb.getWorksheet(COMPS_FOCUSED_PROPERTIES_SHEET);
  if (focused) {
    sortFocusedMonthlyWorksheet(focused);
    applyFocusedMonthlyColorScales(focused);
  }

  const notes = wb.getWorksheet('Notes');
  if (notes) {
    notes.eachRow((row) => {
      const field = cellToString(row.getCell(1).value);
      const valueCell = row.getCell(2);
      const value = cellToString(valueCell.value);
      const nextField = remapCompsNotesField(field, radiusMiles);
      let nextValue = remapCompsNotesText(value, radiusMiles);
      if (field === 'Properties / 9-Month Season Properties') {
        nextValue = nextValue
          .replace(/\s*Season sheet is March[-–]November of each year\.?/i, '')
          .trim();
      }
      if (nextField !== field) row.getCell(1).value = nextField;
      if (nextValue !== value) valueCell.value = nextValue;
    });
    const dropNoteFields = new Set([
      COMPS_FOCUSED_SITES_SHEET,
      COMPS_SEASON_SUMMARY_SHEET,
      LEGACY_FOCUSED_SITES_SHEET,
      LEGACY_SEASON_SUMMARY_SHEET,
      'Sites sheets',
    ]);
    const dropRows: number[] = [];
    notes.eachRow((row, n) => {
      if (n === 1) return;
      if (dropNoteFields.has(cellToString(row.getCell(1).value))) dropRows.push(n);
    });
    for (const n of dropRows.reverse()) notes.spliceRows(n, 1);
  }

  applyCompsSheetTabOrder(wb, radiusMiles);
}

function cellToString(raw: ExcelJS.CellValue): string {
  if (raw == null || raw === '') return '';
  if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
  if (typeof raw === 'string') return raw.trim();
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === 'object' && 'result' in raw && raw.result != null) {
    return cellToString(raw.result as ExcelJS.CellValue);
  }
  if (typeof raw === 'object' && 'text' in raw && typeof raw.text === 'string') {
    return raw.text.trim();
  }
  return String(raw).trim();
}

export function sortFocusedMonthlyWorksheet(ws: ExcelJS.Worksheet): void {
  const header = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => {
    const key = cellToString(cell.value);
    if (key) header.set(key, col);
  });
  const nameCol = header.get('property_name');
  if (nameCol == null) return;
  const yearCol = header.get('year');
  const monthCol = header.get('month');
  const colCount = Math.max(ws.columnCount, COMPS_PROPERTY_COLUMNS.length);
  const data: ExcelJS.CellValue[][] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const values: ExcelJS.CellValue[] = [];
    for (let col = 1; col <= colCount; col++) values.push(row.getCell(col).value);
    data.push(values);
  });
  data.sort((a, b) => {
    const name = cellToString(a[nameCol - 1]).localeCompare(
      cellToString(b[nameCol - 1]),
      undefined,
      { sensitivity: 'base' },
    );
    if (name !== 0) return name;
    if (yearCol != null) {
      const year = cellToString(a[yearCol - 1]).localeCompare(
        cellToString(b[yearCol - 1]),
        undefined,
        { numeric: true },
      );
      if (year !== 0) return year;
    }
    if (monthCol == null) return 0;
    return Number(cellToString(a[monthCol - 1])) - Number(cellToString(b[monthCol - 1]));
  });
  data.forEach((values, idx) => {
    const row = ws.getRow(idx + 2);
    values.forEach((value, colIdx) => {
      row.getCell(colIdx + 1).value = value;
    });
  });
}

function excelColumnLetter(n: number): string {
  let s = '';
  let x = n;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

function colorScaleMetricForColumn(
  column: (typeof FOCUSED_COLOR_SCALE_COLUMNS)[number],
): HeatmapMetric {
  switch (column) {
    case 'median_retail_daily_rate':
    case 'mean_retail_daily_rate':
      return 'rate';
    case 'avg_occupancy_rate_pct':
      return 'occupancy';
    default: {
      const exhaustive: never = column;
      throw new Error(`Unsupported color-scale column: ${String(exhaustive)}`);
    }
  }
}

export function applyFocusedMonthlyColorScales(ws: ExcelJS.Worksheet): void {
  const header = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => {
    const key = cellToString(cell.value);
    if (key) header.set(key, col);
  });
  const refs: string[] = [];
  for (const column of FOCUSED_COLOR_SCALE_COLUMNS) {
    const col = header.get(column);
    if (col == null) {
      throw new Error(`Sheet "${ws.name}" is missing column ${column}`);
    }
    const letter = excelColumnLetter(col);
    refs.push(`${letter}2:${letter}1000`);
  }
  ws.removeConditionalFormatting((cf: { ref?: string }) => !refs.includes(cf.ref ?? ''));
  FOCUSED_COLOR_SCALE_COLUMNS.forEach((column, idx) => {
    addColorScale(
      ws,
      refs[idx]!,
      colorScaleMetricForColumn(column),
      idx + 1,
    );
  });
}

export function heatmapRowsFromPropertyWorksheet(
  ws: ExcelJS.Worksheet,
  milesByName?: Map<string, string>,
): OccupancyHeatmapRow[] {
  const header = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => {
    const key = cellToString(cell.value).toLowerCase();
    if (key) header.set(key, col);
  });
  const required = [
    'property_name',
    'year',
    'month',
    'avg_occupancy_rate_pct',
    'median_retail_daily_rate',
  ] as const;
  for (const col of required) {
    if (!header.has(col)) {
      throw new Error(`Sheet "${ws.name}" is missing column ${col}`);
    }
  }

  const labeled: CompsPropertyRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const propertyName = cellToString(row.getCell(header.get('property_name')!).value);
    const year = cellToString(row.getCell(header.get('year')!).value);
    const month = cellToString(row.getCell(header.get('month')!).value);
    if (!propertyName || !year || !month) return;
    const rateRaw = cellToString(row.getCell(header.get('median_retail_daily_rate')!).value);
    const sheetDistance = header.has('distance_miles')
      ? cellToString(row.getCell(header.get('distance_miles')!).value)
      : '';
    labeled.push({
      comp_set: header.has('comp_set')
        ? cellToString(row.getCell(header.get('comp_set')!).value)
        : '',
      property_name: propertyName,
      property_url: '',
      city: '',
      state: '',
      distance_miles: milesByName?.get(propertyName) || sheetDistance,
      year,
      month,
      month_name: '',
      median_retail_daily_rate: isOtaPlaceholderRate(rateRaw) ? '' : rateRaw,
      mean_retail_daily_rate: '',
      avg_occupancy_rate_pct: cellToString(
        row.getCell(header.get('avg_occupancy_rate_pct')!).value,
      ),
      revpar: '',
      min_price: '',
      max_price: '',
      site_count: '',
      high_month: '',
      low_month: '',
    });
  });
  const unique = header.has('comp_set') ? dedupePrimaryHeatmapRows(labeled) : labeled;
  return propertyRowsToHeatmapRows(unique, milesByName);
}

function cloneNotesRows(ws: ExcelJS.Worksheet): {
  rows: ExcelJS.CellValue[][];
  width1?: number;
  width2?: number;
} {
  const rows: ExcelJS.CellValue[][] = [];
  ws.eachRow((row) => {
    const values: ExcelJS.CellValue[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = cell.value;
    });
    rows.push(values);
  });
  return { rows, width1: ws.getColumn(1).width, width2: ws.getColumn(2).width };
}

export async function rebuildCompsHeatmapsInWorkbook(opts: {
  workbookPath: string;
  radiusMiles: number;
  years: number[];
  milesByName: Map<string, string>;
  outputPath?: string;
}): Promise<void> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(opts.workbookPath);
  applyCompsWorkbookLayout(wb, opts.radiusMiles);
  const range = compsRangeSheetNames(opts.radiusMiles);
  const legacyRange = compsLegacyRangeSheetNames(opts.radiusMiles);
  const marketSrc =
    wb.getWorksheet(range.properties) ?? wb.getWorksheet(legacyRange.properties);
  if (!marketSrc) {
    throw new Error(`Workbook is missing "${range.properties}"`);
  }
  const marketHeatmapRows = heatmapRowsFromPropertyWorksheet(marketSrc, opts.milesByName);
  if (marketHeatmapRows.length === 0) {
    throw new Error(`No property-month rows on ${range.properties}`);
  }
  const focusedSrc = wb.getWorksheet(COMPS_FOCUSED_PROPERTIES_SHEET);
  const compHeatmapRows = focusedSrc
    ? heatmapRowsFromPropertyWorksheet(focusedSrc, opts.milesByName)
    : marketHeatmapRows;
  const notes = wb.getWorksheet('Notes');
  const notesClone = notes ? cloneNotesRows(notes) : null;
  if (notes) wb.removeWorksheet(notes.id);
  removeOccupancyRateHeatmapSheets(wb, opts.years);
  addOccupancyRateHeatmapSheets(wb, compHeatmapRows, opts.years, {
    order: 'rate-first',
    universe: 'comp',
  });
  addOccupancyRateHeatmapSheets(wb, marketHeatmapRows, opts.years, {
    order: 'rate-first',
    universe: 'market',
  });
  if (notesClone) {
    const dest = wb.addWorksheet('Notes');
    for (const row of notesClone.rows) dest.addRow(row);
    dest.getRow(1).font = { bold: true };
    dest.views = [{ state: 'frozen', ySplit: 1 }];
    dest.getColumn(1).width = notesClone.width1 ?? 32;
    dest.getColumn(2).width = notesClone.width2 ?? 90;
  }
  applyCompsSheetTabOrder(wb, opts.radiusMiles, opts.years);
  await wb.xlsx.writeFile(opts.outputPath ?? opts.workbookPath);
}

export async function writeCompsMonthByMonthXlsx(
  input: CompsMonthByMonthWorkbookInput,
): Promise<{ downloads: string; reports: string }> {
  const range = compsRangeSheetNames(input.radiusMiles);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sage Outdoor Advisory';
  wb.created = new Date();

  addSheet(
    wb,
    COMPS_FOCUSED_PROPERTIES_SHEET,
    COMPS_PROPERTY_COLUMNS,
    sortCompsPropertyRowsByName(input.focusedProperties),
  );
  applyFocusedMonthlyColorScales(wb.getWorksheet(COMPS_FOCUSED_PROPERTIES_SHEET)!);
  if (input.destinationProperties !== undefined) {
    addSheet(wb, COMPS_DESTINATION_SHEET, COMPS_PROPERTY_COLUMNS, input.destinationProperties);
  }
  addOccupancyRateHeatmapSheets(
    wb,
    propertyRowsToHeatmapRows(
      dedupePrimaryHeatmapRows(input.focusedProperties),
      input.milesByName,
    ),
    input.years,
    { order: 'rate-first', universe: 'comp' },
  );
  addOccupancyRateHeatmapSheets(
    wb,
    propertyRowsToHeatmapRows(input.rangeProperties, input.milesByName),
    input.years,
    { order: 'rate-first', universe: 'market' },
  );
  if (input.bellTentRows !== undefined) {
    addSheet(
      wb,
      COMPS_BELL_TENT_SHEET,
      input.bellTentColumns ?? COMPS_PROPERTY_COLUMNS,
      input.bellTentRows,
    );
  }
  addSheet(wb, range.properties, COMPS_PROPERTY_COLUMNS, input.rangeProperties);

  const notes = wb.addWorksheet('Notes');
  notes.addRow(['field', 'value']);
  styleHeader(notes, 2);
  for (const row of input.notes) notes.addRow([row.field, row.value]);
  notes.getColumn(1).width = 32;
  notes.getColumn(2).width = 90;

  applyCompsSheetTabOrder(wb, input.radiusMiles, input.years);

  const paths = compsWorkbookPaths(input.fileName);
  mkdirSync(resolve(process.cwd(), 'reports'), { recursive: true });
  await wb.xlsx.writeFile(paths.reports);
  copyFileSync(paths.reports, paths.downloads);
  return paths;
}
