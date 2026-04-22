/**
 * Sage AI - Feasibility section .docx builder.
 *
 * Takes a `FeasibilityDocxPayload` (from the `generate_feasibility_section`
 * tool) and produces a Microsoft Word document that:
 *
 *   1. Inherits the chosen Sage template's branding (Calibri styles, theme,
 *      headers, footers) - either the rv or glamping template.docx already
 *      used by the /admin/report-builder pipeline.
 *   2. Replaces the template body with a fresh, style-guide-conformant
 *      rendering of the section blocks:
 *        - Calibri 11pt body, 1.15 line spacing, justified alignment
 *        - Section headings in bold (Heading 1/2/3, no random bolding)
 *        - Numbered lists with bold item names + regular description
 *        - Paragraphs that begin with a bold "Name -" lead-in when provided
 *        - Tables with Calibri 10pt body and headers bold + filled
 *          with hex #E2EFDA per the user's style guide
 *        - Standard short hyphen "-" only (en/em dashes are stripped)
 *        - No "~" (approximate) and no inline citations / URLs
 *
 * The generated file is intended to be downloaded standalone or pasted into
 * the master report. Citations stay in the chat reply by default; the system
 * prompt tells the model to only embed them in the .docx if the user opts in.
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import { createServerClient } from '@/lib/supabase';
import { getTemplateKeyForMarketType } from '@/lib/ai-report-builder/assemble-docx';
import {
  type FeasibilityBlock,
  type FeasibilityDocxPayload,
  sanitizeFeasibilityText,
  slugifyFeasibilityFilename,
} from '@/lib/sage-ai/feasibility-docx-payload';

const BUCKET_NAME = 'report-templates';

/**
 * Hex color for table-header fill (and any other "highlighted" fields)
 * mandated by the Sage writing-style guide.
 */
export const TABLE_HEADER_FILL_HEX = 'E2EFDA';

/**
 * Calibri sizes are stored as half-points in OOXML, so 22 = 11pt body and
 * 20 = 10pt table cells.
 */
const BODY_FONT_HALF_PT = 22;
const TABLE_FONT_HALF_PT = 20;
const HEADING_1_HALF_PT = 32;
const HEADING_2_HALF_PT = 28;
const HEADING_3_HALF_PT = 24;

/**
 * 1.15 line spacing in DOCX = 276 twentieths of a point (240 = single,
 * 276 = 1.15, 360 = 1.5).
 */
const LINE_SPACING_TWIPS = 276;

const templateCache = new Map<string, { binary: string; fetchedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchTemplateFromSupabase(templateKey: string): Promise<string | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(`${templateKey}/template.docx`);
  if (error || !data) return null;
  const buf = Buffer.from(await data.arrayBuffer());
  return buf.toString('binary');
}

function getLocalFallbackTemplate(templateKey: string): string {
  const specific = path.join(process.cwd(), 'templates', templateKey, 'template.docx');
  if (fs.existsSync(specific)) return fs.readFileSync(specific, 'binary');
  const fallback = path.join(process.cwd(), 'templates', 'feasibility-draft.docx');
  if (fs.existsSync(fallback)) return fs.readFileSync(fallback, 'binary');
  throw new Error(
    `No template available for ${templateKey}. Expected templates/${templateKey}/template.docx or templates/feasibility-draft.docx.`
  );
}

