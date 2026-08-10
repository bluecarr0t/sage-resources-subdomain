/**
 * Apply feasibility model drivers into the live FS workbook (ExcelJS).
 * Soft-fails missing sheets; hard-fails in strict mode (CI).
 * Never overwrites cells that already contain formulas.
 */

import type ExcelJS from 'exceljs';
import type { FeasibilityModelOutput } from '@/lib/feasibility-model';
import type { ComparableProperty } from '../types';
import {
  GLAMPING_COST_DRIVERS,
  GLAMPING_OCC_DRIVER_ROWS,
  GLAMPING_RATE_DRIVER_ROWS,
  GLAMPING_TOT_FINANCING_DRIVERS,
  GLAMPING_UNIT_LABEL_CELLS,
  type DriverCell,
} from './glamping';
import {
  RV_COST_DRIVERS,
  RV_OCC_DRIVER_ROWS,
  RV_RATE_DRIVER_ROWS,
  RV_TOT_FINANCING_DRIVERS,
  RV_UNIT_LABEL_CELLS,
} from './rv';

export type ApplyDriverMapOptions = {
  templateKey: 'glamping' | 'rv';
  model: FeasibilityModelOutput;
  comps?: ComparableProperty[];
  /** Unit mix types for label rows (optional) */
  unitMix?: Array<{ type: string; count: number }>;
  /** When true, throw if a mapped sheet is missing */
  strict?: boolean;
  /** Keep Model Output debug sheet (default true until live sheets fully trusted) */
  includeModelOutputSheet?: boolean;
};

export type ApplyDriverMapResult = {
  missingSheets: string[];
  skippedFormulaCells: string[];
};

function cellHasFormula(cell: ExcelJS.Cell): boolean {
  const v = cell.value as unknown;
  if (v && typeof v === 'object') {
    const o = v as { formula?: string; sharedFormula?: string };
    return !!(o.formula || o.sharedFormula);
  }
  return false;
}

function setCell(
  ws: ExcelJS.Worksheet,
  addr: string,
  value: string | number | null | undefined,
  skipped: string[]
): void {
  if (value === undefined || value === null || value === '') return;
  const cell = ws.getCell(addr);
  if (cellHasFormula(cell)) {
    skipped.push(`${ws.name}!${addr}`);
    return;
  }
  cell.value = value;
}

function resolveDriverValue(model: FeasibilityModelOutput, key: string): number | undefined {
  const a = model.assumptionsUsed;
  switch (key) {
    case 'costs.totalDevelopmentCost':
      return model.costs.totalDevelopmentCost;
    case 'costs.siteDev':
      return model.costs.siteDev;
    case 'costs.unitCosts':
      return model.costs.unitCosts;
    case 'costs.addBldg':
      return model.costs.addBldg;
    case 'costs.softCosts':
      return model.costs.softCosts;
    case 'costs.contingency':
      return model.costs.contingency;
    case 'costs.land':
      return model.costs.land;
    case 'financing.loanAmount':
      return model.financing.loanAmount;
    case 'financing.equityAmount':
      return model.financing.equityAmount;
    case 'assumptions.loanToCost':
      return a.loanToCost.value;
    /** Template stores interest as decimal (0.095), not percent (9.5). */
    case 'assumptions.interestRate':
    case 'assumptions.interestRatePct':
      return a.interestRate.value;
    case 'assumptions.loanTermYears':
      return a.loanTermYears.value;
    default:
      return undefined;
  }
}

function writeDriverCells(
  wb: ExcelJS.Workbook,
  cells: DriverCell[],
  model: FeasibilityModelOutput,
  skipped: string[]
): string[] {
  const missing: string[] = [];
  for (const d of cells) {
    const ws = wb.getWorksheet(d.sheet);
    if (!ws) {
      missing.push(d.sheet);
      continue;
    }
    const v = resolveDriverValue(model, d.key);
    if (v != null) setCell(ws, d.cell, v, skipped);
  }
  return [...new Set(missing)];
}

