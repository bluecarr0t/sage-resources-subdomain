/**
 * API Route: Site Builder AI image generation
 * POST /api/admin/site-builder/generate-image
 *
 * Body: { config, propertySceneArchetype?, catalogUnitId?, location?, referenceImageBase64?, referenceMediaType?, referenceVariation?,
 *   aspectRatio?, timeOfDay?, stylePreset?, ... }
 * Glamping + catalog: resolves unit_link from cce_catalog_units (or config.productLink), fetches og:image from the product page, and attaches it as the first reference image.
 * Road surface: optional body `roadSurface`; otherwise inferred from `imageDescription` (gravel/dirt cues); default paved.
 * Style preset: optional body `stylePreset`; default Sage marketing (`sage_marketing`); use `none` for neutral grading.
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
import type { AdminAuthContext } from '@/lib/require-admin-auth';
import { createServerClient } from '@/lib/supabase';
import { downscaleReferenceImageBase64, prepareReferenceImageForVision } from '@/lib/site-builder/downscale-reference-image';
import { fetchCatalogProductImageFromPageUrl } from '@/lib/site-builder/fetch-catalog-product-image';
import { SITE_BUILDER_GATEWAY_MODEL_ID } from '@/lib/site-builder/site-builder-image-model';
import {
  buildBatchSceneReferenceAfterCatalog,
  buildImagePrompt,
  buildReferenceImagePromptPrefix,
  CATALOG_PRODUCT_IMAGE_PREAMBLE,
  DEFAULT_IMAGE_PROMPT_OPTIONS,
  DEFAULT_REFERENCE_VARIATION,
  isValidImagePromptConfig,
} from '@/lib/site-builder/prompt-builder';
import {
  defaultPropertySceneArchetypeForConfigType,
  parsePropertySceneArchetypeFromBody,
  type PropertySceneArchetypeId,
} from '@/lib/site-builder/property-scene-archetype';
import type {
  ConfigForPrompt,
  ImageAspectRatio,
  ImageTimeOfDay,
  ReferenceVariation,
  StylePresetId,
} from '@/lib/site-builder/prompt-builder';

/** Nudges reproducibility when the provider supports `seed` (ignored otherwise). */
const SITE_BUILDER_IMAGE_SEED = 42_713;

function parseAspectRatio(v: unknown): ImageAspectRatio | undefined {
  return v === '16:9' || v === '3:2' || v === '4:3' ? v : undefined;
}

function parseTimeOfDay(v: unknown): ImageTimeOfDay | undefined {
  return v === 'midday' || v === 'golden_hour' ? v : undefined;
}

function parseStylePreset(v: unknown): StylePresetId | undefined {
  return v === 'none' || v === 'sage_marketing' ? v : undefined;
}

function parseReferenceVariation(v: unknown): ReferenceVariation | undefined {
  return v === 'same_property_new_subject' ||
    v === 'subtle_camera_shift' ||
    v === 'new_subject_and_camera'
    ? v
    : undefined;
}

type ParsedImageRequest = {
  config: ConfigForPrompt;
  /** Resolved scene context (never `auto`); client sends explicit id after resolving from rows + user choice. */
  propertySceneArchetype: PropertySceneArchetypeId;
  /** CCE catalog row id — server loads unit_link for product-page image fetch (glamping). */
  catalogUnitId?: string;
  location?: string;
  imageDescription?: string;
  sharedLandscapeContext?: string;
  batchPosition?: number;
  batchTotal?: number;
  roadSurface?: 'dirt' | 'gravel' | 'paved';
  referenceImageBase64?: string;
  referenceMediaType?: string;
  aspectRatio: ImageAspectRatio;
  timeOfDay: ImageTimeOfDay;
  stylePreset: StylePresetId;
  referenceVariation?: ReferenceVariation;
};

