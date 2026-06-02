/** Admin feasibility study detail page for a past report comparable. */
export function glampingPastReportDetailPath(studyId: string): string {
  const id = studyId.trim();
  return `/admin/glamping-properties/${encodeURIComponent(id)}`;
}

/**
 * Absolute URL for map InfoWindow `<a href>` — relative paths often fail inside
 * Google's info-window document (external https links work; same-origin paths need origin).
 */
export function glampingPastReportDetailUrl(studyId: string): string {
  const path = glampingPastReportDetailPath(studyId);
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}
