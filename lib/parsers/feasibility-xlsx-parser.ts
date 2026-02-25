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
  SeasonalRate,
  MonthlyOccupancy,
  YearlyReturn,
} from '@/lib/types/feasibility';

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

function findSheet(wb: XLSX.WorkBook, ...names: string[]): XLSX.WorkSheet | null {
  // Ranked matching: exact name, case-insensitive exact, starts-with prefix
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
  return null;
}

// ---------------------------------------------------------------------------
// Sheet parsers — existing sheet types (adapted for native XLSX values)
// ---------------------------------------------------------------------------

function parseCompsSummSheet(rows: Row[]): {
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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || isBlank(row)) continue;

    const joined = row.map((c) => str(c).toLowerCase()).join('|');

    if (joined.includes('name') && joined.includes('overview') && !section) {
      section = 'overview';
      const lower = row.map((c) => str(c).toLowerCase());
      const nameIdx = lower.findIndex((c) => (c === 'name' || (c.includes('property') && c.includes('name'))) && !c.includes('overview'));
      const overviewIdx = lower.findIndex((c) => c.includes('overview') || c.includes('description'));
      if (nameIdx >= 0 || overviewIdx >= 0) {
        const n = nameIdx >= 0 ? nameIdx : Math.max(0, overviewIdx - 1);
        const o = overviewIdx >= 0 ? overviewIdx : n + 1;
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
      const lower = row.map((c) => str(c).toLowerCase());
      unitHeaderCols = {
        name: lower.findIndex((c) => c === 'name' || c.includes('name')),
        type: lower.findIndex((c) => c === 'type' || c.includes('type')),
        units: lower.findIndex((c) => c.includes('sites') || c.includes('units')),
        lowAdr: lower.findIndex((c) => c.includes('low') && (c.includes('daily') || c.includes('rate'))),
        peakAdr: lower.findIndex((c) => c.includes('peak') && (c.includes('daily') || c.includes('rate'))),
        lowMonthly: lower.findIndex((c) => c.includes('low') && c.includes('monthly')),
        peakMonthly: lower.findIndex((c) => c.includes('peak') && c.includes('monthly')),
        lowOcc: lower.findIndex((c) => c.includes('low') && c.includes('occ')),
        peakOcc: lower.findIndex((c) => c.includes('peak') && c.includes('occ')),
        quality: lower.findIndex((c) => c.includes('quality')),
      };
      continue;
    }

    if (section === 'overview') {
      const c = overviewCols;
      let name = str(row[c.name]);
      let overview = str(row[c.overview]) || null;
      let amenities = str(row[c.amenities]) || null;
      let distance = num(row[c.distance]);
      let totalSites = int(row[c.totalSites]);
      let qualityScore = num(row[c.quality]);

      if (!name || name.toLowerCase() === 'name') continue;
      if (/^(minimum|average|max)/i.test(name)) continue;
      if (joined.includes('insert table')) { section = null; continue; }

      // Reorder only when the "name" column is a bare row number (1-3 digits, no
      // letters or hyphens) AND the "overview" column starts with an alpha character
      // — indicating the name was placed in the overview column instead.
      if (/^\d{1,3}$/.test(name) && overview && overview.length > 2 && /^[a-zA-Z]/.test(overview)) {
        name = overview;
        overview = amenities;
        amenities = str(row[c.distance]) || null;
        distance = num(row[c.totalSites]);
        totalSites = int(row[c.quality]);
        qualityScore = num(row[c.quality + 1]);
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
      const firstCellText = str(row[cols.name >= 0 ? cols.name : 0] || row[cols.type >= 0 ? cols.type : 1] || '');
      const isSummaryRow = /^(minimum|average|max(imum)?)\b/i.test(firstCellText.trim());
      if (isSummaryRow) {
        let statType: 'market_min' | 'market_avg' | 'market_max' = 'market_avg';
        if (/^minimum/i.test(firstCellText)) statType = 'market_min';
        else if (/^max/i.test(firstCellText)) statType = 'market_max';
        summaries.push({
          summary_type: statType, label: statType.replace('market_', ''),
          num_units: cols.units >= 0 ? int(row[cols.units]) : null,
          low_adr: cols.lowAdr >= 0 ? num(row[cols.lowAdr]) : null,
          peak_adr: cols.peakAdr >= 0 ? num(row[cols.peakAdr]) : null,
          low_monthly_rate: cols.lowMonthly >= 0 ? num(row[cols.lowMonthly]) : null,
          peak_monthly_rate: cols.peakMonthly >= 0 ? num(row[cols.peakMonthly]) : null,
          low_occupancy: cols.lowOcc >= 0 ? num(row[cols.lowOcc]) : null,
          peak_occupancy: cols.peakOcc >= 0 ? num(row[cols.peakOcc]) : null,
          quality_score: cols.quality >= 0 ? num(row[cols.quality]) : null,
        });
        continue;
      }
      if (/phase\s*\d/i.test(joined)) {
        const phaseMatch = joined.match(/phase\s*(\d+)/i);
        summaries.push({
          summary_type: 'phase', label: `Phase ${phaseMatch?.[1] || '?'}`,
          num_units: cols.units >= 0 ? int(row[cols.units]) : null,
          low_adr: cols.lowAdr >= 0 ? num(row[cols.lowAdr]) : null,
          peak_adr: cols.peakAdr >= 0 ? num(row[cols.peakAdr]) : null,
          low_monthly_rate: cols.lowMonthly >= 0 ? num(row[cols.lowMonthly]) : null,
          peak_monthly_rate: cols.peakMonthly >= 0 ? num(row[cols.peakMonthly]) : null,
          low_occupancy: cols.lowOcc >= 0 ? num(row[cols.lowOcc]) : null,
          peak_occupancy: cols.peakOcc >= 0 ? num(row[cols.peakOcc]) : null,
          quality_score: cols.quality >= 0 ? num(row[cols.quality]) : null,
        });
        continue;
      }

      const propName = cols.name >= 0 ? str(row[cols.name]) : '';
      const unitType = cols.type >= 0 ? str(row[cols.type]) : '';
      if (!unitType) continue;
      const lowAdr = cols.lowAdr >= 0 ? num(row[cols.lowAdr]) : null;
      const peakAdr = cols.peakAdr >= 0 ? num(row[cols.peakAdr]) : null;
      if (lowAdr === null && peakAdr === null) continue;

      comp_units.push({
        property_name: propName || 'Unknown',
        unit_type: unitType,
        unit_category: normaliseUnitCategory(unitType),
        num_units: cols.units >= 0 ? int(row[cols.units]) : null,
        low_adr: lowAdr, peak_adr: peakAdr, avg_annual_adr: null,
        low_monthly_rate: cols.lowMonthly >= 0 ? num(row[cols.lowMonthly]) : null,
        peak_monthly_rate: cols.peakMonthly >= 0 ? num(row[cols.peakMonthly]) : null,
        low_occupancy: cols.lowOcc >= 0 ? num(row[cols.lowOcc]) : null,
        peak_occupancy: cols.peakOcc >= 0 ? num(row[cols.peakOcc]) : null,
        quality_score: cols.quality >= 0 ? num(row[cols.quality]) : null,
      });
    }
  }

  return { comparables, comp_units, summaries };
}

