/**
 * XLSX workbook parser for feasibility studies.
 *
 * Reads a complete .xlsx workbook, identifies target sheets by name,
 * converts each to row arrays, and routes to the appropriate parser.
 * Reuses existing CSV-based sub-parsers for Comps Summ., Best Comps,
 * and 10 yr PF sheets.
 */

import * as XLSX from 'xlsx';
import { extractStudyId, normaliseUnitCategory } from '@/lib/csv/feasibility-parser';
import type {
  ParsedWorkbook,
  ParsedProjectInfo,
  ParsedComparable,
  ParsedCompUnit,
  ParsedSummary,
  ParsedPropertyScore,
  ParsedProFormaUnit,
  ParsedValuation,
  ParsedFinancing,
  ParsedDevelopmentCost,
  ParsedRateProjection,
  ParsedOccupancyProjection,
  ParsedMarketData,
  ParsedAssumption,
  ParsedExpenseItem,
  SheetAliasConfig,
  ColumnRoleSchema,
  SeasonalRate,
  MonthlyOccupancy,
  YearlyReturn,
} from '@/lib/types/feasibility';
import {
  inferColumnRoles,
  inferBestCompsColumnOrder,
  detectHeaderRow,
  inferLabelValueLayout,
} from '@/lib/parsers/sheet-layout-detector';

const LAYOUT_CONFIDENCE_THRESHOLD = 0.8;

const COMPS_SUMM_OVERVIEW_SCHEMA: ColumnRoleSchema[] = [
  { role: 'name', keywords: ['name', 'property'] },
  { role: 'overview', keywords: ['overview', 'description'] },
  { role: 'amenities', keywords: ['amenities'] },
  { role: 'distance', keywords: ['distance'] },
  { role: 'totalSites', keywords: ['total', 'sites', 'units'] },
  { role: 'quality', keywords: ['quality'] },
];

const COMPS_SUMM_UNITS_SCHEMA: ColumnRoleSchema[] = [
  { role: 'name', keywords: ['name', 'property'] },
  { role: 'type', keywords: ['type', 'unit type'] },
  { role: 'units', keywords: ['sites', 'units'] },
  { role: 'lowAdr', keywords: ['low', 'daily', 'rate', 'adr'] },
  { role: 'peakAdr', keywords: ['peak', 'daily', 'rate', 'adr'] },
  { role: 'lowMonthly', keywords: ['low', 'monthly'] },
  { role: 'peakMonthly', keywords: ['peak', 'monthly'] },
  { role: 'lowOcc', keywords: ['low', 'occ'] },
  { role: 'peakOcc', keywords: ['peak', 'occ'] },
  { role: 'quality', keywords: ['quality'] },
];

const TEN_YR_PF_YEAR_KEYWORDS = new Set(['year', 'yr', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

// ---------------------------------------------------------------------------
// Default sheet aliases (configurable via parseWorkbook options)
// ---------------------------------------------------------------------------

const DEFAULT_SHEET_ALIASES: Required<SheetAliasConfig> = {
  comps_summary: ['Comps Summ.', 'Comps Summ', 'CompsSumm', 'Comps Summary', 'Comparable Summary', 'Comparables Summary', 'Comp Summary'],
  comps_grid: ['Comps Grid', 'CompsGrid', 'Comp Grid', 'Comparables Grid'],
  best_comps: ['Best Comps', 'Best Comparables', 'Property Scores', 'Comp Scores'],
  ten_yr_pf: ['10 yr PF', '10 Yr PF', '10yr PF', '10 Year PF', '10 Year Pro Forma', 'Pro Forma', '10yr Pro Forma'],
  intake_form: ['ToT (Intake Form)', 'ToT', 'TOT', 'Intake Form', 'Table of Contents'],
  financing: ['Financing'],
  irr: ['IRR'],
  total_project_cost: ['Total Proj. Cost', 'Total Proj Cost', 'Total Project Cost', 'Total Development Cost'],
  unit_costs: ['Unit Costs', 'Unit Cost'],
  rates_projection: ['Rates Proj', 'Rates Proj.', 'Rates Projection', 'Rate Projections'],
  occupancy_projection: ['Occ. Proj', 'Occ. Proj.', 'Occupancy Proj', 'Occupancy Projections'],
  misc_expenses: ['Misc. Expenses', 'Misc Expenses', 'Miscellaneous Expenses'],
  market_profile: ['Market Profile', 'Market Demographics', 'Demographics'],
  assumptions: ['Assumptions', 'Key Assumptions', 'Study Assumptions'],
};

function getSheetAliases(key: keyof SheetAliasConfig, custom?: Partial<SheetAliasConfig>): string[] {
  const customList = custom?.[key];
  const defaultList = DEFAULT_SHEET_ALIASES[key];
  if (customList?.length) return [...customList, ...defaultList.filter((a) => !customList.includes(a))];
  return defaultList;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

type CellValue = string | number | boolean | null | undefined;
type Row = CellValue[];

function sheetToRows(ws: XLSX.WorkSheet): Row[] {
  return XLSX.utils.sheet_to_json<CellValue[]>(ws, {
    header: 1,
    defval: '',
    blankrows: true,
  });
}

function num(val: CellValue): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val === 'string') {
    let s = val.trim();
    // Detect if the original string is a percentage (e.g. "45%", "-3.2%")
    const isPct = s.includes('%');
    // Strip currency symbols, percent signs, and whitespace but preserve minus/parens
    const isNegParens = /^\(.*\)$/.test(s);
    s = s.replace(/[$%,\s]/g, '');
    if (!s || s === '-' || s === '(' || s === ')') return null;
    if (isNegParens) s = '-' + s.replace(/[()]/g, '');
    const n = parseFloat(s);
    if (isNaN(n)) return null;
    // If it was a percentage string and the value is > 1, convert to decimal
    // (XLSX usually returns percentages as decimals already, but text cells may not)
    if (isPct && Math.abs(n) > 1) return n / 100;
    return n;
  }
  return null;
}

function int(val: CellValue): number | null {
  const n = num(val);
  return n !== null ? Math.round(n) : null;
}

function str(val: CellValue): string {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\r\n/g, ', ').replace(/\s+/g, ' ').trim();
}

function isBlank(row: Row): boolean {
  return row.every((c) => c === '' || c === null || c === undefined);
}

/** Safely get cell value; returns empty string if column is out of bounds or negative. */
function safeCell(row: Row, col: number): CellValue {
  if (col < 0 || !Array.isArray(row)) return '';
  return row[col] ?? '';
}

/** Reject comp names that are notes, subject rows, or invalid (numeric-only, too long, etc.) */
function isValidCompName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return false; // pure number (e.g. 291.51)
  if (/^(subject\s+projection|subject\s+property|insert|note|legend)$/i.test(trimmed)) return false;
  if (/\b(resort\s+fee|charges\s+a|incl\.|including|on\s+site\s+activit)/i.test(trimmed)) return false;
  if (/^[\d.\s]+$/.test(trimmed)) return false; // numbers and dots only
  if (trimmed.split(/\s+/).length > 15) return false; // likely a sentence/note
  return true;
}

/** Reject location values that are numeric (acreage, unit count) - use for overview only when it looks like a place */
function isValidLocationForOverview(loc: string | null): boolean {
  if (!loc || !loc.trim()) return false;
  const s = loc.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return false; // pure number
  if (/^\d+(\.\d+)?\s*acres?$/i.test(s)) return false; // "42.25 acres"
  if (/^\d+(\.\d+)?\s*unit\s*types?$/i.test(s)) return false; // "0.065 unit types"
  return true;
}

/** Reject unit types that are numeric (wrong column) - use for overview only when it looks like unit type names */
function isValidUnitTypesForOverview(ut: string | null): boolean {
  if (!ut || !ut.trim()) return false;
  const s = ut.trim();
  if (/^\d+(\.\d+)?$/.test(s)) return false; // pure number (e.g. 0.07)
  return true;
}

