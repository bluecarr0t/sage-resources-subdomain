/**
 * Heuristic layout detection for XLSX feasibility sheets.
 * Infers header rows and column roles when layouts differ from the template.
 */

import type { ColumnRoleSchema } from '@/lib/types/feasibility';

export type CellValue = string | number | boolean | null | undefined;
export type Row = CellValue[];

const MAX_HEADER_SCAN_ROWS = 20;
const CONFIDENCE_THRESHOLD = 0.5;

function str(val: CellValue): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\r\n/g, ', ').replace(/\s+/g, ' ').trim();
}

function isNumeric(val: CellValue): boolean {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'number') return !isNaN(val);
  const s = String(val).trim();
  if (!s) return false;
  return /^-?\d+(\.\d+)?%?$/.test(s.replace(/[$,\s]/g, ''));
}

function isBlank(row: Row): boolean {
  return !row || row.every((c) => c === '' || c === null || c === undefined);
}

function looksLikeLabel(cell: CellValue): boolean {
  const s = str(cell);
  if (s.length > 60) return false;
  if (isNumeric(cell)) return false;
  return /^[a-zA-Z\s\-_&.]+$/.test(s) || s.length < 20;
}

/**
 * Score a row as a potential header row.
 * Higher score = more likely to be a header.
 * Formula: keywordMatches * 2 + labelCells - dataCells
 */
export function scoreHeaderRow(row: Row, keywords: Set<string>): number {
  if (!row || isBlank(row)) return -1;
  let keywordMatches = 0;
  let labelCells = 0;
  let dataCells = 0;

  for (const cell of row) {
    const s = str(cell).toLowerCase();
    if (!s) continue;

    const words = s.split(/\s+/).filter(Boolean);
    for (const w of words) {
      if (keywords.has(w) || keywords.has(s)) {
        keywordMatches++;
        break;
      }
    }
    for (const kw of keywords) {
      if (s.includes(kw)) {
        keywordMatches++;
        break;
      }
    }

    if (looksLikeLabel(cell)) labelCells++;
    if (isNumeric(cell)) dataCells++;
  }

  return keywordMatches * 2 + labelCells - dataCells;
}

export interface DetectHeaderRowResult {
  rowIndex: number;
  confidence: number;
}

/**
 * Detect the header row in a sheet using keyword density and data-type profile.
 */
export function detectHeaderRow(
  rows: Row[],
  keywordSet: Set<string>,
  options?: { maxScanRows?: number }
): DetectHeaderRowResult | null {
  const maxScan = options?.maxScanRows ?? MAX_HEADER_SCAN_ROWS;
  let bestIdx = -1;
  let bestScore = -1;

  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;

    const score = scoreHeaderRow(row, keywordSet);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  if (bestIdx < 0 || bestScore < 0) return null;

  const maxPossibleScore = keywordSet.size * 2 + 20;
  const confidence = Math.min(1, bestScore / Math.max(maxPossibleScore * 0.3, 1));

  return {
    rowIndex: bestIdx,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Infer column roles from a header row using schema keywords.
 * Returns a map of role -> column index. Unmapped roles are omitted.
 * Resolves conflicts (same column for multiple roles) using schema order as priority.
 */
export function inferColumnRoles(
  rows: Row[],
  headerRowIdx: number,
  schema: ColumnRoleSchema[]
): Map<string, number> {
  const result = new Map<string, number>();
  const usedCols = new Set<number>();
  const headerRow = rows[headerRowIdx];
  if (!headerRow || isBlank(headerRow)) return result;

  const lowerCells = headerRow.map((c) => str(c).toLowerCase());

  for (const colSchema of schema) {
    const candidates: Array<{ col: number; score: number }> = [];

    for (let c = 0; c < lowerCells.length; c++) {
      const cell = lowerCells[c];
      if (!cell) continue;

      let score = 0;
      for (const kw of colSchema.keywords) {
        if (cell === kw) score += 3;
        else if (cell.includes(kw)) score += 2;
        else if (cell.startsWith(kw) || cell.endsWith(kw)) score += 1;
      }
      if (score > 0) candidates.push({ col: c, score });
    }

    candidates.sort((a, b) => b.score - a.score);
    for (const { col } of candidates) {
      if (!usedCols.has(col)) {
        result.set(colSchema.role, col);
        usedCols.add(col);
        break;
      }
    }
  }

  return result;
}

export interface DetectedSection {
  startRow: number;
  endRow: number;
  marker?: string;
}

/**
 * Detect section boundaries using blank rows and keyword markers.
 * Sections are blocks of consecutive non-blank rows. First row of a section
 * may match a marker for tagging.
 */
export function detectSections(
  rows: Row[],
  sectionMarkers: string[]
): DetectedSection[] {
  const sections: DetectedSection[] = [];
  let currentStart = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const isBlankRow = !row || isBlank(row);

    if (isBlankRow) {
      if (currentStart >= 0) {
        const firstRow = rows[currentStart];
        const joined = firstRow
          ? firstRow.map((c) => str(c).toLowerCase()).join(' ')
          : '';
        const matchedMarker = sectionMarkers.find((m) =>
          joined.includes(m.toLowerCase())
        );
        sections.push({
          startRow: currentStart,
          endRow: i - 1,
          marker: matchedMarker,
        });
        currentStart = -1;
      }
      continue;
    }

    if (currentStart < 0) currentStart = i;
  }

  if (currentStart >= 0) {
    const firstRow = rows[currentStart];
    const joined = firstRow
      ? firstRow.map((c) => str(c).toLowerCase()).join(' ')
      : '';
    const matchedMarker = sectionMarkers.find((m) =>
      joined.includes(m.toLowerCase())
    );
    sections.push({
      startRow: currentStart,
      endRow: rows.length - 1,
      marker: matchedMarker,
    });
  }

  return sections;
}

export interface InferTableStructureResult {
  hasHeader: boolean;
  numCols: number;
  dataStartRow: number;
  headerRowIndex?: number;
}

/**
 * Infer basic table structure: header presence, column count, data start row.
 */
export function inferTableStructure(
  rows: Row[],
  keywordSet?: Set<string>
): InferTableStructureResult {
  let dataStartRow = 0;
  let numCols = 0;
  let hasHeader = false;
  let headerRowIndex: number | undefined;
  let foundFirstRow = false;

  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;

    const colCount = row.length;
    if (colCount > numCols) numCols = colCount;

    if (keywordSet && keywordSet.size > 0) {
      const score = scoreHeaderRow(row, keywordSet);
      if (score > 2) {
        hasHeader = true;
        headerRowIndex = i;
        dataStartRow = i + 1;
        break;
      }
    }

    if (!foundFirstRow && colCount > 0) {
      dataStartRow = i;
      foundFirstRow = true;
    }
  }

  return {
    hasHeader,
    numCols,
    dataStartRow,
    headerRowIndex,
  };
}

