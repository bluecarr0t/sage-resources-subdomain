/**
 * "Sites" CSV/XLSX template column order (matches Sage sites exports, e.g. Campspot multi-site files).
 * Unknown fields are left blank; amenity booleans default to "No".
 */

import type { CompsV2ExportRow } from '@/lib/comps-v2/export-expand';
import { normalizeOccupancyToPercent } from '@/lib/comps-v2/comps-summary-stats';
import { STATE_ABBR_TO_NAME } from '@/lib/comps-v2/geo';
import { compsV2FriendlySourceTable } from '@/lib/comps-v2/source-table-display';

/** Column order must match downstream importers expecting the sites file shape. */
export const SITES_TEMPLATE_HEADERS: readonly string[] = [
  'DuplicateNote',
  'Source',
  'Date Added',
  'Date Updated',
  'Property Name',
  'Site Name',
  'Unit Type',
  'Property Type',
  'Property: Total Sites',
  'Quantity of Units',
  'Unit Capacity',
  'Year Site Opened',
  '# of Locations',
  'Address',
  'City',
  'State',
  'Zip Code',
  'Country',
  'Occupancy Rate 2024',
  'Avg. Retail Daily Rate 2024',
  'High Rate 2024',
  'Low Rate 2024',
  'Occupancy Rate 2025',
  'Avg. Retail Daily Rate 2025',
  'High Rate 2025',
  'Low Rate 2025',
  'Retail Daily Rate(+fees) 2025',
  'RevPAR 2025',
  'High Month 2025',
  'High Avg. Occupancy 2025',
  'Low Month 2025',
  'Low Avg. Occupancy 2025',
  'Occupancy Rate 2026',
  'Retail Daily Rate YTD',
  'Retail Daily Rate(+fees) YTD',
  'High Rate 2026',
  'Low Rate 2026',
  'RevPAR 2026',
  'High Month 2026',
  'High Avg. Occupancy 2026',
  'Low Month 2026',
  'Low Avg. Occupancy 2026',
  'Operating Season (Months)',
  'Operating Season (Excel Format)',
  'Avg. Rate (Next 12 Months)',
  'High Rate (Next 12 Months)',
  'Low Rate (Next 12 Months)',
  'Winter Weekday',
  'Winter Weekend',
  'Spring Weekday',
  'Spring Weekend',
  'Summer Weekday',
  'Summer Weekend',
  'Fall Weekday',
  'Fall Weekend',
  'Url',
  'Description',
  'Minimum nights',
  'Getting there',
  'lon',
  'lat',
  'Toilet',
  'Hot Tub / Sauna',
  'Pool',
  'Pets',
  'Water',
  'Shower',
  'Trash',
  'Cooking Equipment',
  'Picnic table',
  'Wifi',
  'Laundry',
  'Campfires',
  'Playground',
  'RV - Vehicle Length',
  'RV - Parking',
  'RV - Accommodates Slideout',
  'RV - Surface Type',
  'RV - Surface Level',
  'RV - Vehicles: Fifth Wheels',
  'RV - Vehicles: Class A RVs',
  'RV - Vehicles: Class B RVs',
  'RV - Vehicles: Class C RVs',
  'RV - Vehicles: Toy Hauler',
  'Fishing',
  'Surfing',
  'Horseback riding',
  'Paddling',
  'Climbing',
  'Off-roading (OHV)',
  'Boating',
  'Swimming',
  'Wind sports',
  'Snow sports',
  'Whitewater paddling',
  'Fall Fun',
  'Hiking',
  'Wildlife watching',
  'Biking',
  'Ranch',
  'Beach',
  'Coastal',
  'Suburban',
  'Forest',
  'Field',
  'Wetlands',
  'Hot spring',
  'Desert',
  'Canyon',
  'Waterfall',
  'Swimming hole',
  'Lake',
  'Cave',
  'Redwoods',
  'Farm',
  'River, stream, or creek',
  'Mountainous',
  'Sage - P. Amenity: Food On Site',
  'Waterfront',
  'Restaurant',
  'Dog Park',
  'Clubhouse',
  'Canoeing / Kayaking',
  'Alcohol Available',
  'Golf Cart Rental',
  'Private Bathroom',
  'Waterpark',
  'Kitchen',
  'Patio',
  'Electricity',
  'General Store',
  'Cable',
  'Charcoal Grill',
  'Sewer Hook-Up',
  'Electrical Hook-Up',
  'Generators Allowed',
  'Water Hookup',
] as const;

