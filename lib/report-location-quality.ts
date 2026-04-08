/**
 * Detect mis-extracted `city` / location lines from DOCX pipelines (LLM or heuristics).
 * Fragments like "term. In particular, CO" are not place names — "CO" was mistaken for Colorado.
 */

import { STATE_CENTERS } from '@/lib/us-state-centers';

const US_STATE_ABBR = new Set(Object.keys(STATE_CENTERS));

/** City / locality string is clearly not a US place name. */
const GARBAGE_CITY_PATTERNS: RegExp[] = [
  /\bterm\.\s*in\s+particular\b/i,
  /^industry\s+is\s+positive\b/i,
  /^development\.\s/i,
  /value\s+in\s+column/i,
  /\bthe\s+proposed\b/i,
  /\bvending\s+area\b/i,
  /\bwalking\s+trail\b/i,
  /^with\s+nearby\s+access\b/i,
  /^are\s+its\s+remote\s+location\b/i,
  /^located\s+(?:at|in|near)\b/i,
  /^in\s+(a|an|the)\s+\w+\s+term\b/i,
];

/**
 * True when `city` should not be stored or used for geocoding / map labels.
 */
export function isGarbageReportCity(city: string | null | undefined): boolean {
  const s = String(city ?? '').trim();
  if (!s) return false;
  if (s.length > 80) return true;
  return GARBAGE_CITY_PATTERNS.some((p) => p.test(s));
}

/**
 * True when the full `location` field is dominated by a garbage city fragment.
 */
export function isGarbageReportLocationLine(location: string | null | undefined): boolean {
  const s = String(location ?? '').trim();
  if (!s) return false;
  const head = s.split(',')[0]?.trim() ?? '';
  return isGarbageReportCity(head);
}

const STUDY_ID_RE = /^\d{2}-\d{3}[A-Z]-\d{2}(?:__\d+)?$/i;

/**
 * Property/resort name is usable as a geocode query (not a bare job number or known-bad extraction).
 */
/**
 * Client map markers require a real locality in `reports.city` (not empty, not garbage, not a bare state code).
 */
export function hasValidClientMapCity(city: string | null | undefined): boolean {
  const c = String(city ?? '').trim();
  if (c.length < 2) return false;
  if (isGarbageReportCity(c)) return false;
  if (c.length === 2 && US_STATE_ABBR.has(c.toUpperCase())) return false;
  return true;
}

export function isLikelyUsablePropertyForGeocoding(
  propertyName: string | null | undefined,
  studyId: string | null | undefined
): boolean {
  const p = String(propertyName ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .trim();
  if (p.length < 3 || p.length > 120) return false;
  const sid = String(studyId ?? '').trim();
  if (sid && p.toUpperCase() === sid.toUpperCase()) return false;
  if (STUDY_ID_RE.test(p)) return false;
  return true;
}
