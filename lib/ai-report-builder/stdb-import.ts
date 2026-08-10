/**
 * Parse analyst-uploaded STDB / ESRI Business Analyst exports (CSV or XLSX)
 * and write values into the FS workbook ring sheet
 * `60 Min 120 Min 180 Min` (trailing space tolerated).
 *
 * Best-effort row map (Market Profile / ring sheet formula sources):
 *   Row 11  2010 Total Population
 *   Row 12  2020 Total Population
 *   Row 13  2020 Group Quarters
 *   Row 14  2025 Total Population
 *   Row 15  2025 Group Quarters
 *   Row 16  2030 Total Population
 *   Row 17  2025–2030 Annual Rate (population)
 *   Row 18  2025 Total Daytime Population
 *   Row 19  Workers
 *   Row 20  Residents
 *   Row 23  2010 Total Households
 *   Row 24  2010 Average Household Size
 *   Row 25  2020 Total Households
 *   Row 26  2020 Average Household Size
 *   Row 27  2025 Total Households
 *   Row 28  2025 Average Household Size
 *   Row 29  2030 Total Households
 *   Row 30  2030 Average Household Size
 *   Row 31  2025–2030 Annual Rate (households)
 *   Row 32  2025 Families
 *   Row 33  2025 Average Family Size
 *   Row 34  2030 Families
 *   Row 35  2030 Average Family Size
 *   Row 36  2025–2030 Growth Rate (families)
 *   Row 39  Median Household Income 2025
 *   Row 40  Median Household Income 2030
 *
 * Columns: B = 60 min, C = 120 min, D = 180 min.
 */

import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';

export type StdbRingMinutes = 60 | 120 | 180;

export interface StdbRingMetrics {
  minutes: StdbRingMinutes;
  population_2010: number | null;
  population_2020: number | null;
  group_quarters_2020: number | null;
  population_2025: number | null;
  group_quarters_2025: number | null;
  population_2030: number | null;
  population_annual_rate_2025_2030: number | null;
  daytime_population_2025: number | null;
  workers: number | null;
  residents: number | null;
  households_2010: number | null;
  avg_hh_size_2010: number | null;
  households_2020: number | null;
  avg_hh_size_2020: number | null;
  households_2025: number | null;
  avg_hh_size_2025: number | null;
  households_2030: number | null;
  avg_hh_size_2030: number | null;
  households_annual_rate_2025_2030: number | null;
  families_2025: number | null;
  avg_family_size_2025: number | null;
  families_2030: number | null;
  avg_family_size_2030: number | null;
  families_growth_rate_2025_2030: number | null;
  median_hh_income_2025: number | null;
  median_hh_income_2030: number | null;
}

export interface StdbParseResult {
  rings: StdbRingMetrics[];
  warnings: string[];
  rawRowCount: number;
}

type MetricKey = Exclude<keyof StdbRingMetrics, 'minutes'>;

