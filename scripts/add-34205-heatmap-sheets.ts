#!/usr/bin/env npx tsx
/**
 * Adds Rate 2025, Rate 2026, Occupancy 2025, Occupancy 2026 heatmap sheets
 * to the 34205-50mi Occupancy workbook. Layout and red→white→green color
 * scale match the existing Excel occupancy pivots. Sheets are injected via
 * JSZip so the live 2025/2026 pivot tables stay intact.
 *
 * Run: npx tsx scripts/add-34205-heatmap-sheets.ts
 */

import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

const SOURCE_XLSX = resolve('/Users/nickharsell/Downloads/34205-50mi Occupancy.xlsx');
const REPORTS_COPY = resolve(process.cwd(), 'reports/34205-50mi Occupancy.xlsx');

const OCC_COLORS = {
  low: 'FFCC4125',
  mid: 'FFFFFFFF',
  high: 'FF6AA84F',
} as const;

const KNOWN_PLACEHOLDER_RATES = new Set([1011.5, 1026.67, 705.06]);

type Metric = 'occupancy' | 'rate';

type LongRow = {
  source: string;
  propertyName: string;
  year: number;
  month: number;
  occupancy: number | null;
  rate: number | null;
};

type HeatmapSpec = {
  sheetName: string;
  year: number;
  metric: Metric;
};

const SHEETS: HeatmapSpec[] = [
  { sheetName: 'Rate 2025', year: 2025, metric: 'rate' },
  { sheetName: 'Rate 2026', year: 2026, metric: 'rate' },
  { sheetName: 'Occupancy 2025', year: 2025, metric: 'occupancy' },
  { sheetName: 'Occupancy 2026', year: 2026, metric: 'occupancy' },
];

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

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellValue(raw: ExcelJS.CellValue): string | number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (typeof raw === 'string') return raw;
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === 'object' && 'result' in raw) {
    const result = raw.result;
    if (typeof result === 'number' || typeof raw.result === 'string') return result as string | number;
  }
  if (typeof raw === 'object' && 'text' in raw && typeof raw.text === 'string') return raw.text;
  return String(raw);
}