async function getTemplateBinary(templateKey: string): Promise<string> {
  const cached = templateCache.get(templateKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.binary;
  const remote = await fetchTemplateFromSupabase(templateKey);
  const binary = remote ?? getLocalFallbackTemplate(templateKey);
  templateCache.set(templateKey, { binary, fetchedAt: Date.now() });
  return binary;
}

export function clearFeasibilitySectionTemplateCache() {
  templateCache.clear();
}

/**
 * Escape characters that have meaning in OOXML. Used inside `<w:t>` text runs.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Wrap `<w:t>` so leading/trailing whitespace is preserved (Word strips it
 * by default). We always use `xml:space="preserve"` because section copy
 * routinely starts/ends with significant spacing around bold lead-ins.
 */
function textRun(content: string, opts?: { bold?: boolean; halfPt?: number }): string {
  const bold = opts?.bold ? '<w:b/>' : '';
  const sz = opts?.halfPt ?? BODY_FONT_HALF_PT;
  return (
    `<w:r>` +
    `<w:rPr>` +
    `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>` +
    `${bold}` +
    `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>` +
    `</w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(content)}</w:t>` +
    `</w:r>`
  );
}

/**
 * Body paragraph defaults: justified, 1.15 spacing, Calibri 11pt run defaults.
 * Tables override `pStyle` so they don't inherit body justification.
 */
function bodyParagraphPropsXml(extras: string = ''): string {
  return (
    `<w:pPr>` +
    `<w:spacing w:line="${LINE_SPACING_TWIPS}" w:lineRule="auto" w:after="120"/>` +
    `<w:jc w:val="both"/>` +
    `<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="${BODY_FONT_HALF_PT}"/></w:rPr>` +
    `${extras}` +
    `</w:pPr>`
  );
}

function headingParagraphXml(level: 1 | 2 | 3, text: string): string {
  const halfPt =
    level === 1 ? HEADING_1_HALF_PT : level === 2 ? HEADING_2_HALF_PT : HEADING_3_HALF_PT;
  const before = level === 1 ? 240 : level === 2 ? 200 : 160;
  return (
    `<w:p>` +
    `<w:pPr>` +
    `<w:spacing w:before="${before}" w:after="120" w:line="${LINE_SPACING_TWIPS}" w:lineRule="auto"/>` +
    `<w:jc w:val="left"/>` +
    `<w:outlineLvl w:val="${level - 1}"/>` +
    `</w:pPr>` +
    textRun(text, { bold: true, halfPt }) +
    `</w:p>`
  );
}

/**
 * Render a paragraph with optional bold "Name - " lead-in followed by the
 * regular body text. Per the style guide this is the canonical paragraph
 * shape in chat replies and Word documents alike.
 */
function paragraphBlockXml(name: string | undefined, text: string): string {
  const cleanText = sanitizeFeasibilityText(text);
  const cleanName = name ? sanitizeFeasibilityText(name).trim() : '';

  const runs = cleanName
    ? textRun(`${cleanName} - `, { bold: true }) + textRun(cleanText)
    : textRun(cleanText);

  return `<w:p>${bodyParagraphPropsXml()}${runs}</w:p>`;
}

/**
 * Render a numbered list as a sequence of paragraphs with the list digit and
 * bold item name baked into the run. We deliberately avoid `<w:numPr>` /
 * numbering.xml because the templates may not have a matching abstract num
 * and we want a single, predictable representation that Word always renders
 * the same way.
 */
function numberedListBlockXml(
  items: ReadonlyArray<{ name: string; description: string }>
): string {
  return items
    .map((item, idx) => {
      const ord = `${idx + 1}.`;
      const name = sanitizeFeasibilityText(item.name).trim();
      const description = sanitizeFeasibilityText(item.description);
      return (
        `<w:p>` +
        bodyParagraphPropsXml(
          `<w:ind w:left="540" w:hanging="360"/>`
        ) +
        textRun(`${ord} `) +
        textRun(name, { bold: true }) +
        textRun(` - ${description}`) +
        `</w:p>`
      );
    })
    .join('');
}

/**
 * Render a table per the style guide:
 *   - Calibri 10pt body
 *   - Header row bold with #E2EFDA fill
 *   - Header row first column left-aligned, others centered (per the
 *     user's Excel/Table guide; we mirror that for Word tables)
 *   - Body cells: text left-aligned, numeric-looking values centered
 */
function tableBlockXml(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
  caption?: string
): string {
  const captionXml = caption
    ? `<w:p>${bodyParagraphPropsXml()}${textRun(sanitizeFeasibilityText(caption), { bold: true })}</w:p>`
    : '';

  const colCount = headers.length;
  const colWidth = Math.max(800, Math.floor(9000 / Math.max(1, colCount)));
  const gridCols = Array(colCount).fill(`<w:gridCol w:w="${colWidth}"/>`).join('');

  const headerRow =
    `<w:tr>` +
    `<w:trPr><w:tblHeader/></w:trPr>` +
    headers
      .map((h, i) => {
        const align = i === 0 ? 'left' : 'center';
        return (
          `<w:tc>` +
          `<w:tcPr>` +
          `<w:tcW w:w="${colWidth}" w:type="dxa"/>` +
          `<w:shd w:val="clear" w:color="auto" w:fill="${TABLE_HEADER_FILL_HEX}"/>` +
          `</w:tcPr>` +
          `<w:p>` +
          `<w:pPr>` +
          `<w:spacing w:line="${LINE_SPACING_TWIPS}" w:lineRule="auto" w:after="0"/>` +
          `<w:jc w:val="${align}"/>` +
          `</w:pPr>` +
          textRun(sanitizeFeasibilityText(h), { bold: true, halfPt: TABLE_FONT_HALF_PT }) +
          `</w:p>` +
          `</w:tc>`
        );
      })
      .join('') +
    `</w:tr>`;

  const numericLike = /^[\s$()%.,\-+]*[\d][\d.,$()%\s\-+/]*$/;

  const bodyRows = rows
    .map(
      (row) =>
        `<w:tr>` +
        row
          .map((cell, i) => {
            const value = sanitizeFeasibilityText(cell);
            const isNumeric = numericLike.test(value.trim());
            const align = i === 0 ? 'left' : isNumeric ? 'center' : 'left';
            return (
              `<w:tc>` +
              `<w:tcPr><w:tcW w:w="${colWidth}" w:type="dxa"/></w:tcPr>` +
              `<w:p>` +
              `<w:pPr>` +
              `<w:spacing w:line="${LINE_SPACING_TWIPS}" w:lineRule="auto" w:after="0"/>` +
              `<w:jc w:val="${align}"/>` +
              `</w:pPr>` +
              textRun(value, { halfPt: TABLE_FONT_HALF_PT }) +
              `</w:p>` +
              `</w:tc>`
            );
          })
          .join('') +
        `</w:tr>`
    )
    .join('');

  const table =
    `<w:tbl>` +
    `<w:tblPr>` +
    `<w:tblW w:w="9000" w:type="dxa"/>` +
    `<w:tblBorders>` +
    `<w:top w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
    `<w:left w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
    `<w:bottom w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
    `<w:right w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
    `<w:insideH w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
    `<w:insideV w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"/>` +
    `</w:tblBorders>` +
    `<w:tblLook w:val="04A0"/>` +
    `</w:tblPr>` +
    `<w:tblGrid>${gridCols}</w:tblGrid>` +
    headerRow +
    bodyRows +
    `</w:tbl>` +
    `<w:p>${bodyParagraphPropsXml()}</w:p>`;

  return captionXml + table;
}

function blockToXml(block: FeasibilityBlock): string {
  switch (block.kind) {
    case 'heading':
      return headingParagraphXml(block.level, sanitizeFeasibilityText(block.text));
    case 'paragraph':
      return paragraphBlockXml(block.name, block.text);
    case 'numbered_list':
      return numberedListBlockXml(block.items);
    case 'table':
      return tableBlockXml(block.headers, block.rows, block.caption);
    default: {
      const _exhaustive: never = block;
      void _exhaustive;
      return '';
    }
  }
}

/**
 * Replace the template's `word/document.xml` body content with our
 * style-guide-conformant rendering of the payload, while preserving the
 * original `<w:sectPr>` so headers/footers, page size, and margins from the
 * Sage template carry over to the section file.
 */
function buildBodyXml(payload: FeasibilityDocxPayload, originalBodyXml: string): string {
  const sectPrMatch = originalBodyXml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/);
  const sectPr = sectPrMatch?.[0] ?? '';

  const titleXml = headingParagraphXml(1, sanitizeFeasibilityText(payload.title));
  const blocksXml = payload.blocks.map(blockToXml).join('');

  return `<w:body>${titleXml}${blocksXml}${sectPr}</w:body>`;
}

