/**
 * One-time / CI: builds templates/market-report/template.docx from feasibility-draft
 * by replacing word/document.xml with a minimal docxtemplater-friendly body.
 *
 * Run: npx tsx scripts/create-market-report-template.ts
 */
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';

const root = process.cwd();
const draftPath = path.join(root, 'templates/feasibility-draft.docx');
const outPath = path.join(root, 'templates/market-report/template.docx');

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Market Report</w:t></w:r></w:p>
    <w:p><w:r><w:t>{addressLine}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Radius: {radiusMiles} mi · {segment_label}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Generated: {generatedAt}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Properties in radius: {propertyCount}</w:t></w:r></w:p>
    <w:p><w:r><w:t>Map pins in export: {mapPinsShown} of {mapPinsTotal} (truncated: {mapPinsTruncated_label})</w:t></w:r></w:p>
    <w:p><w:r><w:t>Fetch possibly incomplete: {fetchPossiblyIncomplete_label}</w:t></w:r></w:p>
    <w:p><w:r><w:t></w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Market summary</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#summaryLines}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/summaryLines}</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Sources</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#sourceLines}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/sourceLines}</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>By listing partner</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#sourceBreakdownLines}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/sourceBreakdownLines}</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Top states</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#stateLines}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/stateLines}</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Property analysis</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#propertyIntro}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/propertyIntro}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#propertySampleLines}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/propertySampleLines}</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Rate analysis</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#rateLines}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/rateLines}</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Amenity analysis</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#amenityLines}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/amenityLines}</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Site / unit analysis</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#siteLines}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/siteLines}</w:t></w:r></w:p>

    <w:p><w:r><w:rPr><w:b/><w:sz w:val="26"/></w:rPr><w:t>Map pins (sample)</w:t></w:r></w:p>
    <w:p><w:r><w:t>{#mapPinLines}</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">{.}</w:t></w:r></w:p>
    <w:p><w:r><w:t>{/mapPinLines}</w:t></w:r></w:p>

    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

function main() {
  if (!fs.existsSync(draftPath)) {
    console.error('Missing', draftPath);
    process.exit(1);
  }
  const buf = fs.readFileSync(draftPath);
  const zip = new PizZip(buf);
  zip.file('word/document.xml', documentXml);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log('Wrote', outPath);
}

main();
