import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import { normalizePropertyName } from '@/components/map/utils/propertyProcessing';
import { PUBLISHED_RESEARCH_STATUS } from '@/lib/published-property-pages';

async function loadAllSageUniquePropertyCount(): Promise<number> {
  const supabase = createServerClient();
  const uniqueNames = new Set<string>();
  const batchSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('all_sage_data')
      .select('property_name')
      .eq('research_status', PUBLISHED_RESEARCH_STATUS)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('[loadAllSageUniquePropertyCount]', error);
      throw new Error(`Failed to count unique properties: ${error.message}`);
    }

    if (!data?.length) break;

    for (const row of data as Array<{ property_name?: string | null }>) {
      const name = row.property_name?.trim();
      if (!name) continue;
      uniqueNames.add(normalizePropertyName(name));
    }

    if (data.length < batchSize) break;
    offset += batchSize;
  }

  return uniqueNames.size;
}

/**
 * Cached count of unique published properties in `all_sage_data` (deduped by
 * normalized property_name, `research_status = published`). Use for marketing /
 * SEO / llms.txt — not the narrower map cohort.
 */
export function getAllSageUniquePropertyCount(): Promise<number> {
  return unstable_cache(
    loadAllSageUniquePropertyCount,
    ['all-sage-unique-property-count-published'],
    { revalidate: 1800, tags: ['properties'] }
  )();
}
