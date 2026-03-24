/**
 * POST /api/admin/site-builder/export-images-docx
 * Body: { templateKey?: 'rv' | 'glamping', images: { configName, imageBase64, mediaType }[] }
 * Returns: single-page .docx with a 2-column image grid (feasibility template header/footer).
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { withAdminAuth, type AdminAuthContext } from '@/lib/require-admin-auth';
import {
  buildSiteBuilderImagesDocx,
  type SiteBuilderImagesDocxTemplateKey,
} from '@/lib/site-builder/build-site-builder-images-docx';

const MAX_IMAGES = 24;
const MAX_BODY_CHARS = 120_000_000;

function parseTemplateKey(v: unknown): SiteBuilderImagesDocxTemplateKey {
  return v === 'glamping' ? 'glamping' : 'rv';
}

export const POST = withAdminAuth(async (request: NextRequest, _ctx: AdminAuthContext) => {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_CHARS) {
      return NextResponse.json(
        { success: false, error: 'Request body too large' },
        { status: 413 }
      );
    }
    let body: { templateKey?: unknown; images?: unknown };
    try {
      body = JSON.parse(raw) as { templateKey?: unknown; images?: unknown };
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const templateKey = parseTemplateKey(body.templateKey);
    const arr = body.images;
    if (!Array.isArray(arr) || arr.length === 0) {
      return NextResponse.json(
        { success: false, error: 'images array required' },
        { status: 400 }
      );
    }
    if (arr.length > MAX_IMAGES) {
      return NextResponse.json(
        { success: false, error: `At most ${MAX_IMAGES} images per export` },
        { status: 400 }
      );
    }

    const images: Array<{ configName: string; imageBase64: string; mediaType: string }> = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const configName = typeof o.configName === 'string' ? o.configName.trim() : '';
      const imageBase64 = typeof o.imageBase64 === 'string' ? o.imageBase64 : '';
      const mediaType = typeof o.mediaType === 'string' && o.mediaType.trim() ? o.mediaType.trim() : 'image/jpeg';
      if (!configName || !imageBase64) continue;
      images.push({ configName, imageBase64, mediaType });
    }

    if (images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid images in payload' },
        { status: 400 }
      );
    }

    const buffer = await buildSiteBuilderImagesDocx({ templateKey, images });
    const filename = `site-builder-images-${templateKey}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Export failed';
    console.error('[export-images-docx]', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
});