const AMENITY_START_INDEX = 61;
const NO = 'No';

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** MM-DD-YYYY to align with reference sites files. */
export function formatSitesExportCalendarDate(d: Date): string {
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${d.getFullYear()}`;
}

/** Occupancy in template files is a 0–1 decimal (e.g. 0.08). */
function occupancyDecimalExport(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  const pct = normalizeOccupancyToPercent(value);
  const dec = Math.round((pct / 100) * 1000) / 1000;
  return String(dec);
}

function rateNumberExport(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '';
  return String(Math.round(value * 10) / 10);
}

function stateFullName(abbr: string | null | undefined): string {
  const a = (abbr ?? '').trim().toUpperCase().slice(0, 2);
  if (a.length !== 2) return (abbr ?? '').trim();
  return STATE_ABBR_TO_NAME[a] ?? abbr!.trim();
}

function streetFromLocationDetail(detail: string | null | undefined): string {
  const s = detail?.trim() ?? '';
  if (!s) return '';
  const i = s.indexOf(' · ');
  if (i > 0) return s.slice(0, i).trim();
  if (/^\d/.test(s)) return s;
  return '';
}

function zipFromText(text: string): string {
  const m = text.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1]! : '';
}

function siteExportName(r: CompsV2ExportRow): string {
  if (r.sites_in_property_record > 1) {
    const ut = r.unit_type?.trim();
    return ut ? `${ut} (site ${r.site_index})` : `Site ${r.site_index}`;
  }
  const ut = r.unit_type?.trim();
  return ut || r.property_name;
}

function propertyTypeExport(r: CompsV2ExportRow): string {
  const p = r.property_type?.trim();
  if (p) return p;
  switch (r.source_table) {
    case 'all_glamping_properties':
      return 'Glamping';
    case 'hipcamp':
      return 'Glamping';
    case 'campspot':
      return 'Campground / RV';
    case 'all_roverpass_data_new':
      return 'RV';
    case 'past_reports':
      return 'Past report comp';
    case 'tavily_gap_fill':
    case 'firecrawl_gap_fill':
      return 'Web research';
    case 'comps_v2_deep_enrich':
      return 'Deep enrichment';
    default:
      return '';
  }
}

function countryExport(stateAbbr: string): string {
  const a = stateAbbr.trim().toUpperCase().slice(0, 2);
  return STATE_ABBR_TO_NAME[a] ? 'United States' : '';
}

/**
 * One CSV/XLSX row in sites template column order.
 */
export function compsV2ExportRowToSitesTemplate(
  r: CompsV2ExportRow,
  options?: { exportDate?: Date }
): unknown[] {
  const d = options?.exportDate ?? new Date();
  const dateStr = formatSitesExportCalendarDate(d);
  const loc = r.location_detail?.trim() ?? '';
  const street = streetFromLocationDetail(loc) || (loc && /^\d/.test(loc) ? loc : '');
  const zip = zipFromText(loc) || zipFromText(`${r.city} ${r.state}`);
  const occDec = occupancyDecimalExport(r.market_occupancy_rate);
  const adr = r.avg_retail_daily_rate;
  const hi = r.high_rate;
  const lo = r.low_rate;
  const sr = r.seasonal_rates;

  const row: unknown[] = new Array(SITES_TEMPLATE_HEADERS.length);
  for (let i = AMENITY_START_INDEX; i < row.length; i++) row[i] = NO;

  row[0] = '';
  row[1] = compsV2FriendlySourceTable(r.source_table);
  row[2] = dateStr;
  row[3] = dateStr;
  row[4] = r.property_name;
  row[5] = siteExportName(r);
  row[6] = r.unit_type ?? '';
  row[7] = propertyTypeExport(r);
  row[8] = r.property_total_sites ?? '';
  row[9] = r.quantity_of_units ?? '';
  row[10] = '';
  row[11] = '';
  row[12] = '';
  row[13] = street;
  row[14] = r.city ?? '';
  row[15] = stateFullName(r.state);
  row[16] = zip;
  row[17] = countryExport(r.state ?? '');

  row[18] = '';
  row[19] = '';
  row[20] = '';
  row[21] = '';

  row[22] = occDec;
  row[23] = rateNumberExport(adr);
  row[24] = rateNumberExport(hi);
  row[25] = rateNumberExport(lo);
  row[26] = '';
  row[27] = '';
  row[28] = '';
  row[29] = '';
  row[30] = '';
  row[31] = '';

  row[32] = '';
  row[33] = '';
  row[34] = '';
  row[35] = '';
  row[36] = '';
  row[37] = '';
  row[38] = '';
  row[39] = '';
  row[40] = '';
  row[41] = '';

  row[42] = r.operating_season_months ?? '';
  row[43] = '';
  row[44] = rateNumberExport(adr);
  row[45] = rateNumberExport(hi);
  row[46] = rateNumberExport(lo);

  row[47] = sr.winter_weekday != null ? String(sr.winter_weekday) : '';
  row[48] = sr.winter_weekend != null ? String(sr.winter_weekend) : '';
  row[49] = sr.spring_weekday != null ? String(sr.spring_weekday) : '';
  row[50] = sr.spring_weekend != null ? String(sr.spring_weekend) : '';
  row[51] = sr.summer_weekday != null ? String(sr.summer_weekday) : '';
  row[52] = sr.summer_weekend != null ? String(sr.summer_weekend) : '';
  row[53] = sr.fall_weekday != null ? String(sr.fall_weekday) : '';
  row[54] = sr.fall_weekend != null ? String(sr.fall_weekend) : '';

  row[55] = r.url ?? '';
  row[56] = r.description ?? '';
  row[57] = '';
  row[58] = '';

  const lng = r.geo_lng;
  const lat = r.geo_lat;
  row[59] = lng != null && Number.isFinite(lng) ? lng : '';
  row[60] = lat != null && Number.isFinite(lat) ? lat : '';

  return row;
}
