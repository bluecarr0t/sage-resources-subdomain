/**
 * One-page Word export: Site Builder renders in a 2-column table using the RV or Glamping
 * feasibility template so header/footer match the main study .docx authors paste into.
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import sharp from 'sharp';

export type SiteBuilderImageForDocx = {
  configName: string;
  imageBase64: string;
  mediaType: string;
};

export type SiteBuilderImagesDocxTemplateKey = 'rv' | 'glamping';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function loadTemplateBinary(templateKey: SiteBuilderImagesDocxTemplateKey): string {
  const specificPath = path.join(process.cwd(), 'templates', templateKey, 'template.docx');
  if (fs.existsSync(specificPath)) {
    return fs.readFileSync(specificPath, 'binary');
  }
  const fallback = path.join(process.cwd(), 'templates', 'feasibility-draft.docx');
  if (!fs.existsSync(fallback)) {
    throw new Error(`DOCX template missing: ${specificPath} (and no ${fallback})`);
  }
  return fs.readFileSync(fallback, 'binary');
}

function parseMaxRId(relsXml: string): number {
  let max = 0;
  for (const m of relsXml.matchAll(/Id="rId(\d+)"/g)) {
    const n = parseInt(m[1], 10);
    if (n > max) max = n;
  }
  return max;
}

function decodeBase64Image(imageBase64: string): Buffer {
  const raw = imageBase64.trim();
  const comma = raw.indexOf(',');
  const b64 = raw.startsWith('data:') && comma >= 0 ? raw.slice(comma + 1) : raw;
  return Buffer.from(b64, 'base64');
}

/**
 * Inline picture OOXML (JPEG blip). cx/cy in EMU (914400 per inch).
 */
function buildInlineImageDrawingXml(
  rId: string,
  cxEmu: number,
  cyEmu: number,
  docPrId: number,
  pictureName: string
): string {
  const safeName = escapeXml(pictureName.slice(0, 120));
  return (
    `<w:drawing xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ` +
    `xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cxEmu}" cy="${cyEmu}"/>` +
    `<wp:docPr id="${docPrId}" name="${safeName}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="${safeName}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cxEmu}" cy="${cyEmu}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`
  );
}

function buildCaptionParagraph(text: string): string {
  return (
    `<w:p>` +
    `<w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="180"/></w:pPr>` +
    `<w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t>${escapeXml(text)}</w:t></w:r>` +
    `</w:p>`
  );
}

function buildImageCell(
  configName: string,
  rId: string,
  cxEmu: number,
  cyEmu: number,
  docPrId: number
): string {
  const drawing = buildInlineImageDrawingXml(rId, cxEmu, cyEmu, docPrId, configName);
  const imgPara =
    `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>` +
    `<w:r>${drawing}</w:r></w:p>`;
  return (
    `<w:tc>` +
    `<w:tcPr><w:tcW w:w="4680" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>` +
    imgPara +
    buildCaptionParagraph(configName) +
    `</w:tc>`
  );
}