function findSheet(wb: XLSX.WorkBook, ...names: string[]): XLSX.WorkSheet | null {
  // Ranked matching: exact name, case-insensitive exact, starts-with prefix, contains
  for (const name of names) {
    const exact = wb.SheetNames.find((n) => n === name);
    if (exact) return wb.Sheets[exact];
  }
  for (const name of names) {
    const lower = name.toLowerCase().trim();
    const ciMatch = wb.SheetNames.find((n) => n.toLowerCase().trim() === lower);
    if (ciMatch) return wb.Sheets[ciMatch];
  }
  for (const name of names) {
    const lower = name.toLowerCase().trim();
    const prefix = wb.SheetNames.find(
      (n) => n.toLowerCase().trim().startsWith(lower) || lower.startsWith(n.toLowerCase().trim())
    );
    if (prefix) return wb.Sheets[prefix];
  }
  // Fallback: sheet name contains search term (e.g. "Comps Summary (Rev 2)" contains "Comps Summ")
  for (const name of names) {
    const lower = name.toLowerCase().trim();
    if (lower.length < 4) continue; // avoid overly broad matches
    const contains = wb.SheetNames.find((n) => n.toLowerCase().trim().includes(lower));
    if (contains) return wb.Sheets[contains];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sheet parsers — existing sheet types (adapted for native XLSX values)
// ---------------------------------------------------------------------------

function parseCompsSummSheet(rows: Row[], warnings: string[]): {
  comparables: ParsedComparable[];
  comp_units: ParsedCompUnit[];
  summaries: ParsedSummary[];
} {
  const comparables: ParsedComparable[] = [];
  const comp_units: ParsedCompUnit[] = [];
  const summaries: ParsedSummary[] = [];

  let section: 'overview' | 'units' | null = null;
  let overviewCols: { name: number; overview: number; amenities: number; distance: number; totalSites: number; quality: number } = {
    name: 0, overview: 1, amenities: 2, distance: 3, totalSites: 4, quality: 5,
  };
  let unitHeaderCols: { name: number; type: number; units: number; lowAdr: number; peakAdr: number; lowMonthly: number; peakMonthly: number; lowOcc: number; peakOcc: number; quality: number } | null = null;
  let overviewUsedDefaults = false;
  let unitsUsedFallbacks: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;

    const joined = row.map((c) => str(c).toLowerCase()).join('|');

    if (joined.includes('name') && joined.includes('overview') && !section) {
      section = 'overview';
      const inferred = inferColumnRoles(rows, i, COMPS_SUMM_OVERVIEW_SCHEMA);
      const mappedCount = inferred.size;
      const confidence = mappedCount / COMPS_SUMM_OVERVIEW_SCHEMA.length;

      if (confidence >= LAYOUT_CONFIDENCE_THRESHOLD && inferred.has('name') && inferred.has('overview')) {
        overviewCols = {
          name: inferred.get('name') ?? 0,
          overview: inferred.get('overview') ?? 1,
          amenities: inferred.get('amenities') ?? 2,
          distance: inferred.get('distance') ?? 3,
          totalSites: inferred.get('totalSites') ?? 4,
          quality: inferred.get('quality') ?? 5,
        };
        if (confidence < 1) {
          warnings.push(`Comps Summ.: Heuristic layout used for overview; confidence ${confidence.toFixed(2)}`);
        }
      } else {
        const lower = row.map((c) => str(c).toLowerCase());
        const nameIdx = lower.findIndex((c) => (c === 'name' || (c.includes('property') && c.includes('name'))) && !c.includes('overview'));
        const overviewIdx = lower.findIndex((c) => c.includes('overview') || c.includes('description'));
        const n = nameIdx >= 0 ? nameIdx : (overviewIdx >= 0 ? Math.max(0, overviewIdx - 1) : 0);
        const o = overviewIdx >= 0 ? overviewIdx : n + 1;
        if (nameIdx < 0 || overviewIdx < 0) overviewUsedDefaults = true;
        overviewCols = {
          name: n,
          overview: o,
          amenities: o + 1,
          distance: o + 2,
          totalSites: o + 3,
          quality: o + 4,
        };
      }
      continue;
    }

    if ((joined.includes('type') && (joined.includes('daily') || joined.includes('adr')) && joined.includes('rate')) ||
        (joined.includes('name') && joined.includes('type') && joined.includes('sites'))) {
      section = 'units';
      const inferred = inferColumnRoles(rows, i, COMPS_SUMM_UNITS_SCHEMA);
      const mappedCount = inferred.size;
      const confidence = mappedCount / COMPS_SUMM_UNITS_SCHEMA.length;
      const hasRequired = inferred.has('name') && inferred.has('type') && (inferred.has('lowAdr') || inferred.has('peakAdr'));

      if (confidence >= LAYOUT_CONFIDENCE_THRESHOLD && hasRequired) {
        unitHeaderCols = {
          name: inferred.get('name') ?? 0,
          type: inferred.get('type') ?? 1,
          units: inferred.get('units') ?? 2,
          lowAdr: inferred.get('lowAdr') ?? 3,
          peakAdr: inferred.get('peakAdr') ?? 4,
          lowMonthly: inferred.get('lowMonthly') ?? 5,
          peakMonthly: inferred.get('peakMonthly') ?? 6,
          lowOcc: inferred.get('lowOcc') ?? 7,
          peakOcc: inferred.get('peakOcc') ?? 8,
          quality: inferred.get('quality') ?? 9,
        };
        if (confidence < 1) {
          warnings.push(`Comps Summ.: Heuristic layout used for units; confidence ${confidence.toFixed(2)}`);
        }
      } else {
        const lower = row.map((c) => str(c).toLowerCase());
        const raw = {
          name: lower.findIndex((c) => c === 'name' || (c.includes('property') && c.includes('name'))),
          type: lower.findIndex((c) => c === 'type' || c.includes('unit type')),
          units: lower.findIndex((c) => c.includes('sites') || c.includes('units')),
          lowAdr: lower.findIndex((c) => c.includes('low') && (c.includes('daily') || c.includes('rate') || c.includes('adr'))),
          peakAdr: lower.findIndex((c) => c.includes('peak') && (c.includes('daily') || c.includes('rate') || c.includes('adr'))),
          lowMonthly: lower.findIndex((c) => c.includes('low') && c.includes('monthly')),
          peakMonthly: lower.findIndex((c) => c.includes('peak') && c.includes('monthly')),
          lowOcc: lower.findIndex((c) => c.includes('low') && c.includes('occ')),
          peakOcc: lower.findIndex((c) => c.includes('peak') && c.includes('occ')),
          quality: lower.findIndex((c) => c.includes('quality')),
        };
        if (raw.name < 0) unitsUsedFallbacks.push('name');
        if (raw.type < 0) unitsUsedFallbacks.push('type');
        if (raw.units < 0) unitsUsedFallbacks.push('units');
        if (raw.lowAdr < 0) unitsUsedFallbacks.push('lowAdr');
        if (raw.peakAdr < 0) unitsUsedFallbacks.push('peakAdr');
        if (raw.lowMonthly < 0) unitsUsedFallbacks.push('lowMonthly');
        if (raw.peakMonthly < 0) unitsUsedFallbacks.push('peakMonthly');
        if (raw.lowOcc < 0) unitsUsedFallbacks.push('lowOcc');
        if (raw.peakOcc < 0) unitsUsedFallbacks.push('peakOcc');
        if (raw.quality < 0) unitsUsedFallbacks.push('quality');
        unitHeaderCols = {
          name: raw.name >= 0 ? raw.name : 0,
          type: raw.type >= 0 ? raw.type : 1,
          units: raw.units >= 0 ? raw.units : 2,
          lowAdr: raw.lowAdr >= 0 ? raw.lowAdr : 3,
          peakAdr: raw.peakAdr >= 0 ? raw.peakAdr : 4,
          lowMonthly: raw.lowMonthly >= 0 ? raw.lowMonthly : 5,
          peakMonthly: raw.peakMonthly >= 0 ? raw.peakMonthly : 6,
          lowOcc: raw.lowOcc >= 0 ? raw.lowOcc : 7,
          peakOcc: raw.peakOcc >= 0 ? raw.peakOcc : 8,
          quality: raw.quality >= 0 ? raw.quality : 9,
        };
      }
      continue;
    }

    if (section === 'overview') {
      const c = overviewCols;
      let name = str(safeCell(row, c.name));
      let overview = str(safeCell(row, c.overview)) || null;
      let amenities = str(safeCell(row, c.amenities)) || null;
      let distance = num(safeCell(row, c.distance));
      let totalSites = int(safeCell(row, c.totalSites));
      let qualityScore = num(safeCell(row, c.quality));

      if (!name || name.toLowerCase() === 'name') continue;
      if (/^(minimum|average|max)/i.test(name)) continue;
      if (!isValidCompName(name)) continue;
      if (joined.includes('insert table')) { section = null; continue; }

      // Reorder only when the "name" column is a bare row number (1-3 digits, no
      // letters or hyphens) AND the "overview" column starts with an alpha character
      // — indicating the name was placed in the overview column instead.
      if (/^\d{1,3}$/.test(name) && overview && overview.length > 2 && /^[a-zA-Z]/.test(overview)) {
        name = overview;
        overview = amenities;
        amenities = str(safeCell(row, c.distance)) || null;
        distance = num(safeCell(row, c.totalSites));
        totalSites = int(safeCell(row, c.quality));
        qualityScore = num(safeCell(row, c.quality + 1));
      }

      if (!overview && !amenities && distance === null && totalSites === null && qualityScore === null) continue;

      const amenityKeywords: string[] = [];
      const amenLower = (amenities || '').toLowerCase();
      const kwMap: Record<string, string[]> = {
        'hot tub': ['hot tub', 'soaking tub'], pool: ['pool', 'swimming'], kitchen: ['kitchen', 'kitchenette'],
        fireplace: ['fireplace', 'fire pit'], deck: ['deck', 'patio', 'terrace'], grill: ['grill', 'bbq'],
        hiking: ['hiking', 'trail'], fishing: ['fishing', 'kayaking', 'lake'], spa: ['spa', 'sauna'],
        dining: ['dining', 'restaurant'], wifi: ['wifi', 'wi-fi'], hammock: ['hammock'],
      };
      for (const [kw, patterns] of Object.entries(kwMap)) {
        if (patterns.some((p) => amenLower.includes(p))) amenityKeywords.push(kw);
      }

      comparables.push({ comp_name: name, overview, amenities: amenities || null, amenity_keywords: amenityKeywords, distance_miles: distance, total_sites: totalSites, quality_score: qualityScore, property_type: null });
    }

    if (section === 'units' && unitHeaderCols) {
      const cols = unitHeaderCols;
      // Detect summary rows: "Minimum", "Average", "Maximum" must be the first
      // non-empty cell value (not buried in a description or property name).
      const firstCellText = str(safeCell(row, cols.name) || safeCell(row, cols.type) || '');
      const isSummaryRow = /^(minimum|average|max(imum)?)\b/i.test(firstCellText.trim());
      if (isSummaryRow) {
        let statType: 'market_min' | 'market_avg' | 'market_max' = 'market_avg';
        if (/^minimum/i.test(firstCellText)) statType = 'market_min';
        else if (/^max/i.test(firstCellText)) statType = 'market_max';
        summaries.push({
          summary_type: statType, label: statType.replace('market_', ''),
          num_units: int(safeCell(row, cols.units)),
          low_adr: num(safeCell(row, cols.lowAdr)),
          peak_adr: num(safeCell(row, cols.peakAdr)),
          low_monthly_rate: num(safeCell(row, cols.lowMonthly)),
          peak_monthly_rate: num(safeCell(row, cols.peakMonthly)),
          low_occupancy: num(safeCell(row, cols.lowOcc)),
          peak_occupancy: num(safeCell(row, cols.peakOcc)),
          quality_score: num(safeCell(row, cols.quality)),
        });
        continue;
      }
      if (/phase\s*\d/i.test(joined)) {
        const phaseMatch = joined.match(/phase\s*(\d+)/i);
        summaries.push({
          summary_type: 'phase', label: `Phase ${phaseMatch?.[1] || '?'}`,
          num_units: int(safeCell(row, cols.units)),
          low_adr: num(safeCell(row, cols.lowAdr)),
          peak_adr: num(safeCell(row, cols.peakAdr)),
          low_monthly_rate: num(safeCell(row, cols.lowMonthly)),
          peak_monthly_rate: num(safeCell(row, cols.peakMonthly)),
          low_occupancy: num(safeCell(row, cols.lowOcc)),
          peak_occupancy: num(safeCell(row, cols.peakOcc)),
          quality_score: num(safeCell(row, cols.quality)),
        });
        continue;
      }

      const propName = str(safeCell(row, cols.name));
      const unitType = str(safeCell(row, cols.type));
      if (!unitType) continue;
      const lowAdr = num(safeCell(row, cols.lowAdr));
      const peakAdr = num(safeCell(row, cols.peakAdr));
      if (lowAdr === null && peakAdr === null) continue;

      comp_units.push({
        property_name: propName || 'Unknown',
        unit_type: unitType,
        unit_category: normaliseUnitCategory(unitType),
        num_units: int(safeCell(row, cols.units)),
        low_adr: lowAdr, peak_adr: peakAdr, avg_annual_adr: null,
        low_monthly_rate: num(safeCell(row, cols.lowMonthly)),
        peak_monthly_rate: num(safeCell(row, cols.peakMonthly)),
        low_occupancy: num(safeCell(row, cols.lowOcc)),
        peak_occupancy: num(safeCell(row, cols.peakOcc)),
        quality_score: num(safeCell(row, cols.quality)),
      });
    }
  }

  if (overviewUsedDefaults) {
    warnings.push('Comps Summ.: Overview section used default column positions; headers may not match expected layout.');
  }
  if (unitsUsedFallbacks.length > 0) {
    warnings.push(`Comps Summ.: Units section used fallback columns for: ${unitsUsedFallbacks.join(', ')}`);
  }
  if (section === 'overview' && comparables.length === 0) {
    warnings.push('Comps Summ.: Overview section detected but no comparables extracted.');
  }
  if (section === 'units' && unitHeaderCols && comp_units.length === 0 && summaries.length === 0) {
    warnings.push('Comps Summ.: Units section detected but no unit records or summaries extracted.');
  }

  return { comparables, comp_units, summaries };
}

/**
 * Parse "Comps Grid" sheet: property-level comparables with amenity columns.
 * Structure: Name | Location | Unit Types | Total Unit Count | Property Acreage | [Amenity cols...] | Daily Resort Fee | Low Season | High Season | Average | Operating Season Months | Quality Score
 */
function parseCompsGridSheet(rows: Row[], warnings: string[]): {
  comparables: ParsedComparable[];
  comp_units: ParsedCompUnit[];
} {
  const comparables: ParsedComparable[] = [];
  const comp_units: ParsedCompUnit[] = [];
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;
    const joined = row.map((c) => str(c).toLowerCase()).join(' ');
    const firstCell = str(safeCell(row, 0)).toLowerCase();
    const isSummaryHeader = /^(average|minimum|maximum)/i.test(firstCell);
    if (
      joined.includes('name') &&
      (joined.includes('location') || joined.includes('market')) &&
      joined.includes('unit') &&
      !isSummaryHeader
    ) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx < 0) {
    warnings.push('Comps Grid: Could not find header row (expected Name, Location, Unit Types, etc.).');
    return { comparables, comp_units };
  }

  const headerRow = rows[headerRowIdx];
  const headers = headerRow.map((c) => str(c).toLowerCase().trim());

  const nameCol = headers.findIndex((h) => h === 'name' || (h.includes('property') && h.includes('name')));
  const locCol = headers.findIndex((h) => h.includes('location') || h.includes('market'));
  const unitTypeCol = headers.findIndex((h) => h.includes('unit type'));
  const totalCol = headers.findIndex((h) => (h.includes('total') && h.includes('unit')) || h === 'total unit count');
  const acreageCol = headers.findIndex((h) => h.includes('acreage'));
  const dailyFeeCol = headers.findIndex((h) => h.includes('daily') && h.includes('resort'));
  const lowSeasonCol = headers.findIndex((h) => h.includes('low') && h.includes('season'));
  const highSeasonCol = headers.findIndex((h) => h.includes('high') && h.includes('season'));
  const avgCol = headers.findIndex((h) => h.includes('average') && (h.includes('rate') || h.includes('rates')));
  const opSeasonCol = headers.findIndex((h) => h.includes('operating') && h.includes('season'));
  const qualityCol = headers.findIndex((h) => h.includes('quality') && h.includes('score'));

  if (nameCol < 0) {
    warnings.push('Comps Grid: Name column not found.');
    return { comparables, comp_units };
  }

  const amenityCols: { col: number; label: string }[] = [];
  const dataStartCol = Math.max(0, acreageCol >= 0 ? acreageCol + 1 : totalCol >= 0 ? totalCol + 1 : 5);
  const metricColIndices = [dailyFeeCol, lowSeasonCol, highSeasonCol, avgCol, opSeasonCol, qualityCol].filter((x) => x >= 0);
  const firstMetricCol = metricColIndices.length > 0 ? Math.min(...metricColIndices) : headerRow.length;
  const dataEndCol = Math.min(headerRow.length, firstMetricCol);

  const amenityExclude = new Set(['rate', 'rates', 'fee', 'score', 'season', 'average', 'operating', 'months', 'daily', 'resort']);
  for (let c = dataStartCol; c < dataEndCol; c++) {
    const h = headers[c] || '';
    if (!h || h.length > 80) continue;
    const words = h.split(/[\s\/]+/).map((w) => w.toLowerCase());
    const isMetricCol = words.some((w) => amenityExclude.has(w));
    if (!isMetricCol && h.length > 2) {
      amenityCols.push({ col: c, label: str(headerRow[c]) || h });
    }
  }

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;

    const name = str(safeCell(row, nameCol >= 0 ? nameCol : 0)).trim();
    if (!name) continue;
    if (/^(average|minimum|maximum|insert|note|legend|resort fee)/i.test(name)) continue;
    if (/^\d+$/.test(name) && name.length < 4) continue;
    if (!isValidCompName(name)) continue;

    const rawLocation = locCol >= 0 ? str(safeCell(row, locCol)) || null : null;
    const location = isValidLocationForOverview(rawLocation) ? rawLocation : null;
    const rawUnitTypes = unitTypeCol >= 0 ? str(safeCell(row, unitTypeCol)) || null : null;
    const unitTypes = isValidUnitTypesForOverview(rawUnitTypes) ? rawUnitTypes : null;
    const totalSites = totalCol >= 0 ? int(safeCell(row, totalCol)) : null;
    const qualityScore = qualityCol >= 0 ? num(safeCell(row, qualityCol)) : null;

    const amenityKeywords: string[] = [];
    for (const { col, label } of amenityCols) {
      const val = safeCell(row, col);
      const s = str(val).toLowerCase().trim();
      const numVal = typeof val === 'number' ? val : null;
      const isPresent =
        s === 'x' ||
        s === '✓' ||
        s === '✔' ||
        s === 'yes' ||
        s === 'y' ||
        s === '1' ||
        numVal === 1 ||
        (s.length > 0 && s.length < 6 && !/^\d+$/.test(s));
      if (isPresent && label) {
        const shortLabel = label.split(/[\/\&]/)[0].trim();
        if (shortLabel && shortLabel.length > 2) amenityKeywords.push(shortLabel);
      }
    }

    const overview = location ? `Location: ${location}${unitTypes ? `. Unit types: ${unitTypes}` : ''}` : (unitTypes ? `Unit types: ${unitTypes}` : null);
    const amenities = amenityKeywords.length > 0 ? amenityKeywords.join(', ') : null;

    comparables.push({
      comp_name: name,
      overview,
      amenities,
      amenity_keywords: amenityKeywords,
      distance_miles: null,
      total_sites: totalSites,
      quality_score: qualityScore,
      property_type: unitTypes,
    });

    const lowAdr = lowSeasonCol >= 0 ? num(safeCell(row, lowSeasonCol)) : null;
    const peakAdr = highSeasonCol >= 0 ? num(safeCell(row, highSeasonCol)) : null;
    const avgAdr = avgCol >= 0 ? num(safeCell(row, avgCol)) : null;
    if (lowAdr !== null || peakAdr !== null || avgAdr !== null) {
      comp_units.push({
        property_name: name,
        unit_type: unitTypes || 'Unknown',
        unit_category: normaliseUnitCategory(unitTypes || ''),
        num_units: totalSites,
        low_adr: lowAdr,
        peak_adr: peakAdr,
        avg_annual_adr: avgAdr,
        low_monthly_rate: null,
        peak_monthly_rate: null,
        low_occupancy: null,
        peak_occupancy: null,
        quality_score: qualityScore,
      });
    }
  }

  return { comparables, comp_units };
}

