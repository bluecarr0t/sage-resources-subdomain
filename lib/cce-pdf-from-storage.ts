import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

/** CCE report PDFs (e.g. CCE_March_2026.pdf) — scripts/upload-cce-pdfs-to-blob.ts */
export const CCE_PDF_BLOB_PATH_PREFIX = 'cce-pdfs';

/** Walden Buyers Guide — separate from CCE; scripts/upload-cce-pdfs-to-blob.ts */
export const WALDEN_PDF_BLOB_PATH_PREFIX = 'walden-pdfs';

export const WALDEN_PDF_FILENAME =
  'Walden_2025_Unique_Accommodation_Buyers_Guide_1.1 (2).pdf';

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

function pdfPublicBlobUrl(prefix: string, filename: string): string {
  return `${blobBaseUrl()}/${prefix}/${encodeURIComponent(filename)}`;
}

/** Public GET URL for a CCE PDF under cce-pdfs/<filename> */
export function ccePdfPublicBlobUrl(filename: string): string {
  return pdfPublicBlobUrl(CCE_PDF_BLOB_PATH_PREFIX, filename);
}

/** Public GET URL for Walden PDF under walden-pdfs/<filename> */
export function waldenPdfPublicBlobUrl(filename: string): string {
  return pdfPublicBlobUrl(WALDEN_PDF_BLOB_PATH_PREFIX, filename);
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

/**
 * Walden catalog PDF: local_data first, then blob at walden-pdfs/, then legacy cce-pdfs/ (older uploads).
 */
export async function loadWaldenPdfFromLocalOrBlob(
  projectRoot: string
): Promise<{ buffer: Buffer; source: 'local' | 'blob' } | null> {
  const filename = WALDEN_PDF_FILENAME;
  const localPath = resolve(projectRoot, 'local_data', filename);
  if (existsSync(localPath)) {
    const buffer = await readFile(localPath);
    return { buffer, source: 'local' };
  }

  const urls = [
    waldenPdfPublicBlobUrl(filename),
    ccePdfPublicBlobUrl(filename),
  ];
  for (const url of urls) {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const ab = await res.arrayBuffer();
      return { buffer: Buffer.from(ab), source: 'blob' };
    }
  }
  return null;
}
