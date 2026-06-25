import type { SageGlampingListQuery } from '@/lib/admin/glamping-sage-data-list';
import { normalizeState } from '@/lib/anchor-point-insights/utils';

export const SAGE_DATA_SEARCH_FIELDS = [
  'property_name',
  'address',
  'city',
  'state',
  'country',
] as const;

const SEARCH_STOPWORDS = new Set(['the', 'and', 'of', 'at', 'in', 'a', 'an']);

/** Normalize text for fuzzy comparison: lowercase, strip apostrophes/punctuation. */
export function normalizeForFuzzySearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeIlikeTerm(term: string): string {
  return term.replace(/[%,()]/g, '').trim();
}

/** Split a free-text query into normalized tokens. */
export function tokenizeSageDataSearchQuery(query: string): string[] {
  return normalizeForFuzzySearch(query)
    .split(' ')
    .filter((token) => token.length > 0);
}

/** Tokens used for AND-style matching (drops filler words, keeps numbers). */
export function significantSearchTokens(query: string): string[] {
  return tokenizeSageDataSearchQuery(query).filter(
    (token) => !SEARCH_STOPWORDS.has(token) && (token.length >= 2 || /^\d+$/.test(token))
  );
}

/**
 * Expand a token into ILIKE patterns that tolerate possessives / trailing "s"
 * (e.g. "mcdonnells" also matches "mcdonnell" in "McDonnell's Lane").
 */
export function expandTokenIlikePatterns(token: string): string[] {
  const escaped = escapeIlikeTerm(token);
  if (!escaped) return [];

  const patterns = new Set<string>([`%${escaped}%`]);

  if (escaped.length >= 4 && escaped.endsWith('s')) {
    patterns.add(`%${escaped.slice(0, -1)}%`);
  }
  if (escaped.length >= 5 && !escaped.endsWith('s')) {
    patterns.add(`%${escaped.slice(0, -1)}%`);
  }

  return [...patterns];
}

export function buildTokenOrFilter(token: string): string {
  const patterns = expandTokenIlikePatterns(token);
  const clauses: string[] = [];
  for (const pattern of patterns) {
    for (const field of SAGE_DATA_SEARCH_FIELDS) {
      clauses.push(`${field}.ilike.${pattern}`);
    }
  }
  return clauses.join(',');
}

/** Apply fuzzy token AND search: each token must match at least one searchable field. */
export function applyFuzzySageDataSearch<T extends SageGlampingListQuery>(
  query: T,
  rawQ: string
): T {
  const tokens = significantSearchTokens(rawQ);
  if (tokens.length === 0) return query;

  let q: SageGlampingListQuery = query;
  for (const token of tokens) {
    q = q.or(buildTokenOrFilter(token));
  }
  return q as T;
}

export type SagePropertySearchRow = {
  id: number;
  property_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  is_open?: string | null;
  research_status?: string | null;
  slug?: string | null;
  property_id?: string | null;
  property_type?: string | null;
};

export function propertySearchHaystack(row: SagePropertySearchRow): string {
  return normalizeForFuzzySearch(
    [row.property_name, row.address, row.city, row.state, row.zip_code]
      .filter((part) => part != null && String(part).trim())
      .join(' ')
  );
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

export function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normalizeForFuzzySearch(a);
  const nb = normalizeForFuzzySearch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.95;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshteinDistance(na, nb) / maxLen;
}

export function scorePropertySearchMatch(
  row: SagePropertySearchRow,
  query: string,
  tokens: string[]
): number {
  const haystack = propertySearchHaystack(row);
  if (!haystack) return 0;

  let score = stringSimilarity(query, haystack) * 40;

  for (const token of tokens) {
    if (haystack.includes(token)) {
      score += 12;
      continue;
    }
    const patterns = expandTokenIlikePatterns(token).map((p) => p.slice(1, -1));
    if (patterns.some((stem) => stem.length >= 3 && haystack.includes(stem))) {
      score += 8;
    }
  }

  return score;
}

export function buildBroadOrFilter(tokens: string[]): string {
  const clauses = new Set<string>();
  for (const token of tokens) {
    for (const clause of buildTokenOrFilter(token).split(',')) {
      if (clause) clauses.add(clause);
    }
  }
  return [...clauses].join(',');
}

export function propertyMatchesReportLocation(
  row: Pick<SagePropertySearchRow, 'city' | 'state'>,
  city: string | null | undefined,
  state: string | null | undefined
): boolean {
  const targetState = normalizeState(state ?? '') ?? (state ?? '').trim();
  const rowState = normalizeState(row.state ?? '') ?? (row.state ?? '').trim();
  if (targetState && rowState) {
    if (targetState.toUpperCase() !== rowState.toUpperCase()) return false;
  } else if (targetState || rowState) {
    const targetStateNorm = normalizeForFuzzySearch(targetState);
    const rowStateNorm = normalizeForFuzzySearch(rowState);
    if (targetStateNorm && rowStateNorm && targetStateNorm !== rowStateNorm) return false;
  }

  const targetCity = normalizeForFuzzySearch(city ?? '');
  if (!targetCity) return true;

  const rowCity = normalizeForFuzzySearch(row.city ?? '');
  if (!rowCity) return false;
  return rowCity.includes(targetCity) || targetCity.includes(rowCity);
}

export function rankPropertySearchResults(
  rows: SagePropertySearchRow[],
  query: string
): SagePropertySearchRow[] {
  const tokens = significantSearchTokens(query);
  if (tokens.length === 0) return rows;

  return [...rows]
    .map((row) => ({
      row,
      score: scorePropertySearchMatch(row, query, tokens),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ row }) => row);
}
