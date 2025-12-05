/**
 * Check for slugs with special/non-ASCII characters
 * Run with: npx tsx scripts/check-slugs-for-special-characters.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Check if a slug contains only valid characters (a-z, 0-9, hyphens)
 */
function isValidSlug(slug: string): boolean {
  // Valid slug should only contain lowercase letters, numbers, and hyphens
  return /^[a-z0-9-]+$/.test(slug);
}

/**
 * Extract special characters from a slug
 */
function getSpecialCharacters(slug: string): string {
  // Return all characters that are NOT a-z, 0-9, or hyphen
  return slug.replace(/[a-z0-9-]/g, '');
}

/**
 * Find unique characters in a string
 */
function getUniqueCharacters(str: string): string[] {
  return Array.from(new Set(str.split(''))).sort();
}

async function checkSlugsForSpecialCharacters() {
  console.log('🔍 Checking for slugs with special/non-ASCII characters...\n');

  try {
    // Fetch all slugs
    const { data: properties, error } = await supabase
      .from('sage-glamping-data')
      .select('property_name, slug')
      .not('slug', 'is', null)
      .neq('slug', '')
      .not('property_name', 'is', null)
      .limit(10000);

    if (error) {
      throw error;
    }

    if (!properties || properties.length === 0) {
      console.log('No properties found.');
      return;
    }

    console.log(`Found ${properties.length} properties with slugs\n`);

    // Check each slug
    const problematicSlugs = new Map<string, {
      property_name: string;
      slug: string;
      special_chars: string[];
      record_count: number;
    }>();

    for (const prop of properties) {
      if (!prop.slug) continue;

      const slug = prop.slug.trim();
      
      if (!isValidSlug(slug)) {
        const specialChars = getUniqueCharacters(getSpecialCharacters(slug));
        
        if (!problematicSlugs.has(slug)) {
          problematicSlugs.set(slug, {
            property_name: prop.property_name || '',
            slug: slug,
            special_chars: specialChars,
            record_count: 1
          });
        } else {
          const existing = problematicSlugs.get(slug)!;
          existing.record_count++;
        }
      }
    }

    // Report results
    console.log('=' .repeat(80));
    console.log('SLUG VALIDATION REPORT');
    console.log('=' .repeat(80));
    console.log(`\nTotal properties checked: ${properties.length}`);
    console.log(`Properties with valid slugs: ${properties.length - problematicSlugs.size}`);
    console.log(`Properties with problematic slugs: ${problematicSlugs.size}\n`);

    if (problematicSlugs.size > 0) {
      console.log('⚠️  PROBLEMATIC SLUGS FOUND:\n');
      console.log('-'.repeat(80));

      // Get all unique special characters found
      const allSpecialChars = new Set<string>();
      problematicSlugs.forEach(info => {
        info.special_chars.forEach(char => allSpecialChars.add(char));
      });

      console.log(`\nUnique special characters found: ${Array.from(allSpecialChars).sort().join(', ')}\n`);

      // Show problematic slugs grouped by special characters
      const slugsByChar = new Map<string, typeof problematicSlugs>();
      
      problematicSlugs.forEach((info, slug) => {
        info.special_chars.forEach(char => {
          if (!slugsByChar.has(char)) {
            slugsByChar.set(char, new Map());
          }
          slugsByChar.get(char)!.set(slug, info);
        });
      });

      // Show top 20 most common problematic slugs
      const sortedSlugs = Array.from(problematicSlugs.values())
        .sort((a, b) => b.record_count - a.record_count)
        .slice(0, 20);

      console.log('TOP 20 PROBLEMATIC SLUGS (by record count):\n');
      sortedSlugs.forEach((info, index) => {
        console.log(`${index + 1}. Property: ${info.property_name}`);
        console.log(`   Slug: ${info.slug}`);
        console.log(`   Special chars: ${info.special_chars.join(', ')}`);
        console.log(`   Records: ${info.record_count}`);
        console.log('');
      });

      // Show breakdown by special character
      console.log('\nBREAKDOWN BY SPECIAL CHARACTER:\n');
      Array.from(slugsByChar.entries())
        .sort((a, b) => b[1].size - a[1].size)
        .forEach(([char, slugs]) => {
          console.log(`  "${char}" (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}): ${slugs.size} slugs`);
          // Show first 3 examples
          const examples = Array.from(slugs.values()).slice(0, 3);
          examples.forEach(info => {
            console.log(`    - ${info.slug}`);
          });
          if (slugs.size > 3) {
            console.log(`    ... and ${slugs.size - 3} more`);
          }
          console.log('');
        });

      console.log('\n💡 RECOMMENDATION:');
      console.log('   Run the generate-slugs-from-property-name.sql script to regenerate all slugs');
      console.log('   with proper transliteration of accented characters.\n');
    } else {
      console.log('✅ All slugs are valid! No special characters found.\n');
    }

    console.log('=' .repeat(80));

  } catch (error) {
    console.error('Error checking slugs:', error);
    process.exit(1);
  }
}

// Run the check
checkSlugsForSpecialCharacters().catch(console.error);