function parseBestCompsSheet(rows: Row[], warnings: string[]): ParsedPropertyScore[] {
  function runParse(nameCol: number, scoreCol: number, descCol: number): ParsedPropertyScore[] {
    const scores: ParsedPropertyScore[] = [];
    let current: ParsedPropertyScore | null = null;

  function matchCat(text: string): string | null {
    const l = text.toLowerCase().trim();
    // Check more specific categories first (property_amenities before property)
    if (l.includes('unit type') || l === 'unit types') return 'unit_types';
    if (l.includes('unit amenities')) return 'unit_amenities';
    if (l.includes('property amenities')) return 'property_amenities';
    if (l === 'property' || (l.startsWith('property') && !l.includes('amenities'))) return 'property';
    if (l.includes('location')) return 'location';
    if (l.includes('brand strength')) return 'brand_strength';
    if (l.includes('occupancy notes')) return 'occupancy_notes';
    return null;
  }

  /** Column headers / labels that are never valid property names */
  const PROPERTY_NAME_BLACKLIST = new Set([
    'description', 'name', 'score', 'notes', 'overview', 'property', 'location',
    'unit type', 'unit types', 'unit amenities', 'property amenities', 'brand strength',
    'occupancy notes', 'subject', 'total', 'average', 'minimum', 'maximum',
  ]);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;
    if (isBlank(row)) continue;

    const col1 = str(safeCell(row, nameCol));
    const col2 = safeCell(row, scoreCol);
    const col3 = str(safeCell(row, descCol));

    if (col1 && !matchCat(col1) && !PROPERTY_NAME_BLACKLIST.has(col1.toLowerCase().trim()) && col2 !== '' && col2 !== null && col2 !== undefined) {
      const score = num(col2);
      if (score !== null && score >= 0 && score <= 10 && (col3.toLowerCase() === 'description' || col3 === '')) {
        if (current) scores.push(current);
        current = {
          property_name: col1, overall_score: score, is_subject: false,
          unit_types_score: null, unit_types_description: null,
          unit_amenities_score: null, unit_amenities_description: null,
          property_score: null, property_description: null,
          property_amenities_score: null, property_amenities_description: null,
          location_score: null, location_description: null,
          brand_strength_score: null, brand_strength_description: null,
          occupancy_notes: null,
        };
        continue;
      }
    }

    if (!current) {
      if (str(safeCell(row, 0)).toLowerCase().startsWith('subject') || str(safeCell(row, nameCol)).toLowerCase().startsWith('subject')) {
        const subjScore = num(safeCell(row, scoreCol)) ?? num(safeCell(row, nameCol));
        if (subjScore !== null) {
          current = {
            property_name: 'Subject Property', overall_score: subjScore, is_subject: true,
            unit_types_score: null, unit_types_description: null,
            unit_amenities_score: null, unit_amenities_description: null,
            property_score: null, property_description: null,
            property_amenities_score: null, property_amenities_description: null,
            location_score: null, location_description: null,
            brand_strength_score: null, brand_strength_description: null,
            occupancy_notes: null,
          };
          continue;
        }
      }
      continue;
    }

    const category = matchCat(col1);
    if (!category) continue;
    const s = num(col2);
    const desc = col3 || null;

    switch (category) {
      case 'unit_types': current.unit_types_score = s; current.unit_types_description = desc; break;
      case 'unit_amenities': current.unit_amenities_score = s; current.unit_amenities_description = desc; break;
      case 'property': current.property_score = s; current.property_description = desc; break;
      case 'property_amenities': current.property_amenities_score = s; current.property_amenities_description = desc; break;
      case 'location': current.location_score = s; current.location_description = desc; break;
      case 'brand_strength': current.brand_strength_score = s; current.brand_strength_description = desc; break;
      case 'occupancy_notes': current.occupancy_notes = desc; break;
    }
  }
  if (current) scores.push(current);
  return scores;
  }

  const colOrder = inferBestCompsColumnOrder(rows);
  let nameCol = colOrder?.nameCol ?? 1;
  let scoreCol = colOrder?.scoreCol ?? 2;
  let descCol = colOrder?.descCol ?? 3;
  if (colOrder && (nameCol !== 1 || scoreCol !== 2 || descCol !== 3)) {
    warnings.push('Best Comps: Heuristic column order used for flexible layout.');
  }

  let scores = runParse(nameCol, scoreCol, descCol);

  // Fallback: when inference yields 0 scores, try standard layout (name=1, score=2, desc=3)
  if (scores.length === 0 && (nameCol !== 1 || scoreCol !== 2 || descCol !== 3)) {
    scores = runParse(1, 2, 3);
  }

  if (scores.length === 0 && rows.some((r) => r && r.length > 0)) {
    warnings.push('Best Comps: Sheet has content but no property scores extracted; layout may differ from expected.');
  }
  return scores;
}

