/**
 * Glamping property images (Storage + glamping_property_images)
 *
 * GET    /api/admin/sage-glamping-data/properties/:id/images
 * POST   multipart: file (required), kind (optional, default gallery), caption (optional)
 * PATCH  JSON: { imageId, setHero?: true, sort_order?: number }
 * DELETE ?imageId=<uuid>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { withAdminAuth } from '@/lib/require-admin-auth';
import {
  GLAMPING_PROPERTY_IMAGES_BUCKET,
  buildGlampingPropertyImagePath,
  GLAMPING_PROPERTY_IMAGE_MAX_BYTES,
  isAllowedGlampingPropertyImageMime,
  parseGlampingPropertyImageKind,
  type GlampingPropertyImageKind,
} from '@/lib/glamping-property-images';
import type { GlampingPropertyImageListItem } from '@/lib/types/glamping-property-images';

export const dynamic = 'force-dynamic';

const TABLE = 'glamping_property_images' as const;

type ParamsContext = { params: Promise<{ id: string }> };

function badId(): NextResponse {
  return NextResponse.json({ success: false, error: 'Invalid property id' }, { status: 400 });
}

async function assertPropertyExists(
  supabase: ReturnType<typeof createServerClient>,
  propertyId: number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('all_glamping_properties')
    .select('id')
    .eq('id', propertyId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data != null;
}

async function demoteHeroes(
  supabase: ReturnType<typeof createServerClient>,
  propertyId: number
): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ kind: 'gallery' as const })
    .eq('property_id', propertyId)
    .eq('kind', 'hero');
  if (error) throw new Error(error.message);
}

function attachPublicUrls(
  supabase: ReturnType<typeof createServerClient>,
  rows: Record<string, unknown>[]
): GlampingPropertyImageListItem[] {
  return rows.map((r) => {
    const bucket = String(r.storage_bucket ?? GLAMPING_PROPERTY_IMAGES_BUCKET);
    const path = String(r.storage_path ?? '');
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return {
      ...(r as unknown as GlampingPropertyImageListItem),
      public_url: data.publicUrl,
    };
  });
}

export const GET = withAdminAuth<ParamsContext>(async (_request, _auth, context) => {
  try {
    const { id: idRaw } = await context!.params;
    const propertyId = Number.parseInt(idRaw, 10);
    if (!Number.isFinite(propertyId) || propertyId <= 0) return badId();

    const supabase = createServerClient();
    if (!(await assertPropertyExists(supabase, propertyId))) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('property_id', propertyId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[glamping-property-images] GET', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const kindRank: Record<string, number> = { hero: 0, gallery: 1, map_thumb: 2, evidence: 3 };
    const raw = [...(data ?? [])].sort((a, b) => {
      const ar = kindRank[String((a as { kind?: string }).kind)] ?? 9;
      const br = kindRank[String((b as { kind?: string }).kind)] ?? 9;
      if (ar !== br) return ar - br;
      const soa = Number((a as { sort_order?: number }).sort_order ?? 0);
      const sob = Number((b as { sort_order?: number }).sort_order ?? 0);
      if (soa !== sob) return soa - sob;
      return String((a as { created_at?: string }).created_at ?? '').localeCompare(
        String((b as { created_at?: string }).created_at ?? '')
      );
    });

    const images = attachPublicUrls(supabase, raw);
    return NextResponse.json({ success: true, images });
  } catch (e) {
    console.error('[glamping-property-images] GET', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Failed to list images' },
      { status: 500 }
    );
  }
});

export const POST = withAdminAuth<ParamsContext>(async (request, _auth, context) => {
  try {
    const { id: idRaw } = await context!.params;
    const propertyId = Number.parseInt(idRaw, 10);
    if (!Number.isFinite(propertyId) || propertyId <= 0) return badId();

    const supabase = createServerClient();
    if (!(await assertPropertyExists(supabase, propertyId))) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    const form = await request.formData();
    const fileEntry = form.get('file');
    if (!(fileEntry instanceof Blob)) {
      return NextResponse.json({ success: false, error: 'Missing file field' }, { status: 400 });
    }

    const mimeType = (fileEntry.type || 'application/octet-stream').toLowerCase();
    if (!isAllowedGlampingPropertyImageMime(mimeType)) {
      return NextResponse.json(
        { success: false, error: `Unsupported image type: ${mimeType}` },
        { status: 400 }
      );
    }

    const size = typeof fileEntry.size === 'number' ? fileEntry.size : 0;
    if (size <= 0 || size > GLAMPING_PROPERTY_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File must be between 1 byte and ${GLAMPING_PROPERTY_IMAGE_MAX_BYTES} bytes`,
        },
        { status: 400 }
      );
    }

    const kindField = form.get('kind');
    const kindParsed =
      parseGlampingPropertyImageKind(typeof kindField === 'string' ? kindField : null) ?? 'gallery';
    const kind: GlampingPropertyImageKind = kindParsed;

    const captionRaw = form.get('caption');
    const caption =
      typeof captionRaw === 'string' && captionRaw.trim() !== '' ? captionRaw.trim() : null;

    const { data: maxRow, error: maxErr } = await supabase
      .from(TABLE)
      .select('sort_order')
      .eq('property_id', propertyId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxErr) throw new Error(maxErr.message);
    const sortOrder = (typeof maxRow?.sort_order === 'number' ? maxRow.sort_order : -1) + 1;

    const storagePath = buildGlampingPropertyImagePath(propertyId, kind, mimeType);
    const buffer = Buffer.from(await fileEntry.arrayBuffer());

    if (kind === 'hero') {
      await demoteHeroes(supabase, propertyId);
    }

    const { error: upErr } = await supabase.storage
      .from(GLAMPING_PROPERTY_IMAGES_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (upErr) {
      console.error('[glamping-property-images] storage upload', upErr);
      return NextResponse.json({ success: false, error: upErr.message }, { status: 500 });
    }

    const { data: inserted, error: insErr } = await supabase
      .from(TABLE)
      .insert({
        property_id: propertyId,
        storage_bucket: GLAMPING_PROPERTY_IMAGES_BUCKET,
        storage_path: storagePath,
        kind,
        sort_order: sortOrder,
        mime_type: mimeType,
        byte_size: size,
        source: 'upload',
        caption,
      })
      .select('*')
      .single();

    if (insErr) {
      console.error('[glamping-property-images] insert after upload', insErr);
      await supabase.storage.from(GLAMPING_PROPERTY_IMAGES_BUCKET).remove([storagePath]);
      return NextResponse.json({ success: false, error: insErr.message }, { status: 500 });
    }

    const [withUrl] = attachPublicUrls(supabase, [inserted as Record<string, unknown>]);
    return NextResponse.json({ success: true, image: withUrl });
  } catch (e) {
    console.error('[glamping-property-images] POST', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 500 }
    );
  }
});

export const PATCH = withAdminAuth<ParamsContext>(async (request, _auth, context) => {
  try {
    const { id: idRaw } = await context!.params;
    const propertyId = Number.parseInt(idRaw, 10);
    if (!Number.isFinite(propertyId) || propertyId <= 0) return badId();

    const body = (await request.json()) as {
      imageId?: string;
      setHero?: boolean;
      sort_order?: number;
    };

    const imageId = typeof body.imageId === 'string' ? body.imageId.trim() : '';
    if (!imageId) {
      return NextResponse.json({ success: false, error: 'imageId is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    if (!(await assertPropertyExists(supabase, propertyId))) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    const { data: row, error: selErr } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', imageId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (selErr) throw new Error(selErr.message);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    if (body.setHero === true) {
      await demoteHeroes(supabase, propertyId);
      const { data: updated, error: upErr } = await supabase
        .from(TABLE)
        .update({ kind: 'hero' as const })
        .eq('id', imageId)
        .eq('property_id', propertyId)
        .select('*')
        .single();
      if (upErr) throw new Error(upErr.message);
      const [withUrl] = attachPublicUrls(supabase, [updated as Record<string, unknown>]);
      return NextResponse.json({ success: true, image: withUrl });
    }

    if (typeof body.sort_order === 'number' && Number.isFinite(body.sort_order)) {
      const sortOrder = Math.max(0, Math.floor(body.sort_order));
      const { data: updated, error: upErr } = await supabase
        .from(TABLE)
        .update({ sort_order: sortOrder })
        .eq('id', imageId)
        .eq('property_id', propertyId)
        .select('*')
        .single();
      if (upErr) throw new Error(upErr.message);
      const [withUrl] = attachPublicUrls(supabase, [updated as Record<string, unknown>]);
      return NextResponse.json({ success: true, image: withUrl });
    }

    return NextResponse.json(
      { success: false, error: 'Provide setHero: true and/or sort_order' },
      { status: 400 }
    );
  } catch (e) {
    console.error('[glamping-property-images] PATCH', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Update failed' },
      { status: 500 }
    );
  }
});

export const DELETE = withAdminAuth<ParamsContext>(async (request, _auth, context) => {
  try {
    const { id: idRaw } = await context!.params;
    const propertyId = Number.parseInt(idRaw, 10);
    if (!Number.isFinite(propertyId) || propertyId <= 0) return badId();

    const imageId = request.nextUrl.searchParams.get('imageId')?.trim();
    if (!imageId) {
      return NextResponse.json({ success: false, error: 'imageId query param is required' }, { status: 400 });
    }

    const supabase = createServerClient();
    if (!(await assertPropertyExists(supabase, propertyId))) {
      return NextResponse.json({ success: false, error: 'Property not found' }, { status: 404 });
    }

    const { data: row, error: selErr } = await supabase
      .from(TABLE)
      .select('id, storage_bucket, storage_path')
      .eq('id', imageId)
      .eq('property_id', propertyId)
      .maybeSingle();

    if (selErr) throw new Error(selErr.message);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Image not found' }, { status: 404 });
    }

    const bucket = String(row.storage_bucket || GLAMPING_PROPERTY_IMAGES_BUCKET);
    const path = String(row.storage_path || '');

    const { error: delDb } = await supabase.from(TABLE).delete().eq('id', imageId).eq('property_id', propertyId);
    if (delDb) throw new Error(delDb.message);

    const { error: delSt } = await supabase.storage.from(bucket).remove([path]);
    if (delSt) {
      console.error('[glamping-property-images] storage delete after DB row removed', delSt, path);
    }

    return NextResponse.json({ success: true, deletedId: imageId });
  } catch (e) {
    console.error('[glamping-property-images] DELETE', e);
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Delete failed' },
      { status: 500 }
    );
  }
});
