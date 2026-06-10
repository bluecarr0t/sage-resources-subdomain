import { ALL_SAGE_DATA_TABLE } from '@/lib/all-sage-data-table';
import { normalizeGlampingUnitTypeForStorage } from '@/lib/glamping-unit-type-normalize';
import type { PipelineSegment } from './constants';
import {
  PIPELINE_DISCOVERY_SOURCE,
  PIPELINE_RV_DISCOVERY_SOURCE,
  PIPELINE_RV_PROPERTY_TYPES,
} from './constants';
import type { PipelineExtractedProperty } from './types';
import { todayUtcDateString } from './normalize-is-open';

function slugifyPropertyName(name: string): string {
  const transliterated = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function toStateCode(s: string): string {
  const trimmed = (s || '').trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return trimmed;
}

export type PipelineInsertRow = {
  property_name: string;
  slug: string;
  property_type: string;
  research_status: string;
  is_glamping_property: string;
  is_open: string;
  source: string;
  discovery_source: string;
  date_added: string;
  date_updated: string;
  country: string;
  land_operator_category: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  lat: number | null;
  lon: number | null;
  url: string | null;
  phone_number: string | null;
  description: string | null;
  unit_type: string | null;
  quantity_of_units: string | null;
  site_name: string | null;
  property_total_sites: string | null;
};

export function toPipelineInsertRow(
  property: PipelineExtractedProperty,
  segment: PipelineSegment = 'glamping',
  discoverySource?: string
): PipelineInsertRow {
  const slug = slugifyPropertyName(property.property_name);
  let url = (property.url || '').trim();
  if (url && !url.startsWith('http')) url = `https://${url}`;

  const today = todayUtcDateString();
  const lat = property.latitude ?? property.lat;
  const lon = property.longitude ?? property.lon;
  const units =
    property.number_of_units != null ? String(property.number_of_units) : null;

  const defaultDiscoverySource =
    segment === 'rv' ? PIPELINE_RV_DISCOVERY_SOURCE : PIPELINE_DISCOVERY_SOURCE;

  const propertyType =
    segment === 'rv'
      ? property.property_type &&
        (PIPELINE_RV_PROPERTY_TYPES as readonly string[]).includes(property.property_type)
        ? property.property_type
        : /\bcampground\b/i.test(property.property_name) &&
            !/\bresort\b/i.test(property.property_name)
          ? 'Campground'
          : /\bresort\b/i.test(property.property_name)
            ? 'RV Resort'
            : 'RV Park'
      : property.property_type || 'Glamping Resort';

  return {
    property_name: property.property_name,
    slug,
    property_type: propertyType,
    research_status: 'in_progress',
    is_glamping_property: segment === 'rv' ? 'No' : 'Yes',
    is_open: property.is_open,
    source: 'Sage',
    discovery_source: discoverySource ?? defaultDiscoverySource,
    date_added: today,
    date_updated: today,
    country: 'United States',
    land_operator_category: 'private_commercial',
    address: property.address || null,
    city: property.city || null,
    state: toStateCode(property.state || '') || null,
    zip_code: property.zip_code || null,
    lat: typeof lat === 'number' ? lat : null,
    lon: typeof lon === 'number' ? lon : null,
    url: url || null,
    phone_number: property.phone_number || null,
    description: property.description || null,
    unit_type:
      segment === 'rv'
        ? 'RV Site'
        : normalizeGlampingUnitTypeForStorage(property.unit_type) ?? null,
    quantity_of_units: units,
    property_total_sites: segment === 'rv' ? units : null,
    site_name: property.site_name || null,
  };
}

/** Table name for pipeline inserts (re-export for callers). */
export const PIPELINE_INSERT_TABLE = ALL_SAGE_DATA_TABLE;
