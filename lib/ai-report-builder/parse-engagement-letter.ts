/**
 * PDF → text → engagement letter field extract for Report Builder prefill.
 */

import {
  parseEngagementLetterText,
  type EngagementLetterExtract,
} from './engagement-letter-fields';

export type { EngagementLetterExtract } from './engagement-letter-fields';
export {
  heuristicExtractEngagementLetter,
  parseEngagementLetterText,
  buildAmenitiesDescription,
  reconcilePropertyAndClientEntity,
} from './engagement-letter-fields';

export const MAX_PDF_BYTES = 20 * 1024 * 1024;

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // webpackIgnore + server externals: load pdf-parse/pdfjs-dist from Node, not the
  // webpack graph (bundling pdfjs ESM throws "Object.defineProperty called on non-object").
  const { PDFParse } = await import(/* webpackIgnore: true */ 'pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    const text = (result.text || '').trim();
    if (!text) throw new Error('PDF contained no extractable text');
    return text;
  } finally {
    await parser.destroy?.();
  }
}

export async function parseEngagementLetterPdf(buffer: Buffer): Promise<{
  extract: EngagementLetterExtract;
}> {
  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new Error('PDF exceeds 20 MB limit');
  }
  if (buffer.slice(0, 5).toString('utf8') !== '%PDF-') {
    throw new Error('File is not a PDF');
  }

  const text = await extractPdfText(buffer);
  const extract = await parseEngagementLetterText(text);

  return { extract };
}
