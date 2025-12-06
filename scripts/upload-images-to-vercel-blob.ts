import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const BLOB_STORAGE_URL = 'https://b0evzueuuq9l227n.public.blob.vercel-storage.com';
const imagesDir = path.join(__dirname, '../public/images');

interface UploadResult {
  filename: string;
  localPath: string;
  blobPath: string;
  publicUrl: string;
  success: boolean;
  error?: string;
}

/**
 * Upload a single image to Vercel Blob Storage
 */
async function uploadImage(
  filePath: string,
  filename: string
): Promise<UploadResult> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const blobPath = `glamping-units/${filename}`;

    console.log(`  📤 Uploading ${filename}...`);

    // Upload file to Vercel Blob Storage
    const blob = await put(blobPath, fileBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
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

/**
 * Get all image files from directory
 */
function getImageFiles(): string[] {
  const files = fs.readdirSync(imagesDir).filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
  });

  return files;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting image upload to Vercel Blob Storage...\n');

  // Check for BLOB_READ_WRITE_TOKEN
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Missing BLOB_READ_WRITE_TOKEN environment variable');
    console.error('   Please set BLOB_READ_WRITE_TOKEN in .env.local');
    console.error('   Get your token from: https://vercel.com/dashboard/stores');
    process.exit(1);
  }

  try {
    // Get all image files
    const imageFiles = getImageFiles();

    if (imageFiles.length === 0) {
      console.log('❌ No images found in public/images directory');
      process.exit(1);
    }

    console.log(`📸 Found ${imageFiles.length} image(s) to upload\n`);

    // Upload all images
    const results: UploadResult[] = [];

    for (const filename of imageFiles) {
      const filePath = path.join(imagesDir, filename);
      const result = await uploadImage(filePath, filename);
      results.push(result);

      if (result.success) {
        console.log(`  ✅ ${filename} → ${result.publicUrl}`);
      } else {
        console.log(`  ❌ ${filename}: ${result.error}`);
      }
    }

    // Summary
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Upload Summary');
    console.log('='.repeat(60));
    console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (successful.length > 0) {
      console.log('\n📋 Uploaded Images:');
      successful.forEach((result) => {
        console.log(`  ${result.filename}`);
        console.log(`    URL: ${result.publicUrl}`);
      });

      // Save mapping to file for URL updates
      const mappingPath = path.join(__dirname, '../scripts/image-url-mapping.json');
      const mapping: Record<string, string> = {};
      successful.forEach((result) => {
        mapping[`/images/${result.filename}`] = result.publicUrl;
      });

      fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
      console.log(`\n💾 URL mapping saved to: ${mappingPath}`);
      console.log('\n📝 Next step: Run the update-image-urls script to update all URLs in the codebase');
    }

    if (failed.length > 0) {
      console.log('\n❌ Failed Uploads:');
      failed.forEach((result) => {
        console.log(`  ${result.filename}: ${result.error}`);
      });
    }
  } catch (error) {
    console.error('\n❌ Upload failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main().catch(console.error);
