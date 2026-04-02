import type { ComparableProperty, SeasonalRates } from '@/lib/ai-report-builder/types';
import { effectiveAdr, adrToQualityTier } from '@/lib/comps-v2/filters';
import { parseNum, parseRowLatLon } from '@/lib/comps-v2/geo';
import { stableCandidateId } from '@/lib/comps-v2/stable-id';
import type { CompsV2Candidate } from '@/lib/comps-v2/types';
import type { SiteExportTable } from '@/lib/sites-export/constants';

type AnyRow = Record<string, unknown>;

function pickFirstNumeric(...vals: unknown[]): number | null {
  for (const v of vals) {
    const n = parseNum(v);
    if (n != null) return n;
  }
  return null;
}

function seasonFromRow(
  r: AnyRow,
  prefix: 'rate_' | ''
): SeasonalRates {
  const p = prefix;
  return {
    winter_weekday: parseNum(r[`${p}winter_weekday`]),
    winter_weekend: parseNum(r[`${p}winter_weekend`]),
    spring_weekday: parseNum(r[`${p}spring_weekday`]),
    spring_weekend: parseNum(r[`${p}spring_weekend`]),
    summer_weekday: parseNum(r[`${p}summer_weekday`]),
    summer_weekend: parseNum(r[`${p}summer_weekend`]),
    fall_weekday: parseNum(r[`${p}fall_weekday`]),
    fall_weekend: parseNum(r[`${p}fall_weekend`]),
  };
}

function locationDetail(r: AnyRow): string | null {
  const parts = [r.address, r.city, r.state, r.zip_code].map((x) => (x != null ? String(x).trim() : ''));
  const line = parts.filter(Boolean).join(' · ');
  return line || null;
}

function toCandidate(
  comp: ComparableProperty,
  source_row_id: string | null,
  property_type: string | null
): CompsV2Candidate {
  const stable_id = stableCandidateId(comp.source_table, source_row_id, comp.property_name);
  const adr = effectiveAdr(comp);
  const adr_quality_tier = adrToQualityTier(adr);
  return {
    ...comp,
    stable_id,
    source_row_id,
    property_type,
    adr_quality_tier,
  };
}

export function hipcampCampspotRowToCandidate(
  r: AnyRow,
  table: 'hipcamp' | 'campspot'
): CompsV2Candidate | null {
  const ll = parseRowLatLon(r);
  if (!ll) return null;
  const { lat, lon } = ll;
  const id = r.id != null ? String(r.id) : null;
  const comp: ComparableProperty = {
    property_name: (r.property_name as string) ?? 'Unknown',
    city: (r.city as string) ?? '',
    state: (r.state as string) ?? '',
    unit_type: (r.unit_type as string) ?? null,
    property_total_sites: parseNum(r.property_total_sites),
    quantity_of_units: parseNum(r.quantity_of_units),
    avg_retail_daily_rate: parseNum(r.avg_retail_daily_rate_2025),
    high_rate: parseNum(r.high_rate_2025),
    low_rate: parseNum(r.low_rate_2025),
    seasonal_rates: seasonFromRow(r, ''),
    operating_season_months: (r.operating_season_months as string) ?? null,
    url: (r.url as string) ?? null,
    description: (r.description as string) ?? null,
    distance_miles: null,
    source_table: table,
    geo_lat: lat,
    geo_lng: lon,
    location_detail: locationDetail(r),
    market_occupancy_rate: pickFirstNumeric(
      r.occupancy_rate_2026,
      r.occupancy_rate_2025,
      r.occupancy_rate_2024
    ),
  };
  return toCandidate(comp, id, (r.property_type as string) ?? null);
}

