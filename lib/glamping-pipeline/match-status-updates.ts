import { normalizePropertyName } from '@/lib/glamping-discovery/deduplicate';
import type { PipelinePropertyRef, PipelineStatusUpdate } from './types';

export type MatchedStatusUpdate = {
  update: PipelineStatusUpdate;
  property: PipelinePropertyRef;
};

/**
 * Match article status updates to tracked pipeline properties by normalized name.
 */
export function matchStatusUpdatesToProperties(
  updates: PipelineStatusUpdate[],
  tracked: PipelinePropertyRef[]
): MatchedStatusUpdate[] {
  const byName = new Map<string, PipelinePropertyRef>();
  for (const row of tracked) {
    const key = normalizePropertyName(row.property_name);
    if (key) byName.set(key, row);
  }

  const matched: MatchedStatusUpdate[] = [];
  const seenPropertyIds = new Set<number>();

  for (const update of updates) {
    if (update.confidence !== 'high') continue;

    const key = normalizePropertyName(update.property_name);
    const property = key ? byName.get(key) : undefined;
    if (!property || seenPropertyIds.has(property.id)) continue;

    const current = (property.is_open ?? '').trim();
    if (current === update.is_open) continue;

    seenPropertyIds.add(property.id);
    matched.push({ update, property });
  }

  return matched;
}