export interface AssembleSectionDocxOptions {
  /** rv | glamping. Defaults to 'rv' when omitted (matches report-builder). */
  marketType?: string | null;
}

/**
 * Build a section .docx as a `Buffer` ready to stream from a route handler.
 */
export async function assembleFeasibilitySectionDocx(
  payload: FeasibilityDocxPayload,
  options?: AssembleSectionDocxOptions
): Promise<Buffer> {
  const templateKey = getTemplateKeyForMarketType(options?.marketType);
  const binary = await getTemplateBinary(templateKey);
  const zip = new PizZip(binary);

  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('Template is missing word/document.xml');
  }
  const xml = docFile.asText();
  const bodyMatch = xml.match(/<w:body\b[\s\S]*?<\/w:body>/);
  if (!bodyMatch) {
    throw new Error('Template word/document.xml has no <w:body>');
  }
  const newBody = buildBodyXml(payload, bodyMatch[0]);
  const newDoc = xml.replace(bodyMatch[0], newBody);
  zip.file('word/document.xml', newDoc);

  // Drop any rels the template body referenced (linked Excel objects, drawing
  // anchors, hyperlinks for TOC, etc.) - we just stripped the body that used
  // them, so leaving them in invalidates the package.
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    const relsXml = relsFile.asText();
    const relTypesToDrop = new Set([
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject',
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData',
      'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
    ]);
    const filtered = relsXml.replace(
      /<Relationship\b[^/]*\/>/g,
      (match) => {
        const typeMatch = match.match(/Type="([^"]*)"/);
        if (typeMatch && relTypesToDrop.has(typeMatch[1])) return '';
        return match;
      }
    );
    zip.file('word/_rels/document.xml.rels', filtered);
  }

  const out = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}

/**
 * Convenience helper for building the download filename. The route uses this
 * directly so the schema's `filename_hint` survives a round-trip from the
 * model intact (sanitized) but never produces an empty / unsafe filename.
 */
export function feasibilitySectionFilename(payload: FeasibilityDocxPayload): string {
  const stem = slugifyFeasibilityFilename(payload.filename_hint || payload.title);
  return `${stem}.docx`;
}
