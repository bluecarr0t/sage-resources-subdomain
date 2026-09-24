import type { SupabaseClient } from '@supabase/supabase-js';

export const YEAR_OPENED_TABLE = 'all_sage_data';

const US_COUNTRIES = ['United States', 'US', 'USA', 'United States of America'] as const;

const SELECT_COLS =
  'id, property_id, property_name, city, state, url, is_open, year_site_opened, discovery_source, notes';

export type OpenStatus = 'open' | 'under_construction' | 'proposed' | 'other';

export type YearOpenedQueue = 'fully_blank' | 'copy_forward';

export type YearOpenedCohortRow = {
  id: number;
  property_id: string;
  property_name: string | null;
  city: string | null;
  state: string | null;
  url: string | null;
  is_open: string | null;
  year_site_opened: number | null;
  discovery_source: string | null;
  notes: string | null;
};

export type YearOpenedProperty = {
  propertyId: string;
  propertyName: string;
  city: string | null;
  state: string | null;
  url: string | null;
  openStatus: OpenStatus;
  queue: YearOpenedQueue;
  knownYear: number | null;
  rows: YearOpenedCohortRow[];
};

function parseYear(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

export function propertyOpenStatus(rows: { is_open: string | null }[]): OpenStatus {
  const values = rows.map((row) => (row.is_open ?? '').trim().toLowerCase());
  if (values.includes('yes')) return 'open';
  if (values.includes('under construction')) return 'under_construction';
  if (values.includes('proposed development')) return 'proposed';
  return 'other';
}

export function classifyYearOpenedProperty(
  rows: YearOpenedCohortRow[]
): YearOpenedProperty | null {
  if (rows.length === 0) return null;
  const propertyId = rows[0]?.property_id;
  if (!propertyId) return null;

  const years = rows
    .map((row) => row.year_site_opened)
    .filter((year): year is number => year != null);
  const distinct = [...new Set(years)];
  const blankCount = rows.filter((row) => row.year_site_opened == null).length;

  let queue: YearOpenedQueue | null = null;
  let knownYear: number | null = null;
  if (years.length === 0) {
    queue = 'fully_blank';
  } else if (distinct.length === 1 && blankCount > 0) {
    queue = 'copy_forward';
    knownYear = distinct[0] ?? null;
  } else {
    return null;
  }

  const named = rows.find((row) => (row.property_name ?? '').trim());
  const withUrl = rows.find((row) => (row.url ?? '').trim());
  const withCity = rows.find((row) => (row.city ?? '').trim());
  const withState = rows.find((row) => (row.state ?? '').trim());

  return {
    propertyId,
    propertyName: (named?.property_name ?? '').trim() || propertyId,
    city: (withCity?.city ?? '').trim() || null,
    state: (withState?.state ?? '').trim() || null,
    url: (withUrl?.url ?? '').trim() || null,
    openStatus: propertyOpenStatus(rows),
    queue,
    knownYear,
    rows,
  };
}

function mapRow(raw: Record<string, unknown>): YearOpenedCohortRow | null {
  const propertyId = String(raw.property_id ?? '').trim();
  const id = Number(raw.id);
  if (!propertyId || !Number.isFinite(id)) return null;
  return {
    id,
    property_id: propertyId,
    property_name: raw.property_name != null ? String(raw.property_name) : null,
    city: raw.city != null ? String(raw.city) : null,
    state: raw.state != null ? String(raw.state) : null,
    url: raw.url != null ? String(raw.url) : null,
    is_open: raw.is_open != null ? String(raw.is_open) : null,
    year_site_opened: parseYear(raw.year_site_opened),
    discovery_source: raw.discovery_source != null ? String(raw.discovery_source) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
  };
}

export async function fetchYearOpenedQueue(
  supabase: SupabaseClient
): Promise<YearOpenedProperty[]> {
  const byProperty = new Map<string, YearOpenedCohortRow[]>();
  let offset = 0;
  const pageSize = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from(YEAR_OPENED_TABLE)
      .select(SELECT_COLS)
      .eq('is_glamping_property', 'Yes')
      .eq('property_type', 'Glamping')
      .eq('research_status', 'published')
      .or('land_operator_category.is.null,land_operator_category.eq.private_commercial')
      .in('country', [...US_COUNTRIES])
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Record<string, unknown>[];
    if (batch.length === 0) break;

    for (const raw of batch) {
      const row = mapRow(raw);
      if (!row) continue;
      const list = byProperty.get(row.property_id) ?? [];
      list.push(row);
      byProperty.set(row.property_id, list);
    }

    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  const properties: YearOpenedProperty[] = [];
  for (const rows of byProperty.values()) {
    const classified = classifyYearOpenedProperty(rows);
    if (classified) properties.push(classified);
  }

  properties.sort((a, b) => a.propertyName.localeCompare(b.propertyName));
  return properties;
}

export function toQueueCsv(properties: YearOpenedProperty[]): string {
  const header = [
    'queue',
    'property_id',
    'property_name',
    'city',
    'state',
    'url',
    'open_status',
    'known_year',
    'blank_rows',
    'row_count',
  ];
  const lines = [header.join(',')];
  for (const property of properties) {
    const blankRows = property.rows.filter((row) => row.year_site_opened == null).length;
    lines.push(
      [
        property.queue,
        property.propertyId,
        property.propertyName,
        property.city ?? '',
        property.state ?? '',
        property.url ?? '',
        property.openStatus,
        property.knownYear ?? '',
        String(blankRows),
        String(property.rows.length),
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return `${lines.join('\n')}\n`;
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}
