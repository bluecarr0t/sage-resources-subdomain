import { stringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import { marketReportSourceLabel } from '@/lib/market-report/source-labels';
import type { DedupedCohortRow } from '@/lib/market-report/dedupe';
import type { MarketReportMeta } from '@/lib/market-report/types';

/**
 * Inspect operating_season_months to infer year-round operation. Mirrors the
 * heuristic used in `scripts/national-glamping-300plus-cohort.sql`:
 *   - "year-round" / "open all year" / etc. tokens → Yes
 *   - 12 distinct months parsed out of the string → Yes
 *   - otherwise → No
 *
 * Conservative on purpose; partial-coverage strings (e.g. "May–Oct") fall through to "No".
 */
export function inferYearRound(seasonText: string | null | undefined): 'Yes' | 'No' | 'Unknown' {
  if (seasonText == null) return 'Unknown';
  const s = seasonText.trim().toLowerCase();
  if (!s) return 'Unknown';
  const explicitYesPatterns = [
    /year[\s-]?round/,
    /all[\s-]?year/,
    /open\s+all\s+year/,
    /\bjan(uary)?\b.{0,40}\bdec(ember)?\b/,
  ];
  if (explicitYesPatterns.some((re) => re.test(s))) return 'Yes';

  const monthTokens = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ];
  const hits = new Set<string>();
  for (const m of monthTokens) {
    if (s.includes(m)) hits.add(m);
  }
  if (hits.size === 12) return 'Yes';
  return 'No';
}

export interface BuildCohortCsvOptions {
  rows: DedupedCohortRow[];
  meta?: Pick<MarketReportMeta, 'addressLine' | 'segment' | 'scope' | 'adrMin' | 'adrMax' | 'radiusMiles'>;
  /**
   * When true, add one column per key present in any row's `raw` record
   * (values JSON-stringified when not plain primitives). Base columns always
   * include `source_id`.
   */
  wide?: boolean;
}

/** Column order shared by CSV and XLSX cohort exports. */
export const COHORT_EXPORT_HEADERS = [
  'source',
  'source_label',
  'source_id',
  'property_name',
  'state',
  'city',
  'unit_type',
  'property_type',
  'rate_tier_rows',
  'adr_avg',
  'adr_low',
  'adr_high',
  'unit_count',
  'property_total_sites',
  'distance_miles',
  'lat',
  'lng',
  'winter_weekday',
  'winter_weekend',
  'spring_weekday',
  'spring_weekend',
  'summer_weekday',
  'summer_weekend',
  'fall_weekday',
  'fall_weekend',
  'occupancy_pct',
  'year_round',
  'operating_season_months',
  'url',
] as const;

export type CohortExportRecord = Record<(typeof COHORT_EXPORT_HEADERS)[number], string | number>;

/** Keys from `raw`, sorted for stable CSV/XLSX column order. */
export function collectUnionRawKeys(rows: DedupedCohortRow[]): string[] {
  const keys = new Set<string>();
  for (const r of rows) {
    const raw = r.raw;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      for (const k of Object.keys(raw)) keys.add(k);
    }
  }
  return Array.from(keys).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function cohortRawHeaderNames(originalKeys: string[]): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (const key of originalKeys) {
    const slug = key.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
    let h = `raw_${slug}`;
    let n = 2;
    while (used.has(h)) {
      h = `raw_${slug}_${n++}`;
    }
    used.add(h);
    out.push(h);
  }
  return out;
}