function parseTenYrPFSheet(rows: Row[], warnings: string[]): {
  units: ParsedProFormaUnit[];
  valuation: ParsedValuation | null;
  expenses: ParsedExpenseItem[];
} {
  const units: ParsedProFormaUnit[] = [];
  const expenses: ParsedExpenseItem[] = [];

  let yearCols: number[] = [];
  const yearHeaderResult = detectHeaderRow(rows, TEN_YR_PF_YEAR_KEYWORDS);
  if (yearHeaderResult && yearHeaderResult.confidence >= LAYOUT_CONFIDENCE_THRESHOLD) {
    const headerRow = rows[yearHeaderResult.rowIndex];
    if (headerRow) {
      for (let c = 0; c < headerRow.length; c++) {
        const v = str(headerRow[c]).trim();
        if (/^(?:Year|Yr)\.?\s*\d{1,2}$/i.test(v)) yearCols.push(c);
      }
      if (yearCols.length === 0) {
        for (let c = 0; c < headerRow.length; c++) {
          const v = headerRow[c];
          if (typeof v === 'number' && v >= 1 && v <= 20 && Number.isInteger(v)) yearCols.push(c);
        }
      }
      if (yearCols.length >= 2) {
        warnings.push('10 yr PF: Heuristic year header detection used.');
      }
    }
  }

  let currentType: string | null = null;
  let currentCount: number | null = null;
  let currentGrowth: number | null = null;
  let currentYearly: Array<{ year: number; adr: number | null; occupancy: number | null; site_nights: number | null; revenue: number | null }> = [];

  const yearlyTotals: Array<{ year: number; total_revenue: number | null; total_expenses: number | null; noi: number | null; noi_margin: number | null }> = [];
  let inExpenseSection = false;
  let terminalCap: number | null = null;
  let projectedSalePrice: number | null = null;
  let mainTableDone = false;

  function flush() {
    if (currentType && currentYearly.length > 0) {
      units.push({
        unit_type: currentType, unit_category: normaliseUnitCategory(currentType),
        unit_count: currentCount, adr_growth_rate: currentGrowth, yearly_data: [...currentYearly],
      });
    }
    currentType = null; currentCount = null; currentGrowth = null; currentYearly = [];
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;
    const joined = row.map((c) => str(c).toLowerCase()).join('|');

    // Detect year header row: "Year 1", "Yr. 1", "Year1", "Yr 1", plain numbers 1-10, etc.
    if ((joined.includes('year') || joined.includes('yr')) && /(?:year|yr)\.?\s*[12]/i.test(joined)) {
      yearCols = [];
      for (let c = 0; c < row.length; c++) {
        const v = str(row[c]).trim();
        if (/^(?:Year|Yr)\.?\s*\d{1,2}$/i.test(v)) yearCols.push(c);
      }
      // Fallback: if header has plain numbers 1-20 in sequence (no "Year" prefix)
      if (yearCols.length === 0) {
        for (let c = 0; c < row.length; c++) {
          const v = row[c];
          if (typeof v === 'number' && v >= 1 && v <= 20 && Number.isInteger(v)) yearCols.push(c);
        }
      }
      if (yearCols.length >= 2) continue;
      yearCols = [];
    }
    if (yearCols.length === 0) continue;

    const label = str(row[1] ?? row[0] ?? '');
    const labelLower = label.toLowerCase();

    // Detect unit type row: has a name + integer count in first year column,
    // AND subsequent rows contain ADR/Occupancy (look-ahead confirmation).
    if (label && typeof row[yearCols[0]] === 'number') {
      const firstVal = num(row[yearCols[0]]);
      if (firstVal !== null && firstVal > 0 && firstVal <= 50000 && Number.isInteger(firstVal)) {
        let hasAdrOrOccBelow = false;
        for (let peek = i + 1; peek < Math.min(i + 5, rows.length); peek++) {
          const peekLabel = str(rows[peek]?.[1] ?? rows[peek]?.[0] ?? '').toLowerCase();
          if (peekLabel === 'adr' || peekLabel.startsWith('adr') || peekLabel === 'occupancy' || peekLabel.startsWith('occupancy')) {
            hasAdrOrOccBelow = true;
            break;
          }
        }
        if (hasAdrOrOccBelow) {
          flush();
          currentType = label;
          currentCount = firstVal;
          continue;
        }
      }
    }

    if (currentType) {
      if (labelLower === 'adr' || labelLower.startsWith('adr')) {
        currentGrowth = num(row[1]) ?? num(row[2]);
        yearCols.forEach((c, idx) => {
          if (!currentYearly[idx]) currentYearly[idx] = { year: idx + 1, adr: null, occupancy: null, site_nights: null, revenue: null };
          currentYearly[idx].adr = num(row[c]);
        });
        continue;
      }
      if (labelLower === 'occupancy' || labelLower.startsWith('occupancy')) {
        yearCols.forEach((c, idx) => {
          if (!currentYearly[idx]) currentYearly[idx] = { year: idx + 1, adr: null, occupancy: null, site_nights: null, revenue: null };
          currentYearly[idx].occupancy = num(row[c]);
        });
        continue;
      }
      if (labelLower.includes('site nights')) {
        yearCols.forEach((c, idx) => {
          if (!currentYearly[idx]) currentYearly[idx] = { year: idx + 1, adr: null, occupancy: null, site_nights: null, revenue: null };
          currentYearly[idx].site_nights = int(row[c]);
        });
        continue;
      }
      if (labelLower === 'revenue' || labelLower.startsWith('revenue')) {
        yearCols.forEach((c, idx) => {
          if (!currentYearly[idx]) currentYearly[idx] = { year: idx + 1, adr: null, occupancy: null, site_nights: null, revenue: null };
          currentYearly[idx].revenue = num(row[c]);
        });
        flush();
        continue;
      }
    }

    // Detect end of the main multi-year table (e.g. "Year 5 - Stabilized" section)
    if (joined.includes('stabilized') || joined.includes('year 5 -') || joined.includes('yr 5 -')) {
      mainTableDone = true;
    }

    // Only parse totals rows from the main multi-year table, not from summary sections below
    if (!mainTableDone) {
      // Match "Total Revenue", "Total Lodging Revenue", "Total Gross Revenue", etc.
      if (/total\s+(?:lodging\s+|gross\s+)?revenue/i.test(joined)) {
        flush();
        inExpenseSection = true;
        yearCols.forEach((c, idx) => {
          if (!yearlyTotals[idx]) yearlyTotals[idx] = { year: idx + 1, total_revenue: null, total_expenses: null, noi: null, noi_margin: null };
          const v = num(row[c]);
          if (v !== null) yearlyTotals[idx].total_revenue = v;
        });
        continue;
      }

      // Capture individual expense lines between "Total Revenue" and "Total Expense"
      if (inExpenseSection && label && yearCols.length > 0) {
        const isTotalLine = /^total\s+expense/i.test(label) || /^net\s+operating/i.test(label) || labelLower === 'noi';
        if (isTotalLine) {
          inExpenseSection = false;
        } else if (!joined.includes('total revenue')) {
          const hasValues = yearCols.some((c) => num(row[c]) !== null);
          if (hasValues && label.length > 1 && !/^(expenses?|operating expenses?)$/i.test(label)) {
            let category = 'operating';
            if (/payroll|staff|salary|wage|housekeeping|labor/i.test(labelLower)) category = 'payroll';
            else if (/marketing|advertis/i.test(labelLower)) category = 'marketing';
            else if (/repair|maintenance|r&m/i.test(labelLower)) category = 'maintenance';
            else if (/utilit|electric|water|gas|wi-fi|internet/i.test(labelLower)) category = 'utilities';
            else if (/insurance/i.test(labelLower)) category = 'insurance';
            else if (/tax/i.test(labelLower)) category = 'taxes';
            else if (/management\s+fee|property\s+management/i.test(labelLower)) category = 'management';
            else if (/room\s+turn|linen|cleaning/i.test(labelLower)) category = 'room_turnover';
            else if (/reserve|replacement/i.test(labelLower)) category = 'reserves';
            else if (/franchise|brand|license/i.test(labelLower)) category = 'franchise';
            else if (/food|f&b|beverage/i.test(labelLower)) category = 'food_beverage';
            else if (/admin|g&a|general/i.test(labelLower)) category = 'admin';

            const yearlyAmounts: Array<{ year: number; amount: number | null }> = [];
            yearCols.forEach((c, idx) => {
              yearlyAmounts.push({ year: idx + 1, amount: num(row[c]) });
            });

            const yr1Amount = yearlyAmounts[0]?.amount ?? null;
            const totalRevYr1 = yearlyTotals[0]?.total_revenue;
            const pctOfRevenue = yr1Amount !== null && totalRevYr1 && totalRevYr1 > 0
              ? yr1Amount / totalRevYr1
              : null;

            const totalUnits = units.reduce((s, u) => s + (u.unit_count || 0), 0);
            const perUnit = yr1Amount !== null && totalUnits > 0 ? yr1Amount / totalUnits : null;

            expenses.push({
              category,
              label,
              yearly_amounts: yearlyAmounts,
              per_unit: perUnit,
              pct_of_revenue: pctOfRevenue,
            });
            continue;
          }
        }
      }

      // Match "Total Expense(s)" with optional "w/ Reserve" or "with Reserves"
      if (/total\s+expense/i.test(joined) && !/^noi\b/i.test(labelLower)) {
        inExpenseSection = false;
        yearCols.forEach((c, idx) => {
          if (!yearlyTotals[idx]) yearlyTotals[idx] = { year: idx + 1, total_revenue: null, total_expenses: null, noi: null, noi_margin: null };
          const v = num(row[c]);
          if (v !== null) yearlyTotals[idx].total_expenses = v;
        });
      }
      if (joined.includes('net operating income') || (labelLower === 'noi' && !joined.includes('%'))) {
        inExpenseSection = false;
        yearCols.forEach((c, idx) => {
          if (!yearlyTotals[idx]) yearlyTotals[idx] = { year: idx + 1, total_revenue: null, total_expenses: null, noi: null, noi_margin: null };
          const v = num(row[c]);
          if (v !== null) yearlyTotals[idx].noi = v;
        });
      }
      if (joined.includes('noi %') || joined.includes('noi margin') || (labelLower.includes('noi') && labelLower.includes('%'))) {
        yearCols.forEach((c, idx) => {
          if (!yearlyTotals[idx]) yearlyTotals[idx] = { year: idx + 1, total_revenue: null, total_expenses: null, noi: null, noi_margin: null };
          const v = num(row[c]);
          if (v !== null) yearlyTotals[idx].noi_margin = v;
        });
      }
    }

    if (joined.includes('terminal cap')) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 0 && v < 1) { terminalCap = v; break; } }
    }
    if (joined.includes('sales price') || joined.includes('sale price')) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 100000) { projectedSalePrice = v; break; } }
    }
  }
  flush();

  // Fallback: if no "Total Revenue" row was found but we have unit revenues, sum them by year (Total Lodging Revenue)
  if (yearlyTotals.every((yt) => yt.total_revenue == null) && units.length > 0) {
    const maxYears = Math.max(...units.map((u) => u.yearly_data?.length ?? 0));
    for (let idx = 0; idx < maxYears; idx++) {
      if (!yearlyTotals[idx]) yearlyTotals[idx] = { year: idx + 1, total_revenue: null, total_expenses: null, noi: null, noi_margin: null };
      let sum = 0;
      for (const u of units) {
        const yd = u.yearly_data?.[idx];
        if (yd?.revenue != null) sum += yd.revenue;
      }
      if (sum > 0) yearlyTotals[idx].total_revenue = sum;
    }
  }

  let valuation: ParsedValuation | null = null;
  if (yearlyTotals.length > 0) {
    const yr5 = yearlyTotals[4] || yearlyTotals[yearlyTotals.length - 1];
    valuation = {
      valuation_type: 'pro_forma',
      total_units: units.reduce((s, u) => s + (u.unit_count || 0), 0),
      occupancy_rate: null, average_daily_rate: null, annual_lodging_revenue: null,
      total_revenue: yr5?.total_revenue || null,
      total_expenses: yr5?.total_expenses || null,
      total_expenses_with_reserves: null,
      noi: yr5?.noi || null, noi_margin: yr5?.noi_margin || null,
      cap_rate: terminalCap, indicated_value: projectedSalePrice,
      value_per_unit: null, stabilization_months: null, stabilization_cost: null,
      as_is_value: null, discount_rate: null,
      terminal_cap_rate: terminalCap, projected_sale_price: projectedSalePrice,
      market_rental_rates: [], expense_breakdown: [],
      yearly_projections: yearlyTotals,
    };
  }

  if (units.length === 0 && !valuation && rows.some((r) => r && r.length > 0)) {
    warnings.push('10 yr PF: Sheet has content but no pro forma units or valuation extracted.');
  }
  return { units, valuation, expenses };
}

