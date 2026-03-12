/**
 * Shared constants for report creation and filtering
 */

/** Market type options for Create Report Draft (excludes "All Types" filter) */
export const REPORT_MARKET_TYPE_OPTIONS = [
  { value: 'outdoor_hospitality', label: 'Outdoor Hospitality (default)' },
  { value: 'rv', label: 'RV' },
  { value: 'rv_glamping', label: 'RV & Glamping' },
  { value: 'glamping', label: 'Glamping' },
  { value: 'marina', label: 'Marina' },
  { value: 'landscape_hotel', label: 'Landscape Hotel' },
] as const;

/** Valid study_id formats: DRAFT-YYYYMMDD-xxxx or NN-NNN[A]?-NN (e.g. 25-100A-01) */
export const STUDY_ID_DRAFT_REGEX = /^DRAFT-\d{8}-[a-f0-9]+$/i;
export const STUDY_ID_STANDARD_REGEX = /^\d{2}-\d{3}[A-Z]?-\d{2}$/;

export function isValidStudyIdFormat(id: string): boolean {
  const trimmed = id.trim();
  if (!trimmed) return true; // empty = auto-generate
  return STUDY_ID_DRAFT_REGEX.test(trimmed) || STUDY_ID_STANDARD_REGEX.test(trimmed);
}
