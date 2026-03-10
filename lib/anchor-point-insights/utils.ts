/**
 * Utility functions for Anchor Point Insights
 */

import { STATE_FULL_TO_ABBR, FETCH_PAGE_SIZE } from './constants';

const VALID_STATE_CODES = new Set(Object.values(STATE_FULL_TO_ABBR));

export function parseNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && !isNaN(val)) return val;
  const s = String(val).trim();
  if (!s || s.toLowerCase() === 'no data') return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function parseCoord(val: unknown): number | null {
  const n = parseNum(val);
  if (n === null) return null;
  if (n < -180 || n > 180) return null;
  return n;
}

/** Normalize state to 2-letter uppercase code. Handles "CA", "California", "ca", etc. */
export function normalizeState(state: string | null | undefined): string | null {
  if (state == null || typeof state !== 'string') return null;
  const s = state.trim();
  if (!s) return null;
  if (s.length === 2) {
    const code = s.toUpperCase();
    return VALID_STATE_CODES.has(code) ? code : null;
  }
  const abbr = STATE_FULL_TO_ABBR[s.toLowerCase()];
  return abbr ?? null;
}

import type { SupabaseClient } from '@supabase/supabase-js';

/** Paginate through a Supabase table to fetch up to maxRows */
export async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters: { notNull?: string[]; neq?: Array<{ col: string; val: unknown }> },
  maxRows: number,
  orderBy: string = 'id'
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (all.length < maxRows) {
    const pageSize = Math.min(FETCH_PAGE_SIZE, maxRows - all.length);
    let q = supabase
      .from(table)
      .select(select)
      .range(offset, offset + pageSize - 1)
      .order(orderBy, { ascending: true });
    for (const col of filters.notNull ?? []) {
      q = q.not(col, 'is', null);
    }
    for (const item of filters.neq ?? []) {
      q = q.neq(item.col, item.val);
    }
    const { data, error } = await q;
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    offset += data.length;
  }
  return all;
}
