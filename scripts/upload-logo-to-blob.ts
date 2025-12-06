import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const logoPath = path.join(__dirname, '../public/sage-logo-black-header.png');
const outputDir = path.join(__dirname, '../public');

interface UploadResult {
  filename: string;
  localPath: string;
  blobPath: string;
  publicUrl: string;
  success: boolean;
  error?: string;
  optimizedSize?: number;
  originalSize?: number;
}

/**
 * Optimize and upload logo to Vercel Blob Storage
 */
async function optimizeAndUploadLogo(): Promise<UploadResult> {
  try {
    // Check if logo file exists
    if (!fs.existsSync(logoPath)) {
      return {
        filename: 'sage-logo-black-header.png',
        localPath: logoPath,
        blobPath: '',
        publicUrl: '',
        success: false,
        error: 'Logo file not found',
      };
    }

    // Get original file size
    const originalStats = fs.statSync(logoPath);
    const originalSize = originalStats.size;

    console.log(`📸 Original logo size: ${(originalSize / 1024).toFixed(2)} KB`);

    // Optimize the image
    // For logos, we'll keep PNG format but optimize it
    // Also create a WebP version for better compression
    const optimizedPngBuffer = await sharp(logoPath)
      .png({ 
        quality: 90,
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .resize(400, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .toBuffer();

    const optimizedWebPBuffer = await sharp(logoPath)
      .webp({ quality: 90 })
      .resize(400, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .toBuffer();

    const pngSize = optimizedPngBuffer.length;
    const webpSize = optimizedWebPBuffer.length;

    console.log(`📦 Optimized PNG size: ${(pngSize / 1024).toFixed(2)} KB`);
    console.log(`📦 Optimized WebP size: ${(webpSize / 1024).toFixed(2)} KB`);

    // Use WebP if it's smaller, otherwise use PNG
    const useWebP = webpSize < pngSize;
    const optimizedBuffer = useWebP ? optimizedWebPBuffer : optimizedPngBuffer;
    const extension = useWebP ? 'webp' : 'png';
    const contentType = useWebP ? 'image/webp' : 'image/png';
    const blobPath = `logos/sage-logo-black-header.${extension}`;

    console.log(`\n📤 Uploading optimized logo (${extension.toUpperCase()})...`);

    // Check for BLOB_READ_WRITE_TOKEN
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('❌ Missing BLOB_READ_WRITE_TOKEN environment variable');
      console.error('   Please set BLOB_READ_WRITE_TOKEN in .env.local');
      console.error('   Get your token from: https://vercel.com/dashboard/stores');
      process.exit(1);
    }

    // Upload to Vercel Blob Storage
    const blob = await put(blobPath, optimizedBuffer, {
      access: 'public',
      contentType,
    });

    const savings = ((originalSize - optimizedBuffer.length) / originalSize * 100).toFixed(1);

    console.log(`\n✅ Logo uploaded successfully!`);
    console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
    console.log(`   Optimized: ${(optimizedBuffer.length / 1024).toFixed(2)} KB (${extension.toUpperCase()})`);
    console.log(`   Savings: ${savings}%`);
    console.log(`   URL: ${blob.url}`);

    return {
      filename: `sage-logo-black-header.${extension}`,
      localPath: logoPath,
      blobPath,
      publicUrl: blob.url,
      success: true,
      optimizedSize: optimizedBuffer.length,
      originalSize,
    };
  } catch (error) {
    return {
      filename: 'sage-logo-black-header.png',
      localPath: logoPath,
      blobPath: '',
      publicUrl: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Optimizing and uploading logo to Vercel Blob Storage...\n');

  const result = await optimizeAndUploadLogo();

  if (result.success) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Upload Summary');
    console.log('='.repeat(60));
    console.log(`\n✅ Success!`);
    console.log(`\n📋 Logo Details:`);
    console.log(`  Filename: ${result.filename}`);
    console.log(`  Blob Path: ${result.blobPath}`);
    console.log(`  Public URL: ${result.publicUrl}`);
    console.log(`\n💡 Next step: Update FloatingHeader component to use this URL`);
    console.log(`   Replace: src="/sage-logo-black-header.png"`);
    console.log(`   With: src="${result.publicUrl}"`);
  } else {
    console.error(`\n❌ Upload failed: ${result.error}`);
    process.exit(1);
  }
}

main().catch(console.error);
