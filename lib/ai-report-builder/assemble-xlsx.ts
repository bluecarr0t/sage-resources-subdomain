/**
 * Assemble XLSX from template and form data using ExcelJS (preserves styles/charts).
 * Populates ToT (Intake Form) + model driver cells when modelOutput is provided,
 * and appends a Comparables sheet.
 */

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { createServerClient } from '@/lib/supabase';
import { getTemplateKeyForMarketType } from './template-key';
import type { EnrichedInput, ComparableProperty } from './types';
import type { FeasibilityModelOutput } from '@/lib/feasibility-model';
import { applyXlsxDriverMap } from './xlsx-driver-maps';
import {
  formatDriveTimeFromMiles,
  formatMilesLabel,
  selectNationalParkRows,
  selectStateParkRows,
  sumVisitors,
} from './park-visitation';

const BUCKET_NAME = 'report-templates';
const TOT_SHEET_NAME = 'ToT (Intake Form)';
const COMPS_SHEET_NAME = 'Comparables';
const RADIUS_PIVOTS_SHEET_NAME = 'Radius Pivots';
const SEASONAL_RATES_SHEET_NAME = 'Seasonal Rates';

interface CellMapping {
  cell: string;
  field: string;
}

const RV_CELL_MAPPINGS: CellMapping[] = [
  { cell: 'C6', field: 'client_contact_name' },
  { cell: 'C7', field: 'client_phone_email' },
  { cell: 'C8', field: 'client_entity' },
  { cell: 'C9', field: 'client_address' },
  { cell: 'C10', field: 'purpose_of_report' },
  { cell: 'C13', field: 'property_name' },
  { cell: 'C14', field: 'resort_type' },
  { cell: 'C15', field: 'full_address' },
  { cell: 'C16', field: 'county' },
  { cell: 'C17', field: 'acres' },
  { cell: 'C19', field: 'parcel_number' },
  { cell: 'C43', field: 'total_sites' },
];

const GLAMPING_CELL_MAPPINGS: CellMapping[] = [
  { cell: 'C6', field: 'client_contact_name' },
  { cell: 'C7', field: 'client_phone_email' },
  { cell: 'C8', field: 'client_entity' },
  { cell: 'C9', field: 'client_address' },
  { cell: 'C10', field: 'purpose_of_report' },
  { cell: 'C13', field: 'property_name' },
  { cell: 'C14', field: 'resort_type' },
  { cell: 'C15', field: 'full_address' },
  { cell: 'C16', field: 'county' },
  { cell: 'C17', field: 'acres' },
  { cell: 'C19', field: 'parcel_number' },
  { cell: 'C44', field: 'total_sites' },
  { cell: 'C47', field: 'amenities_description' },
];

function getMappings(templateKey: string): CellMapping[] {
  return templateKey === 'glamping' ? GLAMPING_CELL_MAPPINGS : RV_CELL_MAPPINGS;
}

const xlsxCache = new Map<string, Buffer>();

function loadLocalXlsxTemplate(templateKey: string): Buffer | null {
  const localPath = path.join(process.cwd(), 'templates', templateKey, 'template.xlsx');
  if (!fs.existsSync(localPath)) return null;
  return fs.readFileSync(localPath);
}

async function fetchTemplateBuffer(templateKey: string): Promise<Buffer> {
  const cached = xlsxCache.get(templateKey);
  if (cached) return Buffer.from(cached);

  const storagePath = `${templateKey}/template.xlsx`;
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storagePath);
    if (!error && data) {
      const ab = await data.arrayBuffer();
      const buf = Buffer.from(ab);
      xlsxCache.set(templateKey, buf);
      return buf;
    }
  } catch (err) {
    console.warn(`[assemble-xlsx] Supabase template download failed for ${templateKey}:`, err);
  }

  const local = loadLocalXlsxTemplate(templateKey);
  if (local) {
    xlsxCache.set(templateKey, local);
    return local;
  }

  throw new Error(
    `XLSX template not found for ${templateKey}. Add templates/${templateKey}/template.xlsx or run: npx tsx scripts/upload-report-templates.ts`
  );
}

