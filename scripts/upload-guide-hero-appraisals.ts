/**
 * Optimize and upload property appraisals guide hero to Vercel Blob.
 * Run: npx tsx scripts/upload-guide-hero-appraisals.ts [source-image-path]
 */

import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const DEFAULT_SOURCE = path.join(
  __dirname,
  '../public/images/guides/property-appraisals-complete-guide-hero-source.jpg'
);
const OUTPUT_DIR = path.join(__dirname, '../public/images/guides');
const WEBP_NAME = 'property-appraisals-complete-guide-hero.webp';
const BLOB_PATH = `guides/${WEBP_NAME}`;

async function main() {
  const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SOURCE;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Missing BLOB_READ_WRITE_TOKEN in .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(sourcePath)) {
    console.error(`Source image not found: ${sourcePath}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const webpPath = path.join(OUTPUT_DIR, WEBP_NAME);

  const meta = await sharp(sourcePath).metadata();
  console.log(`Source: ${meta.width}x${meta.height}, ${(fs.statSync(sourcePath).size / 1024).toFixed(1)} KB`);

  let pipeline = sharp(sourcePath).rotate();

  if ((meta.width ?? 0) > 1920) {
    pipeline = pipeline.resize(1920, null, { withoutEnlargement: true, fit: 'inside' });
  }

  await pipeline
    .webp({ quality: 82, effort: 4 })
    .toFile(webpPath);

  const optimizedSize = fs.statSync(webpPath).size;
  console.log(`Optimized WebP: ${(optimizedSize / 1024).toFixed(1)} KB → ${webpPath}`);

  const buffer = fs.readFileSync(webpPath);
  const blob = await put(BLOB_PATH, buffer, {
    access: 'public',
    contentType: 'image/webp',
    allowOverwrite: true,
  });

  console.log('\nUploaded to Vercel Blob:');
  console.log(blob.url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
