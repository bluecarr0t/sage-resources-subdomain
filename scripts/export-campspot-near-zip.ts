#!/usr/bin/env npx tsx
/**
 * Export all `campspot` rows within a mile radius of a zip (geocoded center).
 * Uses bbox RPC + Haversine (same strategy as admin Sites Export).
 *
 * Run: npx tsx scripts/export-campspot-near-zip.ts
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
 * DB: sites_export_campspot_bbox_ids (see scripts/migrations/sites-export-hipcamp-campspot-bbox-rpc.sql)
 */

import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { stringify } from 'csv-stringify/sync';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { getBoundingBox, haversineDistanceMiles, parseRowLatLon } from '@/lib/comps-v2/geo';
import { HIPCAMPSPOT_AMENITY_DB_KEYS } from '@/lib/sites-export/constants';
import { geocodeZipForSitesExport } from '@/lib/sites-export/geocode-zip';

config({ path: resolve(process.cwd(), '.env.local') });

const ZIP = '96094';
const RADIUS_MILES = 200;
/** RPC caps p_limit at 2000 (sites_export_campspot_bbox_ids). */
const PAGE_SIZE = 2000;
const OUTPUT_DIR = resolve(process.cwd(), 'reports');

type AnyRow = Record<string, unknown>;

function normalizeRpcBBoxIds(data: unknown): number[] {
  if (!Array.isArray(data)) return [];
  const out: number[] = [];
  for (const item of data) {
    if (item != null && typeof item === 'object' && !Array.isArray(item)) {
      const raw = item as Record<string, unknown>;
      const v = raw.id ?? raw.Id;
      if (typeof v === 'bigint') {
        const n = Number(v);
        if (Number.isFinite(n)) out.push(n);
        continue;
      }
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n)) out.push(n);
      continue;
    }
    if (typeof item === 'number' && Number.isFinite(item)) {
      out.push(item);
      continue;
    }
    if (typeof item === 'string' && item.trim() !== '') {
      const n = Number(item);
      if (Number.isFinite(n)) out.push(n);
    }
  }
  return out;
}

function cellString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/**
 * Column order for export: property + site first, then distance, then grouped sections.
 * Omits `id` (internal key). Any unexpected keys from the DB are appended alphabetically.
 */
