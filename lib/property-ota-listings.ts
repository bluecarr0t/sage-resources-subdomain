import type { SageProperty } from '@/lib/types/sage';

/** Slugs stored in `third_party_platforms` and used for URL column mapping. */
export const OTA_PLATFORM_SLUGS = ['hipcamp', 'airbnb', 'booking_com', 'vrbo'] as const;

export type OtaPlatformSlug = (typeof OTA_PLATFORM_SLUGS)[number];

export type PropertyOtaListing = {
  platform: OtaPlatformSlug;
  label: string;
  url: string;
  /** Site / unit names from inventory rows that supply this listing URL */
  siteNames?: string[];
};

const PLATFORM_LABELS: Record<OtaPlatformSlug, string> = {
  hipcamp: 'Hipcamp',
  airbnb: 'Airbnb',
  booking_com: 'Booking.com',
  vrbo: 'Vrbo',
};

const URL_COLUMN_BY_PLATFORM: Record<
  OtaPlatformSlug,
  keyof Pick<
    SageProperty,
    'ota_url_hipcamp' | 'ota_url_airbnb' | 'ota_url_booking_com' | 'ota_url_vrbo'
  >
> = {
  hipcamp: 'ota_url_hipcamp',
  airbnb: 'ota_url_airbnb',
  booking_com: 'ota_url_booking_com',
  vrbo: 'ota_url_vrbo',
};

const DISPLAY_ORDER: OtaPlatformSlug[] = ['hipcamp', 'airbnb', 'booking_com', 'vrbo'];

function normalizeUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/** Infer OTA platform from a URL host (fallback when dedicated columns are empty). */
export function inferOtaPlatformFromUrl(url: string | null | undefined): OtaPlatformSlug | null {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    if (host.includes('hipcamp.')) return 'hipcamp';
    if (host.includes('airbnb.')) return 'airbnb';
    if (host.includes('booking.com')) return 'booking_com';
    if (host.includes('vrbo.') || host.includes('homeaway.')) return 'vrbo';
  } catch {
    return null;
  }
  return null;
}

function parsePlatformsArray(raw: SageProperty['third_party_platforms']): OtaPlatformSlug[] {
  if (!raw?.length) return [];
  const allowed = new Set<string>(OTA_PLATFORM_SLUGS);
  return raw.filter((p): p is OtaPlatformSlug => allowed.has(String(p).trim()));
}

function urlForPlatform(row: SageProperty, platform: OtaPlatformSlug): string | null {
  const col = URL_COLUMN_BY_PLATFORM[platform];
  return normalizeUrl(row[col] as string | null | undefined);
}

function siteNameForRow(row: SageProperty): string | null {
  const name = row.site_name?.trim();
  return name || null;
}

/**
 * Resolve third-party listings for display. Merges sibling unit rows; prefers explicit
 * `ota_url_*` columns, then `third_party_platforms`, then infers from `url`.
 */
export function getPropertyOtaListings(
  rows: SageProperty | SageProperty[]
): PropertyOtaListing[] {
  const list = Array.isArray(rows) ? rows : [rows];
  if (list.length === 0) return [];

  const byPlatform = new Map<OtaPlatformSlug, string>();
  const siteNamesByPlatform = new Map<OtaPlatformSlug, Set<string>>();

  const noteSite = (platform: OtaPlatformSlug, row: SageProperty) => {
    const label = siteNameForRow(row);
    if (!label) return;
    if (!siteNamesByPlatform.has(platform)) {
      siteNamesByPlatform.set(platform, new Set());
    }
    siteNamesByPlatform.get(platform)!.add(label);
  };

  for (const row of list) {
    for (const platform of OTA_PLATFORM_SLUGS) {
      const explicit = urlForPlatform(row, platform);
      if (explicit) {
        if (!byPlatform.has(platform)) byPlatform.set(platform, explicit);
        noteSite(platform, row);
      }
    }
  }

  const platformsFromArray = new Set<OtaPlatformSlug>();
  for (const row of list) {
    for (const p of parsePlatformsArray(row.third_party_platforms)) {
      platformsFromArray.add(p);
    }
  }

  for (const platform of platformsFromArray) {
    if (byPlatform.has(platform)) continue;
    for (const row of list) {
      const explicit = urlForPlatform(row, platform);
      if (explicit) {
        byPlatform.set(platform, explicit);
        noteSite(platform, row);
        break;
      }
    }
  }

  for (const row of list) {
    const inferred = inferOtaPlatformFromUrl(row.url);
    if (inferred && !byPlatform.has(inferred)) {
      const u = normalizeUrl(row.url);
      if (u) {
        byPlatform.set(inferred, u);
        noteSite(inferred, row);
      }
    }
  }

  return DISPLAY_ORDER.filter((p) => byPlatform.has(p)).map((platform) => {
    const names = siteNamesByPlatform.get(platform);
    const siteNames = names ? [...names].sort((a, b) => a.localeCompare(b)) : undefined;
    return {
      platform,
      label: PLATFORM_LABELS[platform],
      url: byPlatform.get(platform)!,
      ...(siteNames && siteNames.length > 0 ? { siteNames } : {}),
    };
  });
}
