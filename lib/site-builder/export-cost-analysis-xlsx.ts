/**
 * Export Site Builder cost analysis to XLSX using Cost Analysis Section template.
 * Populates Site Dev Cost, Add. Bldg Improv., and Total Proj. Cost sheets.
 *
 * Uses ExcelJS (not SheetJS) so fonts, fills, borders, and number formats from the
 * template round-trip. Keep the committed template in sync with branded Excel files.
 * Override path: SITE_BUILDER_COST_ANALYSIS_TEMPLATE_PATH, or place a copy at
 * local_data/Cost Analysis Section.xlsx for local edits (takes precedence when present).
 * Default committed template: templates/Cost Analysis Section.xlsx (deployed on Vercel).
 */

import ExcelJS from 'exceljs';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConfigCostResult, SiteBuilderConfig, SiteBuilderCostOptions } from './cost-calculator';
import { calculateSiteBuilderCosts } from './cost-calculator';
import { pickAmenityOverridesForConfig, resolveAmenityUnitCost } from '@/lib/site-builder/amenity-cost-resolve';

const TEMPLATES_DIR_XLSX = resolve(process.cwd(), 'templates', 'Cost Analysis Section.xlsx');
const LEGACY_LOCAL_TEMPLATE_PATH = resolve(process.cwd(), 'local_data', 'Cost Analysis Section.xlsx');

const SITE_DEV_SHEET = 'Site Dev Cost';
const ADD_BLDG_SHEET = 'Add. Bldg Improv.';
const TOTAL_PROJ_SHEET = 'Total Proj. Cost';

/** First data row for unit/site line items */
const UNIT_COSTS_FIRST_EXCEL_ROW = 39;

function resolveCostAnalysisTemplatePath(): string {
  const envPath = process.env.SITE_BUILDER_COST_ANALYSIS_TEMPLATE_PATH?.trim();
  if (envPath && existsSync(envPath)) return envPath;
  if (existsSync(LEGACY_LOCAL_TEMPLATE_PATH)) return LEGACY_LOCAL_TEMPLATE_PATH;
  if (existsSync(TEMPLATES_DIR_XLSX)) return TEMPLATES_DIR_XLSX;
  return TEMPLATES_DIR_XLSX;
}

function getNumericCellValue(cell: ExcelJS.Cell): number {
  const v = cell.value;
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v !== null && 'result' in v) {
    const r = (v as { result?: unknown }).result;
    return typeof r === 'number' ? r : 0;
  }
  return 0;
}

function setCellValue(ws: ExcelJS.Worksheet, address: string, value: string | number): void {
  ws.getCell(address).value = value;
}

function cellBString(ws: ExcelJS.Worksheet, row: number): string {
  const v = ws.getRow(row).getCell(2).value;
  if (typeof v === 'string') return v;
  if (v != null && typeof v === 'object' && 'richText' in (v as object)) return '';
  return v != null ? String(v) : '';
}

/** Sum template Add. Bldg line-item totals in column E for fixed rows 2–13 (before Site Builder amenity block). */
function sumTemplateAddBldgBaseRows(addBldg: ExcelJS.Worksheet): number {
  let s = 0;
  for (let r = 2; r <= 13; r++) {
    s += getNumericCellValue(addBldg.getRow(r).getCell(5));
  }
  return s;
}

function findTotalUnitCostsRow(ws: ExcelJS.Worksheet): number {
  for (let r = UNIT_COSTS_FIRST_EXCEL_ROW; r <= UNIT_COSTS_FIRST_EXCEL_ROW + 30; r++) {
    if (cellBString(ws, r).includes('Total Unit Costs')) return r;
  }
  return UNIT_COSTS_FIRST_EXCEL_ROW + 3;
}

function findCombinedSiteDevTotalRow(ws: ExcelJS.Worksheet): number {
  for (let r = 36; r <= 70; r++) {
    const t = cellBString(ws, r);
    if (t.includes('Total Site Development Costs + Unit Costs')) return r;
  }
  return 44;
}

function findAddBldgTotalRow(ws: ExcelJS.Worksheet): number {
  for (let r = 2; r <= 40; r++) {
    if (cellBString(ws, r).includes('Total Add. Bldg')) return r;
  }
  return 15;
}

/**
 * Aggregate amenity costs by slug across all configs.
 * Returns { name, totalQty, costPerUnit, total } per slug.
 */
