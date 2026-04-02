import {
  HIPCAMPSPOT_AMENITY_DB_KEYS,
  HIPCAMPSPOT_TEMPLATE_DB_KEYS,
} from '@/lib/sites-export/constants';
import type { SiteExportTable } from '@/lib/sites-export/constants';

type AnyRow = Record<string, unknown>;

const AMENITY_START = 61;

function cellStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const s = String(v).trim();
  return s;
}

function firstNonEmpty(raw: AnyRow, keys: string[]): string {
  for (const k of keys) {
    if (raw[k] == null) continue;
    const s = cellStr(raw[k]);
    if (s !== '') return s;
  }
  return '';
}

/** Glamping / v4 schema: extra keys to try per hipcamp-style amenity column. */
const GLAMPING_AMENITY_ALTERNATES: Partial<Record<string, string[]>> = {
  hot_tub_sauna: ['hot_tub_or_sauna', 'unit_hot_tub_or_sauna'],
  pool: ['property_pool', 'unit_pool'],
  pets: ['unit_pets'],
  laundry: ['property_laundry'],
  playground: ['property_playground'],
  campfires: ['unit_campfires'],
  picnic_table: ['unit_picnic_table'],
  wifi: ['unit_wifi'],
  fishing: ['activities_fishing'],
  surfing: ['activities_surfing'],
  horseback_riding: ['activities_horseback_riding'],
  paddling: ['activities_paddling'],
  climbing: ['activities_climbing'],
  off_roading_ohv: ['activities_off_roading_ohv'],
  boating: ['activities_boating'],
  swimming: ['activities_swimming'],
  wind_sports: ['activities_wind_sports'],
  snow_sports: ['activities_snow_sports'],
  whitewater_paddling: ['activities_whitewater_paddling'],
  fall_fun: ['activities_fall_fun'],
  hiking: ['activities_hiking'],
  wildlife_watching: ['activities_wildlife_watching'],
  biking: ['activities_biking'],
  canoeing_kayaking: ['activities_canoeing_kayaking', 'canoeing_kayaking'],
  ranch: ['setting_ranch'],
  beach: ['setting_beach'],
  coastal: ['setting_coastal'],
  suburban: ['setting_suburban'],
  forest: ['setting_forest'],
  field: ['setting_field'],
  wetlands: ['setting_wetlands'],
  hot_spring: ['setting_hot_spring'],
  desert: ['setting_desert'],
  canyon: ['setting_canyon'],
  waterfall: ['setting_waterfall'],
  swimming_hole: ['setting_swimming_hole'],
  lake: ['setting_lake'],
  cave: ['setting_cave'],
  redwoods: ['setting_redwoods'],
  farm: ['setting_farm'],
  mountainous: ['setting_mountainous'],
  sage_p_amenity_food_on_site: ['property_food_on_site'],
  waterfront: ['property_waterfront'],
  restaurant: ['property_restaurant'],
  dog_park: ['property_dog_park'],
  clubhouse: ['property_clubhouse'],
  alcohol_available: ['property_alcohol_available'],
  golf_cart_rental: ['property_golf_cart_rental'],
  waterpark: ['property_waterpark'],
  general_store: ['property_general_store'],
  sewer_hook_up: ['rv_sewer_hook_up'],
  electrical_hook_up: ['rv_electrical_hook_up'],
  generators_allowed: ['rv_generators_allowed'],
  water_hookup: ['rv_water_hookup'],
};

/** Merge raw hipcamp/campspot cells into an existing template row. */
export function mergeHipcampspotRawIntoRow(row: unknown[], raw: AnyRow): void {
  for (let i = 0; i < HIPCAMPSPOT_TEMPLATE_DB_KEYS.length; i++) {
    const key = HIPCAMPSPOT_TEMPLATE_DB_KEYS[i];
    if (!key) continue;
    if (raw[key] == null) continue;
    const s = cellStr(raw[key]);
    if (s !== '') row[i] = s;
  }
  for (let j = 0; j < HIPCAMPSPOT_AMENITY_DB_KEYS.length; j++) {
    const idx = AMENITY_START + j;
    const key = HIPCAMPSPOT_AMENITY_DB_KEYS[j]!;
    if (raw[key] == null) continue;
    const s = cellStr(raw[key]);
    if (s !== '') row[idx] = s;
  }
}

/**
 * Merge raw glamping/roverpass fields into template row (best-effort; schema varies).
 */
export function mergeGlampingRoverRawIntoRow(row: unknown[], raw: AnyRow): void {
  for (let i = 0; i < HIPCAMPSPOT_TEMPLATE_DB_KEYS.length; i++) {
    const key = HIPCAMPSPOT_TEMPLATE_DB_KEYS[i];
    if (!key) continue;
    if (i === 12) {
      const v = firstNonEmpty(raw, ['of_locations', 'number_of_locations']);
      if (v) row[i] = v;
      continue;
    }
    if (i >= 47 && i <= 54) {
      const seasonalKey = key;
      const rateKey = `rate_${seasonalKey}`;
      const v = firstNonEmpty(raw, [rateKey, seasonalKey]);
      if (v) row[i] = v;
      continue;
    }
    if (i >= 18 && i <= 41) {
      const v = firstNonEmpty(raw, [key]);
      if (v) row[i] = v;
      continue;
    }
    const v = firstNonEmpty(raw, [key]);
    if (v) row[i] = v;
  }

  for (let j = 0; j < HIPCAMPSPOT_AMENITY_DB_KEYS.length; j++) {
    const idx = AMENITY_START + j;
    const key = HIPCAMPSPOT_AMENITY_DB_KEYS[j]!;
    const alts = GLAMPING_AMENITY_ALTERNATES[key];
    const keys = alts ? [key, ...alts] : [key];
    const v = firstNonEmpty(raw, keys);
    if (v) row[idx] = v;
  }
}

export function mergeRawIntoTemplateRow(
  row: unknown[],
  raw: AnyRow,
  table: SiteExportTable
): void {
  if (table === 'hipcamp' || table === 'campspot') {
    mergeHipcampspotRawIntoRow(row, raw);
  } else {
    mergeGlampingRoverRawIntoRow(row, raw);
  }
}
