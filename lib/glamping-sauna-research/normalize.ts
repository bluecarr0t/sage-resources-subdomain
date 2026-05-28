import type { SaunaCohortRow, SaunaUnitMatch, YesNo } from '@/lib/glamping-sauna-research/types';

export function normalizeYesNo(v: unknown): YesNo | null {
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase().trim();
  if (['yes', 'y', 'true', '1'].includes(s)) return 'Yes';
  if (['no', 'n', 'false', '0'].includes(s)) return 'No';
  return null;
}

export function normalizeStoredYesNo(v: string | null | undefined): YesNo | null {
  return normalizeYesNo(v);
}

export function normalizeMatchKey(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchScore(row: SaunaCohortRow, match: SaunaUnitMatch): number {
  const siteKey = normalizeMatchKey(match.site_name);
  const typeKey = normalizeMatchKey(match.unit_type);
  const rowSite = normalizeMatchKey(row.site_name);
  const rowType = normalizeMatchKey(row.unit_type);

  let score = 0;
  if (siteKey && rowSite) {
    if (rowSite === siteKey) score += 10;
    else if (rowSite.includes(siteKey) || siteKey.includes(rowSite)) score += 6;
  }
  if (typeKey && rowType) {
    if (rowType === typeKey) score += 8;
    else if (rowType.includes(typeKey) || typeKey.includes(rowType)) score += 4;
  }
  if (!siteKey && typeKey && rowType === typeKey) score += 5;
  if (siteKey && !typeKey && rowSite === siteKey) score += 5;
  return score;
}

export function findBestRowMatch(
  rows: SaunaCohortRow[],
  match: SaunaUnitMatch,
  usedIds: Set<number>
): SaunaCohortRow | null {
  let best: SaunaCohortRow | null = null;
  let bestScore = 0;

  for (const row of rows) {
    if (usedIds.has(row.id)) continue;
    const score = matchScore(row, match);
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  return bestScore >= 5 ? best : null;
}

/** Set combined tub/sauna flag when private sauna is documented. */
export function deriveHotTubOrSaunaFromSauna(unitSauna: YesNo | null): YesNo | null {
  if (unitSauna === 'Yes') return 'Yes';
  return null;
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function discoverySourceTag(runDate = todayIsoDate()): string {
  return `web_research_sauna_${runDate.replace(/-/g, '_')}`;
}
