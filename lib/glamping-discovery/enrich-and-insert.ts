/**
 * Enrich extracted properties via OpenAI and insert into all_glamping_properties
 */

import type { OpenAI } from 'openai';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedProperty } from './extract-properties';

const TABLE_NAME = 'all_glamping_properties';
const DELAY_MS = 2000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const ENRICHMENT_PROMPT = `Research and provide detailed information about this glamping property:

Property Name: ${0}
City: ${1}
State: ${2}
Country: ${3}

Provide a JSON object with as much detail as possible:
- property_name: Keep the original name
- city: City name
- state: State/province abbreviation
- country: Country name (USA or Canada)
- address: Full street address if you can find it
- zip_code: ZIP/postal code if available
- url: Official website URL
- description: 3-5 sentence description of the property, amenities, and what makes it special
- unit_type: Types of accommodations (comma-separated, e.g., "tents, yurts, cabins")
- property_type: Type of property (e.g., "Glamping Resort", "Luxury Campground")
- phone_number: Phone number if available
- latitude: Approximate latitude if known (number)
- longitude: Approximate longitude if known (number)
- amenities: Array of key amenities (e.g., ["wifi", "hot tub", "fire pit", "bathroom", "kitchen", "spa"])

Focus on North American properties. If you cannot find specific information, use null or omit the field.

Return ONLY valid JSON object, no other text.`;

export async function enrichProperty(
  property: ExtractedProperty,
  openai: OpenAI
): Promise<ExtractedProperty> {
  const prompt = ENRICHMENT_PROMPT
    .replace('${0}', property.property_name)
    .replace('${1}', property.city || 'Unknown')
    .replace('${2}', property.state || 'Unknown')
    .replace('${3}', property.country || 'Unknown');

  await sleep(DELAY_MS);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.5,
    response_format: { type: 'json_object' },
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    return property;
  }

  try {
    const enriched = JSON.parse(content);
    return {
      ...enriched,
      property_name: property.property_name || enriched.property_name,
    } as ExtractedProperty;
  } catch {
    return property;
  }
}

export interface InsertRow {
  property_name: string;
  slug: string;
  property_type: string | null;
  research_status: string;
  is_glamping_property: string;
  is_closed: string;
  source: string;
  discovery_source: string;
  date_added: string;
  date_updated: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  url: string | null;
  phone_number: string | null;
  description: string | null;
  unit_type: string | null;
  quantity_of_units: string | null;
  year_site_opened: string | null;
  site_name: string | null;
  [key: string]: unknown;
}

export function toInsertRow(
  property: ExtractedProperty,
  discoverySource: string
): InsertRow {
  const slug = slugifyPropertyName(property.property_name);
  let url = (property.url || '').trim();
  if (url && !url.startsWith('http')) url = `https://${url}`;

  const today = new Date().toISOString().split('T')[0];

  const lat = property.latitude ?? property.lat;
  const lon = property.longitude ?? property.lon;

  return {
    property_name: property.property_name,
    slug,
    property_type: property.property_type || 'Glamping Resort',
    research_status: 'new',
    is_glamping_property: 'Yes',
    is_closed: 'No',
    source: 'Sage',
    discovery_source: discoverySource,
    date_added: today,
    date_updated: today,
    address: property.address || null,
    city: property.city || null,
    state: toStateCode(property.state || '') || null,
    zip_code: property.zip_code || null,
    country: property.country || 'USA',
    lat: typeof lat === 'number' ? lat : null,
    lon: typeof lon === 'number' ? lon : null,
    url: url || null,
    phone_number: property.phone_number || null,
    description: property.description || null,
    unit_type: property.unit_type || null,
    quantity_of_units: property.number_of_units != null ? String(property.number_of_units) : null,
    year_site_opened: property.year_opened != null ? String(property.year_opened) : null,
    site_name: property.site_name || null,
  };
}

export async function insertProperties(
  rows: InsertRow[],
  supabase: SupabaseClient
): Promise<number> {
  if (rows.length === 0) return 0;

  const BATCH_SIZE = 10;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(TABLE_NAME).insert(batch);

    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }

    inserted += batch.length;
  }

  return inserted;
}
