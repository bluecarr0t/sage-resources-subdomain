/**
 * Preserve Word↔Excel paste-links: retarget paths to the companion workbook
 * and annotate remnant template tables for author update.
 */

import type PizZip from 'pizzip';

const AUTHOR_NOTE_MARKER = '[Author update required] Linked Excel table';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isWordParagraphOpenAt(xml: string, index: number): boolean {
  if (!xml.startsWith('<w:p', index)) return false;
  const next = xml[index + 4];
  return next === '>' || next === '/' || next === ' ' || next === '\n' || next === '\r' || next === '\t';
}

function findTopLevelParagraphs(xml: string): Array<{ start: number; end: number; text: string }> {
  const results: Array<{ start: number; end: number; text: string }> = [];
  let i = 0;
  while (i < xml.length) {
    const start = xml.indexOf('<w:p', i);
    if (start < 0) break;
    if (!isWordParagraphOpenAt(xml, start)) {
      i = start + 4;
      continue;
    }
    const afterOpen = xml.indexOf('>', start);
    if (afterOpen < 0) break;
    if (xml[afterOpen - 1] === '/') {
      results.push({ start, end: afterOpen + 1, text: xml.slice(start, afterOpen + 1) });
      i = afterOpen + 1;
      continue;
    }
    let depth = 1;
    let pos = afterOpen + 1;
    while (pos < xml.length && depth > 0) {
      const nextOpen = xml.indexOf('<w:p', pos);
      const nextClose = xml.indexOf('</w:p>', pos);
      if (nextClose < 0) break;
      if (nextOpen >= 0 && nextOpen < nextClose && isWordParagraphOpenAt(xml, nextOpen)) {
        const gt = xml.indexOf('>', nextOpen);
        if (gt >= 0 && xml[gt - 1] !== '/') depth += 1;
        pos = gt >= 0 ? gt + 1 : nextOpen + 4;
      } else {
        depth -= 1;
        pos = nextClose + 6;
      }
    }
    results.push({ start, end: pos, text: xml.slice(start, pos) });
    i = pos;
  }
  return results;
}

function extractSheetHint(instrOrTarget: string): string {
  const m = instrOrTarget.match(/\.xlsx!([^!]+)!/i);
  if (m?.[1]) return decodeURIComponent(m[1].replace(/%20/g, ' '));
  const m2 = instrOrTarget.match(/!([^!]+)!R\d/i);
  if (m2?.[1]) return decodeURIComponent(m2[1].replace(/%20/g, ' '));
  return 'workbook range';
}

export function isExcelLinkParagraph(paraXml: string): boolean {
  if (/HYPERLINK\s+"mailto:/i.test(paraXml)) return false;
  if (/LINK\s+Excel/i.test(paraXml)) return true;
  if (/ProgID="Excel\.Sheet/i.test(paraXml)) return true;
  if (/<w:instrText[^>]*>[\s\S]*?\.xlsx!/i.test(paraXml)) return true;
  if (/<o:OLEObject\b/i.test(paraXml) && /\.xlsx!/i.test(paraXml)) return true;
  if (/<w:object\b/i.test(paraXml) && /Excel\.Sheet/i.test(paraXml)) return true;
  return false;
}

function buildAuthorUpdateNoteXml(sheetHint: string, companionFileName: string): string {
  const text =
    `${AUTHOR_NOTE_MARKER} still shows TEMPLATE remnant data ` +
    `(sheet: ${sheetHint}). Update values in companion workbook "${companionFileName}", ` +
    `then in Word use File → Info → Edit Links to Files (or right-click → Update Link). ` +
    `Delete this highlighted note after the table reflects project data.`;
  return (
    `<w:p>` +
    `<w:pPr><w:pStyle w:val="Normal"/><w:spacing w:before="120" w:after="60"/></w:pPr>` +
    `<w:r><w:rPr><w:highlight w:val="cyan"/><w:sz w:val="18"/></w:rPr>` +
    `<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>` +
    `</w:p>`
  );
}

/**
 * Rewrite LINK Excel / external relationship targets so they point at the
 * generated companion workbook filename (same folder as the DOCX when opened).
 */
export function retargetLinkedExcelWorkbook(
  zip: PizZip,
  companionFileName: string
): { instrTextUpdated: number; relsUpdated: number } {
  const safeName = companionFileName.replace(/[/\\]/g, '').trim() || 'template.xlsx';
  let instrTextUpdated = 0;
  let relsUpdated = 0;

  const docFile = zip.file('word/document.xml');
  if (docFile) {
    let xml = docFile.asText();
    const before = xml;
    xml = xml.replace(
      /"([^"]*?[^"\\/]+\.xlsx)!([^"]+)"/gi,
      (_m, _path: string, rest: string) => {
        instrTextUpdated += 1;
        return `"${safeName}!${rest}"`;
      }
    );
    xml = xml.replace(
      /(&quot;)([^&]*?\.xlsx)!([^&]*?)(&quot;)/gi,
      (_m, q1: string, _path: string, rest: string, q2: string) => {
        instrTextUpdated += 1;
        return `${q1}${safeName}!${rest}${q2}`;
      }
    );
    if (xml !== before) zip.file('word/document.xml', xml);
  }

  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    let rels = relsFile.asText();
    const before = rels;
    rels = rels.replace(
      /Target="file:\/\/\/[^"]+?\.xlsx!([^"]+)"/gi,
      (_m, rest: string) => {
        relsUpdated += 1;
        const encoded = encodeURI(safeName).replace(/#/g, '%23');
        return `Target="file:///${encoded}!${rest}"`;
      }
    );
    rels = rels.replace(
      /Target="([^"]*?[^"/\\]+\.xlsx)!([^"]+)"/gi,
      (_m, _path: string, rest: string) => {
        relsUpdated += 1;
        return `Target="${safeName}!${rest}"`;
      }
    );
    if (rels !== before) zip.file('word/_rels/document.xml.rels', rels);
  }

  return { instrTextUpdated, relsUpdated };
}

