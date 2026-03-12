/**
 * Assemble XLSX from template and form data.
 * Fetches template from Supabase Storage by market type; populates
 * the "ToT (Intake Form)" sheet with user-provided data.
 */

import * as XLSX from 'xlsx';
import { createServerClient } from '@/lib/supabase';
import { getTemplateKeyForMarketType } from './assemble-docx';
import type { EnrichedInput } from './types';

const BUCKET_NAME = 'report-templates';
const TOT_SHEET_NAME = 'ToT (Intake Form)';

/**
 * Cell mappings for the ToT (Intake Form) sheet.
 * Based on actual template inspection:
 *
 * RV layout:
 *   C3  = Report Type (e.g. "RV Resort Feasibility Study")
 *   C6  = Owner Name
 *   C8  = Legal Business Name
 *   C9  = Owner / Business Address
 *   C13 = Resort Name
 *   C14 = Resort Type
 *   C15 = Resort Full Address
 *   C17 = Lot Size (Acres)
 *   C19 = Parcel Number(s)
 *   C22 = Unit A Quantity
 *   C23 = Unit A Type
 *   C43 = Total Units / Sites
 *
 * Glamping layout uses the same structure with minor row offsets.
 */

interface CellMapping {
  cell: string;
  field: string;
}

const RV_CELL_MAPPINGS: CellMapping[] = [
  { cell: 'C6', field: 'client_contact_name' },
  { cell: 'C8', field: 'client_entity' },
  { cell: 'C9', field: 'client_address' },
  { cell: 'C13', field: 'property_name' },
  { cell: 'C15', field: 'full_address' },
  { cell: 'C16', field: 'county' },
  { cell: 'C17', field: 'acres' },
  { cell: 'C19', field: 'parcel_number' },
  { cell: 'C43', field: 'total_sites' },
];

const GLAMPING_CELL_MAPPINGS: CellMapping[] = [
  { cell: 'C6', field: 'client_contact_name' },
  { cell: 'C8', field: 'client_entity' },
  { cell: 'C9', field: 'client_address' },
  { cell: 'C13', field: 'property_name' },
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

const xlsxCache = new Map<string, string>();

async function fetchTemplateFromSupabase(templateKey: string): Promise<string | null> {
  const storagePath = `${templateKey}/template.xlsx`;
  const supabase = createServerClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(storagePath);

  if (error || !data) {
    console.warn(`[assemble-xlsx] Supabase template fetch failed for ${storagePath}:`, error?.message);
    return null;
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('binary');
}

async function getTemplateContent(templateKey: string): Promise<string> {
  const cached = xlsxCache.get(templateKey);
  if (cached) return cached;

  const content = await fetchTemplateFromSupabase(templateKey);
  if (!content) {
    throw new Error(
      `XLSX template not found for ${templateKey}. Run: npx tsx scripts/upload-report-templates.ts`
    );
  }
  xlsxCache.set(templateKey, content);
  return content;
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
    case 'address_1':
      return input.address_1;
    case 'city':
      return input.city;
    case 'state':
      return input.state;
    case 'zip_code':
      return input.zip_code;
    case 'county':
      return undefined;
    case 'acres':
      return input.acres;
    case 'client_entity':
      return input.client_entity;
    case 'client_contact_name':
      return input.client_contact_name ?? input.client_entity;
    case 'client_address':
      return input.client_address
        ? `${input.client_address}${input.client_city_state_zip ? ', ' + input.client_city_state_zip : ''}`
        : undefined;
    case 'study_id':
      return input.study_id;
    case 'parcel_number':
      return input.parcel_number;
    case 'total_sites': {
      const sum = input.unit_mix.reduce((s, u) => s + u.count, 0);
      return sum;
    }
    case 'amenities_description':
      return input.amenities_description;
    default:
      return (input as unknown as Record<string, unknown>)[field] as string | number | undefined;
  }
}

/** Write unit mix rows into the ToT sheet starting at the standard unit rows. */
function writeUnitMix(
  ws: XLSX.WorkSheet,
  input: EnrichedInput,
  templateKey: string
): void {
  const unitRows = templateKey === 'glamping'
    ? [
        { typeCell: 'C23', qtyCell: 'C24' },
        { typeCell: 'C26', qtyCell: 'C27' },
        { typeCell: 'C29', qtyCell: 'C30' },
        { typeCell: 'C32', qtyCell: 'C33' },
        { typeCell: 'C35', qtyCell: 'C36' },
        { typeCell: 'C38', qtyCell: 'C39' },
        { typeCell: 'C41', qtyCell: 'C42' },
      ]
    : [
        { typeCell: 'C23', qtyCell: 'C22' },
        { typeCell: 'C26', qtyCell: 'C25' },
        { typeCell: 'C29', qtyCell: 'C28' },
        { typeCell: 'C32', qtyCell: 'C31' },
        { typeCell: 'C35', qtyCell: 'C34' },
        { typeCell: 'C38', qtyCell: 'C37' },
        { typeCell: 'C41', qtyCell: 'C40' },
      ];

  for (let i = 0; i < unitRows.length; i++) {
    const unit = input.unit_mix[i];
    if (unit) {
      ws[unitRows[i].typeCell] = { t: 's', v: unit.type };
      ws[unitRows[i].qtyCell] = { t: 'n', v: unit.count };
    }
  }
}

export interface AssembleDraftXlsxOptions {
  marketType?: string | null;
}

export async function assembleDraftXlsx(
  input: EnrichedInput,
  options?: AssembleDraftXlsxOptions
): Promise<Buffer> {
  const templateKey = getTemplateKeyForMarketType(options?.marketType ?? input.market_type);
  const content = await getTemplateContent(templateKey);
  const buffer = Buffer.from(content, 'binary');
  const wb = XLSX.read(buffer, { type: 'buffer' });

  const ws = wb.Sheets[TOT_SHEET_NAME];
  if (!ws) {
    console.warn(`[assemble-xlsx] Sheet "${TOT_SHEET_NAME}" not found; writing to first sheet`);
  }
  const targetSheet = ws ?? wb.Sheets[wb.SheetNames[0]];
  if (!targetSheet) {
    throw new Error('XLSX template has no sheets');
  }

  const mappings = getMappings(templateKey);
  for (const { cell, field } of mappings) {
    const value = resolveFieldValue(input, field);
    if (value !== undefined && value !== '') {
      targetSheet[cell] = {
        t: typeof value === 'number' ? 'n' : 's',
        v: value,
      };
    }
  }

  writeUnitMix(targetSheet, input, templateKey);

  const outBuffer = XLSX.write(wb, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  });
  return Buffer.isBuffer(outBuffer) ? outBuffer : Buffer.from(outBuffer as ArrayBuffer);
}
