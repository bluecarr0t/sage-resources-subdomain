import { put } from '@vercel/blob';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const imagePath = path.join(__dirname, '../public/images/unit-types/yurt/yurt-2.png');
const BLOB_STORAGE_PATH = 'glamping-units/unit-types/yurt';

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
 * Optimize and upload yurt-2.png to Vercel Blob Storage
 */
async function optimizeAndUploadImage(): Promise<UploadResult> {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`File not found: ${imagePath}`);
    }

    const originalStats = fs.statSync(imagePath);
    const originalSize = originalStats.size;

    console.log(`📸 Processing yurt-2.png...`);
    console.log(`   Original size: ${(originalSize / 1024).toFixed(1)} KB`);

    // Optimize image with sharp
    // Convert PNG to JPEG for better compression, or optimize PNG if needed
    const metadata = await sharp(imagePath).metadata();
    const isPng = metadata.format === 'png';
    
    let optimizedBuffer: Buffer;
    let contentType: string;
    let outputFilename: string;

    if (isPng) {
      // For PNG, we can optimize it or convert to JPEG
      // Check if it has transparency
      if (metadata.hasAlpha) {
        // Keep as PNG but optimize
        optimizedBuffer = await sharp(imagePath)
          .resize(1920, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .png({
            quality: 90,
            compressionLevel: 9
          })
          .toBuffer();
        contentType = 'image/png';
        outputFilename = 'yurt-2.png';
      } else {
        // Convert to JPEG for better compression
        optimizedBuffer = await sharp(imagePath)
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
        contentType = 'image/jpeg';
        outputFilename = 'yurt-2.jpg';
      }
    } else {
      // Already JPEG or other format
      optimizedBuffer = await sharp(imagePath)
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
      contentType = 'image/jpeg';
      outputFilename = 'yurt-2.jpg';
    }

    const optimizedSize = optimizedBuffer.length;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);

    const blobPath = `${BLOB_STORAGE_PATH}/${outputFilename}`;

    console.log(`📤 Uploading ${outputFilename}...`);

    // Upload optimized image to Vercel Blob Storage
    const blob = await put(blobPath, optimizedBuffer, {
      access: 'public',
      contentType,
    });

    console.log(`✅ Upload successful!`);
    console.log(`   Optimized size: ${(optimizedSize / 1024).toFixed(1)} KB`);
    console.log(`   Savings: ${savings}%`);
    console.log(`   URL: ${blob.url}`);

    return {
      filename: outputFilename,
      localPath: imagePath,
      blobPath,
      publicUrl: blob.url,
      originalSize,
      optimizedSize,
      savings: `${savings}%`,
      success: true,
    };
  } catch (error) {
    return {
      filename: 'yurt-2.png',
      localPath: imagePath,
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
  console.log('🚀 Starting yurt image optimization and upload to Vercel Blob Storage...\n');

  // Check for BLOB_READ_WRITE_TOKEN
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ Missing BLOB_READ_WRITE_TOKEN environment variable');
    console.error('   Please set BLOB_READ_WRITE_TOKEN in .env.local');
    console.error('   Get your token from: https://vercel.com/dashboard/stores');
    process.exit(1);
  }

  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ File not found: ${imagePath}`);
    process.exit(1);
  }

  try {
    const result = await optimizeAndUploadImage();

    if (result.success) {
      console.log('\n' + '='.repeat(60));
      console.log('📊 Upload Summary');
      console.log('='.repeat(60));
      console.log(`\n✅ Successfully uploaded: ${result.filename}`);
      console.log(`   Original: ${(result.originalSize / 1024).toFixed(1)} KB`);
      console.log(`   Optimized: ${(result.optimizedSize / 1024).toFixed(1)} KB`);
      console.log(`   Savings: ${result.savings}`);
      console.log(`\n📋 Image URL:`);
      console.log(`   ${result.publicUrl}`);
      
      // Save URL to a JSON file for easy reference
      const urlsPath = path.join(__dirname, '../scripts/yurt-image-url.json');
      fs.writeFileSync(urlsPath, JSON.stringify({
        filename: result.filename,
        url: result.publicUrl
      }, null, 2));
      console.log(`\n💾 Image URL saved to: ${urlsPath}`);
    } else {
      console.error(`\n❌ Upload failed: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Upload failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main().catch(console.error);
