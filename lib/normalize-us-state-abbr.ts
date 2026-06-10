import { STATE_FULL_TO_ABBR } from '@/lib/anchor-point-insights/constants';
import { US_STATES } from '@/lib/us-states';

const USPS = new Set<string>(US_STATES);

/**
 * Map `all_sage_data.state` (abbrev or full name) to USPS code, or null.
 */
export function normalizeDbStateToUspsAbbr(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  const u = t.toUpperCase().replace(/\./g, '');
  if (u === 'DC' || u === 'D C') return 'DC';
  if (USPS.has(u)) return u;
  const k = t.toLowerCase();
  return STATE_FULL_TO_ABBR[k] ?? null;
}
