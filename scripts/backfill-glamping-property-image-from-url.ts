/**
 * Attach one image from a remote URL to a glamping property (Storage + glamping_property_images).
 *
 * Prerequisites:
 *   - Migration scripts/migrations/create-glamping-property-images-2026-05.sql applied
 *   - .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 *
 * Usage:
 *   npx tsx scripts/backfill-glamping-property-image-from-url.ts --property-id 123 --url https://example.com/a.jpg --kind gallery
 *   npx tsx scripts/backfill-glamping-property-image-from-url.ts --property-id 123 --url https://example.com/a.jpg --kind hero --dry-run
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createServerClient } from '@/lib/supabase';
import {
  GLAMPING_PROPERTY_IMAGES_BUCKET,
  buildGlampingPropertyImagePath,
  GLAMPING_PROPERTY_IMAGE_MAX_BYTES,
  isAllowedGlampingPropertyImageMime,
  parseGlampingPropertyImageKind,
  type GlampingPropertyImageKind,
} from '@/lib/glamping-property-images';

config({ path: resolve(process.cwd(), '.env.local') });

function parseArgs(argv: string[]) {
  let dryRun = false;
  let propertyId: number | null = null;
  let url: string | null = null;
  let kind: GlampingPropertyImageKind = 'gallery';
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') dryRun = true;
    else if (a === '--property-id' && argv[i + 1]) {
      propertyId = parseInt(argv[++i], 10);
    } else if (a === '--url' && argv[i + 1]) {
      url = argv[++i] ?? null;
    } else if (a === '--kind' && argv[i + 1]) {
      const k = parseGlampingPropertyImageKind(argv[++i] ?? '');
      if (k) kind = k;
    }
  }
  return { dryRun, propertyId, url, kind };
}

async function main() {
  const { dryRun, propertyId, url, kind } = parseArgs(process.argv);
  if (propertyId == null || !Number.isFinite(propertyId) || propertyId <= 0 || !url?.trim()) {
    console.error(
      'Usage: npx tsx scripts/backfill-glamping-property-image-from-url.ts --property-id <id> --url <https://...> [--kind hero|gallery|map_thumb|evidence] [--dry-run]'
    );
    process.exit(1);
  }

  const supabase = createServerClient();
  const { data: prop, error: pErr } = await supabase
    .from('all_glamping_properties')
    .select('id')
    .eq('id', propertyId)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!prop) {
    console.error(`No property row for id ${propertyId}`);
    process.exit(1);
  }

  const res = await fetch(url.trim(), {
    headers: { 'User-Agent': 'SageOutdoorAdvisory/1.0 (property-image-backfill)' },
  });
  if (!res.ok) {
    console.error(`Fetch failed ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const mimeType = (res.headers.get('content-type') || '').split(';')[0]?.trim().toLowerCase() || 'image/jpeg';
  if (!isAllowedGlampingPropertyImageMime(mimeType)) {
    console.error(`Unsupported content-type: ${mimeType}`);
    process.exit(1);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0 || buf.length > GLAMPING_PROPERTY_IMAGE_MAX_BYTES) {
    console.error(`Image size ${buf.length} bytes is invalid`);
    process.exit(1);
  }

  const { data: maxRow } = await supabase
    .from('glamping_property_images')
    .select('sort_order')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (typeof maxRow?.sort_order === 'number' ? maxRow.sort_order : -1) + 1;

  const storagePath = buildGlampingPropertyImagePath(propertyId, kind, mimeType);

  if (dryRun) {
    console.log(
      JSON.stringify({ dryRun: true, propertyId, kind, mimeType, bytes: buf.length, storagePath }, null, 2)
    );
    return;
  }

  if (kind === 'hero') {
    await supabase
      .from('glamping_property_images')
      .update({ kind: 'gallery' })
      .eq('property_id', propertyId)
      .eq('kind', 'hero');
  }

  const { error: upErr } = await supabase.storage
    .from(GLAMPING_PROPERTY_IMAGES_BUCKET)
    .upload(storagePath, buf, { contentType: mimeType, upsert: false });
  if (upErr) throw upErr;

  const { error: insErr } = await supabase.from('glamping_property_images').insert({
    property_id: propertyId,
    storage_bucket: GLAMPING_PROPERTY_IMAGES_BUCKET,
    storage_path: storagePath,
    kind,
    sort_order: sortOrder,
    mime_type: mimeType,
    byte_size: buf.length,
    source: 'crawl',
  });
  if (insErr) {
    await supabase.storage.from(GLAMPING_PROPERTY_IMAGES_BUCKET).remove([storagePath]);
    throw insErr;
  }

  const { data: pub } = supabase.storage.from(GLAMPING_PROPERTY_IMAGES_BUCKET).getPublicUrl(storagePath);
  console.log('OK', pub.publicUrl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
