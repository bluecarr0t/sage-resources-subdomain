/**
 * Data utilities for glamping unit type discovery pages
 */

import { createServerClient } from '@/lib/supabase';
import { getCache, setCache } from '@/lib/redis';
import { SageProperty } from '@/lib/types/sage';
import {
  getUnitTypeConfigBySlug,
  type UnitTypeConfig,
} from '@/lib/unit-type-config';

const DEFAULT_LIMIT = 50;
const CACHE_TTL_SECONDS = 86400 * 7; // 7 days

/**
 * Fetch glamping properties that offer a given unit type
 * Uses ilike for flexible matching (handles comma-separated unit_type values)
 */
export async function getPropertiesByUnitType(
  unitTypeSlug: string,
  limit: number = DEFAULT_LIMIT
): Promise<SageProperty[]> {
  const config = getUnitTypeConfigBySlug(unitTypeSlug);
  if (!config) {
    return [];
  }

  const cacheKey = `props-by-unit:${unitTypeSlug}:${limit}`;
  const cached = await getCache<SageProperty[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const supabase = createServerClient();

    // Build OR filter: unit_type ilike pattern1 OR unit_type ilike pattern2 ...
    const orConditions = config.matchPatterns
      .map((p) => `unit_type.ilike.${p}`)
      .join(',');

    const { data: rows, error } = await supabase
      .from('all_glamping_properties')
      .select('*')
      .eq('is_glamping_property', 'Yes')
      .neq('is_closed', 'Yes')
      .eq('research_status', 'published')
      .not('property_name', 'is', null)
      .or(orConditions)
      .limit(limit * 3); // Fetch extra for deduplication

    if (error) {
      console.error('Error fetching properties by unit type:', error);
      return [];
    }

    if (!rows || rows.length === 0) {
      setCache(cacheKey, [], CACHE_TTL_SECONDS).catch(() => {});
      return [];
    }

    // Deduplicate by property_name - keep one record per property
    // Prefer: has slug, has coordinates, higher quality_score
    const propertyMap = new Map<string, any>();
    for (const row of rows) {
      const name = (row.property_name as string)?.trim();
      if (!name) continue;

      const existing = propertyMap.get(name);
      const hasSlug = !!(row.slug as string)?.trim();
      const hasCoords =
        row.lat != null &&
        row.lon != null &&
        !isNaN(Number(row.lat)) &&
        !isNaN(Number(row.lon));
      const qs = row.quality_score != null ? Number(row.quality_score) : 0;

      if (!existing) {
        propertyMap.set(name, row);
      } else {
        const exHasSlug = !!(existing.slug as string)?.trim();
        const exHasCoords =
          existing.lat != null &&
          existing.lon != null &&
          !isNaN(Number(existing.lat)) &&
          !isNaN(Number(existing.lon));
        const exQs = existing.quality_score != null ? Number(existing.quality_score) : 0;

        const replace =
          (hasSlug && !exHasSlug) ||
          (hasCoords && !exHasCoords && hasSlug === exHasSlug) ||
          (qs > exQs && hasCoords === exHasCoords && hasSlug === exHasSlug);

        if (replace) {
          propertyMap.set(name, row);
        }
      }
    }

    const unique = Array.from(propertyMap.values())
      .sort((a, b) => {
        const qsA = a.quality_score != null ? Number(a.quality_score) : 0;
        const qsB = b.quality_score != null ? Number(b.quality_score) : 0;
        if (qsB !== qsA) return qsB - qsA;
        return (a.property_name || '').localeCompare(b.property_name || '');
      })
      .slice(0, limit) as SageProperty[];

    setCache(cacheKey, unique, CACHE_TTL_SECONDS).catch(() => {});

    return unique;
  } catch (err) {
    console.error('Error in getPropertiesByUnitType:', err);
    return [];
  }
}
