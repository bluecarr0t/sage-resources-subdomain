/**
 * Client map markers use `reports.property_name` for the info window headline.
 * Bad imports sometimes store spreadsheet section labels (e.g. "development. Attractions"),
 * DOCX mis-extractions, or truncated marketing sentences there while `reports.title` still
 * follows "Property Name - JOBNUMBER".
 */

/** Strip trailing " - JOBNUMBER" when it matches study_id (case-insensitive). */
export function stripStudyIdSuffixFromTitle(
  title: string | null | undefined,
  studyId: string | null | undefined
): string | null {
  const t = String(title ?? '').trim();
  const sid = String(studyId ?? '').trim();
  if (!t || !sid) return null;
  const escaped = sid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\s*-\\s*${escaped}\\s*$`, 'i');
  if (!re.test(t)) return null;
  const base = t.replace(re, '').trim();
  return base.length > 0 ? base : null;
}

/**
 * True when property_name looks like an internal / spreadsheet category, not a resort name.
 */
export function isLikelyInternalCategoryPropertyName(name: string | null | undefined): boolean {
  const s = String(name ?? '').trim();
  if (!s) return true;
  // e.g. "development. Attractions", "sheet1.Summary"
  return /^[a-z][a-z0-9_-]{0,40}\.\s*\S/.test(s);
}

/** Phrases / shapes that indicate property_name is narrative garbage, not a resort name. */
const FRAGMENT_START_RE = /^(in\s+(a|the|an|this|that)|with|the|a|an|located|situated|featuring)\b/i;

const DOCX_GARBAGE_SUBSTRINGS = /\bthe proposed\b|vending area|community fire pit|walking trail|natural swimming/i;

const AMENITY_TAIL_RE =
  /^(a|an)\s+[\w\s]+(?:area|space|trail|pool|sauna|grill|pit|pavilion|station|games?)$/i;

/**
 * True when stored property_name is almost certainly wrong for a map label.
 * Kept in sync with heuristics in `normalize-report-title.ts` where practical.
 */
export function isLikelyMisextractedPropertyName(name: string | null | undefined): boolean {
  const s = String(name ?? '').trim();
  if (!s) return true;
  if (isLikelyInternalCategoryPropertyName(s)) return true;
  if (FRAGMENT_START_RE.test(s)) return true;
  if (DOCX_GARBAGE_SUBSTRINGS.test(s)) return true;
  if (AMENITY_TAIL_RE.test(s)) return true;

  // Truncated extraction: ends with a lone letter after several words ("... access s")
  const parts = s.split(/\s+/);
  const last = parts[parts.length - 1];
  if (parts.length >= 5 && last.length === 1 && /^[a-z]$/i.test(last)) return true;

  return false;
}

/** Headline for map info window: prefer title-derived name when property_name is junk. */
export function deriveClientMapPropertyHeadline(
  propertyName: string | null | undefined,
  title: string | null | undefined,
  studyId: string | null | undefined
): string {
  const prop = String(propertyName ?? '').trim();
  const fromTitle = stripStudyIdSuffixFromTitle(title, studyId);

  if (fromTitle && isLikelyMisextractedPropertyName(prop)) {
    return fromTitle;
  }
  if (prop) return prop;
  if (fromTitle) return fromTitle;
  const t = String(title ?? '').trim();
  if (t) return t;
  return 'Unnamed Property';
}
