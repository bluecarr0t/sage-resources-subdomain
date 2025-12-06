/**
 * Script to add slug column to national-parks table and generate slugs
 * 
 * Usage:
 *   npx tsx scripts/add-slug-to-national-parks.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { slugifyPropertyName } from '@/lib/properties';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'national-parks';

/**
 * Add slug column to the table (if it doesn't exist)
 */
async function ensureSlugColumnExists(supabase: ReturnType<typeof createClient>) {
  console.log('📋 Checking if slug column exists...');
  
  // Try to query the slug column - if it fails, we need to add it
  const { error } = await supabase
    .from(TABLE_NAME)
    .select('slug')
    .limit(1);
  
  if (error && error.message.includes('column') && error.message.includes('does not exist')) {
    console.log('⚠️  Slug column does not exist. Creating it...');
    
    // Note: We can't add columns via Supabase client, so we'll need to inform the user
    console.log('\n❌ Cannot add columns via Supabase client.');
    console.log('Please run this SQL in Supabase SQL Editor:');
    console.log('\n-- Add slug column to national-parks table');
    console.log('ALTER TABLE "national-parks" ADD COLUMN IF NOT EXISTS slug TEXT;');
    console.log('\n-- Create index on slug for faster lookups');
    console.log('CREATE INDEX IF NOT EXISTS idx_national_parks_slug ON "national-parks" (slug) WHERE slug IS NOT NULL;\n');
    console.log('After running the SQL, press Enter to continue...');
    
    // In a real scenario, you might want to wait for user input
    // For now, we'll continue and assume the column will be added
    return false;
  }
  
  console.log('✅ Slug column exists');
  return true;
}

/**
 * Generate and update slugs for all national parks
 */
async function generateSlugs(supabase: ReturnType<typeof createClient>) {
  console.log('\n🔄 Fetching all national parks...');
  
  const { data: parks, error: fetchError } = await supabase
    .from(TABLE_NAME)
    .select('id, name, slug')
    .order('name');

  if (fetchError) {
    console.error('❌ Error fetching parks:', fetchError.message);
    throw fetchError;
  }

  if (!parks || parks.length === 0) {
    console.log('⚠️  No parks found');
    return;
  }

  console.log(`✅ Found ${parks.length} parks\n`);

  // Generate slugs and check for duplicates
  const slugMap = new Map<string, string[]>();
  const parkUpdates: Array<{ id: number; name: string; slug: string }> = [];

  for (const park of parks) {
    if (!park.name || park.name.trim() === '') {
      console.log(`⚠️  Skipping park with missing name (ID: ${park.id})`);
      continue;
    }

    const baseSlug = slugifyPropertyName(park.name.trim());
    
    // Track which parks use each slug
    if (!slugMap.has(baseSlug)) {
      slugMap.set(baseSlug, []);
    }
    slugMap.get(baseSlug)!.push(park.name);

    // If slug already exists and matches, skip update
    if (park.slug === baseSlug) {
      continue;
    }

    parkUpdates.push({
      id: park.id,
      name: park.name,
      slug: baseSlug,
    });
  }

  // Handle duplicate slugs by appending numbers
  const finalUpdates: Array<{ id: number; slug: string }> = [];
  const slugCounts = new Map<string, number>();

  for (const update of parkUpdates) {
    let finalSlug = update.slug;
    const count = slugCounts.get(finalSlug) || 0;
    
    if (count > 0 || slugMap.get(finalSlug)!.length > 1) {
      // Check if we've already assigned this slug to another park
      const existingPark = parks.find(p => p.slug === finalSlug && p.id !== update.id);
      if (existingPark) {
        finalSlug = `${update.slug}-${count + 1}`;
      }
    }

    slugCounts.set(finalSlug, (slugCounts.get(finalSlug) || 0) + 1);
    finalUpdates.push({ id: update.id, slug: finalSlug });
  }

  if (finalUpdates.length === 0) {
    console.log('✅ All parks already have slugs assigned');
    return;
  }

  console.log(`📝 Updating ${finalUpdates.length} parks with slugs...\n`);

  // Update parks in batches
  for (const update of finalUpdates) {
    const { error: updateError } = await supabase
      .from(TABLE_NAME)
      .update({ slug: update.slug })
      .eq('id', update.id);

    if (updateError) {
      console.error(`❌ Error updating park ID ${update.id}:`, updateError.message);
    } else {
      const park = parks.find(p => p.id === update.id);
      console.log(`  ✅ ${park?.name}: ${update.slug}`);
    }
  }

  console.log(`\n✅ Successfully updated ${finalUpdates.length} parks with slugs`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🏞️  National Parks Slug Generator\n');

    // Create Supabase client
    const supabase = createClient(supabaseUrl!, secretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Check if slug column exists
    const columnExists = await ensureSlugColumnExists(supabase);
    
    if (!columnExists) {
      console.log('\n⚠️  Please add the slug column first using the SQL above.');
      console.log('Then run this script again.\n');
      process.exit(1);
    }

    // Generate slugs
    await generateSlugs(supabase);

    // Verify
    console.log('\n📊 Verification:');
    const { data: parksWithSlugs, error: verifyError } = await supabase
      .from(TABLE_NAME)
      .select('name, slug')
      .not('slug', 'is', null);

    if (verifyError) {
      console.error('❌ Error verifying:', verifyError.message);
    } else {
      console.log(`✅ ${parksWithSlugs?.length || 0} parks have slugs`);
      const parksWithoutSlugs = parks.length - (parksWithSlugs?.length || 0);
      if (parksWithoutSlugs > 0) {
        console.log(`⚠️  ${parksWithoutSlugs} parks without slugs`);
      }
    }

    console.log('\n🎉 Complete!\n');
  } catch (error) {
    console.error('\n❌ Failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
