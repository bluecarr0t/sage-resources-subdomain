import type { SupabaseClient } from '@supabase/supabase-js';
import {
  classifyMissingUnitRow,
  unitTypeFromSiteName,
  type MissingUnitQueue,
} from '@/lib/glamping-unit-type-research/classify';

const US_COUNTRIES = ['United States', 'US', 'USA', 'United States of America'] as const;

const SELECT_COLS =
  'id, property_id, property_name, site_name, city, state, url, is_open, property_type, land_operator_category, quantity_of_units, unit_type';

export type MissingUnitRow = {
  id: number;
  propertyId: string;
  propertyName: string;
  siteName: string | null;
  city: string | null;
  state: string | null;
  url: string | null;
  isOpen: string | null;
  propertyType: string | null;
  landOperatorCategory: string | null;
  quantity: number | null;
  queue: MissingUnitQueue;
  canonicalFromSiteName: string | null;
  siblingUnitTypes: string;
};

type Raw = Record<string, unknown>;

function text(value: unknown): string | null {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

function parseQuantity(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export async function fetchMissingUnitRows(supabase: SupabaseClient): Promise<MissingUnitRow[]> {
  const siblings = new Map<string, Set<string>>();
  const blanks: Raw[] = [];
  let offset = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select(SELECT_COLS)
      .eq('is_glamping_property', 'Yes')
      .eq('research_status', 'published')
      .in('country', [...US_COUNTRIES])
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Raw[];
    if (batch.length === 0) break;
    for (const row of batch) {
      const propertyId = text(row.property_id);
      const unitType = text(row.unit_type);
      if (propertyId && unitType) {
        const set = siblings.get(propertyId) ?? new Set<string>();
        set.add(unitType);
        siblings.set(propertyId, set);
      }
      if (!unitType) blanks.push(row);
    }
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  const rows: MissingUnitRow[] = [];
  for (const raw of blanks) {
    const id = Number(raw.id);
    const propertyId = text(raw.property_id);
    const propertyName = text(raw.property_name);
    if (!Number.isFinite(id) || !propertyId || !propertyName) continue;
    const siteName = text(raw.site_name);
    const land = text(raw.land_operator_category);
    rows.push({
      id,
      propertyId,
      propertyName,
      siteName,
      city: text(raw.city),
      state: text(raw.state),
      url: text(raw.url),
      isOpen: text(raw.is_open),
      propertyType: text(raw.property_type),
      landOperatorCategory: land,
      quantity: parseQuantity(raw.quantity_of_units),
      queue: classifyMissingUnitRow({
        siteName,
        propertyName,
        landOperatorCategory: land,
      }),
      canonicalFromSiteName: unitTypeFromSiteName(siteName),
      siblingUnitTypes: [...(siblings.get(propertyId) ?? [])].sort().join('; '),
    });
  }

  rows.sort((a, b) => a.propertyName.localeCompare(b.propertyName) || a.id - b.id);
  return rows;
}

export function missingUnitQueueCsv(rows: MissingUnitRow[]): string {
  const header = [
    'queue',
    'id',
    'property_id',
    'property_name',
    'site_name',
    'city',
    'state',
    'url',
    'is_open',
    'property_type',
    'land_operator_category',
    'quantity_of_units',
    'canonical_from_site_name',
    'sibling_unit_types',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.queue,
        String(row.id),
        row.propertyId,
        row.propertyName,
        row.siteName ?? '',
        row.city ?? '',
        row.state ?? '',
        row.url ?? '',
        row.isOpen ?? '',
        row.propertyType ?? '',
        row.landOperatorCategory ?? '',
        row.quantity == null ? '' : String(row.quantity),
        row.canonicalFromSiteName ?? '',
        row.siblingUnitTypes,
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function isOpenYes(value: string | null): boolean {
  return (value ?? '').trim().toLowerCase() === 'yes';
}