/**
 * Insert cyan author-update notes immediately above each linked Excel field/object
 * that still carries template remnant data.
 */
export function annotateLinkedExcelTables(
  zip: PizZip,
  companionFileName: string
): number {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 0;

  const xml = file.asText();
  const paras = findTopLevelParagraphs(xml);
  let inserted = 0;
  let updated = '';
  let cursor = 0;

  for (let i = 0; i < paras.length; i++) {
    const para = paras[i];
    updated += xml.slice(cursor, para.start);

    if (isExcelLinkParagraph(para.text)) {
      const prevPlain = i > 0 ? paras[i - 1].text.replace(/<[^>]+>/g, ' ') : '';
      const alreadyAnnotated = prevPlain.includes(AUTHOR_NOTE_MARKER);
      if (!alreadyAnnotated) {
        const sheet = extractSheetHint(para.text);
        updated += buildAuthorUpdateNoteXml(sheet, companionFileName);
        inserted += 1;
      }
    }

    updated += para.text;
    cursor = para.end;
  }
  updated += xml.slice(cursor);
  zip.file(xmlPath, updated);
  return inserted;
}

export { AUTHOR_NOTE_MARKER, extractSheetHint };

/**
 * Replace top-level paragraphs that are Excel LINK/OLE fields targeting a given
 * sheet (e.g. "Market Profile"). Also drops a preceding author-update note.
 * Returns number of Excel-link paragraphs replaced.
 */
export function replaceExcelLinkParagraphsBySheet(
  zip: PizZip,
  sheetHint: string,
  replacementXml: string
): number {
  const xmlPath = 'word/document.xml';
  const file = zip.file(xmlPath);
  if (!file) return 0;

  const xml = file.asText();
  const paras = findTopLevelParagraphs(xml);
  const hint = sheetHint.toLowerCase();
  let replaced = 0;
  let updated = '';
  let cursor = 0;

  for (let i = 0; i < paras.length; i++) {
    const para = paras[i];
    updated += xml.slice(cursor, para.start);

    if (isExcelLinkParagraph(para.text)) {
      const sheet = extractSheetHint(para.text).toLowerCase();
      if (sheet.includes(hint) || para.text.toLowerCase().includes(`${hint}!`)) {
        // Drop preceding cyan author note if present
        if (i > 0 && paras[i - 1].text.includes(AUTHOR_NOTE_MARKER)) {
          const noteStart = updated.lastIndexOf('<w:p');
          if (noteStart >= 0 && updated.slice(noteStart).includes(AUTHOR_NOTE_MARKER)) {
            updated = updated.slice(0, noteStart);
          }
        }
        updated += replacementXml;
        replaced += 1;
        cursor = para.end;
        continue;
      }
    }

    updated += para.text;
    cursor = para.end;
  }
  updated += xml.slice(cursor);
  if (replaced > 0) zip.file(xmlPath, updated);
  return replaced;
}