function toNumber(raw: ExcelJS.CellValue): number | null {
  const v = cellValue(raw);
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

function toText(raw: ExcelJS.CellValue): string {
  const v = cellValue(raw);
  if (v == null) return '';
  return String(v).trim();
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function monthsWithData(rows: LongRow[], year: number, metric: Metric): number[] {
  const present = new Set<number>();
  for (const row of rows) {
    if (row.year !== year) continue;
    const value = metric === 'occupancy' ? row.occupancy : row.rate;
    if (value != null) present.add(row.month);
  }
  return [...present].sort((a, b) => a - b);
}

function pivotGrid(
  rows: LongRow[],
  year: number,
  metric: Metric,
  months: number[],
): { names: string[]; values: Map<string, Map<number, number>> } {
  const byName = new Map<string, Map<number, number[]>>();
  for (const row of rows) {
    if (row.year !== year) continue;
    const value = metric === 'occupancy' ? row.occupancy : row.rate;
    if (value == null) continue;
    let byMonth = byName.get(row.propertyName);
    if (!byMonth) {
      byMonth = new Map();
      byName.set(row.propertyName, byMonth);
    }
    const existing = byMonth.get(row.month) ?? [];
    existing.push(value);
    byMonth.set(row.month, existing);
  }

  const names = [...byName.keys()].sort((a, b) => a.localeCompare(b));
  const values = new Map<string, Map<number, number>>();
  for (const name of names) {
    const byMonth = byName.get(name)!;
    const averaged = new Map<number, number>();
    for (const month of months) {
      const m = mean(byMonth.get(month) ?? []);
      if (m != null) averaged.set(month, m);
    }
    values.set(name, averaged);
  }
  return { names, values };
}

function numberCell(ref: string, value: number): string {
  return `<c r="${ref}"><v>${value}</v></c>`;
}

function textCell(ref: string, value: string): string {
  const space = /^\s|\s$/.test(value) ? ' xml:space="preserve"' : '';
  return `<c r="${ref}" t="inlineStr"><is><t${space}>${xmlEscape(value)}</t></is></c>`;
}

function colorScaleXml(sqref: string, metric: Metric): string {
  const stops =
    metric === 'occupancy'
      ? `<cfvo type="formula" val="0"/><cfvo type="percentile" val="50"/><cfvo type="formula" val="100"/>`
      : `<cfvo type="min"/><cfvo type="percentile" val="50"/><cfvo type="max"/>`;
  return `<conditionalFormatting sqref="${xmlEscape(sqref)}"><cfRule type="colorScale" priority="1"><colorScale>${stops}<color rgb="${OCC_COLORS.low}"/><color rgb="${OCC_COLORS.mid}"/><color rgb="${OCC_COLORS.high}"/></colorScale></cfRule></conditionalFormatting>`;
}

function buildSheetXml(rows: LongRow[], spec: HeatmapSpec): string {
  const months = monthsWithData(rows, spec.year, spec.metric);
  if (months.length === 0) {
    throw new Error(`No ${spec.metric} values for ${spec.year}`);
  }
  const { names, values } = pivotGrid(rows, spec.year, spec.metric, months);
  const lastCol = 1 + months.length;
  const lastColLetter = colLetter(lastCol);
  const title =
    spec.metric === 'occupancy'
      ? 'AVERAGE of avg_occupancy_rate_pct'
      : 'AVERAGE of median_retail_daily_rate';

  const sheetRows: string[] = [];
  sheetRows.push(
    `<row r="1">${textCell('A1', title)}${textCell('B1', 'month')}</row>`,
  );

  const headerCells = [textCell('A2', 'property_name')];
  months.forEach((month, idx) => {
    headerCells.push(numberCell(colLetter(idx + 2) + '2', month));
  });
  sheetRows.push(`<row r="2">${headerCells.join('')}</row>`);

  names.forEach((name, idx) => {
    const excelRow = idx + 3;
    const cells = [textCell(`A${excelRow}`, name)];
    const byMonth = values.get(name)!;
    months.forEach((month, monthIdx) => {
      const value = byMonth.get(month);
      if (value == null) return;
      cells.push(numberCell(colLetter(monthIdx + 2) + String(excelRow), value));
    });
    sheetRows.push(`<row r="${excelRow}">${cells.join('')}</row>`);
  });

  const totalRow = names.length + 3;
  const totalCells = [textCell(`A${totalRow}`, 'Grand Total')];
  months.forEach((month, monthIdx) => {
    const colValues: number[] = [];
    for (const name of names) {
      const v = values.get(name)?.get(month);
      if (v != null) colValues.push(v);
    }
    const avg = mean(colValues);
    if (avg == null) return;
    totalCells.push(numberCell(colLetter(monthIdx + 2) + String(totalRow), avg));
  });
  sheetRows.push(`<row r="${totalRow}">${totalCells.join('')}</row>`);

  const sqref = months.length >= 12 ? 'A3:Z1000' : `A3:${lastColLetter}1000`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><outlinePr summaryBelow="0" summaryRight="0"/></sheetPr><sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews><sheetFormatPr customHeight="1" defaultColWidth="12.63" defaultRowHeight="15.75"/><cols><col customWidth="1" min="1" max="1" width="28.75"/></cols><sheetData>${sheetRows.join('')}</sheetData>${colorScaleXml(sqref, spec.metric)}</worksheet>`;
}

async function readLongRows(path: string): Promise<LongRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Workbook has no sheets');

  const header = new Map<string, number>();
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell, col) => {
    const key = toText(cell.value).toLowerCase();
    if (key) header.set(key, col);
  });

  const required = ['source', 'property_name', 'year', 'month', 'avg_occupancy_rate_pct', 'median_retail_daily_rate'];
  for (const col of required) {
    if (!header.has(col)) throw new Error(`Missing column ${col} on sheet 1`);
  }

  const rows: LongRow[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const source = toText(row.getCell(header.get('source')!).value).toLowerCase();
    if (source !== 'campspot') return;
    const propertyName = toText(row.getCell(header.get('property_name')!).value);
    const year = toNumber(row.getCell(header.get('year')!).value);
    const month = toNumber(row.getCell(header.get('month')!).value);
    if (!propertyName || year == null || month == null) return;
    const occupancy = toNumber(row.getCell(header.get('avg_occupancy_rate_pct')!).value);
    let rate = toNumber(row.getCell(header.get('median_retail_daily_rate')!).value);
    if (rate != null && KNOWN_PLACEHOLDER_RATES.has(rate)) rate = null;
    rows.push({ source, propertyName, year, month, occupancy, rate });
  });
  return rows;
}

function nextSheetId(workbookXml: string): number {
  const ids = [...workbookXml.matchAll(/sheetId="(\d+)"/g)].map((m) => Number(m[1]));
  return Math.max(0, ...ids) + 1;
}

function nextRelId(relsXml: string): number {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => Number(m[1]));
  return Math.max(0, ...ids) + 1;
}

function insertBefore(haystack: string, needle: string, insertion: string): string {
  const idx = haystack.lastIndexOf(needle);
  if (idx < 0) throw new Error(`Could not find ${needle}`);
  return haystack.slice(0, idx) + insertion + haystack.slice(idx);
}

async function main() {
  const longRows = await readLongRows(SOURCE_XLSX);
  if (longRows.length === 0) throw new Error('No Campspot rows found in the source sheet');

  const zip = await JSZip.loadAsync(readFileSync(SOURCE_XLSX));
  let workbookXml = await zip.file('xl/workbook.xml')!.async('string');
  let relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
  let contentTypes = await zip.file('[Content_Types].xml')!.async('string');

  let sheetId = nextSheetId(workbookXml);
  let relId = nextRelId(relsXml);
  let sheetFileNum = 4;

  const relTargetById = new Map(
    [...relsXml.matchAll(/Id="(rId\d+)"[^>]*Target="worksheets\/([^"]+)"/g)].map((m) => [m[1]!, m[2]!]),
  );
  const sheetRelByName = new Map(
    [...workbookXml.matchAll(/name="([^"]+)"[^>]*r:id="(rId\d+)"/g)].map((m) => [m[1]!, m[2]!]),
  );

  for (const spec of SHEETS) {
    const xml = buildSheetXml(longRows, spec);
    const existingRel = sheetRelByName.get(spec.sheetName);
    const existingFile = existingRel ? relTargetById.get(existingRel) : undefined;
    if (existingFile) {
      zip.file(`xl/worksheets/${existingFile}`, xml);
      continue;
    }
    const fileName = `sheet${sheetFileNum}.xml`;
    zip.file(`xl/worksheets/${fileName}`, xml);
    workbookXml = insertBefore(
      workbookXml,
      '</sheets>',
      `<sheet state="visible" name="${xmlEscape(spec.sheetName)}" sheetId="${sheetId}" r:id="rId${relId}"/>`,
    );
    relsXml = insertBefore(
      relsXml,
      '</Relationships>',
      `<Relationship Id="rId${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/${fileName}"/>`,
    );
    contentTypes = insertBefore(
      contentTypes,
      '</Types>',
      `<Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml" PartName="/xl/worksheets/${fileName}"/>`,
    );
    sheetId += 1;
    relId += 1;
    sheetFileNum += 1;
  }

  zip.file('xl/workbook.xml', workbookXml);
  zip.file('xl/_rels/workbook.xml.rels', relsXml);
  zip.file('[Content_Types].xml', contentTypes);
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name]!.dir) delete zip.files[name];
  }

  const out = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  writeFileSync(SOURCE_XLSX, out);
  copyFileSync(SOURCE_XLSX, REPORTS_COPY);

  const occ2025 = monthsWithData(longRows, 2025, 'occupancy');
  const occ2026 = monthsWithData(longRows, 2026, 'occupancy');
  const rate2025 = monthsWithData(longRows, 2025, 'rate');
  const rate2026 = monthsWithData(longRows, 2026, 'rate');
  console.log(`Wrote heatmaps into ${SOURCE_XLSX}`);
  console.log(`Copied ${REPORTS_COPY}`);
  console.log(
    `Campspot rows: ${longRows.length}; Occupancy 2025 months ${occ2025.join(',')}; Occupancy 2026 months ${occ2026.join(',')}; Rate 2025 months ${rate2025.join(',')}; Rate 2026 months ${rate2026.join(',')}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