// ---------------------------------------------------------------------------
// Sheet parsers — NEW sheet types
// ---------------------------------------------------------------------------

/** Reject values that look like descriptions/sentences rather than resort names */
function looksLikeResortName(val: string): boolean {
  if (!val || val.length > 60) return false;
  const lower = val.toLowerCase().trim();
  if (/^(with|the|a|an|this|that|proposed|feasibility)\s/i.test(lower)) return false;
  if (lower.includes(' the proposed ') || lower.includes('proposed ')) return false;
  if (lower.split(/\s+/).length > 8) return false;
  return true;
}

function parseToTSheet(rows: Row[]): ParsedProjectInfo {
  const info: ParsedProjectInfo = {
    resort_name: null, resort_type: null, resort_address: null, county: null,
    lot_size_acres: null, parcel_number: null, report_purpose: null,
    unit_descriptions: [],
  };

  const lvLayout = inferLabelValueLayout(rows);
  let labelCol = lvLayout.labelCol;
  let valueCol = lvLayout.valueCol;

  // ToT often has label in col1, value in col2 (col0 empty). inferLabelValueLayout only considers col0/col1.
  const tryLayouts: [number, number][] = [[labelCol, valueCol], [1, 2], [2, 1], [0, 2], [2, 0]];

  const extractFromRows = (lCol: number, vCol: number, onlyFillMissing: boolean) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const label = str(safeCell(row, lCol)).toLowerCase().replace(/[:：]/g, '').trim();

      if (label === 'report type' || label.includes('report type')) {
        if (!onlyFillMissing || !info.resort_type) info.resort_type = info.resort_type || str(safeCell(row, vCol)) || null;
      }
      if (label === 'resort name' || label.includes('resort name') || label === 'property name' || label.includes('property name') || label.includes('project name')) {
        const val = str(safeCell(row, vCol)) || null;
        if (val && (looksLikeResortName(val) || (val.length >= 3 && val.length <= 60 && !/^(with|the|a|an)\s/i.test(val)))) {
          if (!onlyFillMissing || !info.resort_name) info.resort_name = val;
        }
      }
      if (label === 'resort type' || label.includes('resort type')) {
        if (!onlyFillMissing || !info.resort_type) info.resort_type = info.resort_type || str(safeCell(row, vCol)) || null;
      }
      if (label.includes('resort county') || label.includes('property county') || label.includes('subject county') || label === 'county') {
        const val = str(safeCell(row, vCol)) || null;
        if (val && val.length >= 2 && val.length <= 80 && (!onlyFillMissing || !info.county)) info.county = val;
      }
      if (label.includes('lot size') && label.includes('acres')) info.lot_size_acres = info.lot_size_acres ?? num(safeCell(row, vCol));
      if (label.includes('parcel number')) info.parcel_number = info.parcel_number || str(safeCell(row, vCol)) || null;
      if (label.includes('purpose of the report')) info.report_purpose = info.report_purpose || str(safeCell(row, vCol)) || null;
      if (label.includes('resort full address') || label === 'resort address' || label.includes('property address')) {
        info.resort_address = info.resort_address || str(safeCell(row, vCol)) || null;
      }

      if (/^unit [a-f] type$/i.test(label)) {
        const unitType = str(safeCell(row, vCol));
        if (unitType) {
          const letterMatch = label.match(/unit ([a-f])/i);
          const letter = letterMatch ? letterMatch[1].toUpperCase() : '';
          let qty: number | null = null;
          let desc: string | null = null;
          for (let j = i + 1; j < Math.min(i + 3, rows.length); j++) {
            const nextRow = rows[j];
            const nextLabel = str(safeCell(nextRow, lCol)).toLowerCase();
            if (nextLabel.includes(`unit ${letter.toLowerCase()} quantity`)) qty = int(safeCell(nextRow, vCol));
            if (nextLabel.includes(`unit ${letter.toLowerCase()} description`)) desc = str(safeCell(nextRow, vCol)) || null;
          }
          info.unit_descriptions.push({ type: unitType, quantity: qty, description: desc });
        }
      }
    }
  };

  extractFromRows(labelCol, valueCol, false);

  // Fallback: try alternative column layouts when resort_name or county still null
  for (let k = 1; k < tryLayouts.length && (!info.resort_name || !info.county); k++) {
    const [l, v] = tryLayouts[k];
    if (l === labelCol && v === valueCol) continue;
    extractFromRows(l, v, true);
  }

  return info;
}