function writeBestComps(wb: ExcelJS.Workbook, comps: ComparableProperty[], skipped: string[]): void {
  const ws = wb.getWorksheet('Best Comps');
  if (!ws || !comps.length) return;
  const startRow = 5;
  comps.slice(0, 12).forEach((c, i) => {
    const row = startRow + i;
    setCell(ws, `B${row}`, c.property_name, skipped);
    setCell(ws, `C${row}`, c.city, skipped);
    setCell(ws, `D${row}`, c.state, skipped);
    if (c.distance_miles != null) setCell(ws, `E${row}`, c.distance_miles, skipped);
    if (c.avg_retail_daily_rate != null) setCell(ws, `F${row}`, c.avg_retail_daily_rate, skipped);
    if (c.quality_score != null) setCell(ws, `G${row}`, c.quality_score, skipped);
  });
}

function writeUnitTypeLabels(
  wb: ExcelJS.Workbook,
  templateKey: 'glamping' | 'rv',
  unitMix: Array<{ type: string; count: number }> | undefined,
  skipped: string[]
): void {
  const labels = templateKey === 'glamping' ? GLAMPING_UNIT_LABEL_CELLS : RV_UNIT_LABEL_CELLS;
  const types = (unitMix ?? []).filter((u) => u.count > 0).map((u) => u.type);

  for (const { sheet, cells } of labels) {
    const ws = wb.getWorksheet(sheet);
    if (!ws) continue;
    for (let i = 0; i < cells.length; i++) {
      const addr = cells[i];
      if (i < types.length) {
        const label =
          sheet === 'Rates Proj' || sheet === 'Occ. Proj'
            ? `Subject Projected ${types[i]} Rates`
            : types[i];
        setCell(ws, addr, label, skipped);
      } else {
        const cell = ws.getCell(addr);
        if (!cellHasFormula(cell)) {
          const cur = cell.value;
          if (typeof cur === 'string' && /mirror cabin|sample|example|treehouse|subject projected/i.test(cur)) {
            cell.value = null;
          }
        }
      }
    }
  }
}

function writeModelOutputSheet(wb: ExcelJS.Workbook, model: FeasibilityModelOutput): void {
  let modelSheet = wb.getWorksheet('Model Output');
  if (!modelSheet) modelSheet = wb.addWorksheet('Model Output');
  modelSheet.getCell('A1').value = 'Sage Feasibility Model Output (engine)';
  modelSheet.getCell('A2').value = 'Total Development Cost';
  modelSheet.getCell('B2').value = model.costs.totalDevelopmentCost;
  modelSheet.getCell('A3').value = 'Loan Amount';
  modelSheet.getCell('B3').value = model.financing.loanAmount;
  modelSheet.getCell('A4').value = 'Equity';
  modelSheet.getCell('B4').value = model.financing.equityAmount;
  modelSheet.getCell('A5').value = 'Annual Debt Service';
  modelSheet.getCell('B5').value = model.financing.annualDebtService;
  modelSheet.getCell('A6').value = '10-Year Equity IRR';
  modelSheet.getCell('B6').value = model.irr.equityIrr10Year;
  modelSheet.getCell('A8').value = 'Year';
  modelSheet.getCell('B8').value = 'Revenue';
  modelSheet.getCell('C8').value = 'Expenses';
  modelSheet.getCell('D8').value = 'NOI';
  modelSheet.getCell('E8').value = 'DCR';
  modelSheet.getCell('F8').value = 'Cash-on-Cash';
  model.proForma.forEach((y, i) => {
    const row = 9 + i;
    modelSheet!.getCell(`A${row}`).value = y.year;
    modelSheet!.getCell(`B${row}`).value = y.totalRevenue;
    modelSheet!.getCell(`C${row}`).value = y.expenses;
    modelSheet!.getCell(`D${row}`).value = y.noi;
    modelSheet!.getCell(`E${row}`).value = model.financing.dcrByYear[i] ?? null;
    modelSheet!.getCell(`F${row}`).value = model.financing.cashOnCashByYear[i] ?? null;
  });

  if (model.monthlyProForma?.length) {
    modelSheet.getCell('H8').value = 'Month';
    modelSheet.getCell('I8').value = 'Y1 Revenue';
    modelSheet.getCell('J8').value = 'Y1 NOI';
    model.monthlyProForma.forEach((m, i) => {
      const row = 9 + i;
      modelSheet!.getCell(`H${row}`).value = m.month;
      modelSheet!.getCell(`I${row}`).value = m.totalRevenue;
      modelSheet!.getCell(`J${row}`).value = m.noi;
    });
  }
}

