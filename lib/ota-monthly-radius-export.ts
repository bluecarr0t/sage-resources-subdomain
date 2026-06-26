/**
 * Property-level month-over-month occupancy & rates from raw Hipcamp/Campspot
 * `site_monthly_analytics` (DigitalOcean campings DB), filtered by zip + radius.
 */

import { query } from '@/lib/legacy-camping-db';
import { geocodeZipForSitesExport } from '@/lib/sites-export/geocode-zip';

export const OTA_MONTHLY_EXPORT_COLUMNS = [
  'source',
  'property_id',
  'property_name',
  'property_url',
  'city',
  'state',
  'distance_miles',
  'year',
  'month',
  'month_name',
  'median_retail_daily_rate',
  'mean_retail_daily_rate',
  'avg_occupancy_rate_pct',
  'revpar',
  'min_price',
  'max_price',
  'site_count',
  'high_month',
  'low_month',
] as const;

export type OtaMonthlyExportColumn = (typeof OTA_MONTHLY_EXPORT_COLUMNS)[number];

export type OtaMonthlySource = 'hipcamp' | 'campspot';

export type OtaMonthlyExportRow = Record<OtaMonthlyExportColumn, string>;

export type OtaMonthlyRadiusExportOptions = {
  zip: string;
  radiusMiles?: number;
  years?: number[];
  sources?: OtaMonthlySource[];
};

export type OtaMonthlySourceSummary = {
  properties_in_radius: number;
  properties_with_monthly_data: number;
  row_count: number;
};

export type OtaMonthlyRadiusExportResult = {
  zip: string;
  radius_miles: number;
  years: number[];
  center: { lat: number; lon: number };
  sources: Array<OtaMonthlySourceSummary & { source: OtaMonthlySource }>;
  /** Combined rows (hipcamp + campspot) — exact export format. */
  data: OtaMonthlyExportRow[];
  /** Per-source sheets for multi-tab Excel download. */
  export_sheets: Array<{ name: string; data: OtaMonthlyExportRow[] }>;
  total_row_count: number;
};

const KNOWN_PLACEHOLDER_RATES = new Set(['1011.5', '1011.50', '1026.67', '705.06']);
const DEFAULT_YEARS = [2025, 2026] as const;
const DEFAULT_RADIUS_MILES = 50;
const DEFAULT_SOURCES: OtaMonthlySource[] = ['hipcamp', 'campspot'];

export function isOtaPlaceholderRate(val: string | undefined): boolean {
  if (!val?.trim()) return false;
  return KNOWN_PLACEHOLDER_RATES.has(val.trim());
}

type PropertyMonthlyRow = {
  name: string;
  link: string;
  city: string;
  state: string;
  property_id: string;
  year: string;
  month: string;
  month_name: string;
  avg_occupancy_rate_pct: string;
  median_retail_daily_rate: string;
  mean_retail_daily_rate: string;
  revpar: string;
  min_price: string;
  max_price: string;
  site_count: string;
  sites_with_occ_above_5: string;
  high_month: string;
  low_month: string;
  distance_miles: string;
};

async function getZipCenter(zip: string): Promise<{ lat: number; lon: number }> {
  const center = await geocodeZipForSitesExport(zip, []);
  if (!center) throw new Error(`Could not geocode zip ${zip}`);
  return { lat: center.lat, lon: center.lng };
}

async function getPropertyIdsInRadius(
  source: OtaMonthlySource,
  lat: number,
  lon: number,
  radiusMiles: number,
): Promise<Array<{ id: string; distance_miles: number }>> {
  const radiusMeters = radiusMiles * 1609.344;
  const { rows } = await query<{ id: string; distance_miles: string }>(
    `
    SELECT
      pd.id::text as id,
      round((ST_Distance(
        pd.coordinates::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) / 1609.344)::numeric, 1)::text as distance_miles
    FROM ${source}.propertydetails pd
    WHERE pd.coordinates IS NOT NULL
      AND ST_DWithin(
        pd.coordinates::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
    ORDER BY 2
  `,
    [lon, lat, radiusMeters],
  );
  return (rows ?? []).map((r) => ({
    id: r.id,
    distance_miles: parseFloat(r.distance_miles),
  }));
}

