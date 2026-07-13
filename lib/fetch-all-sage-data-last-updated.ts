/**
 * Table-wide freshness for `/glamping-market-overview` “Last Updated”.
 * Uses the newest timestamp across all `all_sage_data` rows (any change),
 * not the filtered market-overview cohort.
 */

import { unstable_cache } from 'next/cache';
import { createServerClient } from '@/lib/supabase';
import {
  GLAMPING_MARKET_OVERVIEW_CACHE_TAGS,
  GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS,
} from '@/lib/glamping-market-overview-cache';

export function parseTimestampMs(value: string | null | undefined): number | null {
  if (value == null || !String(value).trim()) return null;
  const ms = Date.parse(String(value).trim());
  return Number.isFinite(ms) ? ms : null;
}

/** YYYY-MM-DD text → UTC midnight ms (admin `date_updated` / script convention). */
export function parseDateUpdatedMs(value: string | null | undefined): number | null {
  if (value == null) return null;
  const t = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  return parseTimestampMs(`${t}T00:00:00.000Z`);
}

export function resolveAllSageDataLastUpdatedIso(parts: {
  updatedAt?: string | null;
  createdAt?: string | null;
  dateUpdated?: string | null;
  nowMs?: number;
}): string {
  const candidates = [
    parseTimestampMs(parts.updatedAt),
    parseTimestampMs(parts.createdAt),
    parseDateUpdatedMs(parts.dateUpdated),
  ].filter((n): n is number => n != null && n > 0);

  const maxMs =
    candidates.length > 0 ? Math.max(...candidates) : (parts.nowMs ?? Date.now());
  return new Date(maxMs).toISOString();
}

async function loadAllSageDataLastUpdatedAt(): Promise<string> {
  const supabase = createServerClient();

  const [updatedRes, createdRes, dateUpdatedRes] = await Promise.all([
    supabase
      .from('all_sage_data')
      .select('updated_at')
      .not('updated_at', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('all_sage_data')
      .select('created_at')
      .not('created_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('all_sage_data')
      .select('date_updated')
      .not('date_updated', 'is', null)
      .neq('date_updated', '')
      .order('date_updated', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (updatedRes.error) {
    console.error('[loadAllSageDataLastUpdatedAt] updated_at', updatedRes.error);
  }
  if (createdRes.error) {
    console.error('[loadAllSageDataLastUpdatedAt] created_at', createdRes.error);
  }
  if (dateUpdatedRes.error) {
    console.error('[loadAllSageDataLastUpdatedAt] date_updated', dateUpdatedRes.error);
  }

  return resolveAllSageDataLastUpdatedIso({
    updatedAt: (updatedRes.data as { updated_at?: string | null } | null)?.updated_at,
    createdAt: (createdRes.data as { created_at?: string | null } | null)?.created_at,
    dateUpdated: (dateUpdatedRes.data as { date_updated?: string | null } | null)
      ?.date_updated,
  });
}

/** Cached newest `all_sage_data` change timestamp (ISO). */
export async function fetchAllSageDataLastUpdatedAt(): Promise<string> {
  return unstable_cache(
    () => loadAllSageDataLastUpdatedAt(),
    ['all-sage-data-last-updated'],
    {
      revalidate: GLAMPING_MARKET_OVERVIEW_REVALIDATE_SECONDS,
      tags: [...GLAMPING_MARKET_OVERVIEW_CACHE_TAGS],
    }
  )();
}