function parseBody(body: unknown): ParsedImageRequest | null {
  if (!body || typeof body !== 'object' || !('config' in body)) return null;
  const b = body as Record<string, unknown>;
  const config = b.config;
  const location = b.location;
  const imageDescription = b.imageDescription;
  const sharedLandscapeContext = b.sharedLandscapeContext;
  const batchPosition = b.batchPosition;
  const batchTotal = b.batchTotal;
  const referenceImageBase64 = b.referenceImageBase64;
  const referenceMediaType = b.referenceMediaType;
  const aspectRatio = parseAspectRatio(b.aspectRatio) ?? DEFAULT_IMAGE_PROMPT_OPTIONS.aspectRatio;
  const timeOfDay = parseTimeOfDay(b.timeOfDay) ?? DEFAULT_IMAGE_PROMPT_OPTIONS.timeOfDay;
  const stylePreset = parseStylePreset(b.stylePreset) ?? DEFAULT_IMAGE_PROMPT_OPTIONS.stylePreset;
  const referenceVariation = parseReferenceVariation(b.referenceVariation);
  const catalogUnitId =
    typeof b.catalogUnitId === 'string' && b.catalogUnitId.trim() ? b.catalogUnitId.trim() : undefined;
  const archeFromBody = parsePropertySceneArchetypeFromBody(b.propertySceneArchetype);

  if (!config || typeof config !== 'object') return null;

  const type = (config as { type?: string }).type;
  const roadSurfaceRaw = b.roadSurface;
  const roadSurfaceParsed: ParsedImageRequest['roadSurface'] =
    roadSurfaceRaw === 'dirt' || roadSurfaceRaw === 'gravel' || roadSurfaceRaw === 'paved'
      ? roadSurfaceRaw
      : undefined;

  const sharedTail = {
    catalogUnitId,
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
    roadSurface: roadSurfaceParsed,
    referenceImageBase64:
      typeof referenceImageBase64 === 'string' && referenceImageBase64.trim() ? referenceImageBase64.trim() : undefined,
    referenceMediaType:
      typeof referenceMediaType === 'string' && referenceMediaType.trim() ? referenceMediaType.trim() : undefined,
    aspectRatio,
    timeOfDay,
    stylePreset,
    referenceVariation,
  };

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
      propertySceneArchetype: archeFromBody ?? defaultPropertySceneArchetypeForConfigType('glamping'),
      ...sharedTail,
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
      propertySceneArchetype: archeFromBody ?? defaultPropertySceneArchetypeForConfigType('rv'),
      ...sharedTail,
    };
  }
  return null;
}

async function resolveGlampingCatalogProductPageUrl(
  catalogUnitId: string | undefined,
  productLink: string | undefined
): Promise<string | null> {
  if (catalogUnitId?.trim()) {
    try {
      const supabase = createServerClient();
      const { data, error } = await supabase
        .from('cce_catalog_units')
        .select('unit_link')
        .eq('id', catalogUnitId.trim())
        .maybeSingle();
      if (!error && data?.unit_link && String(data.unit_link).trim()) {
        return String(data.unit_link).trim();
      }
    } catch (err) {
      console.warn('[api/admin/site-builder/generate-image] catalog unit_link lookup failed:', err);
    }
  }
  return productLink?.trim() ? productLink.trim() : null;
}

type VisionContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mediaType?: string };