function parseFinancingSheet(rows: Row[]): Omit<ParsedFinancing, 'irr_on_equity'> {
  const result: Omit<ParsedFinancing, 'irr_on_equity'> = {
    interest_rate: null, loan_term_years: null, ltc_ratio: null, equity_pct: null,
    mortgage_amount: null, annual_debt_service: null, total_development_cost: null,
    land_cost: null, total_project_cost: null, payback_period_years: null,
    yearly_returns: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const joined = row.map((c) => str(c).toLowerCase()).join('|');

    if (joined.includes('interest rate') && joined.includes('annual')) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 0 && v < 1) { result.interest_rate = v; break; } }
    }
    if (joined.includes('term') && joined.includes('year')) {
      for (const cell of row) { const v = int(cell); if (v !== null && v > 1 && v <= 50) { result.loan_term_years = v; break; } }
    }
    if (joined.includes('ltc') || (joined.includes('% financed') && !joined.includes('equity'))) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 0 && v <= 1) { result.ltc_ratio = v; break; } }
    }
    if (joined.includes('equity investment') && !joined.includes('$') && !joined.includes('based')) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 0 && v <= 1) { result.equity_pct = v; break; } }
    }
    if (joined.includes('mortgage amount') || joined.includes('loan amount')) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 100000) { result.mortgage_amount = v; break; } }
    }
    if (joined.includes('annual debt service') || joined.includes('annual payment')) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 10000) { result.annual_debt_service = v; break; } }
    }
    if (joined.includes('total construction') || joined.includes('total development cost')) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 100000) { result.total_development_cost = v; break; } }
    }
    if (joined.includes('land cost') && !joined.includes('total')) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 1000) { result.land_cost = v; break; } }
    }
    if (joined.includes('total project cost') && !joined.includes('development')) {
      for (const cell of row) { const v = num(cell); if (v !== null && v > 100000) { result.total_project_cost = v; break; } }
    }
    if (joined.includes('payback period')) {
      for (const cell of row) { const v = int(cell); if (v !== null && v >= 1 && v <= 30) { result.payback_period_years = v; break; } }
    }

    // Yearly returns: look for year headers followed by NOI, net income, cash-on-cash, DCR
    if (joined.includes('year') && joined.includes('noi') && joined.includes('net income')) {
      continue;
    }
    if (/^\|*\s*\|*year\|/.test(joined) || joined.startsWith('|year|')) continue;
  }

  // Parse yearly return blocks: typically two blocks (years 1-5, years 6-10)
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const label = str(row[1] ?? row[0] ?? '').toLowerCase();

    // Match NOI row: "NOI", "Net Operating Income", but not "NOI %" or "NOI Margin"
    const isNoiRow = (label === 'noi' || label.includes('net operating income') || label.startsWith('noi'))
      && !label.includes('%') && !label.includes('margin');

    if (isNoiRow) {
      const nextRows: Record<string, Row> = {};
      nextRows['noi'] = row;
      for (let j = i + 1; j < Math.min(i + 8, rows.length); j++) {
        const rl = str(rows[j]?.[1] ?? rows[j]?.[0] ?? '').toLowerCase();
        if (rl.includes('net income') || rl.includes('net operating') || rl.includes('return on equity')) nextRows['net_income'] = rows[j]!;
        if (rl.includes('debt coverage') || rl.includes('dcr') || rl.includes('dscr') || rl.includes('debt service coverage')) nextRows['dcr'] = rows[j]!;
        if (rl.includes('cash on cash') || rl.includes('cash-on-cash') || rl.includes('coc') || rl.includes('equity dividend')) nextRows['coc'] = rows[j]!;
      }

      // Find the year columns in the header above — search up to 3 rows above
      let yrCols: number[] = [];
      for (let above = 1; above <= 3 && yrCols.length === 0; above++) {
        const headerRow = rows[i - above];
        if (!headerRow) continue;
        for (let c = 0; c < headerRow.length; c++) {
          const v = headerRow[c];
          if (typeof v === 'number' && v >= 1 && v <= 10 && Number.isInteger(v)) yrCols.push(c);
          const sv = str(v).trim();
          if (/^(?:Year|Yr)\.?\s*(\d{1,2})$/i.test(sv)) {
            yrCols.push(c);
          }
        }
      }
      if (yrCols.length === 0) continue;

      // Determine actual header row for year number extraction
      const headerIdx = yrCols.length > 0 ? (rows[i - 1] ? i - 1 : i - 2) : i - 1;
      const headerRow = rows[headerIdx];
      if (!headerRow) continue;

      for (const c of yrCols) {
        let year: number | null = null;
        const hv = headerRow[c];
        if (typeof hv === 'number') year = Math.round(hv);
        else {
          const m = str(hv).match(/(\d{1,2})/);
          if (m) year = parseInt(m[1], 10);
        }
        if (year === null || year < 1 || year > 10) continue;
        const existing = result.yearly_returns.find((r) => r.year === year);
        const entry: YearlyReturn = existing || { year, noi: null, net_income_to_equity: null, cash_on_cash: null, dcr: null };
        if (nextRows['noi']) entry.noi = num(nextRows['noi'][c]);
        if (nextRows['net_income']) entry.net_income_to_equity = num(nextRows['net_income'][c]);
        if (nextRows['dcr']) entry.dcr = num(nextRows['dcr'][c]);
        if (nextRows['coc']) entry.cash_on_cash = num(nextRows['coc'][c]);
        if (!existing) result.yearly_returns.push(entry);
      }
    }
  }

  result.yearly_returns.sort((a, b) => a.year - b.year);
  return result;
}

function parseIRRSheet(rows: Row[]): number | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const joined = row.map((c) => str(c).toLowerCase()).join('|');
    if (joined.includes('10 year irr') || (joined.includes('irr on equity') && joined.includes('='))) {
      for (const cell of row) {
        const v = num(cell);
        if (v !== null && v > 0 && v < 100) return v;
      }
    }
    if (joined.includes('irr @') || joined.includes('irr@')) {
      for (const cell of row) {
        const v = num(cell);
        if (v !== null && v > 0 && v < 100) return v;
      }
    }
  }
  return null;
}

function parseTotalProjCostSheet(rows: Row[]): ParsedDevelopmentCost[] {
  const costs: ParsedDevelopmentCost[] = [];
  let numUnits: number | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;

    const label = str(row[0] ?? row[1] ?? '');
    const labelLower = label.toLowerCase();

    if (labelLower === 'number of units' || labelLower.includes('number of units')) {
      numUnits = int(row[1]) ?? int(row[2]);
      continue;
    }

    const perUnit = num(row[1]);
    const total = num(row[2]) ?? num(row[3]);
    const notes = str(row[3] ?? row[4] ?? '') || null;

    if (!label || (perUnit === null && total === null)) continue;
    if (labelLower.includes('total project cost') || labelLower === 'total development cost') {
      costs.push({ line_item: label, category: 'total', per_unit_cost: perUnit, total_cost: total, notes });
      continue;
    }

    let category = 'other';
    if (labelLower.includes('site dev')) category = 'site_dev';
    else if (labelLower.includes('unit cost')) category = 'units';
    else if (labelLower.includes('building') || labelLower.includes('bldg')) category = 'building_improvements';
    else if (labelLower.includes('hard cost')) category = 'hard_costs';
    else if (labelLower.includes('ff&e') || labelLower.includes('furniture')) category = 'ff_e';
    else if (labelLower.includes('soft cost')) category = 'soft_costs';
    else if (labelLower.includes('contingency')) category = 'contingency';
    else if (labelLower.includes('pre-opening') || labelLower.includes('preopening')) category = 'pre_opening';
    else if (labelLower.includes('land cost') || labelLower.includes('land basis')) category = 'land';
    else if (labelLower.includes('interest reserve')) category = 'interest_reserve';

    costs.push({ line_item: label, category, per_unit_cost: perUnit, total_cost: total, notes });
  }

  return costs;
}

function parseUnitCostsSheet(rows: Row[]): ParsedDevelopmentCost[] {
  const costs: ParsedDevelopmentCost[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;
    const label = str(row[0] ?? row[1] ?? '');
    if (!label) continue;
    const labelLower = label.toLowerCase();
    if (labelLower.includes('summary') || labelLower === 'quantity') continue;

    const perUnit = num(row[1]);
    const total = num(row[2]);
    if (perUnit === null && total === null) continue;
    if (labelLower === '0' || label === '0') continue;

    costs.push({
      line_item: label, category: 'unit_detail',
      per_unit_cost: perUnit, total_cost: total, notes: null,
    });
  }
  return costs;
}