function propertyIdFilter(source: OtaMonthlySource, paramIndex: number): string {
  if (source === 'campspot') {
    return `sma.property_id = ANY($${paramIndex}::int[])`;
  }
  return `sma.property_id = ANY($${paramIndex}::text[])`;
}

function propertyIdParam(
  source: OtaMonthlySource,
  propertyIds: string[],
): string[] | number[] {
  if (source === 'campspot') {
    return propertyIds.map((id) => parseInt(id, 10));
  }
  return propertyIds;
}

async function fetchPropertyMonthlyRows(
  source: OtaMonthlySource,
  propertyIds: string[],
  years: number[],
  distanceById: Map<string, number>,
): Promise<PropertyMonthlyRow[]> {
  if (propertyIds.length === 0) return [];

  const idFilter = propertyIdFilter(source, 1);
  const joinPropertyId =
    source === 'campspot'
      ? 'pd.id = sma.property_id'
      : 'pd.id::text = sma.property_id';

  const { rows } = await query<PropertyMonthlyRow>(
    `
    WITH property_monthly AS (
      SELECT sma.property_id, sma.year, sma.month, sma.month_name, avg(sma.avg_occupancy::float) as occ
      FROM ${source}.site_monthly_analytics sma
      WHERE sma.year = ANY($2::numeric[]) AND ${idFilter}
      GROUP BY sma.property_id, sma.year, sma.month, sma.month_name
    ),
    open_months AS (
      SELECT * FROM property_monthly WHERE occ > 5
    ),
    property_peaks AS (
      SELECT
        property_id,
        year,
        (array_agg(month_name ORDER BY occ DESC))[1] as high_month,
        (array_agg(month_name ORDER BY occ ASC))[1] as low_month
      FROM open_months
      GROUP BY property_id, year
    )
    SELECT
      pd.name,
      pd.link,
      pd.city,
      pd.state,
      sma.property_id::text as property_id,
      sma.year::text as year,
      sma.month::text as month,
      sma.month_name,
      round(avg(sma.avg_occupancy::numeric), 2)::text as avg_occupancy_rate_pct,
      round((percentile_cont(0.5) WITHIN GROUP (ORDER BY sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5))::numeric, 2)::text as median_retail_daily_rate,
      round(avg(sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5), 2)::text as mean_retail_daily_rate,
      round((percentile_cont(0.5) WITHIN GROUP (ORDER BY sma.revpar::numeric))::numeric, 2)::text as revpar,
      round(min(sma.min_price) FILTER (WHERE sma.avg_occupancy::float > 5)::numeric, 2)::text as min_price,
      round(percentile_cont(0.95) WITHIN GROUP (ORDER BY sma.avg_price::numeric) FILTER (WHERE sma.avg_occupancy::float > 5)::numeric, 2)::text as max_price,
      count(DISTINCT sma.site_id)::text as site_count,
      count(DISTINCT sma.site_id) FILTER (WHERE sma.avg_occupancy::float > 5)::text as sites_with_occ_above_5,
      pp.high_month,
      pp.low_month,
      ''::text as distance_miles
    FROM ${source}.site_monthly_analytics sma
    JOIN ${source}.propertydetails pd ON ${joinPropertyId}
    LEFT JOIN property_peaks pp ON pp.property_id = sma.property_id AND pp.year = sma.year
    WHERE sma.year = ANY($2::numeric[]) AND ${idFilter}
    GROUP BY pd.id, pd.name, pd.link, pd.city, pd.state, sma.property_id, sma.year, sma.month, sma.month_name, pp.high_month, pp.low_month
    ORDER BY pd.name, sma.year, sma.month::int
  `,
    [propertyIdParam(source, propertyIds), years],
  );

  const MIN_SITES_FOR_LOW_OCC_MONTH = 5;
  return (rows ?? []).map((r) => {
    const occ = parseFloat(r.avg_occupancy_rate_pct ?? '0');
    const sitesAbove5 = parseInt(r.sites_with_occ_above_5 ?? '0', 10);
    const hasValidRates =
      !isOtaPlaceholderRate(r.median_retail_daily_rate) &&
      (r.median_retail_daily_rate ?? '').trim() !== '';
    const showRates =
      occ > 5 || (sitesAbove5 >= MIN_SITES_FOR_LOW_OCC_MONTH && hasValidRates);
    const median =
      showRates && !isOtaPlaceholderRate(r.median_retail_daily_rate)
        ? (r.median_retail_daily_rate ?? '')
        : '';
    const mean =
      showRates && !isOtaPlaceholderRate(r.mean_retail_daily_rate)
        ? (r.mean_retail_daily_rate ?? '')
        : '';
    const minPrice =
      showRates && !isOtaPlaceholderRate(r.min_price) ? (r.min_price ?? '') : '';
    const maxPrice =
      showRates && !isOtaPlaceholderRate(r.max_price) ? (r.max_price ?? '') : '';
    return {
      ...r,
      median_retail_daily_rate: median,
      mean_retail_daily_rate: mean,
      min_price: minPrice,
      max_price: maxPrice,
      distance_miles: String(distanceById.get(r.property_id) ?? ''),
    };
  });
}

