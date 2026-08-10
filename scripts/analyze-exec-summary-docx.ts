import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

const reportsDir = path.join(process.cwd(), 'reports');
const files = fs
  .readdirSync(reportsDir)
  .filter((f) => f.endsWith('-report.docx'))
  .map((f) => ({
    f,
    mtime: fs.statSync(path.join(reportsDir, f)).mtimeMs,
  }))
  .sort((a, b) => b.mtime - a.mtime);

if (!files.length) {
  console.error('No report docx found');
  process.exit(1);
}

const docxPath = path.join(reportsDir, files[0].f);
console.log('Analyzing', docxPath);

const zip = new PizZip(fs.readFileSync(docxPath, 'binary'));
const xml = zip.file('word/document.xml')!.asText();

const paras = [...xml.matchAll(/<w:p[\s>][\s\S]*?<\/w:p>/g)].map((m) => m[0]);
let inExec = false;
const lines: string[] = [];
for (const p of paras) {
  const plain = [...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((x) => x[1])
    .join('');
  const isH1 = /w:pStyle\s+w:val="Heading1"/.test(p);
  const hasLink = /instrText/.test(p);
  if (isH1 && plain.includes('Executive Summary') && !/<w:hyperlink\b/.test(p)) {
    inExec = true;
    lines.push('>>> ' + plain);
    continue;
  }
  if (inExec) {
    if (isH1) {
      lines.push('<<< ' + plain);
      break;
    }
    if (plain.trim()) {
      lines.push(`${hasLink ? 'LINK ' : ''}${plain.replace(/\s+/g, ' ').trim()}`);
    }
  }
}

console.log('\n========== EXECUTIVE SUMMARY ==========\n');
console.log(lines.join('\n'));
console.log('\n========== CHECKS ==========');
const body = lines.join('\n');
console.log({
  hasProjectOverviewLabel: body.includes('Project Overview:'),
  hasDemandLabel: body.includes('Overall Demand Indicators:'),
  hasNpsTable: body.includes('Combined NPS Visitation'),
  hasProFormaLabel: body.includes('10 Year Pro Forma'),
  hasFeasibilityLabel: body.includes('Feasibility Conclusion'),
  hasRemnant37Acres: body.includes('37.0 acres'),
  hasRemnant5Rv: body.includes('5 RV sites'),
  hasRemnantCabins: body.includes('3 one-bedroom cabins'),
  hasOleLinks: body.includes('LINK '),
  hasPeninsula: /Peninsula|Ohio|OH|Nordic|Heritage/i.test(body),
  hasVictorMt: /Victor|Montana|Ravalli/i.test(body),
  charCount: body.length,
});