function parseBestCompsSheet(rows: Row[]): ParsedPropertyScore[] {
  const scores: ParsedPropertyScore[] = [];
  let current: ParsedPropertyScore | null = null;

  function matchCat(text: string): string | null {
    const l = text.toLowerCase().trim();
    if (l === 'unit type(s)' || l === 'unit types') return 'unit_types';
    if (l === 'unit amenities') return 'unit_amenities';
    if (l === 'property amenities') return 'property_amenities';
    if (l === 'property') return 'property';
    if (l === 'location') return 'location';
    if (l === 'brand strength') return 'brand_strength';
    if (l === 'occupancy notes') return 'occupancy_notes';
    return null;
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 3) continue;
    if (isBlank(row)) continue;

    const col1 = str(row[1] ?? '');
    const col2 = row[2];
    const col3 = str(row[3] ?? '');

    if (col1 && !matchCat(col1) && col2 !== '' && col2 !== null && col2 !== undefined) {
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
      if (str(row[0] ?? '').toLowerCase().startsWith('subject') || str(row[1] ?? '').toLowerCase().startsWith('subject')) {
        const subjScore = num(row[1]) ?? num(row[2]);
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

function parseTenYrPFSheet(rows: Row[]): {
  units: ParsedProFormaUnit[];
  valuation: ParsedValuation | null;
  expenses: ParsedExpenseItem[];
} {
  const units: ParsedProFormaUnit[] = [];
  const expenses: ParsedExpenseItem[] = [];

  let yearCols: number[] = [];
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
      // Fallback: if header has plain numbers 1-10 in sequence (no "Year" prefix)
      if (yearCols.length === 0) {
        for (let c = 0; c < row.length; c++) {
          const v = row[c];
          if (typeof v === 'number' && v >= 1 && v <= 10 && Number.isInteger(v)) yearCols.push(c);
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
      if (joined.includes('total revenue')) {
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

      if (joined.includes('total expense') && joined.includes('reserve')) {
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

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const label = str(row[0]).toLowerCase();

    if (label === 'report type' || label.includes('report type')) info.resort_type = str(row[1]) || null;
    if (label === 'resort name' || label.includes('resort name')) {
      const val = str(row[1]) || null;
      info.resort_name = val && looksLikeResortName(val) ? val : null;
    }
    if (label === 'resort type' || label === 'resort type') info.resort_type = info.resort_type || str(row[1]) || null;
    if (label.includes('resort county') || label === 'county') info.county = str(row[1]) || null;
    if (label.includes('lot size') && label.includes('acres')) info.lot_size_acres = num(row[1]);
    if (label.includes('parcel number')) info.parcel_number = str(row[1]) || null;
    if (label.includes('purpose of the report')) info.report_purpose = str(row[1]) || null;
    if (label.includes('resort full address') || label === 'resort address' || label.includes('property address')) {
      info.resort_address = str(row[1]) || null;
    }

    if (/^unit [a-f] type$/i.test(label)) {
      const unitType = str(row[1]);
      if (unitType) {
        const letterMatch = label.match(/unit ([a-f])/i);
        const letter = letterMatch ? letterMatch[1].toUpperCase() : '';
        let qty: number | null = null;
        let desc: string | null = null;
        for (let j = i + 1; j < Math.min(i + 3, rows.length); j++) {
          const nextLabel = str(rows[j]?.[0] ?? '').toLowerCase();
          if (nextLabel.includes(`unit ${letter.toLowerCase()} quantity`)) qty = int(rows[j]?.[1]);
          if (nextLabel.includes(`unit ${letter.toLowerCase()} description`)) desc = str(rows[j]?.[1] ?? '') || null;
        }
        info.unit_descriptions.push({ type: unitType, quantity: qty, description: desc });
      }
    }
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

export function parseWorkbook(buffer: Buffer, filename: string): ParsedWorkbook {
  const studyId = extractStudyId(filename);

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

  const result: ParsedWorkbook = {
    study_id: studyId,
    filename,
    sheets_found: [],
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

  // Route sheets to parsers
  const compsSummWs = findSheet(wb, 'Comps Summ.', 'Comps Summ', 'CompsSumm');
  if (compsSummWs) {
    result.sheets_found.push('Comps Summ.');
    const parsed = parseCompsSummSheet(sheetToRows(compsSummWs));
    result.comparables = parsed.comparables;
    result.comp_units = parsed.comp_units;
    result.summaries = parsed.summaries;
  }

  const bestCompsWs = findSheet(wb, 'Best Comps');
  if (bestCompsWs) {
    result.sheets_found.push('Best Comps');
    result.property_scores = parseBestCompsSheet(sheetToRows(bestCompsWs));
  }

  const pfWs = findSheet(wb, '10 yr PF', '10 Yr PF', '10yr PF');
  if (pfWs) {
    result.sheets_found.push('10 yr PF');
    const parsed = parseTenYrPFSheet(sheetToRows(pfWs));
    result.pro_forma_units = parsed.units;
    result.valuation = parsed.valuation;
    result.pro_forma_expenses = parsed.expenses;
  }

  const totWs = findSheet(wb, 'ToT (Intake Form)', 'ToT', 'TOT');
  if (totWs) {
    result.sheets_found.push('ToT (Intake Form)');
    result.project_info = parseToTSheet(sheetToRows(totWs));
  }

  const finWs = findSheet(wb, 'Financing');
  if (finWs) {
    result.sheets_found.push('Financing');
    const finData = parseFinancingSheet(sheetToRows(finWs));
    result.financing = { ...finData, irr_on_equity: null };
  }

  const irrWs = findSheet(wb, 'IRR');
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

  const totalCostWs = findSheet(wb, 'Total Proj. Cost', 'Total Proj Cost');
  if (totalCostWs) {
    result.sheets_found.push('Total Proj. Cost');
    result.development_costs.push(...parseTotalProjCostSheet(sheetToRows(totalCostWs)));
  }

  const unitCostsWs = findSheet(wb, 'Unit Costs');
  if (unitCostsWs) {
    result.sheets_found.push('Unit Costs');
    result.development_costs.push(...parseUnitCostsSheet(sheetToRows(unitCostsWs)));
  }

  const ratesWs = findSheet(wb, 'Rates Proj', 'Rates Proj.');
  if (ratesWs) {
    result.sheets_found.push('Rates Proj');
    result.rate_projections = parseRatesProjSheet(sheetToRows(ratesWs));
  }

  const occWs = findSheet(wb, 'Occ. Proj', 'Occ. Proj.');
  if (occWs) {
    result.sheets_found.push('Occ. Proj');
    result.occupancy_projections = parseOccProjSheet(sheetToRows(occWs));
  }

  const miscExpWs = findSheet(wb, 'Misc. Expenses', 'Misc Expenses');
  if (miscExpWs) {
    result.sheets_found.push('Misc. Expenses');
    result.development_costs.push(...parseMiscExpensesSheet(sheetToRows(miscExpWs)));
  }

  const marketWs = findSheet(wb, 'Market Profile');
  if (marketWs) {
    result.sheets_found.push('Market Profile');
    result.market_data = parseMarketProfileSheet(sheetToRows(marketWs));
  }

  const assumptionsWs = findSheet(wb, 'Assumptions', 'Key Assumptions', 'Study Assumptions');
  if (assumptionsWs) {
    result.sheets_found.push('Assumptions');
    result.assumptions = parseAssumptionsSheet(sheetToRows(assumptionsWs));
  }

  return result;
}
