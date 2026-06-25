/**
 * Fuzzy property search for linking past reports to Sage inventory.
 * GET /api/admin/reports/sage-property-search?q=...&city=...&state=...&limit=20
 */

import { NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { applySageDataGlampingListFilters } from '@/lib/admin/glamping-sage-data-list';
import {
  buildBroadOrFilter,
  propertyMatchesReportLocation,
  rankPropertySearchResults,
  significantSearchTokens,
  type SagePropertySearchRow,
} from '@/lib/admin/sage-data-fuzzy-search';
import { dedupeRowsToPropertyAnchors } from '@/lib/admin/glamping-list-anchor-key';
import { SAGE_PROPERTY_SELECT_FIELDS } from '@/lib/admin/resolve-sage-data-anchor-id';
import { normalizeState } from '@/lib/anchor-point-insights/utils';

export const dynamic = 'force-dynamic';

const LIST_ANCHORS_VIEW = 'all_sage_data_list_anchors';
const TABLE = 'all_sage_data';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const FALLBACK_CANDIDATE_LIMIT = 300;

const SEARCH_SELECT = SAGE_PROPERTY_SELECT_FIELDS;

type AdminSupabase = Parameters<Parameters<typeof withAdminAuth>[0]>[1]['supabase'];

type LocationScopedSearch = {
  queryText: string;
  city?: string;
  state?: string;
  limit: number;
};

function parseLimit(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function normalizeSearchState(state: string | undefined): string | undefined {
  if (!state?.trim()) return undefined;
  return normalizeState(state) ?? state.trim();
}

function buildListFilters(search: LocationScopedSearch) {
  return {
    q: search.queryText,
    researchStatus: undefined,
    country: undefined,
    city: search.city,
    state: normalizeSearchState(search.state),
    isOpen: undefined,
    discoverySource: undefined,
    missing: null,
    glampingServiceTier: undefined,
  };
}

function isMissingListViewError(message: string): boolean {
  const msg = message.toLowerCase();
  return msg.includes('list_anchors') || msg.includes('does not exist');
}

async function runFilteredQuery(
  supabase: AdminSupabase,
  search: LocationScopedSearch,
  candidateLimit: number
): Promise<SagePropertySearchRow[]> {
  const listFilters = buildListFilters(search);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from(LIST_ANCHORS_VIEW)
    .select(SEARCH_SELECT)
    .order('property_name', { ascending: true })
    .limit(candidateLimit);
  q = applySageDataGlampingListFilters(q, listFilters);

  let { data, error } = await q;
  if (error && isMissingListViewError(error.message)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tableQuery: any = supabase
      .from(TABLE)
      .select(SEARCH_SELECT)
      .order('property_name', { ascending: true })
      .limit(candidateLimit);
    tableQuery = applySageDataGlampingListFilters(tableQuery, listFilters);
    ({ data, error } = await tableQuery);
    if (!error) {
      return dedupeRowsToPropertyAnchors((data ?? []) as SagePropertySearchRow[]) as SagePropertySearchRow[];
    }
  }
  if (error) throw new Error(error.message);
  return (data ?? []) as SagePropertySearchRow[];
}

function applyLocationGuard(
  rows: SagePropertySearchRow[],
  city: string | undefined,
  state: string | undefined
): SagePropertySearchRow[] {
  if (!city && !state) return rows;
  return rows.filter((row) => propertyMatchesReportLocation(row, city, state));
}

async function fetchStrictMatches(
  supabase: AdminSupabase,
  search: LocationScopedSearch
): Promise<SagePropertySearchRow[]> {
  const rows = await runFilteredQuery(supabase, search, search.limit);
  return applyLocationGuard(rows, search.city, search.state);
}

async function fetchFallbackCandidates(
  supabase: AdminSupabase,
  search: LocationScopedSearch
): Promise<SagePropertySearchRow[]> {
  const tokens = significantSearchTokens(search.queryText).filter(
    (token) => token.length >= 3 || /^\d+$/.test(token)
  );
  if (tokens.length === 0) return [];

  const orFilter = buildBroadOrFilter(tokens);
  if (!orFilter) return [];

  const listFilters = buildListFilters({ ...search, queryText: '' });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from(LIST_ANCHORS_VIEW)
    .select(SEARCH_SELECT)
    .or(orFilter)
    .order('property_name', { ascending: true })
    .limit(FALLBACK_CANDIDATE_LIMIT);
  q = applySageDataGlampingListFilters(q, listFilters);

  let { data, error } = await q;
  if (error && isMissingListViewError(error.message)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tableQuery: any = supabase
      .from(TABLE)
      .select(SEARCH_SELECT)
      .or(orFilter)
      .order('property_name', { ascending: true })
      .limit(FALLBACK_CANDIDATE_LIMIT);
    tableQuery = applySageDataGlampingListFilters(tableQuery, listFilters);
    ({ data, error } = await tableQuery);
    if (!error) {
      const rows = dedupeRowsToPropertyAnchors((data ?? []) as SagePropertySearchRow[]) as SagePropertySearchRow[];
      return applyLocationGuard(rows, search.city, search.state);
    }
  }

  if (error) throw new Error(error.message);
  return applyLocationGuard((data ?? []) as SagePropertySearchRow[], search.city, search.state);
}

export const GET = withAdminAuth(async (request, auth) => {
  try {
    const params = request.nextUrl.searchParams;
    const queryText = (params.get('q') ?? '').trim();
    const city = params.get('city')?.trim() || undefined;
    const state = params.get('state')?.trim() || undefined;
    const limit = parseLimit(params.get('limit'));

    if (!queryText && !city && !state) {
      return NextResponse.json({ success: true, rows: [] });
    }

    const search: LocationScopedSearch = { queryText, city, state, limit };

    let rows = await fetchStrictMatches(auth.supabase, search);

    if (rows.length === 0 && queryText) {
      const candidates = await fetchFallbackCandidates(auth.supabase, search);
      rows = rankPropertySearchResults(candidates, queryText).slice(0, limit);
      rows = applyLocationGuard(rows, city, state);
    }

    return NextResponse.json({ success: true, rows });
  } catch (error) {
    console.error('[reports/sage-property-search] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    );
  }
});
