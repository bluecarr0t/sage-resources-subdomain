/**
 * API Route: Site Builder AI image generation
 * POST /api/admin/site-builder/generate-image
 *
 * Body: { config: ConfigForPrompt, location?: string }
 * Returns: { success: true, imageBase64: string, mediaType: string } or error
 *
 * Uses Vercel AI Gateway with Gemini 3 Pro Image (Nano Banana Pro) for highest-quality output.
 * Requires AI_GATEWAY_API_KEY in environment.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

import { generateText } from 'ai';
import { createGateway } from 'ai';
import { withAdminAuth } from '@/lib/require-admin-auth';
import { buildImagePrompt } from '@/lib/site-builder/prompt-builder';
import type { ConfigForPrompt } from '@/lib/site-builder/prompt-builder';

function parseBody(body: unknown): {
  config: ConfigForPrompt;
  location?: string;
  imageDescription?: string;
  sharedLandscapeContext?: string;
  batchPosition?: number;
  batchTotal?: number;
  roadSurface?: 'dirt' | 'gravel' | 'paved';
} | null {
  if (!body || typeof body !== 'object' || !('config' in body)) return null;
  const config = (body as { config: unknown }).config;
  const location = (body as { location?: string }).location;
  const imageDescription = (body as { imageDescription?: string }).imageDescription;
  const sharedLandscapeContext = (body as { sharedLandscapeContext?: string }).sharedLandscapeContext;
  const batchPosition = (body as { batchPosition?: number }).batchPosition;
  const batchTotal = (body as { batchTotal?: number }).batchTotal;
  const roadSurface = (body as { roadSurface?: string }).roadSurface;
  if (!config || typeof config !== 'object') return null;

  const type = (config as { type?: string }).type;
  if (type === 'glamping') {
    const c = config as {
      unitTypeName?: string;
      sqft?: number;
      diameterFt?: number;
      qualityType?: string;
      amenityNames?: string[];
      productLink?: string;
    };
    return {
      config: {
        type: 'glamping',
        unitTypeName: String(c.unitTypeName ?? ''),
        sqft: typeof c.sqft === 'number' ? c.sqft : undefined,
        diameterFt: typeof c.diameterFt === 'number' ? c.diameterFt : undefined,
        qualityType: String(c.qualityType ?? 'Premium'),
        amenityNames: Array.isArray(c.amenityNames) ? c.amenityNames.filter((s): s is string => typeof s === 'string') : [],
        productLink: typeof c.productLink === 'string' && c.productLink.trim() ? c.productLink.trim() : undefined,
      },
      location: typeof location === 'string' ? location : undefined,
      imageDescription:
        typeof imageDescription === 'string' && imageDescription.trim()
          ? imageDescription.trim()
          : undefined,
      sharedLandscapeContext:
        typeof sharedLandscapeContext === 'string' && sharedLandscapeContext.trim()
          ? sharedLandscapeContext.trim()
          : undefined,
      batchPosition: typeof batchPosition === 'number' ? batchPosition : undefined,
      batchTotal: typeof batchTotal === 'number' ? batchTotal : undefined,
      roadSurface: roadSurface === 'dirt' || roadSurface === 'gravel' || roadSurface === 'paved' ? roadSurface : undefined,
    };
  }
  if (type === 'rv') {
    const c = config as { siteTypeName?: string; qualityType?: string; amenityNames?: string[] };
    return {
      config: {
        type: 'rv',
        siteTypeName: String(c.siteTypeName ?? ''),
        qualityType: String(c.qualityType ?? 'Premium'),
        amenityNames: Array.isArray(c.amenityNames) ? c.amenityNames.filter((s): s is string => typeof s === 'string') : [],
      },
      location: typeof location === 'string' ? location : undefined,
      imageDescription:
        typeof imageDescription === 'string' && imageDescription.trim()
          ? imageDescription.trim()
          : undefined,
      sharedLandscapeContext:
        typeof sharedLandscapeContext === 'string' && sharedLandscapeContext.trim()
          ? sharedLandscapeContext.trim()
          : undefined,
      batchPosition: typeof batchPosition === 'number' ? batchPosition : undefined,
      batchTotal: typeof batchTotal === 'number' ? batchTotal : undefined,
      roadSurface: roadSurface === 'dirt' || roadSurface === 'gravel' || roadSurface === 'paved' ? roadSurface : undefined,
    };
  }
  return null;
}

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'AI_GATEWAY_API_KEY not configured' },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = parseBody(body);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const prompt = buildImagePrompt(parsed.config, parsed.location, parsed.imageDescription, {
      sharedLandscapeContext: parsed.sharedLandscapeContext,
      batchPosition: parsed.batchPosition,
      batchTotal: parsed.batchTotal,
      roadSurface: parsed.roadSurface,
    });
    const gateway = createGateway({ apiKey });

    const result = await generateText({
      model: gateway('google/gemini-3-pro-image'),
      prompt,
    });

    const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith('image/')) ?? [];
    const image = imageFiles[0];
    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image generated' },
        { status: 500 }
      );
    }

    const base64 = image.base64 ?? (image.uint8Array ? Buffer.from(image.uint8Array).toString('base64') : null);
    if (!base64) {
      return NextResponse.json(
        { success: false, error: 'Could not encode image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imageBase64: base64,
      mediaType: image.mediaType ?? 'image/png',
    });
  } catch (err) {
    console.error('[api/admin/site-builder/generate-image] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Image generation failed' },
      { status: 500 }
    );
  }
});