function resolveFieldValue(
  input: EnrichedInput,
  field: string
): string | number | undefined {
  switch (field) {
    case 'property_name':
      return input.property_name;
    case 'full_address': {
      const parts = [input.address_1, input.city, input.state, input.zip_code].filter(Boolean);
      return parts.join(', ') || undefined;
    }
    case 'county':
      return input.county;
    case 'acres':
      return input.acres;
    case 'client_entity':
      return input.client_entity;
    case 'client_contact_name':
      return input.client_contact_name ?? input.client_entity;
    case 'client_phone_email': {
      // ToT has Phone Number (C7) but no Email column — stack both when present.
      const parts = [input.client_phone?.trim(), input.client_email?.trim()].filter(Boolean);
      return parts.length ? parts.join('\n') : undefined;
    }
    case 'client_address':
      return input.client_address
        ? `${input.client_address}${input.client_city_state_zip ? ', ' + input.client_city_state_zip : ''}`
        : undefined;
    case 'resort_type':
      return input.resort_type?.trim() || undefined;
    case 'purpose_of_report': {
      const purpose = input.intended_use_of_study?.trim();
      const date = input.engagement_date?.trim();
      if (purpose && date) return `${purpose}\nEngagement date: ${date}`;
      if (purpose) return purpose;
      if (date) return `Engagement date: ${date}`;
      return undefined;
    }
    case 'parcel_number':
      return input.parcel_number;
    case 'total_sites': {
      // Only write a literal total when unit mix is known. Otherwise leave the
      // template SUM formula intact (empty slots are zeroed in writeUnitMix).
      const total = input.unit_mix.reduce((s, u) => s + u.count, 0);
      return total > 0 ? total : undefined;
    }
    case 'amenities_description':
      return input.amenities_description;
    default:
      return undefined;
  }
}

function setCell(ws: ExcelJS.Worksheet, addr: string, value: string | number | null | undefined): void {
  if (value === undefined || value === null || value === '') return;
  const cell = ws.getCell(addr);
  cell.value = value;
  if (typeof value === 'string' && value.includes('\n')) {
    cell.alignment = { ...(cell.alignment ?? {}), wrapText: true, vertical: 'top' };
  }
}

function clearCell(ws: ExcelJS.Worksheet, addr: string): void {
  ws.getCell(addr).value = null;
}

/** Fields whose template sample values must be wiped when intake has no replacement. */
const CLEAR_WHEN_EMPTY = new Set([
  'purpose_of_report',
  'amenities_description',
  'acres',
  'resort_type',
]);

type UnitRowLayout = { typeCell: string; qtyCell: string; descCell: string };

function getUnitRowLayout(templateKey: string): UnitRowLayout[] {
  if (templateKey === 'glamping') {
    return [
      { typeCell: 'C23', qtyCell: 'C24', descCell: 'C25' },
      { typeCell: 'C26', qtyCell: 'C27', descCell: 'C28' },
      { typeCell: 'C29', qtyCell: 'C30', descCell: 'C31' },
      { typeCell: 'C32', qtyCell: 'C33', descCell: 'C34' },
      { typeCell: 'C35', qtyCell: 'C36', descCell: 'C37' },
      { typeCell: 'C38', qtyCell: 'C39', descCell: 'C40' },
      { typeCell: 'C41', qtyCell: 'C42', descCell: 'C43' },
    ];
  }
  return [
    { typeCell: 'C23', qtyCell: 'C22', descCell: 'C24' },
    { typeCell: 'C26', qtyCell: 'C25', descCell: 'C27' },
    { typeCell: 'C29', qtyCell: 'C28', descCell: 'C30' },
    { typeCell: 'C32', qtyCell: 'C31', descCell: 'C33' },
    { typeCell: 'C35', qtyCell: 'C34', descCell: 'C36' },
    { typeCell: 'C38', qtyCell: 'C37', descCell: 'C39' },
    { typeCell: 'C41', qtyCell: 'C40', descCell: 'C42' },
  ];
}

/**
 * Write provided unit mix into ToT rows A–G. Always clears leftover template
 * sample types/descriptions (and zeroes unused quantities) so Mirror Cabin /
 * example RV rows do not survive an empty or partial intake.
 */
function writeUnitMix(ws: ExcelJS.Worksheet, input: EnrichedInput, templateKey: string): void {
  const unitRows = getUnitRowLayout(templateKey);

  for (let i = 0; i < unitRows.length; i++) {
    const unit = input.unit_mix[i];
    const { typeCell, qtyCell, descCell } = unitRows[i];
    if (unit && unit.type && unit.count > 0) {
      setCell(ws, typeCell, unit.type);
      setCell(ws, qtyCell, unit.count);
      // Descriptions are template samples — clear unless we later add intake support.
      clearCell(ws, descCell);
    } else {
      clearCell(ws, typeCell);
      ws.getCell(qtyCell).value = 0;
      clearCell(ws, descCell);
    }
  }
}

