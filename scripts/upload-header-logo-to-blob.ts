/**
 * Upload header nav logo to Vercel Blob Storage.
 * Run: npx tsx scripts/upload-header-logo-to-blob.ts
 *
 * Requires BLOB_READ_WRITE_TOKEN in .env.local
 */

import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const LOCAL_PATH = path.join(__dirname, '../public/logos/sage-logo-header-nav.png');
const BLOB_PATH = 'logos/sage-logo-header-nav.png';

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Missing BLOB_READ_WRITE_TOKEN in .env.local');
    process.exit(1);
  }

  if (!fs.existsSync(LOCAL_PATH)) {
    console.error(`File not found: ${LOCAL_PATH}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(LOCAL_PATH);
  const blob = await put(BLOB_PATH, buffer, {
    access: 'public',
    contentType: 'image/png',
    allowOverwrite: true,
  });

  console.log('Uploaded header logo:');
  console.log(blob.url);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
