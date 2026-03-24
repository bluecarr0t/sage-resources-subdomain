/**
 * Vercel AI Gateway model for Site Builder image generation.
 * Keep in sync with `app/api/admin/site-builder/generate-image/route.ts`.
 */
export const SITE_BUILDER_GATEWAY_MODEL_ID = 'google/gemini-3-pro-image' as const;

/** Shown in admin UI (product name; gateway id is {@link SITE_BUILDER_GATEWAY_MODEL_ID}). */
export const SITE_BUILDER_IMAGE_MODEL_DISPLAY_NAME = 'Gemini 3 Pro Image';