function formatWideCell(value: unknown): string | number {
  if (value == null) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function roundedCell(n: number | null): string | number {
  if (n == null || !Number.isFinite(n)) return '';
  return Math.round(n * 100) / 100;
}

/** One plain record per cohort row — used by CSV and XLSX builders. */
export function getCohortExportRecords({ rows }: BuildCohortCsvOptions): CohortExportRecord[] {
  return rows.map((r) => ({
    source: r.source,
    source_label: marketReportSourceLabel(r.source),
    source_id: r.sourceId ?? '',
    property_name: r.property_name,
    state: r.state,
    city: r.city,
    unit_type: r.unit_type ?? '',
    property_type: r.property_type ?? '',
    rate_tier_rows: r.rateTierRows,
    adr_avg: roundedCell(r.rate_avg),
    adr_low: roundedCell(r.rateLow),
    adr_high: roundedCell(r.rateHigh),
    unit_count: r.quantity_of_units ?? '',
    property_total_sites: r.property_total_sites ?? '',
    distance_miles: roundedCell(r.distance_miles),
    lat: roundedCell(r.geo_lat),
    lng: roundedCell(r.geo_lng),
    winter_weekday: roundedCell(r.winter_weekday),
    winter_weekend: roundedCell(r.winter_weekend),
    spring_weekday: roundedCell(r.spring_weekday),
    spring_weekend: roundedCell(r.spring_weekend),
    summer_weekday: roundedCell(r.summer_weekday),
    summer_weekend: roundedCell(r.summer_weekend),
    fall_weekday: roundedCell(r.fall_weekday),
    fall_weekend: roundedCell(r.fall_weekend),
    occupancy_pct: roundedCell(r.occupancy),
    year_round: inferYearRound(r.operating_season_months),
    operating_season_months: r.operating_season_months ?? '',
    url: r.url ?? '',
  }));
}

function buildWideRecords(options: BuildCohortCsvOptions): {
  headers: string[];
  rows: Record<string, string | number>[];
} {
  const baseHeaders = [...COHORT_EXPORT_HEADERS];
  const rawOriginal = collectUnionRawKeys(options.rows);
  const rawHeaders = cohortRawHeaderNames(rawOriginal);
  const headers = [...baseHeaders, ...rawHeaders];
  const base = getCohortExportRecords(options);
  const wideRows = options.rows.map((r, i) => {
    const rec: Record<string, string | number> = { ...base[i]! };
    const raw = r.raw;
    for (let j = 0; j < rawOriginal.length; j++) {
      const orig = rawOriginal[j]!;
      const col = rawHeaders[j]!;
      const v =
        raw && typeof raw === 'object' && !Array.isArray(raw)
          ? (raw as Record<string, unknown>)[orig]
          : undefined;
      rec[col] = formatWideCell(v);
    }
    return rec;
  });
  return { headers, rows: wideRows };
}

/**
 * Row-level master CSV — one row per (source, property, unit_type), matching the
 * shape of `out/national-glamping-300plus-by-unit-type.csv`. This is the file
 * we'd attach to a deck or hand off to clients.
 */
export function buildCohortCsv(options: BuildCohortCsvOptions): string {
  if (options.wide) {
    const { headers, rows } = buildWideRecords(options);
    return stringify(rows, {
      header: true,
      columns: headers,
      quoted_string: true,
    }) as string;
  }
  const headers = [...COHORT_EXPORT_HEADERS];
  const data = getCohortExportRecords(options);
  return stringify(data, {
    header: true,
    columns: headers,
    quoted_string: true,
  }) as string;
}

/** Same row-level data as the CSV, as an Excel workbook buffer. */
export function buildCohortXlsxBuffer(options: BuildCohortCsvOptions): Buffer {
  if (options.wide) {
    const { headers, rows } = buildWideRecords(options);
    const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cohort');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
  const data = getCohortExportRecords(options);
  const ws = XLSX.utils.json_to_sheet(data, { header: [...COHORT_EXPORT_HEADERS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cohort');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Filename stem shared by CSV and XLSX cohort downloads. */
export function cohortExportBasename(meta: BuildCohortCsvOptions['meta']): string {
  if (!meta) return 'cohort';
  const scopeSlug = meta.scope === 'national' ? 'national' : 'local';
  const segSlug = meta.segment === 'glamping' ? 'glamping' : 'rv';
  const adrSlug =
    meta.adrMin != null && meta.adrMax != null
      ? `${meta.adrMin}-${meta.adrMax}`
      : meta.adrMin != null
      ? `${meta.adrMin}plus`
      : meta.adrMax != null
      ? `under${meta.adrMax}`
      : 'all-rates';
  const radSlug = meta.scope === 'national' ? '' : `-${meta.radiusMiles ?? 0}mi`;
  return `${scopeSlug}-${segSlug}-${adrSlug}${radSlug}`;
}

/** A short slug for filenames — e.g. "national-glamping-300-plus.csv" */
export function cohortCsvFilename(meta: BuildCohortCsvOptions['meta']): string {
  if (!meta) return 'cohort.csv';
  return `${cohortExportBasename(meta)}.csv`;
}

export function cohortXlsxFilename(meta: BuildCohortCsvOptions['meta']): string {
  if (!meta) return 'cohort.xlsx';
  return `${cohortExportBasename(meta)}.xlsx`;
}