/** Label patterns → metric key (order matters: more specific first). */
const LABEL_TO_METRIC: Array<{ pattern: RegExp; key: MetricKey }> = [
  { pattern: /2020\s+group\s+quarters/i, key: 'group_quarters_2020' },
  { pattern: /2025\s+group\s+quarters/i, key: 'group_quarters_2025' },
  { pattern: /2010\s+total\s+population/i, key: 'population_2010' },
  { pattern: /2020\s+total\s+population/i, key: 'population_2020' },
  { pattern: /2025\s+total\s+population(?!\s+daytime)/i, key: 'population_2025' },
  { pattern: /2030\s+total\s+population/i, key: 'population_2030' },
  { pattern: /2025\s+total\s+daytime\s+population/i, key: 'daytime_population_2025' },
  { pattern: /2025.?2030\s+annual\s+rate/i, key: 'population_annual_rate_2025_2030' },
  { pattern: /^workers$/i, key: 'workers' },
  { pattern: /^residents$/i, key: 'residents' },
  { pattern: /2010\s+total\s+households/i, key: 'households_2010' },
  { pattern: /2010\s+average\s+household\s+size/i, key: 'avg_hh_size_2010' },
  { pattern: /2020\s+total\s+households/i, key: 'households_2020' },
  { pattern: /2020\s+average\s+household\s+size/i, key: 'avg_hh_size_2020' },
  { pattern: /2025\s+total\s+households/i, key: 'households_2025' },
  { pattern: /2025\s+average\s+household\s+size/i, key: 'avg_hh_size_2025' },
  { pattern: /2030\s+total\s+households/i, key: 'households_2030' },
  { pattern: /2030\s+average\s+household\s+size/i, key: 'avg_hh_size_2030' },
  { pattern: /2025\s+families/i, key: 'families_2025' },
  { pattern: /2025\s+average\s+family\s+size/i, key: 'avg_family_size_2025' },
  { pattern: /2030\s+families/i, key: 'families_2030' },
  { pattern: /2030\s+average\s+family\s+size/i, key: 'avg_family_size_2030' },
  { pattern: /2025.?2030\s+growth\s+rate/i, key: 'families_growth_rate_2025_2030' },
  { pattern: /median\s+(household\s+)?income.*2025|^2025$/i, key: 'median_hh_income_2025' },
  { pattern: /median\s+(household\s+)?income.*2030|^2030$/i, key: 'median_hh_income_2030' },
  // Loose fallbacks
  { pattern: /\bpopulation\b.*\b2020\b|\b2020\b.*\bpopulation\b/i, key: 'population_2020' },
  { pattern: /\bpopulation\b.*\b2025\b|\b2025\b.*\bpopulation\b/i, key: 'population_2025' },
  { pattern: /\bhouseholds?\b.*\b2020\b|\b2020\b.*\bhouseholds?\b/i, key: 'households_2020' },
  { pattern: /\bhouseholds?\b.*\b2025\b|\b2025\b.*\bhouseholds?\b/i, key: 'households_2025' },
  { pattern: /median.*(income|hhi)/i, key: 'median_hh_income_2025' },
];

/**
 * Rows written into the ring sheet (documented above).
 * Second entry for household annual rate shares row 31 vs population rate at 17 —
 * STDB exports often use the same label twice; we write pop rate to 17 and hh rate
 * to 31 when both appear in order.
 */
const METRIC_TO_ROW: Partial<Record<MetricKey, number>> = {
  population_2010: 11,
  population_2020: 12,
  group_quarters_2020: 13,
  population_2025: 14,
  group_quarters_2025: 15,
  population_2030: 16,
  population_annual_rate_2025_2030: 17,
  daytime_population_2025: 18,
  workers: 19,
  residents: 20,
  households_2010: 23,
  avg_hh_size_2010: 24,
  households_2020: 25,
  avg_hh_size_2020: 26,
  households_2025: 27,
  avg_hh_size_2025: 28,
  households_2030: 29,
  avg_hh_size_2030: 30,
  households_annual_rate_2025_2030: 31,
  families_2025: 32,
  avg_family_size_2025: 33,
  families_2030: 34,
  avg_family_size_2030: 35,
  families_growth_rate_2025_2030: 36,
  median_hh_income_2025: 39,
  median_hh_income_2030: 40,
};

const RING_COL: Record<StdbRingMinutes, number> = {
  60: 2, // B
  120: 3, // C
  180: 4, // D
};

const RING_SHEET_CANDIDATES = ['60 Min 120 Min 180 Min', '60 Min 120 Min 180 Min '];

function emptyRing(minutes: StdbRingMinutes): StdbRingMetrics {
  return {
    minutes,
    population_2010: null,
    population_2020: null,
    group_quarters_2020: null,
    population_2025: null,
    group_quarters_2025: null,
    population_2030: null,
    population_annual_rate_2025_2030: null,
    daytime_population_2025: null,
    workers: null,
    residents: null,
    households_2010: null,
    avg_hh_size_2010: null,
    households_2020: null,
    avg_hh_size_2020: null,
    households_2025: null,
    avg_hh_size_2025: null,
    households_2030: null,
    avg_hh_size_2030: null,
    households_annual_rate_2025_2030: null,
    families_2025: null,
    avg_family_size_2025: null,
    families_2030: null,
    avg_family_size_2030: null,
    families_growth_rate_2025_2030: null,
    median_hh_income_2025: null,
    median_hh_income_2030: null,
  };
}