export const POST = withAdminAuth(async (request: NextRequest, auth: AdminAuthContext) => {
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

    if (!isValidImagePromptConfig(parsed.config)) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.config.type === 'glamping'
              ? 'Glamping unit type name is required for image generation'
              : 'RV site type name is required for image generation',
        },
        { status: 400 }
      );
    }

    let catalogImageBase64: string | undefined;
    let catalogMediaType: string | undefined;
    if (parsed.config.type === 'glamping') {
      const pageUrl = await resolveGlampingCatalogProductPageUrl(
        parsed.catalogUnitId,
        parsed.config.productLink
      );
      if (pageUrl) {
        try {
          const fetched = await fetchCatalogProductImageFromPageUrl(pageUrl);
          if (fetched) {
            try {
              const downscaled = await downscaleReferenceImageBase64(fetched.base64);
              catalogImageBase64 = downscaled.base64;
              catalogMediaType = downscaled.mediaType;
            } catch (err) {
              console.warn('[api/admin/site-builder/generate-image] Catalog image downscale failed:', err);
              catalogImageBase64 = fetched.base64;
              catalogMediaType = /^image\/[a-z0-9.+-]+$/i.test(fetched.mediaType)
                ? fetched.mediaType
                : 'image/jpeg';
            }
          } else {
            console.warn(
              '[api/admin/site-builder/generate-image] No raster product image from catalog page:',
              pageUrl
            );
          }
        } catch (err) {
          console.warn('[api/admin/site-builder/generate-image] Catalog product page fetch failed:', err);
        }
      }
    }

    let referenceImageBase64 = parsed.referenceImageBase64;
    let referenceMediaType =
      parsed.referenceMediaType && /^image\/[a-z0-9.+-]+$/i.test(parsed.referenceMediaType)
        ? parsed.referenceMediaType
        : 'image/png';

    if (referenceImageBase64) {
      try {
        const prepared = await prepareReferenceImageForVision(referenceImageBase64, 'batch');
        referenceImageBase64 = prepared.base64;
        referenceMediaType = prepared.mediaType;
      } catch (err) {
        console.warn('[api/admin/site-builder/generate-image] Reference prepare failed, using original:', err);
      }
    }

    const basePrompt = buildImagePrompt(parsed.config, parsed.location, parsed.imageDescription, {
      sharedLandscapeContext: parsed.sharedLandscapeContext,
      batchPosition: parsed.batchPosition,
      batchTotal: parsed.batchTotal,
      roadSurface: parsed.roadSurface,
      aspectRatio: parsed.aspectRatio,
      timeOfDay: parsed.timeOfDay,
      stylePreset: parsed.stylePreset,
      propertySceneArchetype: parsed.propertySceneArchetype,
    });

    const hasCatalog = Boolean(catalogImageBase64 && catalogMediaType);
    const hasBatch = Boolean(referenceImageBase64);

    const gateway = createGateway({ apiKey });

    let result;
    if (!hasCatalog && !hasBatch) {
      result = await generateText({
        model: gateway(SITE_BUILDER_GATEWAY_MODEL_ID),
        prompt: basePrompt,
        seed: SITE_BUILDER_IMAGE_SEED,
      });
    } else {
      const parts: VisionContentPart[] = [];
      if (hasCatalog) {
        parts.push({ type: 'text', text: CATALOG_PRODUCT_IMAGE_PREAMBLE });
        parts.push({ type: 'image', image: catalogImageBase64!, mediaType: catalogMediaType });
      }
      if (hasBatch) {
        const batchText = hasCatalog
          ? buildBatchSceneReferenceAfterCatalog(parsed.referenceVariation ?? DEFAULT_REFERENCE_VARIATION)
          : `${buildReferenceImagePromptPrefix(parsed.referenceVariation ?? DEFAULT_REFERENCE_VARIATION)}${basePrompt}`;
        parts.push({ type: 'text', text: batchText });
        parts.push({ type: 'image', image: referenceImageBase64!, mediaType: referenceMediaType });
        if (hasCatalog) {
          parts.push({ type: 'text', text: basePrompt });
        }
      } else {
        parts.push({ type: 'text', text: basePrompt });
      }
      result = await generateText({
        model: gateway(SITE_BUILDER_GATEWAY_MODEL_ID),
        messages: [{ role: 'user' as const, content: parts }],
        seed: SITE_BUILDER_IMAGE_SEED,
      });
    }

    try {
      const usage = result.totalUsage ?? result.usage;
      const supabase = createServerClient();
      await supabase.from('admin_ai_usage_events' as never).insert({
        user_id: auth.session.user.id,
        user_email: auth.session.user.email ?? null,
        feature: 'site_builder_image',
        provider: 'vercel_ai_gateway',
        model: SITE_BUILDER_GATEWAY_MODEL_ID,
        input_tokens: usage?.inputTokens ?? null,
        output_tokens: usage?.outputTokens ?? null,
        total_tokens: usage?.totalTokens ?? null,
        raw_usage: usage?.raw ?? null,
        request_meta: {
          hasCatalog,
          hasBatch,
          aspectRatio: parsed.aspectRatio ?? null,
          batchPosition: parsed.batchPosition ?? null,
          batchTotal: parsed.batchTotal ?? null,
        },
      } as never);
    } catch (logErr) {
      console.warn('[api/admin/site-builder/generate-image] admin_ai_usage_events insert failed:', logErr);
    }

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
