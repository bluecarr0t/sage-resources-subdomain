import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Vercel Blob path prefix used by scripts/upload-cce-pdfs-to-blob.ts
 */
export const CCE_PDF_BLOB_PATH_PREFIX = 'cce-pdfs';

/**
 * Default store matches glamping-units / admin-logos in this repo.
 * Set CCE_PDF_BLOB_BASE_URL if PDFs live on another blob store (no trailing slash).
 */
const DEFAULT_BLOB_BASE =
  'https://b0evzueuuq9l227n.public.blob.vercel-storage.com';

function blobBaseUrl(): string {
  const raw = process.env.CCE_PDF_BLOB_BASE_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  return DEFAULT_BLOB_BASE;
}

/** Public GET URL for a PDF uploaded under cce-pdfs/<filename> */
export function ccePdfPublicBlobUrl(filename: string): string {
  return `${blobBaseUrl()}/${CCE_PDF_BLOB_PATH_PREFIX}/${encodeURIComponent(filename)}`;
}

/**
 * Prefer local_data when present (local dev); otherwise fetch from Vercel Blob.
 */
export async function loadCcePdfFromLocalOrBlob(
  filename: string,
  projectRoot: string
): Promise<{ buffer: Buffer; source: 'local' | 'blob' } | null> {
  const localPath = resolve(projectRoot, 'local_data', filename);
  if (existsSync(localPath)) {
    const buffer = await readFile(localPath);
    return { buffer, source: 'local' };
  }

  const url = ccePdfPublicBlobUrl(filename);
  // Avoid Next data cache for large PDFs; API routes set Cache-Control on the response.
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    return null;
  }
  const ab = await res.arrayBuffer();
  return { buffer: Buffer.from(ab), source: 'blob' };
}
