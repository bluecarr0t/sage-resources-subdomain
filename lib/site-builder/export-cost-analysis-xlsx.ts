/**
 * Export Site Builder cost analysis to XLSX using Cost Analysis Section template.
 * Populates Site Dev Cost, Add. Bldg Improv., and Total Proj. Cost sheets.
 */

import * as XLSX from 'xlsx';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConfigCostResult, SiteBuilderConfig } from './cost-calculator';
import { calculateSiteBuilderCosts } from './cost-calculator';

const TEMPLATE_PATH = resolve(process.cwd(), 'local_data', 'Cost Analysis Section.xlsx');

const SITE_DEV_SHEET = 'Site Dev Cost';
const ADD_BLDG_SHEET = 'Add. Bldg Improv.';
const TOTAL_PROJ_SHEET = 'Total Proj. Cost';

/** Unit costs section starts at row 39 (0-based: 38) */
const UNIT_COSTS_START_ROW = 38;
const MAX_GLAMPING_CONFIGS = 7;

function setCell(ws: XLSX.WorkSheet, addr: string, value: string | number): void {
  ws[addr] = {
    t: typeof value === 'number' ? 'n' : 's',
    v: value,
  };
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
      const cost = Number(a.cost_per_unit);
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
  const costMap = new Map((names ?? []).map((n) => [n.slug, Number(n.cost_per_unit)]));

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

export function exportCostAnalysisToXlsx(input: ExportCostAnalysisInput): Buffer {
  const { configs, costResult, amenityBreakdown } = input;
  const glampingConfigs = costResult.configs.filter((c) => c.type === 'glamping');
  const rvConfigs = costResult.configs.filter((c) => c.type === 'rv');

  const totalRVSites = rvConfigs.reduce((s, c) => s + c.quantity, 0);
  const totalGlampingUnits = glampingConfigs.reduce((s, c) => s + c.quantity, 0);
  const totalRVCost = rvConfigs.reduce((s, c) => s + c.subtotal, 0);
  const totalGlampingCost = glampingConfigs.reduce((s, c) => s + c.subtotal, 0);
  const totalAmenityCost = amenityBreakdown.reduce((s, a) => s + a.total, 0);

  const totalSitesForTemplate = Math.max(totalRVSites + totalGlampingUnits, 1);

  if (!existsSync(TEMPLATE_PATH)) {
    throw new Error(
      `Cost Analysis template not found at ${TEMPLATE_PATH}. Add local_data/Cost Analysis Section.xlsx to enable export.`
    );
  }

  const buffer = readFileSync(TEMPLATE_PATH);
  const wb = XLSX.read(buffer, { type: 'buffer' });

  const siteDev = wb.Sheets[SITE_DEV_SHEET];
  const addBldg = wb.Sheets[ADD_BLDG_SHEET];
  const totalProj = wb.Sheets[TOTAL_PROJ_SHEET];

  if (!siteDev || !addBldg || !totalProj) {
    throw new Error('Cost Analysis template missing required sheets');
  }

  // Site Dev Cost: C4 = Number of Units/Sites (RV + glamping for template compatibility)
  setCell(siteDev, 'C4', totalSitesForTemplate);

  // Site Dev Cost: Unit Costs section (rows 39-42)
  for (let i = 0; i < Math.min(glampingConfigs.length, MAX_GLAMPING_CONFIGS); i++) {
    const c = glampingConfigs[i];
    const row = UNIT_COSTS_START_ROW + i;
    const rowB = XLSX.utils.encode_cell({ r: row, c: 1 });
    const rowC = XLSX.utils.encode_cell({ r: row, c: 2 });
    const rowD = XLSX.utils.encode_cell({ r: row, c: 3 });
    const rowE = XLSX.utils.encode_cell({ r: row, c: 4 });
    setCell(siteDev, rowB, c.name);
    setCell(siteDev, rowC, c.quantity);
    setCell(siteDev, rowD, Math.round(c.costPerUnit));
    setCell(siteDev, rowE, Math.round(c.subtotal));
  }

  // Site Dev Cost: E36 = Total Site Dev (overwrite - use RV total for horizontal)
  setCell(siteDev, 'E36', Math.round(totalRVCost));

  // Site Dev Cost: E42 = Total Unit Costs (glamping)
  setCell(siteDev, 'E42', Math.round(totalGlampingCost));

  // Add. Bldg Improv.: Add unit-level amenities row at 14, extend total formula to E15
  // Template rows 2-13 = shared facilities, row 14 = last item, row 15 = total (SUM(E2:E13))
  const templateAddBldgTotal = typeof addBldg['E15']?.v === 'number' ? addBldg['E15'].v : 0;
  let addBldgTotal: number;

  if (amenityBreakdown.length > 0) {
    const row14 = 13;
    const rowB = XLSX.utils.encode_cell({ r: row14, c: 1 });
    const rowC = XLSX.utils.encode_cell({ r: row14, c: 2 });
    const rowD = XLSX.utils.encode_cell({ r: row14, c: 3 });
    const rowE = XLSX.utils.encode_cell({ r: row14, c: 4 });
    const rowF = XLSX.utils.encode_cell({ r: row14, c: 5 });
    const amenityList = amenityBreakdown.map((a) => `${a.name} (×${a.totalQty})`).join(', ');
    setCell(addBldg, rowB, `Unit-level amenities (Site Builder): ${amenityList}`);
    setCell(addBldg, rowC, amenityBreakdown.reduce((s, a) => s + a.totalQty, 0));
    setCell(addBldg, rowD, Math.round(totalAmenityCost / Math.max(amenityBreakdown.reduce((s, a) => s + a.totalQty, 0), 1)));
    setCell(addBldg, rowE, Math.round(totalAmenityCost));
    setCell(addBldg, rowF, 'Site Builder');
    addBldg['E15'] = { t: 'n', f: 'SUM(E2:E14)' };
    addBldgTotal = templateAddBldgTotal + totalAmenityCost;
  } else {
    addBldgTotal = templateAddBldgTotal;
  }

  const hardCostTotal = totalRVCost + totalGlampingCost + addBldgTotal;

  // Total Proj. Cost: Overwrite cells that reference missing ToT/Excel Input sheets
  setCell(totalProj, 'C3', totalSitesForTemplate);
  setCell(totalProj, 'C5', totalGlampingUnits);
  setCell(totalProj, 'D4', Math.round(totalRVCost));
  setCell(totalProj, 'D6', Math.round(totalGlampingCost));
  setCell(totalProj, 'D7', Math.round(addBldgTotal));
  setCell(totalProj, 'D8', Math.round(hardCostTotal));
  setCell(totalProj, 'D15', 0);

  const outBuffer = XLSX.write(wb, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  });

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