/** Infer Best Comps column order from data profile (no header row). */
export interface BestCompsColumnOrder {
  nameCol: number;
  scoreCol: number;
  descCol: number;
}

/** Column header/label values that are never property names — exclude from name votes */
const BEST_COMPS_NON_NAME = new Set([
  'description', 'name', 'score', 'notes', 'sites', 'amenities', 'overview',
]);

export function inferBestCompsColumnOrder(rows: Row[]): BestCompsColumnOrder | null {
  const CATEGORIES = ['unit type', 'unit types', 'unit amenities', 'property amenities', 'property', 'location', 'brand strength', 'occupancy notes'];
  const scoreVotes: number[] = [0, 0, 0, 0];
  const nameVotes: number[] = [0, 0, 0, 0];

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!row || isBlank(row) || row.length < 2) continue;

    for (let c = 0; c < Math.min(row.length, 4); c++) {
      const v = row[c];
      const s = str(v);
      const lower = s.toLowerCase().trim();
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,]/g, ''));
      const isScore = !isNaN(n) && n >= 0 && n <= 10;
      const isCategory = CATEGORIES.some((cat) => lower === cat);
      const isNonName = BEST_COMPS_NON_NAME.has(lower);
      const isName = s.length > 1 && !isCategory && !isScore && !isNonName;

      if (isScore) scoreVotes[c]++;
      if (isName) nameVotes[c]++;
    }
  }

  const scoreCol = scoreVotes.indexOf(Math.max(...scoreVotes));
  const nameCol = nameVotes.indexOf(Math.max(...nameVotes));

  if (scoreCol === nameCol || scoreVotes[scoreCol] < 2) return null;

  const descCol = [0, 1, 2, 3].find((c) => c !== nameCol && c !== scoreCol) ?? 2;
  return { nameCol, scoreCol, descCol };
}

/** Infer label-value column layout (col0=label, col1=value or vice versa). */
export interface LabelValueLayout {
  labelCol: number;
  valueCol: number;
}

export function inferLabelValueLayout(rows: Row[], maxScan = 20): LabelValueLayout {
  let labelVotes0 = 0;
  let labelVotes1 = 0;

  for (let i = 0; i < Math.min(rows.length, maxScan); i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;

    const c0 = row[0];
    const c1 = row[1];
    const s0 = str(c0);
    const s1 = str(c1);
    const isNum0 = isNumeric(c0);
    const isNum1 = isNumeric(c1);

    if (s0.length > 0 && !isNum0 && s0.length < 50) labelVotes0++;
    if (s1.length > 0 && !isNum1 && s1.length < 50) labelVotes1++;
  }

  if (labelVotes1 > labelVotes0) {
    return { labelCol: 1, valueCol: 0 };
  }
  return { labelCol: 0, valueCol: 1 };
}
