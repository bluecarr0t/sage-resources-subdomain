/**
 * Upload CCE PDFs to Vercel Blob Storage
 *
 * Usage: npx tsx scripts/upload-cce-pdfs-to-blob.ts
 *
 * Requires BLOB_READ_WRITE_TOKEN in .env.local
 */

import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const BLOB_PREFIX = 'cce-pdfs';

const PDFS = [
  'CCE_March_2026.pdf',
  'Walden_2025_Unique_Accommodation_Buyers_Guide_1.1 (2).pdf',
];

interface UploadResult {
  filename: string;
  localPath: string;
  blobPath: string;
  publicUrl: string;
  success: boolean;
  error?: string;
}

async function uploadPdf(filePath: string, filename: string): Promise<UploadResult> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const blobPath = `${BLOB_PREFIX}/${filename}`;

    console.log(`  📤 Uploading ${filename}...`);

    const blob = await put(blobPath, fileBuffer, {
      access: 'public',
      contentType: 'application/pdf',
      multipart: true, // Required for large files (137MB, 71MB)
    });

    return {
      filename,
      localPath: filePath,
      blobPath,
      publicUrl: blob.url,
      success: true,
    };
  } catch (error) {
    return {
      filename,
      localPath: filePath,
      blobPath: '',
      publicUrl: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log('🚀 Uploading CCE PDFs to Vercel Blob Storage...\n');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Missing BLOB_READ_WRITE_TOKEN environment variable');
    console.error('   Please set BLOB_READ_WRITE_TOKEN in .env.local');
    process.exit(1);
  }

  const localDataDir = path.join(__dirname, '../local_data');
  const results: UploadResult[] = [];

  for (const filename of PDFS) {
    const filePath = path.join(localDataDir, filename);

    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  Skipping ${filename} (not found at ${filePath})`);
      results.push({
        filename,
        localPath: filePath,
        blobPath: '',
        publicUrl: '',
        success: false,
        error: 'File not found',
      });
      continue;
    }

    const result = await uploadPdf(filePath, filename);
    results.push(result);

    if (result.success) {
      console.log(`  ✅ ${filename} → ${result.publicUrl}`);
    } else {
      console.log(`  ❌ ${filename}: ${result.error}`);
    }
  }

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log('\n' + '='.repeat(60));
  console.log('📊 Upload Summary');
  console.log('='.repeat(60));
  console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    console.log('\n📋 Uploaded PDFs:');
    successful.forEach((r) => {
      console.log(`  ${r.filename}`);
      console.log(`    URL: ${r.publicUrl}`);
    });
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
