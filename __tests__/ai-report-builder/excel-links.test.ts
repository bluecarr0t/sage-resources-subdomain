/**
 * Linked Excel retarget + author-update annotations.
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';
import {
  annotateLinkedExcelTables,
  AUTHOR_NOTE_MARKER,
  retargetLinkedExcelWorkbook,
} from '@/lib/ai-report-builder/assemble-docx-excel-links';

describe('retargetLinkedExcelWorkbook', () => {
  const templatePath = path.join(process.cwd(), 'templates', 'glamping', 'template.docx');
  if (!fs.existsSync(templatePath)) {
    it.skip('glamping template missing', () => undefined);
    return;
  }

  it('rewrites LINK Excel paths and external rels to companion workbook basename', () => {
    const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));
    const before = zip.file('word/document.xml')!.asText();
    expect(before).toMatch(/GLAMPING FS TEMPLATE/i);

    const stats = retargetLinkedExcelWorkbook(zip, 'template.xlsx');
    expect(stats.instrTextUpdated).toBeGreaterThan(0);

    const after = zip.file('word/document.xml')!.asText();
    expect(after).toMatch(/"template\.xlsx!10 yr PF!/);
    expect(after).not.toMatch(/GLAMPING FS TEMPLATE 1-15-25\.xlsx!/);

    const rels = zip.file('word/_rels/document.xml.rels')!.asText();
    expect(rels).toMatch(/template\.xlsx!/);
  });

  it('inserts cyan author notes above linked Excel objects', () => {
    const zip = new PizZip(fs.readFileSync(templatePath, 'binary'));
    retargetLinkedExcelWorkbook(zip, 'template.xlsx');
    const notes = annotateLinkedExcelTables(zip, 'template.xlsx');
    expect(notes).toBeGreaterThan(5);

    const xml = zip.file('word/document.xml')!.asText();
    expect(xml).toContain(AUTHOR_NOTE_MARKER);
    expect(xml).toContain('w:highlight w:val="cyan"');
    // Idempotent
    expect(annotateLinkedExcelTables(zip, 'template.xlsx')).toBe(0);
  });
});
