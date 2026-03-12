/**
 * Deduplicate extracted properties against all_glamping_properties
 * Adapted from process-afar-article-text.ts
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedProperty } from './extract-properties';

const TABLE_NAME = 'all_glamping_properties';

// Normalize property name for comparison
export function normalizePropertyName(name: string): string {
  if (!name) return '';
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(/-/g, ' ');
  normalized = normalized.replace(/\([^)]*\)/g, '');
  normalized = normalized.replace(/\s+/g, ' ');
  normalized = normalized.replace(/[^a-z0-9\s]/g, '');
  return normalized.trim();
}

/**
 * Fetch all property names from database (normalized for lookup)
 */
export async function getDatabasePropertyNames(
  supabase: SupabaseClient
): Promise<Set<string>> {
  const propertyNames = new Set<string>();
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('property_name')
      .not('property_name', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Error fetching from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const row of data) {
      const name = (row as { property_name?: string }).property_name?.trim();
      if (name) {
        propertyNames.add(normalizePropertyName(name));
      }
    }

    offset += batchSize;
    hasMore = data.length === batchSize;
  }

  return propertyNames;
}

/**
 * Check if property already exists in database
 */
export function propertyExistsInDb(
  property: ExtractedProperty,
  dbProperties: Set<string>
): boolean {
  const normalizedName = normalizePropertyName(property.property_name);
  if (dbProperties.has(normalizedName)) return true;
  for (const dbName of dbProperties) {
    if (normalizedName.length > 5 && (dbName.includes(normalizedName) || normalizedName.includes(dbName))) {
      return true;
    }
  }
  return false;
}

/**
 * Filter out properties that already exist in database
 */
export function filterNewProperties(
  properties: ExtractedProperty[],
  dbProperties: Set<string>
): ExtractedProperty[] {
  return properties.filter((p) => !propertyExistsInDb(p, dbProperties));
}
