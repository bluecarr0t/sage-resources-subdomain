import sharp from 'sharp';

const CATALOG_MAX_EDGE_PX = 1280;
const CATALOG_JPEG_QUALITY = 85;

/** Only shrink huge prior renders; avoid re-encoding normal model outputs (PNG) so batch images stay sharp. */
const BATCH_MAX_EDGE_PX = 4096;

export type DownscaleReferenceResult = { base64: string; mediaType: 'image/jpeg' };

export type PreparedReferenceResult = { base64: string; mediaType: string };

function mediaTypeFromSharpFormat(format: string | undefined): string {
  switch (format) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/png';
  }
}

async function prepareCatalogReferenceImage(input: Buffer): Promise<PreparedReferenceResult> {
  const out = await sharp(input)
    .rotate()
    .resize(CATALOG_MAX_EDGE_PX, CATALOG_MAX_EDGE_PX, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: CATALOG_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  return {
    base64: out.toString('base64'),
    mediaType: 'image/jpeg',
  };
}

/**
 * Prepares a reference image for the vision model.
 * - `catalog`: shrink + JPEG for arbitrary product-page images (payload size).
 * - `batch`: keep prior render at full fidelity when already ≤ {@link BATCH_MAX_EDGE_PX};
 *   only resize oversized images, using PNG to avoid stacking JPEG artifacts.
 */
export async function prepareReferenceImageForVision(
  rawBase64: string,
  purpose: 'catalog' | 'batch'
): Promise<PreparedReferenceResult> {
  const input = Buffer.from(rawBase64, 'base64');

  if (purpose === 'batch') {
    let meta: sharp.Metadata;
    try {
      meta = await sharp(input).metadata();
    } catch {
      return prepareCatalogReferenceImage(input);
    }
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w > 0 && h > 0 && w <= BATCH_MAX_EDGE_PX && h <= BATCH_MAX_EDGE_PX) {
      return {
        base64: rawBase64,
        mediaType: mediaTypeFromSharpFormat(meta.format),
      };
    }
    const out = await sharp(input)
      .rotate()
      .resize(BATCH_MAX_EDGE_PX, BATCH_MAX_EDGE_PX, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 6 })
      .toBuffer();
    return {
      base64: out.toString('base64'),
      mediaType: 'image/png',
    };
  }

  return prepareCatalogReferenceImage(input);
}

/**
 * Shrinks large reference images before sending to the vision model (smaller payload, faster).
 * Always outputs JPEG. Images already within max edge are re-encoded only (slight size reduction).
 */
export async function downscaleReferenceImageBase64(rawBase64: string): Promise<DownscaleReferenceResult> {
  const r = await prepareReferenceImageForVision(rawBase64, 'catalog');
  return { base64: r.base64, mediaType: 'image/jpeg' };
}
