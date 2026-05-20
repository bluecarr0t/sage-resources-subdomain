#!/usr/bin/env npx tsx
/**
 * Backfill OTA columns from legacy `url` when host is Hipcamp / Airbnb / Booking.com.
 * Clears `url` for those rows. Syncs OTA fields across sibling unit rows (same property_id).
 *
 * Run: npx tsx scripts/backfill-ota-from-url.ts
 * Dry-run: npx tsx scripts/backfill-ota-from-url.ts --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import {
  OTA_URL_COLUMN_BY_PLATFORM,
  applyOtaFieldSanitization,
  otaPlatformForLegacyWebsiteUrl,
  platformsFromOtaUrlColumns,
} from '@/lib/property-ota-fields';

config({ path: resolve(process.cwd(), '.env.local') });

const TABLE = 'all_glamping_properties';
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_ARG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG.split('=')[1] ?? '', 10) : undefined;

type Row = {
  id: number;
  property_id: string | null;
  property_name: string | null;
  url: string | null;
  third_party_platforms: string[] | null;
  ota_url_hipcamp: string | null;
  ota_url_airbnb: string | null;
  ota_url_booking_com: string | null;
  ota_url_vrbo: string | null;
};

function buildOtaPatchFromWebsiteUrl(url: string): Partial<Row> | null {
  const platform = otaPlatformForLegacyWebsiteUrl(url);
  if (!platform) return null;
  const col = OTA_URL_COLUMN_BY_PLATFORM[platform];
  const normalized = url.trim();
  const patch: Partial<Row> = {
    url: null,
    [col]: /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`,
  } as Partial<Row>;
  const merged: Record<string, unknown> = { ...patch };
  applyOtaFieldSanitization(merged, { syncPlatformsFromUrls: true });
  return merged as Partial<Row>;
}

function mergeOtaFields(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const out = { ...target };
  for (const key of [
    'third_party_platforms',
    'ota_url_hipcamp',
    'ota_url_airbnb',
    'ota_url_booking_com',
    'ota_url_vrbo',
  ] as const) {
    if (source[key] != null && source[key] !== '') {
      out[key] = source[key];
    }
  }
  applyOtaFieldSanitization(out, { syncPlatformsFromUrls: true });
  return out;
}

async function main() {
  const { createServerClient } = await import('@/lib/supabase');
  const supabase = createServerClient();

  let q = supabase
    .from(TABLE)
    .select(
      'id, property_id, property_name, url, third_party_platforms, ota_url_hipcamp, ota_url_airbnb, ota_url_booking_com, ota_url_vrbo'
    )
    .not('url', 'is', null);

  if (LIMIT && Number.isFinite(LIMIT)) {
    q = q.limit(LIMIT);
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as Row[];
  let moved = 0;
  let synced = 0;

  for (const row of rows) {
    const url = row.url?.trim();
    if (!url) continue;

    const patch = buildOtaPatchFromWebsiteUrl(url);
    if (!patch) continue;

    if (DRY_RUN) {
      console.log(`[dry-run] id=${row.id} ${row.property_name}: url → ${JSON.stringify(patch)}`);
      moved++;
      continue;
    }

    const { error: upErr } = await supabase.from(TABLE).update(patch).eq('id', row.id);
    if (upErr) {
      console.error(`id=${row.id}`, upErr.message);
      continue;
    }
    moved++;
    console.log(`Moved OTA url for id=${row.id} (${row.property_name})`);
  }

  // Sync OTA fields across siblings sharing property_id
  const { data: withPid, error: pidErr } = await supabase
    .from(TABLE)
    .select(
      'id, property_id, property_name, third_party_platforms, ota_url_hipcamp, ota_url_airbnb, ota_url_booking_com, ota_url_vrbo'
    )
    .not('property_id', 'is', null);

  if (pidErr) throw pidErr;

  const byPropertyId = new Map<string, Row[]>();
  for (const r of (withPid ?? []) as Row[]) {
    const pid = r.property_id?.trim();
    if (!pid) continue;
    const list = byPropertyId.get(pid) ?? [];
    list.push(r);
    byPropertyId.set(pid, list);
  }

  for (const [, siblings] of byPropertyId) {
    if (siblings.length < 2) continue;

    let canonical: Record<string, unknown> | null = null;
    for (const s of siblings) {
      const fields: Record<string, unknown> = {
        third_party_platforms: s.third_party_platforms,
        ota_url_hipcamp: s.ota_url_hipcamp,
        ota_url_airbnb: s.ota_url_airbnb,
        ota_url_booking_com: s.ota_url_booking_com,
        ota_url_vrbo: s.ota_url_vrbo,
      };
      applyOtaFieldSanitization(fields, { syncPlatformsFromUrls: true });
      if (platformsFromOtaUrlColumns(fields).length > 0) {
        canonical = fields;
        break;
      }
    }
    if (!canonical) continue;

    for (const s of siblings) {
      const needsSync = [
        'third_party_platforms',
        'ota_url_hipcamp',
        'ota_url_airbnb',
        'ota_url_booking_com',
        'ota_url_vrbo',
      ].some(
        (k) => (s as Record<string, unknown>)[k] !== canonical![k]
      );
      if (!needsSync) continue;

      if (DRY_RUN) {
        console.log(`[dry-run] sync siblings property_id=${s.property_id} id=${s.id}`);
        synced++;
        continue;
      }

      const { error: sErr } = await supabase.from(TABLE).update(canonical).eq('id', s.id);
      if (sErr) {
        console.warn(`Sibling sync id=${s.id}:`, sErr.message);
        continue;
      }
      synced++;
    }
  }

  console.log(
    `\n${DRY_RUN ? '[dry-run] ' : ''}Done. Moved ${moved} OTA url(s) from website column; synced ${synced} sibling row(s).`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
