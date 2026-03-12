/**
 * Creates a minimal DOCX template for the AI Report Builder.
 * Run: npx tsx scripts/create-feasibility-draft-template.ts
 *
 * Output: templates/feasibility-draft.docx
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
`;

// Document body with docxtemplater placeholders
const DOCUMENT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:jc w:val="center"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>{property_name} Feasibility Study</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{location}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Prepared for: {client_entity}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Report Date: {report_date}</w:t></w:r>
    </w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>Executive Summary</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>{executive_summary}</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t></w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

function main() {
  const zip = new PizZip();

  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.file('_rels/.rels', RELS);
  zip.file('word/_rels/document.xml.rels', DOC_RELS);
  zip.file('word/document.xml', DOCUMENT);

  const buf = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  const outDir = path.join(process.cwd(), 'templates');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'feasibility-draft.docx');
  fs.writeFileSync(outPath, buf);
  console.log(`Created ${outPath}`);
}

main();