/**
 * Apply rate/occ/financing/cost drivers for the given template key.
 * Skips formula cells; returns missing sheets + skipped addresses.
 */
export function applyXlsxDriverMap(
  wb: ExcelJS.Workbook,
  options: ApplyDriverMapOptions
): ApplyDriverMapResult {
  const {
    templateKey,
    model,
    comps = [],
    unitMix,
    strict = false,
    includeModelOutputSheet = true,
  } = options;
  const isGlamping = templateKey === 'glamping';
  const financing = isGlamping ? GLAMPING_TOT_FINANCING_DRIVERS : RV_TOT_FINANCING_DRIVERS;
  const costs = isGlamping ? GLAMPING_COST_DRIVERS : RV_COST_DRIVERS;
  const rateRows = isGlamping ? GLAMPING_RATE_DRIVER_ROWS : RV_RATE_DRIVER_ROWS;
  const occRows = isGlamping ? GLAMPING_OCC_DRIVER_ROWS : RV_OCC_DRIVER_ROWS;
  const skipped: string[] = [];

  const missing = [
    ...writeDriverCells(wb, financing, model, skipped),
    ...writeDriverCells(wb, costs, model, skipped),
  ];

  writeUnitTypeLabels(wb, templateKey, unitMix, skipped);

  const ratesSheet = wb.getWorksheet('Rates Proj') ?? wb.getWorksheet('Rates + Occ. Proj');
  if (ratesSheet) {
    model.rates.forEach((r, i) => {
      const cells = rateRows[i];
      if (!cells) return;
      setCell(ratesSheet, cells.low, r.lowAdr, skipped);
      setCell(ratesSheet, cells.peak, r.peakAdr, skipped);
    });
  } else {
    missing.push('Rates Proj');
  }

  const occSheet = wb.getWorksheet('Occ. Proj');
  if (occSheet) {
    model.occupancy.forEach((o, i) => {
      const cells = occRows[i];
      if (!cells) return;
      setCell(occSheet, cells.low, o.lowOccupancy, skipped);
      setCell(occSheet, cells.peak, o.peakOccupancy, skipped);
    });
  } else {
    missing.push('Occ. Proj');
  }

  writeBestComps(wb, comps, skipped);

  if (includeModelOutputSheet) {
    writeModelOutputSheet(wb, model);
  }

  const uniq = [...new Set(missing)];
  if (strict && uniq.length) {
    throw new Error(`XLSX driver map missing sheets: ${uniq.join(', ')}`);
  }
  if (skipped.length) {
    console.warn(
      `[xlsx-driver-map] Skipped ${skipped.length} formula cell(s): ${skipped.slice(0, 12).join(', ')}${
        skipped.length > 12 ? '…' : ''
      }`
    );
  }
  return { missingSheets: uniq, skippedFormulaCells: skipped };
}

export {
  GLAMPING_TOT_FINANCING_DRIVERS,
  GLAMPING_COST_DRIVERS,
  GLAMPING_RATE_DRIVER_ROWS,
  GLAMPING_OCC_DRIVER_ROWS,
} from './glamping';
export {
  RV_TOT_FINANCING_DRIVERS,
  RV_COST_DRIVERS,
  RV_RATE_DRIVER_ROWS,
  RV_OCC_DRIVER_ROWS,
} from './rv';
