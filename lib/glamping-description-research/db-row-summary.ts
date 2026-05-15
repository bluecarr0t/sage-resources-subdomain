import { GLAMPING_PROPERTY_AMENITY_COLUMNS } from '@/lib/market-report/amenity-columns';

const UNIT_AMENITY_KEYS = [
  'unit_wifi',
  'unit_pets',
  'unit_private_bathroom',
  'unit_full_kitchen',
  'unit_kitchenette',
  'unit_hot_tub',
  'unit_air_conditioning',
  'unit_ada_accessibility',
] as const;

const SETTING_KEYS = [
  'setting_forest',
  'setting_lake',
  'setting_mountainous',
  'setting_desert',
  'setting_beach',
  'setting_ranch',
] as const;

function isYes(v: unknown): boolean {
  return typeof v === 'string' && v.trim().toLowerCase() === 'yes';
}

function humanizeColumnKey(key: string): string {
  return key
    .replace(/^unit_/i, '')
    .replace(/^property_/i, '')
    .replace(/^setting_/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Compact structured facts from a glamping row for the LLM (no raw notes).
 */
export function summarizeRowForDescription(row: Record<string, unknown>): string {
  const lines: string[] = [];
  const name = row.property_name != null ? String(row.property_name).trim() : '';
  if (name) lines.push(`Property name: ${name}`);
  const site = row.site_name != null ? String(row.site_name).trim() : '';
  if (site) lines.push(`Site / listing name: ${site}`);
  const city = row.city != null ? String(row.city).trim() : '';
  const state = row.state != null ? String(row.state).trim() : '';
  const country = row.country != null ? String(row.country).trim() : '';
  if (city || state || country) {
    lines.push(`Location: ${[city, state, country].filter(Boolean).join(', ')}`);
  }
  const unitType = row.unit_type != null ? String(row.unit_type).trim() : '';
  if (unitType) lines.push(`Primary unit type: ${unitType}`);
  const ptype = row.property_type != null ? String(row.property_type).trim() : '';
  if (ptype) lines.push(`Property type (dataset): ${ptype}`);
  const loc = row.land_operator_category != null ? String(row.land_operator_category).trim() : '';
  if (loc) lines.push(`Operator / tenure: ${loc}`);
  const sites = row.property_total_sites;
  if (sites != null && String(sites).trim() !== '') {
    lines.push(`Total sites (reported): ${String(sites).trim()}`);
  }
  const season = row.operating_season_months != null ? String(row.operating_season_months).trim() : '';
  if (season) lines.push(`Operating season: ${season}`);

  const amenities: string[] = [];
  for (const k of GLAMPING_PROPERTY_AMENITY_COLUMNS) {
    if (amenities.length >= 14) break;
    if (isYes(row[k])) amenities.push(humanizeColumnKey(k));
  }
  for (const k of UNIT_AMENITY_KEYS) {
    if (amenities.length >= 14) break;
    if (isYes(row[k])) amenities.push(humanizeColumnKey(k));
  }
  for (const k of SETTING_KEYS) {
    if (amenities.length >= 14) break;
    if (isYes(row[k])) amenities.push(humanizeColumnKey(k));
  }
  if (amenities.length) {
    lines.push(`Notable amenities / features (Yes in database): ${amenities.join(', ')}`);
  }

  return lines.join('\n');
}