export function mapOtaMonthlyRowsToExport(
  source: OtaMonthlySource,
  rows: PropertyMonthlyRow[],
): OtaMonthlyExportRow[] {
  return rows.map((r) => ({
    source,
    property_id: r.property_id,
    property_name: r.name,
    property_url: r.link,
    city: r.city,
    state: r.state,
    distance_miles: r.distance_miles,
    year: r.year,
    month: r.month,
    month_name: r.month_name,
    median_retail_daily_rate: r.median_retail_daily_rate,
    mean_retail_daily_rate: r.mean_retail_daily_rate,
    avg_occupancy_rate_pct: r.avg_occupancy_rate_pct,
    revpar: r.revpar,
    min_price: r.min_price,
    max_price: r.max_price,
    site_count: r.site_count,
    high_month: r.high_month || '',
    low_month: r.low_month || '',
  }));
}

export function countUniqueProperties(rows: OtaMonthlyExportRow[]): number {
  const keys = new Set(rows.map((r) => `${r.source}:${r.property_id}`));
  return keys.size;
}

export async function exportOtaPropertyMonthlyByRadius(
  options: OtaMonthlyRadiusExportOptions,
): Promise<OtaMonthlyRadiusExportResult> {
  const zip = options.zip.trim();
  if (!zip) throw new Error('zip is required');

  const radiusMiles = options.radiusMiles ?? DEFAULT_RADIUS_MILES;
  const years = options.years?.length ? [...options.years] : [...DEFAULT_YEARS];
  const sources = options.sources?.length ? options.sources : [...DEFAULT_SOURCES];

  const { lat, lon } = await getZipCenter(zip);

  const sourceSummaries: OtaMonthlyRadiusExportResult['sources'] = [];
  const exportSheets: Array<{ name: string; data: OtaMonthlyExportRow[] }> = [];
  const combined: OtaMonthlyExportRow[] = [];

  for (const source of sources) {
    const inRadius = await getPropertyIdsInRadius(source, lat, lon, radiusMiles);
    const distanceById = new Map(inRadius.map((p) => [p.id, p.distance_miles]));
    const propertyIds = inRadius.map((p) => p.id);
    const rawRows = await fetchPropertyMonthlyRows(
      source,
      propertyIds,
      years,
      distanceById,
    );
    const exportRows = mapOtaMonthlyRowsToExport(source, rawRows);
    combined.push(...exportRows);
    exportSheets.push({ name: source, data: exportRows });
    sourceSummaries.push({
      source,
      properties_in_radius: inRadius.length,
      properties_with_monthly_data: countUniqueProperties(exportRows),
      row_count: exportRows.length,
    });
  }

  exportSheets.push({ name: 'combined', data: combined });

  return {
    zip,
    radius_miles: radiusMiles,
    years,
    center: { lat, lon },
    sources: sourceSummaries,
    data: combined,
    export_sheets: exportSheets,
    total_row_count: combined.length,
  };
}
