/**
 * Compress OOXML files (DOCX, XLSX) before upload.
 * These formats are ZIP archives; recompressing with max level can reduce size 10–30%.
 * Legacy .doc (binary) is not supported and is returned unchanged.
 */

import JSZip from 'jszip';

const COMPRESSION_LEVEL = 9;

/**
 * Compress a DOCX or XLSX buffer. Returns the original buffer if:
 * - The file is not a valid ZIP (e.g. legacy .doc)
 * - Compression fails or produces a larger result
 */
export async function compressOoxml(
  buffer: Buffer,
  filename: string
): Promise<Buffer> {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.doc')) {
    // Legacy binary format, not a ZIP
    return buffer;
  }
  if (!lower.endsWith('.docx') && !lower.endsWith('.xlsx')) {
    return buffer;
  }

  try {
    const zip = await JSZip.loadAsync(buffer);
    const compressed = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: COMPRESSION_LEVEL },
    });

    // Only use compressed version if it's smaller
    if (compressed.length < buffer.length) {
      return Buffer.from(compressed);
    }
  } catch {
    // Invalid zip or compression error – return original
  }
  return buffer;
}
