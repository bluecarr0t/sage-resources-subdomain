import {
  GLAMPING_IS_OPEN_VALUES,
  type GlampingIsOpenValue,
} from '@/lib/glamping-is-open';
import type { PipelineTrackedIsOpen } from './types';

const PIPELINE_TRACKED = new Set<string>([
  'Proposed Development',
  'Under Construction',
]);

/** Map free-text / article labels to stored `is_open` values. */
export function normalizeGlampingIsOpenLabel(
  raw: string | null | undefined
): GlampingIsOpenValue | null {
  const v = (raw ?? '').trim().toLowerCase();
  if (!v) return null;

  if (v === 'yes' || v === 'open' || v === 'operating' || v === 'now open' || v === 'opened') {
    return 'Yes';
  }
  if (
    v === 'under construction' ||
    v === 'construction' ||
    v === 'pre-opening' ||
    v === 'preopening' ||
    v === 'coming soon' ||
    v === 'building'
  ) {
    return 'Under Construction';
  }
  if (
    v === 'proposed development' ||
    v === 'proposed' ||
    v === 'in planning' ||
    v === 'planning' ||
    v === 'entitlement'
  ) {
    return 'Proposed Development';
  }
  if (v === 'temporarily closed') return 'Temporarily closed';
  if (
    v === 'cancelled' ||
    v === 'canceled' ||
    v === 'abandoned' ||
    v === 'project cancelled' ||
    v === 'project canceled' ||
    v === 'development cancelled' ||
    v === 'development canceled' ||
    v === 'shelved' ||
    v === 'on hold indefinitely' ||
    v === 'permanently on hold'
  ) {
    return 'Cancelled';
  }
  if (v === 'closed' || v === 'no') return 'Closed';

  const exact = GLAMPING_IS_OPEN_VALUES.find(
    (opt) => opt.toLowerCase() === v
  );
  return exact ?? null;
}

export function isPipelineTrackedIsOpen(
  value: string | null | undefined
): value is PipelineTrackedIsOpen {
  return PIPELINE_TRACKED.has((value ?? '').trim());
}

export function todayUtcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
