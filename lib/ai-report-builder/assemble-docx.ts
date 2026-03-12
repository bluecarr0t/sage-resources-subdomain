/**
 * Assemble DOCX from template and generated sections
 * Caches template in memory for performance
 */

import * as fs from 'fs';
import * as path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import type { EnrichedInput } from './types';
import type { GeneratedSections } from './types';

let templateCache: string | null = null;

function getTemplateContent(): string {
  if (templateCache) return templateCache;
  const templatePath = path.join(process.cwd(), 'templates', 'feasibility-draft.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Template not found at ${templatePath}. Run: npx tsx scripts/create-feasibility-draft-template.ts`
    );
  }
  templateCache = fs.readFileSync(templatePath, 'binary');
  return templateCache;
}

export async function assembleDraftDocx(
  input: EnrichedInput,
  sections: GeneratedSections
): Promise<Buffer> {
  const content = getTemplateContent();
  const zip = new PizZip(content);

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  });

  const location = [input.address_1, input.city, input.state, input.zip_code]
    .filter(Boolean)
    .join(', ');

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  try {
    doc.render({
      property_name: input.property_name,
      location: location || 'Not specified',
      client_entity: input.client_entity || 'Client',
      report_date: reportDate,
      executive_summary: sections.executive_summary,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Docxtemplater render failed (check template placeholders): ${msg}`
    );
  }

  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
}
