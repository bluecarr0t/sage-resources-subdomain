import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Populate slug column in sage-glamping-data table
 * This script generates URL-safe slugs from property_name
 * All records with the same property_name get the same slug
 * Handles duplicate slugs by appending numbers
 */

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Convert property name to URL-safe slug
 * Must match the function in lib/properties.ts
 */
function slugifyPropertyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}

async function populatePropertySlugs() {
  console.log('📝 Starting property slug population...\n');

  try {
    // Fetch all records with property_name
    console.log('Fetching data from sage-glamping-data...');
    const { data: allRecords, error: fetchError } = await supabase
      .from('sage-glamping-data')
      .select('id, property_name')
      .not('property_name', 'is', null)
      .limit(10000);

    if (fetchError) {
      throw fetchError;
    }

    if (!allRecords || allRecords.length === 0) {
      console.log('No records found in sage-glamping-data table.');
      return;
    }

    console.log(`Found ${allRecords.length} records\n`);

    // Get unique property names
    const uniquePropertyNames = new Set<string>();
    const recordsByPropertyName = new Map<string, any[]>();
    
    allRecords.forEach((record: any) => {
      const propertyName = record.property_name?.trim();
      if (propertyName) {
        uniquePropertyNames.add(propertyName);
        if (!recordsByPropertyName.has(propertyName)) {
          recordsByPropertyName.set(propertyName, []);
        }
        recordsByPropertyName.get(propertyName)!.push(record);
      }
    });

    console.log(`Found ${uniquePropertyNames.size} unique property names\n`);

    // Generate base slugs for each property name
    const propertySlugMap = new Map<string, string>();
    const slugCounts = new Map<string, number>();
    const slugToPropertyName = new Map<string, string>();

    // First pass: generate base slugs
    for (const propertyName of Array.from(uniquePropertyNames).sort()) {
      const baseSlug = slugifyPropertyName(propertyName);
      
      // Check if this slug is already taken by a different property
      if (slugToPropertyName.has(baseSlug) && slugToPropertyName.get(baseSlug) !== propertyName) {
        // This is a duplicate - we'll handle it in the next pass
        slugCounts.set(baseSlug, (slugCounts.get(baseSlug) || 0) + 1);
      } else {
        // First property to use this slug
        slugToPropertyName.set(baseSlug, propertyName);
        slugCounts.set(baseSlug, 1);
        propertySlugMap.set(propertyName, baseSlug);
      }
    }

    // Second pass: handle duplicate slugs by appending numbers
    const duplicateProperties: Array<{ propertyName: string; baseSlug: string }> = [];
    
    for (const propertyName of Array.from(uniquePropertyNames).sort()) {
      const baseSlug = slugifyPropertyName(propertyName);
      const existingProperty = slugToPropertyName.get(baseSlug);
      
      if (existingProperty && existingProperty !== propertyName) {
        // This property name generates a duplicate slug
        duplicateProperties.push({ propertyName, baseSlug });
      }
    }

    // Resolve duplicates by assigning numbers
    const baseSlugGroups = new Map<string, string[]>();
    duplicateProperties.forEach(({ propertyName, baseSlug }) => {
      if (!baseSlugGroups.has(baseSlug)) {
        // Include the first property that got the base slug
        const firstProperty = slugToPropertyName.get(baseSlug);
        if (firstProperty) {
          baseSlugGroups.set(baseSlug, [firstProperty]);
        } else {
          baseSlugGroups.set(baseSlug, []);
        }
      }
      baseSlugGroups.get(baseSlug)!.push(propertyName);
    });

    // Assign final slugs to duplicate groups
    baseSlugGroups.forEach((propertyNames, baseSlug) => {
      propertyNames.forEach((propertyName, index) => {
        if (index === 0) {
          // First property keeps the base slug
          propertySlugMap.set(propertyName, baseSlug);
        } else {
          // Others get numbered slugs
          propertySlugMap.set(propertyName, `${baseSlug}-${index + 1}`);
        }
      });
    });

    console.log(`Generated ${propertySlugMap.size} unique slugs`);
    const duplicateCount = duplicateProperties.length;
    if (duplicateCount > 0) {
      console.log(`Resolved ${duplicateCount} duplicate slug conflicts\n`);
    } else {
      console.log('No duplicate slugs found\n');
    }

    // Update all records with their property's slug
    let updatedCount = 0;
    let errorCount = 0;
    const batchSize = 100;

    // Group updates by slug for efficiency
    const updatesBySlug = new Map<string, number[]>();
    propertySlugMap.forEach((slug, propertyName) => {
      const recordIds = recordsByPropertyName.get(propertyName)?.map(r => r.id) || [];
      if (recordIds.length > 0) {
        updatesBySlug.set(slug, recordIds);
      }
    });

    console.log('Updating records in batches...\n');
    let processedCount = 0;
    const totalUpdates = updatesBySlug.size;

    for (const [slug, recordIds] of updatesBySlug.entries()) {
      // Update all records with this slug in batches
      for (let i = 0; i < recordIds.length; i += batchSize) {
        const batch = recordIds.slice(i, i + batchSize);
        
        // Update each record individually (Supabase doesn't support bulk update by IDs easily)
        for (const id of batch) {
          const { error: updateError } = await supabase
            .from('sage-glamping-data')
            .update({ slug })
            .eq('id', id);

          if (updateError) {
            console.error(`Error updating record ${id} with slug ${slug}:`, updateError.message);
            errorCount++;
          } else {
            updatedCount++;
          }
        }
      }

      processedCount++;
      if (processedCount % 10 === 0) {
        console.log(`Progress: ${processedCount}/${totalUpdates} properties processed (${updatedCount} records updated)`);
      }
    }

    console.log('\n✅ Slug population complete!');
    console.log(`   Updated ${updatedCount} records`);
    console.log(`   ${errorCount} errors`);
    console.log(`   ${propertySlugMap.size} unique slugs generated`);
    
    if (duplicateCount > 0) {
      console.log(`\n⚠️  ${duplicateCount} properties had duplicate slugs and were renamed:`);
      baseSlugGroups.forEach((propertyNames, baseSlug) => {
        if (propertyNames.length > 1) {
          console.log(`\n   Base slug: "${baseSlug}"`);
          propertyNames.forEach((propertyName, index) => {
            const finalSlug = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
            console.log(`     - "${propertyName}" → ${finalSlug}`);
          });
        }
      });
    }

    // Verify no duplicates remain
    console.log('\n🔍 Verifying slug uniqueness...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('sage-glamping-data')
      .select('slug, property_name')
      .not('slug', 'is', null)
      .limit(10000);

    if (!verifyError && verifyData) {
      const slugGroups = new Map<string, Set<string>>();
      verifyData.forEach((record: any) => {
        if (record.slug) {
          if (!slugGroups.has(record.slug)) {
            slugGroups.set(record.slug, new Set());
          }
          if (record.property_name) {
            slugGroups.get(record.slug)!.add(record.property_name);
          }
        }
      });

      const duplicates: Array<{ slug: string; propertyNames: string[] }> = [];
      slugGroups.forEach((propertyNames, slug) => {
        if (propertyNames.size > 1) {
          duplicates.push({ slug, propertyNames: Array.from(propertyNames) });
        }
      });

      if (duplicates.length > 0) {
        console.log(`\n⚠️  WARNING: Found ${duplicates.length} slugs used by multiple property names:`);
        duplicates.slice(0, 10).forEach(({ slug, propertyNames }) => {
          console.log(`   "${slug}" used by: ${propertyNames.join(', ')}`);
        });
        if (duplicates.length > 10) {
          console.log(`   ... and ${duplicates.length - 10} more`);
        }
      } else {
        console.log('✅ All slugs are unique across different property names');
      }

      // Verify same property_name = same slug
      const propertyNameGroups = new Map<string, Set<string>>();
      verifyData.forEach((record: any) => {
        if (record.property_name && record.slug) {
          if (!propertyNameGroups.has(record.property_name)) {
            propertyNameGroups.set(record.property_name, new Set());
          }
          propertyNameGroups.get(record.property_name)!.add(record.slug);
        }
      });

      const inconsistentProperties: Array<{ propertyName: string; slugs: string[] }> = [];
      propertyNameGroups.forEach((slugs, propertyName) => {
        if (slugs.size > 1) {
          inconsistentProperties.push({ propertyName, slugs: Array.from(slugs) });
        }
      });

      if (inconsistentProperties.length > 0) {
        console.log(`\n⚠️  WARNING: Found ${inconsistentProperties.length} properties with multiple slugs:`);
        inconsistentProperties.slice(0, 10).forEach(({ propertyName, slugs }) => {
          console.log(`   "${propertyName}" has slugs: ${slugs.join(', ')}`);
        });
        if (inconsistentProperties.length > 10) {
          console.log(`   ... and ${inconsistentProperties.length - 10} more`);
        }
      } else {
        console.log('✅ All records with same property_name have the same slug');
      }
    }

    console.log('\n📋 Next steps:');
    console.log('   1. Review the output above for any warnings');
    console.log('   2. Run: scripts/make-slug-column-required.sql to add constraints');
    console.log('   3. Update application code to use slug column');

  } catch (error) {
    console.error('❌ Error populating slugs:', error);
    process.exit(1);
  }
}

// Run the script
populatePropertySlugs();
