/**
 * Supabase Storage helpers for glamping property images (bucket + paths).
 * Metadata lives in public.glamping_property_images; see scripts/migrations/create-glamping-property-images-2026-05.sql
 */

export const GLAMPING_PROPERTY_IMAGES_BUCKET = 'glamping-media' as const;

export const GLAMPING_PROPERTY_IMAGE_KINDS = [
  'hero',
  'gallery',
  'map_thumb',
  'evidence',
] as const;

export type GlampingPropertyImageKind = (typeof GLAMPING_PROPERTY_IMAGE_KINDS)[number];

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const GLAMPING_PROPERTY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export function isAllowedGlampingPropertyImageMime(mime: string): boolean {
  return ALLOWED_MIME.has(mime.toLowerCase());
}

export function extensionForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === 'image/jpeg') return 'jpg';
  if (m === 'image/png') return 'png';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/gif') return 'gif';
  return 'bin';
}

/** Object path: `{propertyId}/{kind}/{uuid}.{ext}` */
export function buildGlampingPropertyImagePath(
  propertyId: number,
  kind: GlampingPropertyImageKind,
  mimeType: string
): string {
  const ext = extensionForMime(mimeType);
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${propertyId}/${kind}/${id}.${ext}`;
}

export function parseGlampingPropertyImageKind(raw: string | null): GlampingPropertyImageKind | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return (GLAMPING_PROPERTY_IMAGE_KINDS as readonly string[]).includes(v)
    ? (v as GlampingPropertyImageKind)
    : null;
}
