import { resolveUsStateAbbr } from '@/lib/us-state-centers';

/** US full name or mixed case → USPS abbreviation; otherwise unchanged (e.g. provinces). */
export function formatMarketReportStateCell(state: string | null | undefined): string {
  const s = (state ?? '').trim();
  if (!s) return '—';
  return resolveUsStateAbbr(s) ?? s;
}

/**
 * Returns the URL only when it parses as http(s) — guards against unsafe
 * schemes (e.g. `javascript:`) leaking into anchor `href` attributes.
 */
export function sanitizeHttpUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
    return null;
  } catch {
    return null;
  }
}