export async function getAmenityBreakdown(
  supabase: SupabaseClient,
  configs: SiteBuilderConfig[],
  options?: SiteBuilderCostOptions
): Promise<{ name: string; totalQty: number; costPerUnit: number; total: number }[]> {
  /** Key = slug + resolved unit cost so the same slug with different per-row overrides becomes separate lines. */
  const byKey: Record<string, { slug: string; totalQty: number; costPerUnit: number }> = {};

  for (let ci = 0; ci < configs.length; ci++) {
    const config = configs[ci];
    const amenitySlugs = config.amenitySlugs;
    const quantity = config.quantity;
    if (amenitySlugs.length === 0) continue;

    const overrides = pickAmenityOverridesForConfig(options, ci);
    const applies = config.type === 'glamping' ? ['glamping', 'both'] : ['rv', 'both'];
    const { data: amenities } = await supabase
      .from('amenities')
      .select('slug, name, cost_per_unit, applies_to')
      .in('slug', amenitySlugs)
      .in('applies_to', applies);

    for (const a of amenities ?? []) {
      const cost = resolveAmenityUnitCost(a.slug, a.cost_per_unit, overrides);
      const key = `${a.slug}\x1e${cost}`;
      if (!byKey[key]) {
        byKey[key] = { slug: a.slug, totalQty: 0, costPerUnit: cost };
      }
      byKey[key].totalQty += quantity;
    }
  }

  const keys = Object.keys(byKey);
  if (keys.length === 0) return [];

  const slugs = [...new Set(Object.values(byKey).map((v) => v.slug))];
  const { data: names } = await supabase
    .from('amenities')
    .select('slug, name, cost_per_unit')
    .in('slug', slugs);

  const nameMap = new Map((names ?? []).map((n) => [n.slug, n.name]));

  return keys
    .map((k) => {
      const d = byKey[k]!;
      const total = d.totalQty * d.costPerUnit;
      return {
        name: nameMap.get(d.slug) ?? d.slug,
        totalQty: d.totalQty,
        costPerUnit: d.costPerUnit,
        total,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.costPerUnit - b.costPerUnit);
}

export interface ExportCostAnalysisInput {
  configs: SiteBuilderConfig[];
  costResult: { configs: ConfigCostResult[]; totalSiteBuild: number };
  amenityBreakdown: { name: string; totalQty: number; costPerUnit: number; total: number }[];
}

export async function exportCostAnalysisToXlsx(input: ExportCostAnalysisInput): Promise<Buffer> {
  const { costResult, amenityBreakdown } = input;
  const glampingConfigs = costResult.configs.filter((c) => c.type === 'glamping');
  const rvConfigs = costResult.configs.filter((c) => c.type === 'rv');

  const totalRVSites = rvConfigs.reduce((s, c) => s + c.quantity, 0);
  const totalGlampingUnits = glampingConfigs.reduce((s, c) => s + c.quantity, 0);
  const totalRVCost = rvConfigs.reduce((s, c) => s + c.subtotal, 0);
  const totalGlampingCost = glampingConfigs.reduce((s, c) => s + c.subtotal, 0);
  const totalAmenityCost = amenityBreakdown.reduce((s, a) => s + a.total, 0);

  const totalSitesForTemplate = Math.max(totalRVSites + totalGlampingUnits, 1);

  const templatePath = resolveCostAnalysisTemplatePath();
  if (!existsSync(templatePath)) {
    throw new Error(
      `Cost Analysis template not found. Add templates/Cost Analysis Section.xlsx, or set SITE_BUILDER_COST_ANALYSIS_TEMPLATE_PATH, or add local_data/Cost Analysis Section.xlsx.`
    );
  }

  const fileBuffer = readFileSync(templatePath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(fileBuffer as never);

  const siteDev = wb.getWorksheet(SITE_DEV_SHEET);
  const addBldg = wb.getWorksheet(ADD_BLDG_SHEET);
  const totalProj = wb.getWorksheet(TOTAL_PROJ_SHEET);

  if (!siteDev || !addBldg || !totalProj) {
    throw new Error('Cost Analysis template missing required sheets');
  }

  setCellValue(siteDev, 'C4', totalSitesForTemplate);

  const unitRows = costResult.configs;
  let totalUnitRow = findTotalUnitCostsRow(siteDev);
  const firstDataRow = UNIT_COSTS_FIRST_EXCEL_ROW;
  const templateSlots = totalUnitRow - firstDataRow;
  const needed = unitRows.length;
  const toInsert = Math.max(0, needed - templateSlots);
  if (toInsert > 0) {
    siteDev.spliceRows(totalUnitRow, 0, ...Array.from({ length: toInsert }, () => []));
    totalUnitRow += toInsert;
  }

  const lastUnitDataRow = firstDataRow + unitRows.length - 1;
  for (let i = 0; i < unitRows.length; i++) {
    const c = unitRows[i];
    const excelRow = firstDataRow + i;
    setCellValue(siteDev, `B${excelRow}`, c.name);
    setCellValue(siteDev, `C${excelRow}`, c.quantity);
    setCellValue(siteDev, `D${excelRow}`, Math.round(c.costPerUnit));
    setCellValue(siteDev, `E${excelRow}`, Math.round(c.subtotal));
  }
  for (let r = firstDataRow + unitRows.length; r < totalUnitRow; r++) {
    setCellValue(siteDev, `B${r}`, '');
    siteDev.getRow(r).getCell(3).value = null;
    siteDev.getRow(r).getCell(4).value = null;
    siteDev.getRow(r).getCell(5).value = null;
  }

  const sumC = `SUM(C${firstDataRow}:C${lastUnitDataRow})`;
  const sumE = `SUM(E${firstDataRow}:E${lastUnitDataRow})`;
  siteDev.getCell(`C${totalUnitRow}`).value = { formula: sumC, result: unitRows.reduce((s, c) => s + c.quantity, 0) };
  siteDev.getCell(`E${totalUnitRow}`).value = {
    formula: sumE,
    result: unitRows.reduce((s, c) => s + c.subtotal, 0),
  };

  const combinedRow = findCombinedSiteDevTotalRow(siteDev);
  const e36Result = getNumericCellValue(siteDev.getCell('E36'));
  siteDev.getCell(`E${combinedRow}`).value = {
    formula: `SUM(E36,E${firstDataRow}:E${lastUnitDataRow})`,
    result: e36Result + unitRows.reduce((s, c) => s + c.subtotal, 0),
  };

  const templateAddBldgBaseSum = sumTemplateAddBldgBaseRows(addBldg);
  let addBldgTotalRow = findAddBldgTotalRow(addBldg);
  let addBldgTotal: number;

  if (amenityBreakdown.length > 0) {
    const k = amenityBreakdown.length;
    const insertBeforeTotal = k - 1;
    if (insertBeforeTotal > 0) {
      addBldg.spliceRows(addBldgTotalRow, 0, ...Array.from({ length: insertBeforeTotal }, () => []));
      addBldgTotalRow += insertBeforeTotal;
    }
    const firstAmenityRow = 14;
    for (let i = 0; i < k; i++) {
      const a = amenityBreakdown[i];
      const r = firstAmenityRow + i;
      setCellValue(addBldg, `B${r}`, `Site Builder: ${a.name}`);
      setCellValue(addBldg, `C${r}`, a.totalQty);
      setCellValue(addBldg, `D${r}`, Math.round(a.costPerUnit));
      setCellValue(addBldg, `E${r}`, Math.round(a.total));
      setCellValue(addBldg, `F${r}`, 'Site Builder');
    }
    for (let r = firstAmenityRow + k; r < addBldgTotalRow; r++) {
      setCellValue(addBldg, `B${r}`, '');
      addBldg.getRow(r).getCell(3).value = null;
      addBldg.getRow(r).getCell(4).value = null;
      addBldg.getRow(r).getCell(5).value = null;
      addBldg.getRow(r).getCell(6).value = null;
    }
    const lastDataRow = firstAmenityRow + k - 1;
    const sumERange = `SUM(E2:E${lastDataRow})`;
    const sumCRange = `SUM(C2:C${lastDataRow})`;
    const amenityPlusBase = templateAddBldgBaseSum + totalAmenityCost;
    addBldg.getCell(`C${addBldgTotalRow}`).value = { formula: sumCRange };
    addBldg.getCell(`D${addBldgTotalRow}`).value = {
      formula: `IF(C${addBldgTotalRow}>0,E${addBldgTotalRow}/C${addBldgTotalRow},0)`,
    };
    addBldg.getCell(`E${addBldgTotalRow}`).value = {
      formula: sumERange,
      result: amenityPlusBase,
    };
    addBldgTotal = amenityPlusBase;
  } else {
    addBldgTotal = getNumericCellValue(addBldg.getCell(`E${addBldgTotalRow}`));
  }

  const hardCostTotal = totalRVCost + totalGlampingCost + addBldgTotal;

  setCellValue(totalProj, 'C3', totalSitesForTemplate);
  setCellValue(totalProj, 'C5', totalGlampingUnits);
  setCellValue(totalProj, 'D4', Math.round(totalRVCost));
  setCellValue(totalProj, 'D6', Math.round(totalGlampingCost));
  setCellValue(totalProj, 'D7', Math.round(addBldgTotal));
  setCellValue(totalProj, 'D8', Math.round(hardCostTotal));
  setCellValue(totalProj, 'D15', 0);

  const outBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(outBuffer);
}

export async function buildAndExportCostAnalysisXlsx(
  supabase: SupabaseClient,
  configs: SiteBuilderConfig[],
  options?: SiteBuilderCostOptions
): Promise<Buffer> {
  const costResult = await calculateSiteBuilderCosts(supabase, configs, options);
  const amenityBreakdown = await getAmenityBreakdown(supabase, configs, options);

  return exportCostAnalysisToXlsx({
    configs,
    costResult,
    amenityBreakdown,
  });
}
