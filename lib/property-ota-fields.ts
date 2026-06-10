/**
 * DB + admin sanitization for OTA columns on all_sage_data.
 */

import {
  OTA_PLATFORM_SLUGS,
  type OtaPlatformSlug,
  inferOtaPlatformFromUrl,
} from '@/lib/property-ota-listings';

export const OTA_URL_COLUMN_BY_PLATFORM: Record<
  OtaPlatformSlug,
  'ota_url_hipcamp' | 'ota_url_airbnb' | 'ota_url_booking_com' | 'ota_url_vrbo'
> = {
  hipcamp: 'ota_url_hipcamp',
  airbnb: 'ota_url_airbnb',
  booking_com: 'ota_url_booking_com',
  vrbo: 'ota_url_vrbo',
};

export const THIRD_PARTY_FIELD_KEYS = [
  'third_party_platforms',
  'ota_url_hipcamp',
  'ota_url_airbnb',
  'ota_url_booking_com',
  'ota_url_vrbo',
] as const;

/** @deprecated Use THIRD_PARTY_FIELD_KEYS */
export const OTA_FIELD_KEYS = THIRD_PARTY_FIELD_KEYS;

export type OtaFieldKey = (typeof OTA_FIELD_KEYS)[number];

export function normalizeOtaUrl(raw: unknown): string | null {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

export function parseOtaPlatformsArray(raw: unknown): OtaPlatformSlug[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const allowed = new Set<string>(OTA_PLATFORM_SLUGS);
  const out = raw
    .map((p) => String(p).trim())
    .filter((p): p is OtaPlatformSlug => allowed.has(p));
  return out.length > 0 ? out : null;
}

/** Platforms with a non-empty normalized OTA URL on the row. */
export function platformsFromOtaUrlColumns(row: Record<string, unknown>): OtaPlatformSlug[] {
  const out: OtaPlatformSlug[] = [];
  for (const platform of OTA_PLATFORM_SLUGS) {
    const col = OTA_URL_COLUMN_BY_PLATFORM[platform];
    if (normalizeOtaUrl(row[col])) out.push(platform);
  }
  return out;
}

/**
 * Normalize OTA URL columns; optionally set `third_party_platforms` from URLs.
 * Mutates `target` in place.
 */
export function applyOtaFieldSanitization(
  target: Record<string, unknown>,
  options?: { syncPlatformsFromUrls?: boolean }
): void {
  for (const col of Object.values(OTA_URL_COLUMN_BY_PLATFORM)) {
    if (col in target) {
      target[col] = normalizeOtaUrl(target[col]);
    }
  }

  if ('third_party_platforms' in target) {
    const parsed = parseOtaPlatformsArray(target.third_party_platforms);
    target.third_party_platforms =
      parsed ??
      (Array.isArray(target.third_party_platforms) && target.third_party_platforms.length === 0
        ? null
        : target.third_party_platforms);
  }

  if (options?.syncPlatformsFromUrls) {
    const fromUrls = platformsFromOtaUrlColumns(target);
    target.third_party_platforms = fromUrls.length > 0 ? fromUrls : null;
  }
}

export function hasOfficialWebsiteOrOtaListing(row: Record<string, unknown>): boolean {
  const website = String(row.url ?? '').trim();
  if (website) return true;
  return platformsFromOtaUrlColumns(row).length > 0;
}

/** Host patterns for backfill: move legacy `url` into OTA columns. */
export function otaPlatformForLegacyWebsiteUrl(url: string | null | undefined): OtaPlatformSlug | null {
  return inferOtaPlatformFromUrl(url);
}

export const THIRD_PARTY_PROPAGATE_KEYS: readonly OtaFieldKey[] = THIRD_PARTY_FIELD_KEYS;

/** @deprecated Use THIRD_PARTY_PROPAGATE_KEYS */
export const OTA_PROPAGATE_KEYS = THIRD_PARTY_PROPAGATE_KEYS;