function cellToString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
    return String(v).trim();
  }
  if (typeof v === 'object' && v !== null && 'richText' in v) {
    const rt = (v as { richText?: Array<{ text?: string }> }).richText;
    return (rt ?? []).map((t) => t.text ?? '').join('').trim();
  }
  if (typeof v === 'object' && v !== null && 'text' in v) {
    return String((v as { text: unknown }).text ?? '').trim();
  }
  if (typeof v === 'object' && v !== null && 'result' in v) {
    return cellToString((v as { result: unknown }).result);
  }
  return String(v).trim();
}

function parseNumber(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  const s = cellToString(raw).replace(/[$,%\s]/g, '').replace(/,/g, '');
  if (!s || s === '-' || s === 'n/a' || s === 'na') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function detectRingMinutes(header: string): StdbRingMinutes | null {
  const h = header.toLowerCase().replace(/\s+/g, ' ');
  if (/\b60\b/.test(h) && /min/.test(h)) return 60;
  if (/\b120\b/.test(h) && /min/.test(h)) return 120;
  if (/\b180\b/.test(h) && /min/.test(h)) return 180;
  if (h === '60' || h === '60min' || h === '60_min') return 60;
  if (h === '120' || h === '120min' || h === '120_min') return 120;
  if (h === '180' || h === '180min' || h === '180_min') return 180;
  return null;
}

function matchMetricKey(label: string, annualRateSeen: { pop: boolean }): MetricKey | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  // Second "2025-2030 Annual Rate" after households section → household rate
  if (/2025.?2030\s+annual\s+rate/i.test(trimmed) && annualRateSeen.pop) {
    return 'households_annual_rate_2025_2030';
  }

  for (const { pattern, key } of LABEL_TO_METRIC) {
    if (pattern.test(trimmed)) {
      if (key === 'population_annual_rate_2025_2030') annualRateSeen.pop = true;
      return key;
    }
  }
  return null;
}

function ensureRings(map: Map<StdbRingMinutes, StdbRingMetrics>): StdbRingMetrics[] {
  for (const m of [60, 120, 180] as const) {
    if (!map.has(m)) map.set(m, emptyRing(m));
  }
  return [map.get(60)!, map.get(120)!, map.get(180)!];
}

function applyMetric(
  rings: Map<StdbRingMinutes, StdbRingMetrics>,
  minutes: StdbRingMinutes,
  key: MetricKey,
  value: number | null
): void {
  if (value == null) return;
  const ring = rings.get(minutes) ?? emptyRing(minutes);
  ring[key] = value;
  rings.set(minutes, ring);
}

/**
 * Parse a matrix where col0 = label and subsequent columns are ring values.
 * Header row (optional) identifies which columns are 60/120/180.
 */
function parseWideMatrix(
  rows: string[][],
  warnings: string[]
): { rings: StdbRingMetrics[]; rawRowCount: number } {
  const rings = new Map<StdbRingMinutes, StdbRingMetrics>();
  if (rows.length === 0) {
    return { rings: ensureRings(rings), rawRowCount: 0 };
  }

  let colMap: Array<StdbRingMinutes | null> = [null, 60, 120, 180];
  let dataStart = 0;

  const headerCells = rows[0].map((c) => c.trim());
  const detected = headerCells.map((h) => detectRingMinutes(h));
  if (detected.some((d) => d != null)) {
    colMap = detected;
    dataStart = 1;
  } else {
    // No ring headers — assume B/C/D = 60/120/180 when ≥4 columns
    const width = Math.max(...rows.map((r) => r.length));
    if (width >= 4) {
      colMap = headerCells.map((_, i) => {
        if (i === 1) return 60;
        if (i === 2) return 120;
        if (i === 3) return 180;
        return null;
      });
      while (colMap.length < 4) colMap.push(null);
      if (colMap[1] == null) colMap[1] = 60;
      if (colMap[2] == null) colMap[2] = 120;
      if (colMap[3] == null) colMap[3] = 180;
    } else {
      warnings.push('Could not detect 60/120/180 columns; assuming single value column is 60-min');
      colMap = [null, 60];
    }
  }

  const annualRateSeen = { pop: false };
  let matched = 0;

  for (let r = dataStart; r < rows.length; r++) {
    const row = rows[r];
    const label = (row[0] ?? '').trim();
    if (!label) continue;
    const key = matchMetricKey(label, annualRateSeen);
    if (!key) continue;
    matched += 1;
    for (let c = 1; c < row.length && c < colMap.length; c++) {
      const minutes = colMap[c];
      if (minutes == null) continue;
      applyMetric(rings, minutes, key, parseNumber(row[c]));
    }
  }

  if (matched === 0) {
    warnings.push('No recognizable STDB metric labels found in upload');
  }

  return { rings: ensureRings(rings), rawRowCount: rows.length };
}