function parseRatesProjSheet(rows: Row[]): ParsedRateProjection[] {
  const projections: ParsedRateProjection[] = [];
  let currentCategory: string | null = null;

  // Detect seasonal/additional rate columns from header rows
  const seasonalKeywords = ['shoulder', 'holiday', 'summer', 'winter', 'spring', 'fall', 'autumn',
    'weekday', 'weekend', 'midweek', 'off-season', 'off season', 'high season', 'mid-season'];
  let seasonalColMap: Array<{ col: number; season: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;

    const col0 = str(row[0] ?? '');
    const col1 = str(row[1] ?? '');

    // Detect category header
    if (col0 && col0.toLowerCase().includes('daily rate indicators')) {
      currentCategory = col0.replace(/\s*Daily Rate Indicators/i, '').trim();
      continue;
    }

    // Detect header rows and capture seasonal column positions
    const col0Lower = col0.toLowerCase();
    if (col0Lower === 'low' || col0Lower === 'peak' || col1.toLowerCase() === 'low') {
      seasonalColMap = [];
      for (let c = 0; c < row.length; c++) {
        const headerVal = str(row[c]).toLowerCase().trim();
        const matchedSeason = seasonalKeywords.find((kw) => headerVal.includes(kw));
        if (matchedSeason) {
          seasonalColMap.push({ col: c, season: str(row[c]).trim() });
        }
      }
      continue;
    }

    const name = col0 || col1;
    if (!name) continue;
    const nameL = name.toLowerCase();
    if (nameL.includes('average') && !nameL.includes('subject')) continue;
    if (nameL.includes('what i did') || nameL.includes('daily rate projection')) continue;

    const isSubject = nameL.includes('subject projected');

    const low = num(row[1]) ?? num(row[2]);
    const peak = num(row[2]) ?? num(row[3]);
    const avg = num(row[3]) ?? num(row[4]);
    const quality = num(row[4]) ?? num(row[5]);

    if (low === null && peak === null) continue;

    // Capture seasonal rates from detected columns
    let seasonal: SeasonalRate[] | null = null;
    if (seasonalColMap.length > 0) {
      const rates: SeasonalRate[] = [];
      for (const { col, season } of seasonalColMap) {
        const rate = num(row[col]);
        if (rate !== null) rates.push({ season, rate });
      }
      if (rates.length > 0) seasonal = rates;
    }

    projections.push({
      unit_type: name, is_subject: isSubject,
      low_rate: low, peak_rate: peak, avg_rate: avg,
      quality_score: quality !== null && quality >= 0 && quality <= 5 ? quality : null,
      source: isSubject ? 'Subject Projected' : name,
      rate_category: currentCategory,
      seasonal_rates: seasonal,
    });
  }
  return projections;
}

function parseOccProjSheet(rows: Row[]): ParsedOccupancyProjection[] {
  const projections: ParsedOccupancyProjection[] = [];

  let stabilizedSection = false;
  let lowMonths: number | null = null;
  let peakMonths: number | null = null;
  const stabilizedData: Map<string, { low: number | null; peak: number | null; weighted: number | null }> = new Map();
  const rampUpData: Map<string, Array<{ year: number; occupancy: number | null }>> = new Map();
  const monthlyData: Map<string, MonthlyOccupancy[]> = new Map();

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthFull = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;
    const joined = row.map((c) => str(c).toLowerCase()).join('|');

    if (joined.includes('stabilized occupancy')) {
      stabilizedSection = true;
      continue;
    }

    if (stabilizedSection && joined.includes('# of months')) {
      for (let c = 1; c < row.length; c++) {
        const v = int(row[c]);
        if (v !== null) {
          if (lowMonths === null) lowMonths = v;
          else if (peakMonths === null) peakMonths = v;
        }
      }
      continue;
    }

    if (stabilizedSection) {
      const name = str(row[0] ?? '');
      if (!name || name === '0') { stabilizedSection = false; continue; }
      const low = num(row[1]);
      const peak = num(row[2]);
      const weighted = num(row[3]);
      if (low === null && peak === null) continue;
      stabilizedData.set(name, { low, peak, weighted });
    }

    // Monthly occupancy table: header row has month names (Jan, Feb, ... or January, February, ...)
    if (joined.includes('monthly occupancy') || joined.includes('month by month') ||
        (joined.includes('jan') && joined.includes('feb') && joined.includes('mar'))) {
      // Detect month columns from this header row
      const monthCols: Array<{ col: number; month: number; name: string }> = [];
      for (let c = 0; c < row.length; c++) {
        const cellVal = str(row[c]).toLowerCase().trim();
        const shortIdx = monthNames.indexOf(cellVal.slice(0, 3));
        const fullIdx = monthFull.indexOf(cellVal);
        const idx = fullIdx >= 0 ? fullIdx : shortIdx;
        if (idx >= 0) {
          monthCols.push({ col: c, month: idx + 1, name: MONTH_NAMES[idx] });
        }
      }

      if (monthCols.length >= 6) {
        // Parse data rows below
        for (let j = i + 1; j < Math.min(i + 20, rows.length); j++) {
          const dataRow = rows[j];
          if (!dataRow || isBlank(dataRow)) continue;
          const unitName = str(dataRow[0] ?? '');
          if (!unitName || unitName === '0') continue;
          if (unitName.toLowerCase().includes('average') || unitName.toLowerCase().includes('total')) continue;

          const monthly: MonthlyOccupancy[] = [];
          for (const { col, month, name } of monthCols) {
            const occ = num(dataRow[col]);
            monthly.push({ month, month_name: name, occupancy: occ });
          }
          if (monthly.some((m) => m.occupancy !== null)) {
            monthlyData.set(unitName, monthly);
          }
        }
      }
      continue;
    }

    if (joined.includes('annual occupancy projections') || joined.includes('% of year')) {
      for (let j = i + 1; j < Math.min(i + 20, rows.length); j++) {
        const dataRow = rows[j];
        if (!dataRow || isBlank(dataRow)) continue;
        const unitName = str(dataRow[0] ?? '');
        if (!unitName || unitName === '0') continue;
        const rampUp: Array<{ year: number; occupancy: number | null }> = [];
        for (let c = 1; c < Math.min(dataRow.length, 7); c++) {
          const occ = num(dataRow[c]);
          if (occ !== null) rampUp.push({ year: c, occupancy: occ });
        }
        if (rampUp.length > 0) rampUpData.set(unitName, rampUp);
      }
      break;
    }
  }

  const allNames = new Set([...stabilizedData.keys(), ...rampUpData.keys(), ...monthlyData.keys()]);
  for (const name of allNames) {
    const stab = stabilizedData.get(name);
    const rampUp = rampUpData.get(name) || [];
    const monthly = monthlyData.get(name) || null;
    projections.push({
      unit_type: name,
      stabilized_low_occ: stab?.low ?? null,
      stabilized_peak_occ: stab?.peak ?? null,
      weighted_annual_occ: stab?.weighted ?? null,
      low_months: lowMonths, peak_months: peakMonths,
      ramp_up: rampUp,
      monthly_occupancy: monthly,
    });
  }

  return projections;
}

function parseMiscExpensesSheet(rows: Row[]): ParsedDevelopmentCost[] {
  const expenses: ParsedDevelopmentCost[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;
    const label = str(row[0] ?? '');
    if (!label) continue;
    const labelLower = label.toLowerCase();
    if (labelLower.includes('note') || labelLower.includes('instruction')) continue;

    const value = num(row[1]);
    const total = num(row[2]);
    if (value === null && total === null) continue;

    let category = 'operating';
    if (labelLower.includes('payroll') || labelLower.includes('staff') || labelLower.includes('housekeeping')) category = 'payroll';
    else if (labelLower.includes('marketing') || labelLower.includes('advertising')) category = 'marketing';
    else if (labelLower.includes('repair') || labelLower.includes('maintenance')) category = 'maintenance';
    else if (labelLower.includes('utilit') || labelLower.includes('wi-fi')) category = 'utilities';
    else if (labelLower.includes('insurance')) category = 'insurance';
    else if (labelLower.includes('tax')) category = 'taxes';
    else if (labelLower.includes('management fee')) category = 'management';
    else if (labelLower.includes('room turn') || labelLower.includes('linen')) category = 'room_turnover';

    expenses.push({ line_item: label, category, per_unit_cost: value, total_cost: total, notes: null });
  }
  return expenses;
}