/**
 * Write model driver values into known sheets when present.
 * Soft-fail if sheet/cell layout differs by template vintage.
 */
function writeModelDrivers(
  wb: ExcelJS.Workbook,
  model: FeasibilityModelOutput,
  templateKey: string,
  comps?: ComparableProperty[],
  unitMix?: EnrichedInput['unit_mix']
): void {
  applyXlsxDriverMap(wb, {
    templateKey: templateKey === 'glamping' ? 'glamping' : 'rv',
    model,
    comps,
    unitMix,
    strict: false,
    includeModelOutputSheet: true,
  });
}

function sourceLabel(s: string): string {
  switch (s) {
    case 'all_sage_data':
      return 'Glamping DB';
    case 'hipcamp':
      return 'Hipcamp';
    case 'all_roverpass_data_new':
      return 'RoverPass';
    case 'campspot':
      return 'Campspot';
    case 'past_reports':
      return 'Past Sage Report';
    case 'tavily_web_research':
      return 'Web Research';
    default:
      return s;
  }
}

function writeCompsSheet(wb: ExcelJS.Workbook, comps: ComparableProperty[]): void {
  const existing = wb.getWorksheet(COMPS_SHEET_NAME);
  if (existing) wb.removeWorksheet(existing.id);
  const ws = wb.addWorksheet(COMPS_SHEET_NAME);
  const headers = [
    '#', 'Property Name', 'City', 'State', 'Distance (mi)', 'Unit Type', 'Total Sites', 'Units',
    'Avg Daily Rate', 'High Rate', 'Low Rate', 'Low Occupancy %', 'Peak Occupancy %',
    'Quality Score', 'Source', 'Past Report ID', 'Lat', 'Lng',
  ];
  headers.forEach((h, i) => {
    ws.getCell(1, i + 1).value = h;
  });
  comps.forEach((c, idx) => {
    const row = idx + 2;
    ws.getCell(row, 1).value = idx + 1;
    ws.getCell(row, 2).value = c.property_name;
    ws.getCell(row, 3).value = c.city;
    ws.getCell(row, 4).value = c.state;
    ws.getCell(row, 5).value = c.distance_miles;
    ws.getCell(row, 6).value = c.unit_type;
    ws.getCell(row, 7).value = c.property_total_sites;
    ws.getCell(row, 8).value = c.quantity_of_units;
    ws.getCell(row, 9).value = c.avg_retail_daily_rate;
    ws.getCell(row, 10).value = c.high_rate;
    ws.getCell(row, 11).value = c.low_rate;
    ws.getCell(row, 12).value = c.low_occupancy;
    ws.getCell(row, 13).value = c.peak_occupancy;
    ws.getCell(row, 14).value = c.quality_score;
    ws.getCell(row, 15).value = sourceLabel(c.source_table);
    ws.getCell(row, 16).value = c.past_report_study_id;
    ws.getCell(row, 17).value = c.geo_lat ?? null;
    ws.getCell(row, 18).value = c.geo_lng ?? null;
  });
}

function writeRadiusPivotsSheet(wb: ExcelJS.Workbook, input: EnrichedInput): void {
  const pivots = input.comp_radius_pivots;
  if (!pivots?.buckets?.length) return;
  const existing = wb.getWorksheet(RADIUS_PIVOTS_SHEET_NAME);
  if (existing) wb.removeWorksheet(existing.id);
  const ws = wb.addWorksheet(RADIUS_PIVOTS_SHEET_NAME);
  ws.getCell(1, 1).value = 'Comp radius pivots (Sage / Hipcamp / Campspot / RoverPass)';
  ws.getCell(2, 1).value = `Fetched: ${pivots.fetched_at}`;
  const headers = ['Radius (mi)', 'Properties', 'Avg ADR', 'Avg Occ', 'Sources'];
  headers.forEach((h, i) => {
    ws.getCell(4, i + 1).value = h;
  });
  pivots.buckets.forEach((b, idx) => {
    const row = 5 + idx;
    ws.getCell(row, 1).value = b.radius_miles;
    ws.getCell(row, 2).value = b.property_count;
    ws.getCell(row, 3).value = b.avg_adr;
    ws.getCell(row, 4).value = b.avg_occupancy;
    ws.getCell(row, 5).value = b.sources.join(', ');
  });

  let typeRow = 5 + pivots.buckets.length + 2;
  ws.getCell(typeRow, 1).value = 'By unit type (within each radius)';
  typeRow += 1;
  ['Radius (mi)', 'Unit Type', 'Properties', 'Avg ADR', 'Avg Occ'].forEach((h, i) => {
    ws.getCell(typeRow, i + 1).value = h;
  });
  typeRow += 1;
  for (const b of pivots.buckets) {
    for (const t of b.by_unit_type ?? []) {
      ws.getCell(typeRow, 1).value = b.radius_miles;
      ws.getCell(typeRow, 2).value = t.unit_type;
      ws.getCell(typeRow, 3).value = t.property_count;
      ws.getCell(typeRow, 4).value = t.avg_adr;
      ws.getCell(typeRow, 5).value = t.avg_occupancy;
      typeRow += 1;
    }
  }
}

