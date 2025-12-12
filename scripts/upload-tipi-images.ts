import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const tipiImagesDir = path.join(__dirname, '../public/images/unit-types/tipi');
const BLOB_STORAGE_PATH = 'glamping-units/unit-types/tipi';

interface UploadResult {
  filename: string;
  localPath: string;
  blobPath: string;
  publicUrl: string;
  originalSize: number;
  optimizedSize: number;
  savings: string;
  success: boolean;
  error?: string;
}

/**
 * Optimize and upload a single tipi image to Vercel Blob Storage
 */
async function optimizeAndUploadImage(
  filePath: string,
  filename: string
): Promise<UploadResult> {
  try {
    const originalStats = fs.statSync(filePath);
    const originalSize = originalStats.size;

    console.log(`  📸 Processing ${filename}...`);

    // Optimize image with sharp
    const optimizedBuffer = await sharp(filePath)
      .resize(1920, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({
        quality: 85,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();

    const optimizedSize = optimizedBuffer.length;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

    const blobPath = `${BLOB_STORAGE_PATH}/${filename}`;

    console.log(`  📤 Uploading ${filename}...`);

    // Upload optimized image to Vercel Blob Storage
    const blob = await put(blobPath, optimizedBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    return {
      filename,
      localPath: filePath,
      blobPath,
      publicUrl: blob.url,
      originalSize,
      optimizedSize,
      savings: `${savings}%`,
      success: true,
    };
  } catch (error) {
    return {
      filename,
      localPath: filePath,
      blobPath: '',
      publicUrl: '',
      originalSize: 0,
      optimizedSize: 0,
      savings: '0%',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting tipi image optimization and upload to Vercel Blob Storage...\n');

  // Check for BLOB_READ_WRITE_TOKEN
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Missing BLOB_READ_WRITE_TOKEN environment variable');
    console.error('   Please set BLOB_READ_WRITE_TOKEN in .env.local');
    console.error('   Get your token from: https://vercel.com/dashboard/stores');
    process.exit(1);
  }

  // Check if directory exists
  if (!fs.existsSync(tipiImagesDir)) {
    console.error(`❌ Directory not found: ${tipiImagesDir}`);
    process.exit(1);
  }

  try {
    // Get all tipi image files
    const files = fs.readdirSync(tipiImagesDir).filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg'].includes(ext);
    });

    if (files.length === 0) {
      console.log('❌ No tipi images found');
      process.exit(1);
    }

    console.log(`📸 Found ${files.length} tipi image(s) to process\n`);

    // Process and upload all images
    const results: UploadResult[] = [];

    for (const filename of files) {
      const filePath = path.join(tipiImagesDir, filename);
      const result = await optimizeAndUploadImage(filePath, filename);
      results.push(result);

      if (result.success) {
        console.log(`  ✅ ${filename}`);
        console.log(`     Size: ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.optimizedSize / 1024).toFixed(1)}KB (${result.savings} reduction)`);
        console.log(`     URL: ${result.publicUrl}\n`);
      } else {
        console.log(`  ❌ ${filename}: ${result.error}\n`);
      }
    }

    // Summary
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    console.log('='.repeat(60));
    console.log('📊 Upload Summary');
    console.log('='.repeat(60));
    console.log(`\n✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (successful.length > 0) {
      const totalOriginal = successful.reduce((sum, r) => sum + r.originalSize, 0);
      const totalOptimized = successful.reduce((sum, r) => sum + r.optimizedSize, 0);
      const totalSavings = ((totalOriginal - totalOptimized) / totalOriginal * 100).toFixed(1);

      console.log(`\n📊 Total Size Reduction:`);
      console.log(`   Original: ${(totalOriginal / 1024).toFixed(1)} KB`);
      console.log(`   Optimized: ${(totalOptimized / 1024).toFixed(1)} KB`);
      console.log(`   Savings: ${totalSavings}%`);

      console.log('\n📋 Uploaded Images:');
      successful.forEach((result) => {
        console.log(`  ${result.filename}`);
        console.log(`    URL: ${result.publicUrl}`);
      });

      // Save URLs to a JSON file for easy reference
      const urlsPath = path.join(__dirname, '../scripts/tipi-image-urls.json');
      const urls = successful.map(r => ({
        filename: r.filename,
        url: r.publicUrl
      }));
      fs.writeFileSync(urlsPath, JSON.stringify(urls, null, 2));
      console.log(`\n💾 Image URLs saved to: ${urlsPath}`);
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