function parseCsvBuffer(buffer: Buffer, warnings: string[]): StdbParseResult {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  let records: string[][];
  try {
    records = parseCsv(text, {
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    }) as string[][];
  } catch (err) {
    warnings.push(`CSV parse failed: ${err instanceof Error ? err.message : String(err)}`);
    return { rings: ensureRings(new Map()), warnings, rawRowCount: 0 };
  }
  const { rings, rawRowCount } = parseWideMatrix(records, warnings);
  return { rings, warnings, rawRowCount };
}

async function parseXlsxBuffer(buffer: Buffer, warnings: string[]): Promise<StdbParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);

  // Prefer a sheet that already looks like the ring export
  let ws =
    wb.worksheets.find((s) => RING_SHEET_CANDIDATES.includes(s.name) || s.name.trim() === '60 Min 120 Min 180 Min') ??
    wb.worksheets.find((s) => /60\s*min/i.test(s.name) && /180/i.test(s.name)) ??
    wb.worksheets[0];

  if (!ws) {
    warnings.push('XLSX has no worksheets');
    return { rings: ensureRings(new Map()), warnings, rawRowCount: 0 };
  }

  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const vals: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (vals.length < colNumber - 1) vals.push('');
      vals[colNumber - 1] = cellToString(cell.value);
    });
    rows.push(vals);
  });

  const { rings, rawRowCount } = parseWideMatrix(rows, warnings);
  return { rings, warnings, rawRowCount };
}

export async function parseStdbUpload(
  buffer: Buffer,
  filename: string
): Promise<StdbParseResult> {
  const warnings: string[] = [];
  const lower = filename.toLowerCase();

  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    return parseCsvBuffer(buffer, warnings);
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.xlsm')) {
    return parseXlsxBuffer(buffer, warnings);
  }

  // Sniff: try CSV then XLSX
  const asText = buffer.toString('utf8', 0, Math.min(buffer.length, 200));
  if (asText.includes(',') || asText.includes('\t')) {
    warnings.push(`Unknown extension for "${filename}"; treating as CSV`);
    return parseCsvBuffer(buffer, warnings);
  }
  warnings.push(`Unknown extension for "${filename}"; treating as XLSX`);
  return parseXlsxBuffer(buffer, warnings);
}

function findRingWorksheet(wb: ExcelJS.Workbook): ExcelJS.Worksheet | undefined {
  for (const name of RING_SHEET_CANDIDATES) {
    const ws = wb.getWorksheet(name);
    if (ws) return ws;
  }
  return wb.worksheets.find((s) => s.name.trim() === '60 Min 120 Min 180 Min');
}

/**
 * Write parsed ring metrics into the workbook source sheet used by Market Profile formulas.
 */
export function applyStdbToWorkbook(wb: ExcelJS.Workbook, parsed: StdbParseResult): {
  sheetName: string | null;
  cellsWritten: number;
  warnings: string[];
} {
  const warnings = [...parsed.warnings];
  const ws = findRingWorksheet(wb);
  if (!ws) {
    warnings.push('Worksheet "60 Min 120 Min 180 Min" not found; STDB values not applied');
    return { sheetName: null, cellsWritten: 0, warnings };
  }

  let cellsWritten = 0;
  for (const ring of parsed.rings) {
    const col = RING_COL[ring.minutes];
    for (const [key, row] of Object.entries(METRIC_TO_ROW) as Array<[MetricKey, number]>) {
      const value = ring[key];
      if (value == null) continue;
      ws.getCell(row, col).value = value;
      cellsWritten += 1;
    }
  }

  if (cellsWritten === 0) {
    warnings.push('No STDB numeric values to write into ring sheet');
  }

  return { sheetName: ws.name, cellsWritten, warnings };
}