export function glampingRowToCandidate(r: AnyRow): CompsV2Candidate | null {
  const lat = parseNum(r.lat);
  const lon = parseNum(r.lon);
  if (lat == null || lon == null) return null;
  const id = r.id != null ? String(r.id) : null;

  const adr =
    parseNum(r.rate_avg_retail_daily_rate) ??
    parseNum(r.avg_retail_daily_rate_2025) ??
    parseNum(r.avg_retail_daily_rate);

  const seasonal_rates =
    parseNum(r.rate_winter_weekday) != null ||
    parseNum(r.rate_summer_weekday) != null ||
    parseNum(r.winter_weekday) != null
      ? {
          winter_weekday: pickFirstNumeric(r.rate_winter_weekday, r.winter_weekday),
          winter_weekend: pickFirstNumeric(r.rate_winter_weekend, r.winter_weekend),
          spring_weekday: pickFirstNumeric(r.rate_spring_weekday, r.spring_weekday),
          spring_weekend: pickFirstNumeric(r.rate_spring_weekend, r.spring_weekend),
          summer_weekday: pickFirstNumeric(r.rate_summer_weekday, r.summer_weekday),
          summer_weekend: pickFirstNumeric(r.rate_summer_weekend, r.summer_weekend),
          fall_weekday: pickFirstNumeric(r.rate_fall_weekday, r.fall_weekday),
          fall_weekend: pickFirstNumeric(r.rate_fall_weekend, r.fall_weekend),
        }
      : seasonFromRow(r, '');

  const comp: ComparableProperty = {
    property_name: (r.property_name as string) ?? 'Unknown',
    city: (r.city as string) ?? '',
    state: (r.state as string) ?? '',
    unit_type: (r.unit_type as string) ?? null,
    property_total_sites: parseNum(r.property_total_sites),
    quantity_of_units: parseNum(r.quantity_of_units),
    avg_retail_daily_rate: adr,
    high_rate: null,
    low_rate: null,
    seasonal_rates,
    operating_season_months: (r.operating_season_months as string) ?? null,
    url: (r.url as string) ?? null,
    description: (r.description as string) ?? null,
    distance_miles: null,
    source_table: 'all_glamping_properties',
    geo_lat: lat,
    geo_lng: lon,
    location_detail: locationDetail(r),
    market_occupancy_rate: pickFirstNumeric(
      r.roverpass_occupancy_rate,
      r.occupancy_rate_2025,
      r.occupancy_rate_2024,
      r.occupancy_rate_2026
    ),
  };
  return toCandidate(comp, id, (r.property_type as string) ?? null);
}

export function roverpassRowToCandidate(r: AnyRow): CompsV2Candidate | null {
  const lat = parseNum(r.lat);
  const lon = parseNum(r.lon);
  if (lat == null || lon == null) return null;
  const id = r.id != null ? String(r.id) : null;

  const seasonal_rates = seasonFromRow(r, 'rate_');

  const comp: ComparableProperty = {
    property_name: (r.property_name as string) ?? 'Unknown',
    city: (r.city as string) ?? '',
    state: (r.state as string) ?? '',
    unit_type: (r.unit_type as string) ?? null,
    property_total_sites: parseNum(r.property_total_sites),
    quantity_of_units: parseNum(r.quantity_of_units),
    avg_retail_daily_rate: parseNum(r.rate_avg_retail_daily_rate),
    high_rate: null,
    low_rate: null,
    seasonal_rates,
    operating_season_months: (r.operating_season_months as string) ?? null,
    url: (r.url as string) ?? null,
    description: (r.description as string) ?? null,
    distance_miles: null,
    source_table: 'all_roverpass_data_new',
    geo_lat: lat,
    geo_lng: lon,
    location_detail: locationDetail(r),
    market_occupancy_rate: parseNum(r.roverpass_occupancy_rate),
  };
  return toCandidate(comp, id, (r.property_type as string) ?? null);
}

export function tableRowToCandidate(
  r: AnyRow,
  table: SiteExportTable
): CompsV2Candidate | null {
  switch (table) {
    case 'hipcamp':
      return hipcampCampspotRowToCandidate(r, 'hipcamp');
    case 'campspot':
      return hipcampCampspotRowToCandidate(r, 'campspot');
    case 'all_glamping_properties':
      return glampingRowToCandidate(r);
    case 'all_roverpass_data_new':
      return roverpassRowToCandidate(r);
    default:
      return null;
  }
}
