import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const mappingPath = path.join(__dirname, 'image-url-mapping.json');
const projectRoot = path.join(__dirname, '..');

interface UrlMapping {
  [localPath: string]: string; // e.g., "/images/tipi.jpg" -> "https://..."
}

/**
 * Load URL mapping from JSON file
 */
function loadUrlMapping(): UrlMapping {
  if (!fs.existsSync(mappingPath)) {
    throw new Error(
      `URL mapping file not found: ${mappingPath}\nPlease run upload-images-to-supabase-storage.ts first.`
    );
  }

  const content = fs.readFileSync(mappingPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Find all files that might contain image references
 */
async function findFilesToUpdate(): Promise<string[]> {
  const patterns = [
    '**/*.ts',
    '**/*.tsx',
    '**/*.js',
    '**/*.jsx',
    '**/*.md',
  ];

  const excludePatterns = [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    'scripts/image-url-mapping.json',
    '**/package-lock.json',
  ];

  const allFiles: string[] = [];

  // Search for each pattern
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: projectRoot,
      ignore: excludePatterns,
      absolute: true,
    });
    allFiles.push(...files);
  }

  // Remove duplicates
  return [...new Set(allFiles)];
}

/**
 * Update image URLs in a file
 */
function updateFileUrls(filePath: string, mapping: UrlMapping): { updated: boolean; count: number } {
  let content = fs.readFileSync(filePath, 'utf-8');
  let updated = false;
  let count = 0;

  // Update each mapping
  Object.entries(mapping).forEach(([localPath, blobUrl]) => {
    // Match various patterns:
    // - "/images/filename.jpg"
    // - '/images/filename.jpg'
    // - src="/images/filename.jpg"
    // - src='/images/filename.jpg'
    // - url("/images/filename.jpg")
    // - url('/images/filename.jpg')
    // - href="/images/filename.jpg"
    
    const patterns = [
      new RegExp(`"${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
      new RegExp(`'${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
      new RegExp(`\`${localPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\``, 'g'),
    ];

    patterns.forEach((pattern) => {
      const matches = content.match(pattern);
      if (matches) {
        const replacement = content.replace(pattern, (match) => {
          // Preserve quotes
          if (match.startsWith('"')) return `"${blobUrl}"`;
          if (match.startsWith("'")) return `'${blobUrl}'`;
          if (match.startsWith('`')) return `\`${blobUrl}\``;
          return blobUrl;
        });
        if (replacement !== content) {
          content = replacement;
          updated = true;
          count += matches.length;
        }
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
  console.log('🔄 Updating image URLs to blob storage...\n');

  try {
    // Load mapping
    console.log('📖 Loading URL mapping...');
    const mapping = loadUrlMapping();
    console.log(`  ✅ Loaded ${Object.keys(mapping).length} image mappings\n`);

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
      const result = updateFileUrls(filePath, mapping);
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

    console.log('\n✅ All image URLs have been updated to blob storage!');
  } catch (error) {
    console.error('\n❌ Update failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main().catch(console.error);
