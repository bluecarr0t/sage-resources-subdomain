import { PROJECT_PIPELINE_SEGMENTS } from './segment';

export const PROJECT_PIPELINE_SEGMENT_URL_PARAM = 'segment';
export const PROJECT_PIPELINE_SEGMENT_STORAGE_KEY = 'project-pipeline-segment-filter';

const ALL_DIVISIONS_URL_VALUE = 'all';

export function parseSegmentFilterParam(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === ALL_DIVISIONS_URL_VALUE) return '';
  if ((PROJECT_PIPELINE_SEGMENTS as readonly string[]).includes(trimmed)) return trimmed;
  const title =
    trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  if ((PROJECT_PIPELINE_SEGMENTS as readonly string[]).includes(title)) return title;
  return null;
}

export function segmentFilterToUrlValue(segment: string): string {
  if (!segment.trim()) return ALL_DIVISIONS_URL_VALUE;
  return segment;
}

export function readPersistedSegmentFilter(
  searchParams: Pick<URLSearchParams, 'get'> | null
): string | null {
  const fromUrl = searchParams?.get(PROJECT_PIPELINE_SEGMENT_URL_PARAM);
  if (fromUrl !== null) {
    const parsed = parseSegmentFilterParam(fromUrl);
    if (parsed !== null) return parsed;
  }

  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(PROJECT_PIPELINE_SEGMENT_STORAGE_KEY);
    if (stored !== null) {
      const parsed = parseSegmentFilterParam(stored);
      if (parsed !== null) return parsed;
    }
  } catch {
    // sessionStorage may be unavailable (private browsing, etc.)
  }

  return null;
}

export function writePersistedSegmentFilter(
  segment: string,
  options: { pathname: string; router: { replace: (url: string) => void } }
): void {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(
        PROJECT_PIPELINE_SEGMENT_STORAGE_KEY,
        segmentFilterToUrlValue(segment)
      );
    } catch {
      // ignore
    }
  }

  const params = new URLSearchParams(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  const urlValue = segmentFilterToUrlValue(segment);
  if (urlValue === ALL_DIVISIONS_URL_VALUE) {
    params.delete(PROJECT_PIPELINE_SEGMENT_URL_PARAM);
  } else {
    params.set(PROJECT_PIPELINE_SEGMENT_URL_PARAM, urlValue);
  }

  const query = params.toString();
  options.router.replace(query ? `${options.pathname}?${query}` : options.pathname);
}