function buildEmptyCell(): string {
  return (
    `<w:tc>` +
    `<w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>` +
    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr></w:p>` +
    `</w:tc>`
  );
}

function buildTitleParagraph(): string {
  const title = 'Site Builder — illustrative configuration images';
  const note =
    'Copy this page into your feasibility study Word file. Images are conceptual only; see Site Builder governance notes.';
  return (
    `<w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:after="120"/></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:sz w:val="36"/></w:rPr><w:t>${escapeXml(title)}</w:t></w:r></w:p>` +
    `<w:p><w:pPr><w:pStyle w:val="Normal"/><w:spacing w:after="240"/></w:pPr>` +
    `<w:r><w:rPr><w:i/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(note)}</w:t></w:r></w:p>`
  );
}

function computeImageExtentsEmu(imageCount: number): { cx: number; cy: number } {
  const rows = Math.max(1, Math.ceil(imageCount / 2));
  /** ~7.2" printable body height after title (EMU) */
  const usableH = 7.2 * 914400;
  const rowBudget = usableH / rows;
  let cy = Math.floor(rowBudget * 0.62);
  cy = Math.max(550000, Math.min(1_600_000, cy));
  let cx = Math.floor(cy * (4 / 3));
  const maxHalfCol = Math.floor(3.15 * 914400);
  if (cx > maxHalfCol) {
    cx = maxHalfCol;
    cy = Math.floor(cx * (3 / 4));
  }
  return { cx, cy };
}

function extractTrailingSectPr(bodyInner: string): string {
  const endTag = '</w:sectPr>';
  const closeIdx = bodyInner.lastIndexOf(endTag);
  if (closeIdx < 0) {
    throw new Error('Template document.xml has no closing w:sectPr');
  }
  const openIdx = bodyInner.lastIndexOf('<w:sectPr', closeIdx);
  if (openIdx < 0) {
    throw new Error('Template document.xml has no final w:sectPr');
  }
  return bodyInner.slice(openIdx, closeIdx + endTag.length);
}

/**
 * Remove document/media relationships that are no longer referenced from any XML part.
 * Scans every header/footer part in the zip (feasibility templates ship dozens of them).
 */
function stripUnreferencedMediaDynamic(zip: PizZip): void {
  const allXmlParts = Object.keys(zip.files).filter(
    (k) =>
      !zip.files[k]?.dir &&
      (k === 'word/document.xml' ||
        k === 'word/footnotes.xml' ||
        k === 'word/endnotes.xml' ||
        /^word\/header\d+\.xml$/.test(k) ||
        /^word\/footer\d+\.xml$/.test(k))
  );

  const referencedRIds = new Set<string>();
  const rIdPattern = /r:(?:embed|link|id)="(rId\d+)"/g;
  for (const xmlPath of allXmlParts) {
    const f = zip.file(xmlPath);
    if (!f) continue;
    const content = f.asText();
    for (const m of content.matchAll(rIdPattern)) {
      referencedRIds.add(m[1]);
    }
  }

  const relsFiles = Object.keys(zip.files).filter(
    (k) =>
      !zip.files[k]?.dir &&
      (k === 'word/_rels/document.xml.rels' ||
        /^word\/_rels\/header\d+\.xml\.rels$/.test(k) ||
        /^word\/_rels\/footer\d+\.xml\.rels$/.test(k))
  );

  const imageType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
  const relEntryPattern = /<Relationship\s[^>]*\/?>(?:<\/Relationship>)?/g;

  for (const relsPath of relsFiles) {
    const relsFile = zip.file(relsPath);
    if (!relsFile) continue;
    let relsXml = relsFile.asText();
    const entries: Array<{ full: string; id: string; target: string; type: string }> = [];
    for (const m of relsXml.matchAll(relEntryPattern)) {
      const el = m[0];
      const idMatch = el.match(/Id="([^"]*)"/);
      const targetMatch = el.match(/Target="([^"]*)"/);
      const typeMatch = el.match(/Type="([^"]*)"/);
      if (idMatch && targetMatch && typeMatch) {
        entries.push({ full: el, id: idMatch[1], target: targetMatch[1], type: typeMatch[1] });
      }
    }
    const toRemove = entries.filter(
      (e) => e.type === imageType && !referencedRIds.has(e.id)
    );
    if (toRemove.length === 0) continue;
    for (const entry of toRemove) {
      relsXml = relsXml.replace(entry.full, '');
      const mediaPath = entry.target.startsWith('/')
        ? entry.target.slice(1)
        : `word/${entry.target}`;
      if (zip.file(mediaPath)) {
        zip.remove(mediaPath);
      }
    }
    relsXml = relsXml.replace(/\n\s*\n/g, '\n');
    zip.file(relsPath, relsXml);
  }
}

export async function buildSiteBuilderImagesDocx(params: {
  templateKey: SiteBuilderImagesDocxTemplateKey;
  images: SiteBuilderImageForDocx[];
}): Promise<Buffer> {
  const { templateKey, images } = params;
  if (images.length === 0) {
    throw new Error('At least one image is required');
  }

  const binary = loadTemplateBinary(templateKey);
  const zip = new PizZip(binary);

  const docPath = 'word/document.xml';
  const docFile = zip.file(docPath);
  if (!docFile) {
    throw new Error('Invalid template: missing word/document.xml');
  }

  let docXml = docFile.asText();
  const bodyMatch = docXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) {
    throw new Error('Invalid document.xml: no w:body');
  }
  const sectPr = extractTrailingSectPr(bodyMatch[1]);

  const relsPath = 'word/_rels/document.xml.rels';
  const relsFile = zip.file(relsPath);
  if (!relsFile) {
    throw new Error('Invalid template: missing document.xml.rels');
  }
  let relsXml = relsFile.asText();
  let nextRNum = parseMaxRId(relsXml) + 1;
  let docPrId = 50_000;

  const { cx, cy } = computeImageExtentsEmu(images.length);
  const tableRows: string[] = [];
  let mediaSerial = 0;

  const embedOne = async (item: SiteBuilderImageForDocx, label: string): Promise<{ rId: string }> => {
    const buf = decodeBase64Image(item.imageBase64);
    if (buf.length < 64 || buf.length > 12 * 1024 * 1024) {
      throw new Error(`Invalid image payload for ${label}`);
    }
    let jpeg: Buffer;
    try {
      jpeg = await sharp(buf)
        .rotate()
        .resize(1400, 1400, { fit: 'inside' })
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch {
      throw new Error(`Could not decode image for ${label}`);
    }
    mediaSerial += 1;
    const mediaName = `siteBuilderImage${mediaSerial}.jpeg`;
    const mediaPath = `word/media/${mediaName}`;
    zip.file(mediaPath, jpeg, { binary: true });
    const rId = `rId${nextRNum++}`;
    const rel = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${mediaName}"/>`;
    relsXml = relsXml.replace('</Relationships>', `${rel}\n</Relationships>`);
    return { rId };
  };

  for (let i = 0; i < images.length; i += 2) {
    const left = images[i]!;
    const right = images[i + 1];
    const { rId: rIdLeft } = await embedOne(left, left.configName);
    const leftCellXml = buildImageCell(left.configName, rIdLeft, cx, cy, docPrId++);

    let rightCellXml: string;
    if (right) {
      const { rId: rIdRight } = await embedOne(right, right.configName);
      rightCellXml = buildImageCell(right.configName, rIdRight, cx, cy, docPrId++);
    } else {
      rightCellXml = buildEmptyCell();
    }

    tableRows.push(`<w:tr>${leftCellXml}${rightCellXml}</w:tr>`);
  }

  const tableXml =
    `<w:tbl>` +
    `<w:tblPr>` +
    `<w:tblStyle w:val="TableGrid"/>` +
    `<w:tblW w:w="9360" w:type="dxa"/>` +
    `<w:tblLook w:val="04A0"/>` +
    `</w:tblPr>` +
    `<w:tblGrid><w:gridCol w:w="4680"/><w:gridCol w:w="4680"/></w:tblGrid>` +
    tableRows.join('') +
    `</w:tbl>`;

  const newBodyInner = buildTitleParagraph() + tableXml + sectPr;
  docXml = docXml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${newBodyInner}</w:body>`);
  zip.file(docPath, docXml);
  zip.file(relsPath, relsXml);

  stripUnreferencedMediaDynamic(zip);

  const out = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}