function buildCampspotNearZipColumnOrder(allKeys: Set<string>): string[] {
  const exclude = new Set(['id']);
  const explicit: string[] = [
    'property_name',
    'site_name',
    'distance_miles_from_zip',
    'unit_type',
    'property_type',
    'property_total_sites',
    'quantity_of_units',
    'unit_capacity',
    'year_site_opened',
    'of_locations',
    'address',
    'city',
    'state',
    'zip_code',
    'country',
    'lon',
    'lon_num',
    'lat',
    'lat_num',
    'duplicatenote',
    'source',
    'date_added',
    'date_updated',
    'occupancy_rate_2024',
    'avg_retail_daily_rate_2024',
    'high_rate_2024',
    'low_rate_2024',
    'occupancy_rate_2025',
    'avg_retail_daily_rate_2025',
    'high_rate_2025',
    'low_rate_2025',
    'retail_daily_rate_fees_2025',
    'revpar_2025',
    'high_month_2025',
    'high_avg_occupancy_2025',
    'low_month_2025',
    'low_avg_occupancy_2025',
    'occupancy_rate_2026',
    'retail_daily_rate_ytd',
    'retail_daily_rate_fees_ytd',
    'high_rate_2026',
    'low_rate_2026',
    'revpar_2026',
    'high_month_2026',
    'high_avg_occupancy_2026',
    'low_month_2026',
    'low_avg_occupancy_2026',
    'operating_season_months',
    'operating_season_excel_format',
    'avg_rate_next_12_months',
    'high_rate_next_12_months',
    'low_rate_next_12_months',
    'winter_weekday',
    'winter_weekend',
    'spring_weekday',
    'spring_weekend',
    'summer_weekday',
    'summer_weekend',
    'fall_weekday',
    'fall_weekend',
    'url',
    'description',
    'minimum_nights',
    'getting_there',
    ...HIPCAMPSPOT_AMENITY_DB_KEYS,
    'created_at',
    'updated_at',
  ];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of explicit) {
    if (exclude.has(c) || !allKeys.has(c) || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  const remaining = [...allKeys]
    .filter((k) => !seen.has(k) && !exclude.has(k))
    .sort((a, b) => a.localeCompare(b));
  return [...out, ...remaining];
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
    process.exit(1);
  }

  console.log(`Geocoding zip ${ZIP}…`);
  const center = await geocodeZipForSitesExport(ZIP, []);
  if (!center) {
    console.error('Could not geocode zip.');
    process.exit(1);
  }
  const { lat: centerLat, lng: centerLng } = center;
  console.log(`Center: ${centerLat}, ${centerLng} — radius ${RADIUS_MILES} mi`);

  const bb = getBoundingBox(centerLat, centerLng, RADIUS_MILES);
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const collected: AnyRow[] = [];
  let afterId = 0;
  let page = 0;

  for (;;) {
    page += 1;
    const { data, error } = await supabase.rpc('sites_export_campspot_bbox_ids', {
      p_min_lat: bb.minLat,
      p_max_lat: bb.maxLat,
      p_min_lng: bb.minLng,
      p_max_lng: bb.maxLng,
      p_after: afterId,
      p_limit: PAGE_SIZE,
      p_countries: null,
      p_states: null,
      p_unit_types: null,
    });

    if (error) {
      console.error('RPC error:', error.message);
      process.exit(1);
    }

    const ids = normalizeRpcBBoxIds(data);
    if (ids.length === 0) break;

    const { data: rows, error: rowErr } = await supabase
      .from('campspot')
      .select('*')
      .in('id', ids);

    if (rowErr) {
      console.error('Select error:', rowErr.message);
      process.exit(1);
    }

    const byId = new Map<number, AnyRow>();
    for (const r of rows ?? []) {
      const row = r as AnyRow;
      const id = row.id;
      const n = typeof id === 'number' ? id : Number(id);
      if (Number.isFinite(n)) byId.set(n, row);
    }

    for (const id of ids) {
      const row = byId.get(id);
      if (!row) continue;
      const ll = parseRowLatLon(row);
      if (!ll) continue;
      const d = haversineDistanceMiles(centerLat, centerLng, ll.lat, ll.lon);
      if (d > RADIUS_MILES) continue;
      collected.push({
        ...row,
        distance_miles_from_zip: Number(d.toFixed(2)),
      });
    }

    afterId = ids[ids.length - 1]!;
    console.log(`Page ${page}: +${ids.length} bbox ids → ${collected.length} within ${RADIUS_MILES} mi so far`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const base = `campspot-within-${RADIUS_MILES}mi-zip-${ZIP}`;
  const csvPath = resolve(OUTPUT_DIR, `${base}.csv`);
  const xlsxPath = resolve(OUTPUT_DIR, `${base}.xlsx`);

  if (collected.length === 0) {
    console.log('No rows in radius; writing empty files.');
  }

  const keySet = new Set<string>();
  for (const r of collected) {
    for (const k of Object.keys(r)) keySet.add(k);
  }
  const headers =
    collected.length > 0
      ? buildCampspotNearZipColumnOrder(keySet)
      : ['property_name', 'site_name', 'distance_miles_from_zip'];

  const csvRows = collected.map((row) => {
    const o: Record<string, string> = {};
    for (const h of headers) o[h] = cellString(row[h]);
    return o;
  });
  const csv = stringify(csvRows, { header: true, columns: headers });
  writeFileSync(csvPath, csv, 'utf8');
  console.log(`Wrote ${csvPath} (${collected.length} rows)`);

  const xlsxRows = collected.map((row) => {
    const o: Record<string, unknown> = {};
    for (const h of headers) o[h] = row[h] ?? '';
    return o;
  });
  const sheet = XLSX.utils.json_to_sheet(xlsxRows.length ? xlsxRows : [{}]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'campspot');
  XLSX.writeFile(wb, xlsxPath);
  console.log(`Wrote ${xlsxPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
