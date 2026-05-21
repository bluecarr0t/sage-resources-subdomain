import type { MapSearchParams } from '@/lib/map-embed-mode';

/** Build a searchParams record from `URLSearchParams` or Next `useSearchParams()`. */
export function mapSearchParamsFromUrlSearchParams(
  searchParams: URLSearchParams
): MapSearchParams {
  const record: MapSearchParams = {};
  searchParams.forEach((value, key) => {
    const existing = record[key];
    if (existing === undefined) {
      record[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      record[key] = [existing, value];
    }
  });
  return record;
}