function writeSeasonalRatesSheet(wb: ExcelJS.Workbook, comps: ComparableProperty[]): void {
  const withSeasonal = comps.filter((c) => {
    const s = c.seasonal_rates;
    if (!s) return false;
    return Object.values(s).some((v) => v != null && v > 0);
  });
  if (!withSeasonal.length) return;
  const existing = wb.getWorksheet(SEASONAL_RATES_SHEET_NAME);
  if (existing) wb.removeWorksheet(existing.id);
  const ws = wb.addWorksheet(SEASONAL_RATES_SHEET_NAME);
  const headers = [
    'Property', 'City', 'State', 'Distance (mi)', 'Source',
    'Winter WD', 'Winter WE', 'Spring WD', 'Spring WE',
    'Summer WD', 'Summer WE', 'Fall WD', 'Fall WE',
  ];
  headers.forEach((h, i) => {
    ws.getCell(1, i + 1).value = h;
  });
  withSeasonal.forEach((c, idx) => {
    const row = idx + 2;
    const s = c.seasonal_rates;
    ws.getCell(row, 1).value = c.property_name;
    ws.getCell(row, 2).value = c.city;
    ws.getCell(row, 3).value = c.state;
    ws.getCell(row, 4).value = c.distance_miles;
    ws.getCell(row, 5).value = sourceLabel(c.source_table);
    ws.getCell(row, 6).value = s.winter_weekday;
    ws.getCell(row, 7).value = s.winter_weekend;
    ws.getCell(row, 8).value = s.spring_weekday;
    ws.getCell(row, 9).value = s.spring_weekend;
    ws.getCell(row, 10).value = s.summer_weekday;
    ws.getCell(row, 11).value = s.summer_weekend;
    ws.getCell(row, 12).value = s.fall_weekday;
    ws.getCell(row, 13).value = s.fall_weekend;
  });
}

/**
 * Rewrite State Parks + Nat. Parks summary tables from enrich demand drivers
 * so the companion XLSX matches the generated report (and Word can be re-linked).
 */
