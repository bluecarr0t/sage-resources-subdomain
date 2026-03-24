/**
 * @jest-environment node
 */

import {
  downscaleReferenceImageBase64,
  prepareReferenceImageForVision,
} from '@/lib/site-builder/downscale-reference-image';

/** Minimal 1x1 PNG */
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmWQQAAAABJRU5ErkJggg==';

describe('downscaleReferenceImageBase64', () => {
  it('returns JPEG base64 and media type', async () => {
    const result = await downscaleReferenceImageBase64(TINY_PNG_BASE64);
    expect(result.mediaType).toBe('image/jpeg');
    expect(result.base64.length).toBeGreaterThan(20);
  });
});

describe('prepareReferenceImageForVision', () => {
  it('batch purpose preserves small PNG without re-encoding to JPEG', async () => {
    const result = await prepareReferenceImageForVision(TINY_PNG_BASE64, 'batch');
    expect(result.mediaType).toBe('image/png');
    expect(result.base64).toBe(TINY_PNG_BASE64);
  });
});
