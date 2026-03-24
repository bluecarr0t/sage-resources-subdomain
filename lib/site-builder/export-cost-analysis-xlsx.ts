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
import type { ConfigCostResult, SiteBuilderConfig } from './cost-calculator';
import { calculateSiteBuilderCosts } from './cost-calculator';
import { effectiveAmenityCostPerUnit } from './effective-amenity-cost';

const TEMPLATES_DIR_XLSX = resolve(process.cwd(), 'templates', 'Cost Analysis Section.xlsx');
const LEGACY_LOCAL_TEMPLATE_PATH = resolve(process.cwd(), 'local_data', 'Cost Analysis Section.xlsx');

const SITE_DEV_SHEET = 'Site Dev Cost';
const ADD_BLDG_SHEET = 'Add. Bldg Improv.';
const TOTAL_PROJ_SHEET = 'Total Proj. Cost';

/** Unit costs section: first data row in Excel (1-based), matches template row 39 */
const UNIT_COSTS_FIRST_EXCEL_ROW = 39;
const MAX_GLAMPING_CONFIGS = 7;

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

/**
 * Aggregate amenity costs by slug across all configs.
 * Returns { slug -> { name, totalQty, costPerUnit, total } }
 */
async function getAmenityBreakdown(
  supabase: SupabaseClient,
  configs: SiteBuilderConfig[]
): Promise<{ name: string; totalQty: number; costPerUnit: number; total: number }[]> {
  const bySlug: Record<string, { totalQty: number; costPerUnit: number }> = {};

  for (const config of configs) {
    const amenitySlugs = config.type === 'glamping' ? config.amenitySlugs : config.amenitySlugs;
    const quantity = config.quantity;
    if (amenitySlugs.length === 0) continue;

    const applies = config.type === 'glamping' ? ['glamping', 'both'] : ['rv', 'both'];
    const { data: amenities } = await supabase
      .from('site_builder_amenity_costs')
      .select('slug, name, cost_per_unit, applies_to')
      .in('slug', amenitySlugs)
      .in('applies_to', applies);

    for (const a of amenities ?? []) {
      const cost = effectiveAmenityCostPerUnit(a.slug, a.cost_per_unit);
      if (!bySlug[a.slug]) {
        bySlug[a.slug] = { totalQty: 0, costPerUnit: cost };
      }
      bySlug[a.slug].totalQty += quantity;
    }
  }

  const slugs = Object.keys(bySlug);
  if (slugs.length === 0) return [];

  const { data: names } = await supabase
    .from('site_builder_amenity_costs')
    .select('slug, name, cost_per_unit')
    .in('slug', slugs);

  const nameMap = new Map((names ?? []).map((n) => [n.slug, n.name]));
  const costMap = new Map(
    (names ?? []).map((n) => [n.slug, effectiveAmenityCostPerUnit(n.slug, n.cost_per_unit)])
  );

  return slugs.map((slug) => {
    const d = bySlug[slug];
    const costPerUnit = costMap.get(slug) ?? d.costPerUnit;
    const total = d.totalQty * costPerUnit;
    return {
      name: nameMap.get(slug) ?? slug,
      totalQty: d.totalQty,
      costPerUnit,
      total,
    };
  });
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
  // exceljs typings lag Node 22+ `Buffer` / `readFileSync` types — runtime Buffer is valid
  await wb.xlsx.load(fileBuffer as never);

  const siteDev = wb.getWorksheet(SITE_DEV_SHEET);
  const addBldg = wb.getWorksheet(ADD_BLDG_SHEET);
  const totalProj = wb.getWorksheet(TOTAL_PROJ_SHEET);

  if (!siteDev || !addBldg || !totalProj) {
    throw new Error('Cost Analysis template missing required sheets');
  }

  setCellValue(siteDev, 'C4', totalSitesForTemplate);

  for (let i = 0; i < Math.min(glampingConfigs.length, MAX_GLAMPING_CONFIGS); i++) {
    const c = glampingConfigs[i];
    const excelRow = UNIT_COSTS_FIRST_EXCEL_ROW + i;
    setCellValue(siteDev, `B${excelRow}`, c.name);
    setCellValue(siteDev, `C${excelRow}`, c.quantity);
    setCellValue(siteDev, `D${excelRow}`, Math.round(c.costPerUnit));
    setCellValue(siteDev, `E${excelRow}`, Math.round(c.subtotal));
  }

  setCellValue(siteDev, 'E36', Math.round(totalRVCost));
  setCellValue(siteDev, 'E42', Math.round(totalGlampingCost));

  const templateAddBldgTotal = getNumericCellValue(addBldg.getCell('E15'));
  let addBldgTotal: number;

  if (amenityBreakdown.length > 0) {
    const amenityList = amenityBreakdown.map((a) => `${a.name} (×${a.totalQty})`).join(', ');
    const qtySum = amenityBreakdown.reduce((s, a) => s + a.totalQty, 0);
    setCellValue(addBldg, 'B14', `Unit-level amenities (Site Builder): ${amenityList}`);
    setCellValue(addBldg, 'C14', qtySum);
    setCellValue(addBldg, 'D14', Math.round(totalAmenityCost / Math.max(qtySum, 1)));
    setCellValue(addBldg, 'E14', Math.round(totalAmenityCost));
    setCellValue(addBldg, 'F14', 'Site Builder');
    addBldg.getCell('E15').value = { formula: 'SUM(E2:E14)', result: templateAddBldgTotal + totalAmenityCost };
    addBldgTotal = templateAddBldgTotal + totalAmenityCost;
  } else {
    addBldgTotal = templateAddBldgTotal;
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
  configs: SiteBuilderConfig[]
): Promise<Buffer> {
  const costResult = await calculateSiteBuilderCosts(supabase, configs);
  const amenityBreakdown = await getAmenityBreakdown(supabase, configs);

  return exportCostAnalysisToXlsx({
    configs,
    costResult,
    amenityBreakdown,
  });
}
