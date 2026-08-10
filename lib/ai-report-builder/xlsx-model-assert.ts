/**
 * Assert ExcelJS-written model drivers / Model Output sheet match the TS engine.
 * Soft-fail friendly: returns flags instead of throwing.
 */

import ExcelJS from 'exceljs';
import type { FeasibilityModelOutput } from '@/lib/feasibility-model';

const MODEL_OUTPUT_SHEET = 'Model Output';
const TOL_ABS = 2;
const TOL_REL = 0.005;

function nearlyEqual(a: number, b: number): boolean {
  const delta = Math.abs(a - b);
  if (delta <= TOL_ABS) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return delta / scale <= TOL_REL;
}

function numCell(ws: ExcelJS.Worksheet, row: number, col: number): number | null {
  const v = ws.getCell(row, col).value;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[$,%\s,]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  if (v && typeof v === 'object' && 'result' in v) {
    const r = (v as { result?: unknown }).result;
    if (typeof r === 'number' && Number.isFinite(r)) return r;
  }
  return null;
}

/**
 * Read key metrics from the optional Model Output sheet written by applyXlsxDriverMap.
 * Returns empty flags when the sheet is absent (older templates).
 */
export function assertXlsxMatchesModel(
  wb: ExcelJS.Workbook,
  model: FeasibilityModelOutput
): string[] {
  const flags: string[] = [];
  const ws = wb.getWorksheet(MODEL_OUTPUT_SHEET);
  if (!ws) {
    return flags;
  }

  // Layout from xlsx-driver-maps: label in col A, value in col B (rows vary by template).
  // Scan first 40 rows for known labels.
  const labelToValue = new Map<string, number>();
  for (let r = 1; r <= 40; r++) {
    const label = String(ws.getCell(r, 1).value ?? '')
      .trim()
      .toLowerCase();
    if (!label) continue;
    const n = numCell(ws, r, 2);
    if (n != null) labelToValue.set(label, n);
  }

  const checks: Array<{ keys: string[]; expected: number; name: string }> = [
    {
      keys: ['total development cost', 'tdc', 'total project cost'],
      expected: model.costs.totalDevelopmentCost,
      name: 'TDC',
    },
    {
      keys: ['loan amount', 'loan'],
      expected: model.financing.loanAmount,
      name: 'loan',
    },
    {
      keys: ['equity amount', 'equity'],
      expected: model.financing.equityAmount,
      name: 'equity',
    },
  ];

  for (const check of checks) {
    let found: number | null = null;
    for (const [label, val] of labelToValue) {
      if (check.keys.some((k) => label.includes(k))) {
        found = val;
        break;
      }
    }
    if (found == null) continue;
    if (!nearlyEqual(found, check.expected)) {
      flags.push(
        `xlsx_model_assert: ${check.name} sheet=${found} engine=${Math.round(check.expected)}`
      );
    }
  }

  return flags;
}

/** Load buffer and assert against model. */
export async function assertXlsxBufferMatchesModel(
  xlsxBuffer: Buffer,
  model: FeasibilityModelOutput
): Promise<string[]> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsxBuffer as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);
    return assertXlsxMatchesModel(wb, model);
  } catch (err) {
    return [
      `xlsx_model_assert: failed to load workbook (${err instanceof Error ? err.message : 'unknown'})`,
    ];
  }
}
