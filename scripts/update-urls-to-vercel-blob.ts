import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const BLOB_STORAGE_BASE_URL = 'https://b0evzueuuq9l227n.public.blob.vercel-storage.com';
const projectRoot = path.join(__dirname, '..');

/**
 * Find all files that might contain image references
 */
async function findFilesToUpdate(): Promise<string[]> {
  const patterns = [
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
  ];

  const excludePatterns = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    'scripts/image-url-mapping.json',
    'scripts/update-urls-to-vercel-blob.ts',
    'scripts/upload-images-to-vercel-blob.ts',
    'package-lock.json',
  ];

  const allFiles: string[] = [];

  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: projectRoot,
      ignore: excludePatterns,
      absolute: true,
    });
    allFiles.push(...files);
  }

  return [...new Set(allFiles)];
}

/**
 * Generate Vercel Blob Storage URL from filename
 */
function getVercelBlobUrl(filename: string): string {
  return `${BLOB_STORAGE_BASE_URL}/glamping-units/${filename}`;
}

/**
 * Update image URLs in a file
 */
function updateFileUrls(filePath: string): { updated: boolean; count: number } {
  let content = fs.readFileSync(filePath, 'utf-8');
  let updated = false;
  let count = 0;

  // List of image filenames
  const imageFiles = [
    'a-frame-cabin-1.jpg',
    'a-frame-cabin-2.jpg',
    'a-frame-cabin.jpg',
    'bell-tent.jpg',
    'blurred-image.jpg',
    'blurry-image.jpg',
    'bubble-tent.jpg',
    'cabin-1.jpg',
    'cabin.jpg',
    'canvas-tent-1.jpg',
    'canvas-tent.jpg',
    'forest-scene.jpg',
    'geodesic-dome.jpg',
    'mountain-view.jpg',
    'safari-tent-1.jpg',
    'safari-tent.jpg',
    'solid-color.jpg',
    'tipi.jpg',
    'tipis.jpg',
    'treehouse.jpg',
    'yurt-1.jpg',
    'yurt.jpg',
    'yurts.jpg',
  ];

  // Replace Supabase URLs with Vercel Blob URLs
  imageFiles.forEach((filename) => {
    const supabaseUrl = `https://mdlniwrgrszdhzwxjdal.supabase.co/storage/v1/object/public/images/glamping-units/${filename}`;
    const vercelBlobUrl = getVercelBlobUrl(filename);

    // Replace in various quote styles
    const patterns = [
      new RegExp(supabaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    ];

    patterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, vercelBlobUrl);
        updated = true;
        count += matches.length;
      }
    });
  });

  if (updated) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { updated, count };
}

/**
 * Main function
 */
async function main() {
  console.log('🔄 Updating image URLs to Vercel Blob Storage...\n');
  console.log(`Base URL: ${BLOB_STORAGE_BASE_URL}\n`);

  try {
    // Find all files
    console.log('🔍 Finding files to update...');
    const files = await findFilesToUpdate();
    console.log(`  ✅ Found ${files.length} file(s) to check\n`);

    // Update files
    let totalUpdated = 0;
    let totalCount = 0;
    const updatedFiles: string[] = [];

    console.log('📝 Updating files...\n');

    files.forEach((filePath) => {
      const result = updateFileUrls(filePath);
      if (result.updated) {
        updatedFiles.push(path.relative(projectRoot, filePath));
        totalUpdated++;
        totalCount += result.count;
        console.log(`  ✅ ${path.relative(projectRoot, filePath)} (${result.count} replacement(s))`);
      }
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Update Summary');
    console.log('='.repeat(60));
    console.log(`\n✅ Files updated: ${totalUpdated}/${files.length}`);
    console.log(`🔄 Total replacements: ${totalCount}`);

    if (updatedFiles.length > 0) {
      console.log('\n📋 Updated Files:');
      updatedFiles.forEach((file) => {
        console.log(`  - ${file}`);
      });
    }

    console.log('\n✅ All image URLs have been updated to Vercel Blob Storage!');
  } catch (error) {
    console.error('\n❌ Update failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main().catch(console.error);