function writeParkVisitationSheets(wb: ExcelJS.Workbook, input: EnrichedInput): void {
  const dd = input.demand_drivers;
  if (!dd) return;

  const stateRows = selectStateParkRows(dd, 6);
  const natRows = selectNationalParkRows(dd, 6);

  const stateWs = wb.getWorksheet('State Parks');
  if (stateWs && stateRows.length > 0) {
    // Template header is row 3 (B–F); data starts row 4. Clear remnant Texas/TN parks.
    for (let r = 4; r <= 12; r++) {
      for (let c = 2; c <= 6; c++) {
        stateWs.getCell(r, c).value = null;
      }
    }
    stateWs.getCell(3, 2).value = '#';
    stateWs.getCell(3, 3).value = 'State Park Name';
    stateWs.getCell(3, 4).value = 'Address';
    stateWs.getCell(3, 5).value = 'Miles from Subject';
    stateWs.getCell(3, 6).value = 'Annual Visitors';
    stateRows.forEach((row, i) => {
      const r = 4 + i;
      stateWs.getCell(r, 2).value = i + 1;
      stateWs.getCell(r, 3).value = row.name;
      stateWs.getCell(r, 4).value = row.state || null;
      stateWs.getCell(r, 5).value = formatMilesLabel(row.distance_miles);
      stateWs.getCell(r, 6).value = row.visitors ?? null;
    });
    const totalRow = 4 + stateRows.length;
    stateWs.getCell(totalRow, 5).value = 'Total';
    stateWs.getCell(totalRow, 6).value = sumVisitors(stateRows);
    stateWs.getCell(totalRow + 1, 3).value =
      'SOURCE: Web research / ODNR / Sage outdoor_recreation_sites (state park data)';
  }

  const natWs = wb.getWorksheet('Nat. Parks');
  if (natWs && natRows.length > 0) {
    const headerProbe = [
      natWs.getCell(4, 2).value,
      natWs.getCell(4, 3).value,
      natWs.getCell(4, 4).value,
    ]
      .map((v) => String(v ?? '').toLowerCase())
      .join(' ');
    const isSummaryLayout =
      headerProbe.includes('time to subject') ||
      (headerProbe.includes('#') && headerProbe.includes('name'));

    // Glamping-style summary at B4:E — rewrite in place.
    // RV monthly IRMA grids start at B4 — write generated summary to columns H–K instead.
    const colOffset = isSummaryLayout ? 0 : 6; // H=8 when offset 6 from B(=2)
    const startCol = 2 + colOffset;
    const startRow = isSummaryLayout ? 4 : 1;

    if (isSummaryLayout) {
      for (let r = 4; r <= 12; r++) {
        for (let c = 2; c <= 5; c++) {
          natWs.getCell(r, c).value = null;
        }
      }
    }

    natWs.getCell(startRow, startCol).value = isSummaryLayout ? '#' : 'Combined NPS Visitation';
    if (!isSummaryLayout) {
      natWs.getCell(startRow + 1, startCol).value = '#';
      natWs.getCell(startRow + 1, startCol + 1).value = 'Name';
      natWs.getCell(startRow + 1, startCol + 2).value = 'Time to Subject';
      natWs.getCell(startRow + 1, startCol + 3).value = 'Annual Visitors';
    } else {
      natWs.getCell(startRow, startCol + 1).value = 'Name';
      natWs.getCell(startRow, startCol + 2).value = 'Time to Subject';
      natWs.getCell(startRow, startCol + 3).value = 'Annual Visitors';
    }

    const dataStart = isSummaryLayout ? startRow + 1 : startRow + 2;
    natRows.forEach((row, i) => {
      const r = dataStart + i;
      natWs.getCell(r, startCol).value = i + 1;
      natWs.getCell(r, startCol + 1).value = row.name;
      natWs.getCell(r, startCol + 2).value = formatDriveTimeFromMiles(row.distance_miles);
      natWs.getCell(r, startCol + 3).value = row.visitors ?? null;
    });
    const totalRow = dataStart + natRows.length;
    natWs.getCell(totalRow, startCol + 2).value = 'Total';
    natWs.getCell(totalRow, startCol + 3).value = sumVisitors(natRows);
    natWs.getCell(totalRow + 1, startCol + 1).value =
      'SOURCE: National Park Service / Sage national-parks (latest recreation_visitors on file)';
  }
}

export interface AssembleDraftXlsxOptions {
  marketType?: string | null;
  modelOutput?: FeasibilityModelOutput | null;
}

export async function assembleDraftXlsx(
  input: EnrichedInput,
  options?: AssembleDraftXlsxOptions
): Promise<Buffer> {
  const templateKey = getTemplateKeyForMarketType(options?.marketType ?? input.market_type);
  const buf = await fetchTemplateBuffer(templateKey);
  const wb = new ExcelJS.Workbook();
  // exceljs typings expect Buffer; Uint8Array works at runtime in Node
  await wb.xlsx.load(buf as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);

  const tot = wb.getWorksheet(TOT_SHEET_NAME) ?? wb.worksheets[0];
  if (!tot) throw new Error('XLSX template has no sheets');

  for (const { cell, field } of getMappings(templateKey)) {
    const value = resolveFieldValue(input, field);
    if (value !== undefined && value !== null && value !== '') {
      setCell(tot, cell, value);
    } else if (CLEAR_WHEN_EMPTY.has(field)) {
      clearCell(tot, cell);
    }
  }
  writeUnitMix(tot, input, templateKey);

  if (options?.modelOutput) {
    writeModelDrivers(wb, options.modelOutput, templateKey, input.nearby_comps, input.unit_mix);
  }

  if (input.nearby_comps?.length) {
    writeCompsSheet(wb, input.nearby_comps);
    writeSeasonalRatesSheet(wb, input.nearby_comps);
  }

  writeRadiusPivotsSheet(wb, input);
  writeParkVisitationSheets(wb, input);

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
