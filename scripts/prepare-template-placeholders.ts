/**
 * Prepare DOCX template with Docxtemplater placeholders.
 *
 * Reads a .docx file, finds project-specific text in the XML, and replaces
 * it with {placeholder} tags that Docxtemplater can render.
 *
 * Usage:
 *   npx tsx scripts/prepare-template-placeholders.ts glamping
 *   npx tsx scripts/prepare-template-placeholders.ts rv
 *
 * After running, upload the updated template:
 *   npx tsx scripts/upload-report-templates.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import PizZip from 'pizzip';

const GLAMPING_REPLACEMENTS: Array<[string | RegExp, string]> = [
  // Cover page
  ['Glamping Resort', '{property_name}'],
  ['TVA Road', '{address_1}'],
  [/Jasper,\s*TN\s*37347/g, '{city}, {state} {zip_code}'],
  ['Parcel Number 144 009.00', 'Parcel Number {parcel_number}'],

  // Letter of Transmittal
  ['February 18, 2024', '{report_date}'],
  ['Mr. Amir Peleg', '{client_contact_name}'],
  ['Nickajack, LLC', '{client_entity}'],
  ['4157 Rovelo Way', '{client_address}'],
  ['Buford, GA 30519', '{client_city_state_zip}'],
  ['TBD-Nickajack Shores Resort', '{property_name}'],
  ['24-109A-01', '{study_id}'],
  ['Mr. Peleg', '{client_salutation}'],
  ['Amir Peleg', '{client_contact_name}'],

  // Acreage & site counts
  ['approximately 47 acres', 'approximately {acres} acres'],
  ['47 acres', '{acres} acres'],
  ['51 glamping sites', '{total_sites} glamping sites'],

  // Amenities (keep as placeholder for customization)
  [
    'an event area with a bar, a self-checkout coffee shop, a stage, a business center, hiking trails, golf cart paths, and a spa area with a hot tub / dipping pool / sauna',
    '{amenities_description}',
  ],
  [
    'heated pool, lodge building, and a central fire pit area',
    '{amenities_description}',
  ],
];

const RV_REPLACEMENTS: Array<[string | RegExp, string]> = [
  // Cover page
  ['RV Resort Template', '{property_name}'],
  ['RV Resort', '{property_name}'],
  ['3455 Coastal Hwy', '{address_1}'],
  [/St\.\s*Augustine,\s*FL\s*32084/g, '{city}, {state} {zip_code}'],
  ['Parcel Number 144 009.00', 'Parcel Number {parcel_number}'],

  // Letter of Transmittal
  ['August 4, 2023', '{report_date}'],
  ['Mr. Wallace R. Devlin', '{client_contact_name}'],
  ['Rimrock Devlin Beachcomber, LLC', '{client_entity}'],
  ['343 NW Cole Terrace, Suite 201', '{client_address}'],
  ['Lake City, FL 32055', '{client_city_state_zip}'],
  ['Ocean Club Luxury RV Destination', '{property_name}'],
  ['23-196A-06', '{study_id}'],
  ['Mr. Devlin', '{client_salutation}'],
  ['Wallace R. Devlin', '{client_contact_name}'],

  // Acreage & site counts
  ['approximately 43.86 acres', 'approximately {acres} acres'],
  ['43.86 acres', '{acres} acres'],
  ['170 RV sites', '{total_sites} RV sites'],
  ['30 one-bedroom cabins', '{cabin_count} one-bedroom cabins'],

  // Amenities
  [
    'a clubhouse, general store, and a pool',
    '{amenities_description}',
  ],
];

function replaceInXml(xml: string, replacements: Array<[string | RegExp, string]>): string {
  let result = xml;
  for (const [search, replace] of replacements) {
    if (search instanceof RegExp) {
      result = result.replace(search, replace);
    } else {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), replace);
    }
  }
  return result;
}

function processTemplate(templateKey: string) {
  const replacements = templateKey === 'glamping' ? GLAMPING_REPLACEMENTS : RV_REPLACEMENTS;
  const templateDir = path.join(process.cwd(), 'templates', templateKey);
  const inputPath = path.join(templateDir, 'template.docx');
  const outputPath = path.join(templateDir, 'template.docx');

  if (!fs.existsSync(inputPath)) {
    console.error(`Template not found: ${inputPath}`);
    process.exit(1);
  }

  const buf = fs.readFileSync(inputPath);
  const zip = new PizZip(buf);

  const xmlFiles = ['word/document.xml', 'word/header1.xml', 'word/header2.xml', 'word/footer1.xml'];

  let totalReplacements = 0;
  for (const xmlFile of xmlFiles) {
    const file = zip.file(xmlFile);
    if (!file) continue;

    const original = file.asText();
    const modified = replaceInXml(original, replacements);

    if (original !== modified) {
      zip.file(xmlFile, modified);
      const diffCount = original.split('').filter((c, i) => c !== modified[i]).length;
      console.log(`  Modified: ${xmlFile}`);
      totalReplacements++;
    }
  }

  const outBuf = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  fs.writeFileSync(outputPath, outBuf);
  console.log(`\nWrote ${outputPath} (${totalReplacements} files modified)`);
  console.log('Run: npx tsx scripts/upload-report-templates.ts to upload to Supabase');
}

const key = process.argv[2];
if (!key || !['rv', 'glamping'].includes(key)) {
  console.error('Usage: npx tsx scripts/prepare-template-placeholders.ts <rv|glamping>');
  process.exit(1);
}

processTemplate(key);
