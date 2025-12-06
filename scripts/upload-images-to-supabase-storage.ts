import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const BUCKET_NAME = 'images'; // Name of the storage bucket
const imagesDir = path.join(__dirname, '../public/images');

interface UploadResult {
  filename: string;
  localPath: string;
  storagePath: string;
  publicUrl: string;
  success: boolean;
  error?: string;
}

/**
 * Create Supabase client with admin access
 */
function getSupabaseClient() {
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Ensure storage bucket exists and is public
 */
async function ensureBucketExists(supabase: ReturnType<typeof createClient>) {
  console.log(`\n📦 Checking storage bucket '${BUCKET_NAME}'...`);

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Failed to list buckets: ${listError.message}`);
  }

  const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.log(`  ⚠️  Bucket '${BUCKET_NAME}' does not exist. Creating...`);

    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // Make bucket public so images are accessible
      fileSizeLimit: 52428800, // 50MB limit
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'],
    });

    if (error) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }

    console.log(`  ✅ Bucket '${BUCKET_NAME}' created successfully`);
  } else {
    console.log(`  ✅ Bucket '${BUCKET_NAME}' exists`);

    // Ensure bucket is public
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
      public: true,
    });

    if (updateError) {
      console.warn(`  ⚠️  Warning: Could not update bucket to public: ${updateError.message}`);
      console.warn(`  You may need to set bucket to public manually in Supabase Dashboard`);
    } else {
      console.log(`  ✅ Bucket is set to public`);
    }
  }
}

/**
 * Upload a single image to Supabase Storage
 */
async function uploadImage(
  supabase: ReturnType<typeof createClient>,
  filePath: string,
  filename: string
): Promise<UploadResult> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `glamping-units/${filename}`;

    console.log(`  📤 Uploading ${filename}...`);

    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true, // Overwrite if exists
      });

    if (error) {
      return {
        filename,
        localPath: filePath,
        storagePath,
        publicUrl: '',
        success: false,
        error: error.message,
      };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

    return {
      filename,
      localPath: filePath,
      storagePath,
      publicUrl,
      success: true,
    };
  } catch (error) {
    return {
      filename,
      localPath: filePath,
      storagePath: '',
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
  console.log('🚀 Starting image upload to Supabase Storage...\n');

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local');
    process.exit(1);
  }

  try {
    // Get Supabase client
    const supabase = getSupabaseClient();

    // Ensure bucket exists
    await ensureBucketExists(supabase);

    // Get all image files
    const imageFiles = getImageFiles();

    if (imageFiles.length === 0) {
      console.log('❌ No images found in public/images directory');
      process.exit(1);
    }

    console.log(`\n📸 Found ${imageFiles.length} image(s) to upload\n`);

    // Upload all images
    const results: UploadResult[] = [];

    for (const filename of imageFiles) {
      const filePath = path.join(imagesDir, filename);
      const result = await uploadImage(supabase, filePath, filename);
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