function parseMarketProfileSheet(rows: Row[]): ParsedMarketData[] {
  const data: ParsedMarketData[] = [];

  // Find the header row with radius labels
  let radiusRow = -1;
  const radiusLabels: string[] = [];
  const radiusCols: number[] = [];

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!row) continue;
    const joined = row.map((c) => str(c).toLowerCase()).join('|');
    if (joined.includes('market profile') || (joined.includes('minutes') && joined.includes('county')) ||
        (joined.includes('mile') && joined.includes('radius')) || joined.includes('drive time')) {
      radiusRow = i;
      for (let c = 0; c < row.length; c++) {
        const v = str(row[c]);
        if (v && !/^market\s*profile$/i.test(v)) {
          radiusLabels.push(v);
          radiusCols.push(c);
        }
      }
      break;
    }
  }

  if (radiusLabels.length === 0) return data;

  const radiusData: Map<string, Partial<ParsedMarketData>> = new Map();
  for (const label of radiusLabels) {
    radiusData.set(label, { radius: label });
  }

  for (let i = radiusRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;
    const label = str(row[0] ?? '').toLowerCase();

    for (let r = 0; r < radiusLabels.length; r++) {
      const col = radiusCols[r];
      const entry = radiusData.get(radiusLabels[r])!;
      const v = num(row[col]);
      if (v === null) continue;

      if (label.includes('2020 population') && !label.includes('project')) entry.population_2020 = int(row[col]);
      if (label.includes('projected population') || label.includes('2029 projected population')) entry.population_projected = int(row[col]);
      if (label.includes('projected annual growth') || (label.includes('growth rate') && label.includes('2020'))) entry.population_growth_rate = v;
      if (label.includes('2020 households') && !label.includes('size')) entry.households_2020 = int(row[col]);
      if (label.includes('average household size') && label.includes('2020')) entry.avg_household_size = v;
      if (label.includes('median household income')) entry.median_household_income = v;
      if (label.includes('per capita income')) entry.per_capita_income = v;
    }
  }

  for (const [, entry] of radiusData) {
    if (entry.population_2020 || entry.households_2020 || entry.median_household_income) {
      data.push({
        radius: entry.radius!,
        population_2020: entry.population_2020 ?? null,
        population_projected: entry.population_projected ?? null,
        population_growth_rate: entry.population_growth_rate ?? null,
        households_2020: entry.households_2020 ?? null,
        avg_household_size: entry.avg_household_size ?? null,
        median_household_income: entry.median_household_income ?? null,
        per_capita_income: entry.per_capita_income ?? null,
      });
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Assumptions sheet parser
// ---------------------------------------------------------------------------

function parseAssumptionsSheet(rows: Row[]): ParsedAssumption[] {
  const assumptions: ParsedAssumption[] = [];
  let currentCategory = 'general';

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;

    const col0 = str(row[0]);
    const col1 = row[1];
    const col0Lower = col0.toLowerCase();

    // Detect category headers — short text with no value in col1
    if (col0 && (col1 === null || col1 === undefined || col1 === '') && col0.length < 50) {
      if (/^(general|financial|market|operational|revenue|expense|development|construction|land|financing|occupancy|rate|growth|staffing|amenity)/i.test(col0Lower)) {
        currentCategory = col0Lower.replace(/\s+/g, '_');
        continue;
      }
    }

    // Skip header-like rows
    if (col0Lower === 'assumption' || col0Lower === 'item' || col0Lower === 'parameter') continue;

    if (!col0 || col0Lower === 'notes' || col0Lower === 'source') continue;

    const rawValue = col1;
    let value: string | number | null = null;
    if (typeof rawValue === 'number') {
      value = rawValue;
    } else if (typeof rawValue === 'string' && rawValue.trim()) {
      const n = num(rawValue);
      value = n !== null ? n : rawValue.trim();
    }

    if (value === null && !str(row[2])) continue;

    const notes = str(row[2] ?? row[3] ?? '') || null;

    assumptions.push({
      category: currentCategory,
      label: col0,
      value,
      notes,
    });
  }

  return assumptions;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface ParseWorkbookOptions {
  /** Custom sheet name aliases; merged with defaults. */
  sheetAliases?: Partial<SheetAliasConfig>;
}

export function parseWorkbook(buffer: Buffer, filename: string, options?: ParseWorkbookOptions): ParsedWorkbook {
  const studyId = extractStudyId(filename);
  const sheetAliases = options?.sheetAliases;

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    throw new Error(
      `Failed to read "${filename}" as an Excel workbook. The file may be corrupted or not a valid .xlsx file. (${(err as Error).message})`
    );
  }

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error(`"${filename}" contains no sheets. The file may be empty or corrupted.`);
  }

  const warnings: string[] = [];
  const result: ParsedWorkbook = {
    study_id: studyId,
    filename,
    sheets_found: [],
    warnings,
    project_info: null,
    comparables: [],
    comp_units: [],
    summaries: [],
    property_scores: [],
    pro_forma_units: [],
    valuation: null,
    financing: null,
    development_costs: [],
    rate_projections: [],
    occupancy_projections: [],
    market_data: [],
    assumptions: [],
    pro_forma_expenses: [],
  };

  // Route sheets to parsers (uses configurable aliases)
  const compsSummWs = findSheet(wb, ...getSheetAliases('comps_summary', sheetAliases));
  if (compsSummWs) {
    result.sheets_found.push('Comps Summ.');
    const parsed = parseCompsSummSheet(sheetToRows(compsSummWs), warnings);
    result.comparables = parsed.comparables;
    result.comp_units = parsed.comp_units;
    result.summaries = parsed.summaries;
  } else {
    warnings.push('Comps Summary sheet not found. Tried: ' + getSheetAliases('comps_summary', sheetAliases).slice(0, 3).join(', ') + '...');
  }

  const compsGridWs = findSheet(wb, ...getSheetAliases('comps_grid', sheetAliases));
  if (compsGridWs) {
    result.sheets_found.push('Comps Grid');
    const gridParsed = parseCompsGridSheet(sheetToRows(compsGridWs), warnings);
    if (result.comparables.length === 0 && gridParsed.comparables.length > 0) {
      result.comparables = gridParsed.comparables;
      result.comp_units.push(...gridParsed.comp_units);
    } else if (gridParsed.comparables.length > 0) {
      const byName = new Map(result.comparables.map((c) => [c.comp_name.toLowerCase(), c]));
      for (const g of gridParsed.comparables) {
        const existing = byName.get(g.comp_name.toLowerCase());
        if (existing && g.amenity_keywords.length > 0) {
          existing.amenity_keywords = [...new Set([...existing.amenity_keywords, ...g.amenity_keywords])];
          if (g.amenities) existing.amenities = existing.amenities ? `${existing.amenities}; ${g.amenities}` : g.amenities;
        } else if (!existing) {
          result.comparables.push(g);
          byName.set(g.comp_name.toLowerCase(), g);
        }
      }
      if (result.comp_units.length === 0) {
        result.comp_units.push(...gridParsed.comp_units);
      }
    }
  }

  const bestCompsWs = findSheet(wb, ...getSheetAliases('best_comps', sheetAliases));
  if (bestCompsWs) {
    result.sheets_found.push('Best Comps');
    result.property_scores = parseBestCompsSheet(sheetToRows(bestCompsWs), warnings);
  } else {
    warnings.push('Best Comps sheet not found.');
  }

  const pfWs = findSheet(wb, ...getSheetAliases('ten_yr_pf', sheetAliases));
  if (pfWs) {
    result.sheets_found.push('10 yr PF');
    const parsed = parseTenYrPFSheet(sheetToRows(pfWs), warnings);
    result.pro_forma_units = parsed.units;
    result.valuation = parsed.valuation;
    result.pro_forma_expenses = parsed.expenses;
  } else {
    warnings.push('10 yr PF sheet not found.');
  }

  const totWs = findSheet(wb, ...getSheetAliases('intake_form', sheetAliases));
  if (totWs) {
    result.sheets_found.push('ToT (Intake Form)');
    result.project_info = parseToTSheet(sheetToRows(totWs));
  }

  const finWs = findSheet(wb, ...getSheetAliases('financing', sheetAliases));
  if (finWs) {
    result.sheets_found.push('Financing');
    const finData = parseFinancingSheet(sheetToRows(finWs));
    result.financing = { ...finData, irr_on_equity: null };
  }

  const irrWs = findSheet(wb, ...getSheetAliases('irr', sheetAliases));
  if (irrWs) {
    result.sheets_found.push('IRR');
    const irr = parseIRRSheet(sheetToRows(irrWs));
    if (result.financing) {
      result.financing.irr_on_equity = irr;
    } else {
      result.financing = {
        interest_rate: null, loan_term_years: null, ltc_ratio: null, equity_pct: null,
        mortgage_amount: null, annual_debt_service: null, total_development_cost: null,
        land_cost: null, total_project_cost: null, payback_period_years: null,
        irr_on_equity: irr, yearly_returns: [],
      };
    }
  }

  const totalCostWs = findSheet(wb, ...getSheetAliases('total_project_cost', sheetAliases));
  if (totalCostWs) {
    result.sheets_found.push('Total Proj. Cost');
    result.development_costs.push(...parseTotalProjCostSheet(sheetToRows(totalCostWs)));
  }

  const unitCostsWs = findSheet(wb, ...getSheetAliases('unit_costs', sheetAliases));
  if (unitCostsWs) {
    result.sheets_found.push('Unit Costs');
    result.development_costs.push(...parseUnitCostsSheet(sheetToRows(unitCostsWs)));
  }

  const ratesWs = findSheet(wb, ...getSheetAliases('rates_projection', sheetAliases));
  if (ratesWs) {
    result.sheets_found.push('Rates Proj');
    result.rate_projections = parseRatesProjSheet(sheetToRows(ratesWs));
  }

  const occWs = findSheet(wb, ...getSheetAliases('occupancy_projection', sheetAliases));
  if (occWs) {
    result.sheets_found.push('Occ. Proj');
    result.occupancy_projections = parseOccProjSheet(sheetToRows(occWs));
  }

  const miscExpWs = findSheet(wb, ...getSheetAliases('misc_expenses', sheetAliases));
  if (miscExpWs) {
    result.sheets_found.push('Misc. Expenses');
    result.development_costs.push(...parseMiscExpensesSheet(sheetToRows(miscExpWs)));
  }

  const marketWs = findSheet(wb, ...getSheetAliases('market_profile', sheetAliases));
  if (marketWs) {
    result.sheets_found.push('Market Profile');
    result.market_data = parseMarketProfileSheet(sheetToRows(marketWs));
  }

  const assumptionsWs = findSheet(wb, ...getSheetAliases('assumptions', sheetAliases));
  if (assumptionsWs) {
    result.sheets_found.push('Assumptions');
    result.assumptions = parseAssumptionsSheet(sheetToRows(assumptionsWs));
  }

  // Warn if no meaningful data extracted
  const hasData =
    result.comparables.length > 0 ||
    result.comp_units.length > 0 ||
    result.property_scores.length > 0 ||
    result.pro_forma_units.length > 0 ||
    result.valuation !== null ||
    result.financing !== null ||
    result.development_costs.length > 0 ||
    result.project_info !== null;
  if (!hasData && result.sheets_found.length > 0) {
    warnings.push('No parseable data extracted from any sheet. Layout may differ from expected feasibility study format.');
  }
  if (!hasData && result.sheets_found.length === 0) {
    warnings.push('No known sheets found. Available: ' + (wb.SheetNames?.slice(0, 5).join(', ') || 'none') + (wb.SheetNames?.length > 5 ? '...' : ''));
  }

  return result;
}
