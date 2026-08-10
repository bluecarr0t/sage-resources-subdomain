/**
 * TOC hyperlink bookmarks must point at real Heading1/2 targets.
 */

import PizZip from 'pizzip';
import { repairTocHeadingBookmarks } from '@/lib/ai-report-builder/assemble-docx';

function minimalDoc(bodyInner: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:body>${bodyInner}</w:body></w:document>`
  );
}

describe('repairTocHeadingBookmarks', () => {
  it('recreates a missing Area Analysis TOC bookmark on the Heading1', () => {
    const tocEntry =
      `<w:p><w:hyperlink w:anchor="_Toc999" w:history="1">` +
      `<w:r><w:t>Area Analysis</w:t></w:r>` +
      `<w:r><w:rPr><w:webHidden/></w:rPr><w:instrText> PAGEREF _Toc999 \\h </w:instrText></w:r>` +
      `</w:hyperlink></w:p>`;
    const wrong =
      `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>` +
      `<w:bookmarkStart w:id="1" w:name="_Toc999"/>` +
      `<w:r><w:t>U.S. Domestic Tourism</w:t></w:r>` +
      `<w:bookmarkEnd w:id="1"/></w:p>`;
    const area =
      `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>` +
      `<w:r><w:t>Area Analysis</w:t></w:r></w:p>`;

    const zip = new PizZip();
    zip.file(
      'word/document.xml',
      minimalDoc(`${tocEntry}${wrong}${area}<w:sectPr/>`)
    );

    const repaired = repairTocHeadingBookmarks(zip);
    expect(repaired).toBeGreaterThanOrEqual(1);

    const xml = zip.file('word/document.xml')!.asText();
    // Bookmark must be inside the Heading1 Area Analysis paragraph
    const headingMatch = xml.match(
      /<w:p>[\s\S]*?w:val="Heading1"[\s\S]*?Area Analysis[\s\S]*?<\/w:p>/
    );
    expect(headingMatch?.[0] ?? '').toContain('w:name="_Toc999"');
    expect(headingMatch?.[0] ?? '').toContain('bookmarkEnd');
  });

  it('is a no-op when the TOC bookmark already wraps the correct heading', () => {
    const tocEntry =
      `<w:p><w:hyperlink w:anchor="_Toc111" w:history="1">` +
      `<w:r><w:t>Site Analysis</w:t></w:r></w:hyperlink></w:p>`;
    const site =
      `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr>` +
      `<w:bookmarkStart w:id="9" w:name="_Toc111"/>` +
      `<w:r><w:t>Site Analysis</w:t></w:r>` +
      `<w:bookmarkEnd w:id="9"/></w:p>`;
    const zip = new PizZip();
    zip.file('word/document.xml', minimalDoc(`${tocEntry}${site}<w:sectPr/>`));
    expect(repairTocHeadingBookmarks(zip)).toBe(0);
  });
});
