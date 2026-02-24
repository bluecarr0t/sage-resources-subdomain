/**
 * Upload admin sidebar logos (light + dark mode) to Vercel Blob Storage.
 * Run: npx tsx scripts/upload-admin-logos-to-blob.ts
 *
 * Requires BLOB_READ_WRITE_TOKEN in .env.local
 * Logo URLs are stored in AdminSidebar.tsx - update them if you use a different blob store.
 */

import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const BLOB_PREFIX = 'admin-logos';

const LOGOS = [
  {
    localPath: path.join(__dirname, '../public/logos/sage-logo-light.png'),
    blobPath: `${BLOB_PREFIX}/sage-logo-light.png`,
    label: 'Light mode (white background, dark text)',
  },
  {
    localPath: path.join(__dirname, '../public/logos/sage-logo-dark.png'),
    blobPath: `${BLOB_PREFIX}/sage-logo-dark.png`,
    label: 'Dark mode (black background, white text)',
  },
];

async function main() {
  console.log('🚀 Uploading admin sidebar logos to Vercel Blob Storage...\n');

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Missing BLOB_READ_WRITE_TOKEN in .env.local');
    console.error('   Get your token from: https://vercel.com/dashboard/stores');
    process.exit(1);
  }

  const results: { label: string; url: string; success: boolean; error?: string }[] = [];

  for (const logo of LOGOS) {
    try {
      if (!fs.existsSync(logo.localPath)) {
        results.push({ label: logo.label, url: '', success: false, error: `File not found: ${logo.localPath}` });
        continue;
      }

      const buffer = fs.readFileSync(logo.localPath);
      const blob = await put(logo.blobPath, buffer, {
        access: 'public',
        contentType: 'image/png',
      });

      console.log(`✅ ${logo.label}`);
      console.log(`   URL: ${blob.url}\n`);
      results.push({ label: logo.label, url: blob.url, success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ ${logo.label}: ${msg}\n`);
      results.push({ label: logo.label, url: '', success: false, error: msg });
    }
  }

  const lightResult = results.find((r) => r.label.includes('Light'));
  const darkResult = results.find((r) => r.label.includes('Dark'));

  if (lightResult?.success && darkResult?.success) {
    console.log('='.repeat(60));
    console.log('✅ Logos uploaded. URLs are stored in AdminSidebar.tsx');
    console.log('='.repeat(60));

    // Save URLs to a JSON file for reference
    const urlsPath = path.join(__dirname, 'admin-logo-urls.json');
    fs.writeFileSync(
      urlsPath,
      JSON.stringify(
        {
          light: lightResult.url,
          dark: darkResult.url,
        },
        null,
        2
      )
    );
    console.log(`\n💾 URLs saved to: ${urlsPath}`);
  } else {
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      console.error('\n❌ Some uploads failed. Fix errors above and re-run.');
      process.exit(1);
    }
  }
}

main().catch(console.error);
