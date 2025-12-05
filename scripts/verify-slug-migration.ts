import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Verify slug column migration data integrity
 * Checks:
 * - All records with property_name have slugs
 * - No duplicate slugs across different property names
 * - All records with same property_name have same slug
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

async function verifySlugMigration() {
  console.log('🔍 Verifying slug column migration...\n');

  try {
    // Fetch all records
    console.log('Fetching all records from sage-glamping-data...');
    const { data: allRecords, error: fetchError } = await supabase
      .from('sage-glamping-data')
      .select('id, property_name, slug')
      .limit(10000);

    if (fetchError) {
      throw fetchError;
    }

    if (!allRecords || allRecords.length === 0) {
      console.log('No records found.');
      return;
    }

    console.log(`Found ${allRecords.length} total records\n`);

    // Filter to records with property_name
    const recordsWithPropertyName = allRecords.filter(
      (r: any) => r.property_name && r.property_name.trim()
    );

    console.log(`Records with property_name: ${recordsWithPropertyName.length}\n`);

    // Check 1: All records with property_name should have slugs
    console.log('✅ Check 1: Verifying all records with property_name have slugs...');
    const recordsWithoutSlugs = recordsWithPropertyName.filter(
      (r: any) => !r.slug || !r.slug.trim()
    );

    if (recordsWithoutSlugs.length > 0) {
      console.log(`   ❌ FAILED: ${recordsWithoutSlugs.length} records missing slugs:`);
      recordsWithoutSlugs.slice(0, 10).forEach((r: any) => {
        console.log(`      - ID ${r.id}: "${r.property_name}"`);
      });
      if (recordsWithoutSlugs.length > 10) {
        console.log(`      ... and ${recordsWithoutSlugs.length - 10} more`);
      }
    } else {
      console.log(`   ✅ PASSED: All ${recordsWithPropertyName.length} records have slugs`);
    }

    // Check 2: No duplicate slugs across different property names
    console.log('\n✅ Check 2: Verifying no duplicate slugs across different property names...');
    const slugToPropertyNames = new Map<string, Set<string>>();

    recordsWithPropertyName.forEach((r: any) => {
      if (r.slug && r.property_name) {
        const slug = r.slug.trim();
        const propertyName = r.property_name.trim();
        if (!slugToPropertyNames.has(slug)) {
          slugToPropertyNames.set(slug, new Set());
        }
        slugToPropertyNames.get(slug)!.add(propertyName);
      }
    });

    const duplicateSlugs: Array<{ slug: string; propertyNames: string[] }> = [];
    slugToPropertyNames.forEach((propertyNames, slug) => {
      if (propertyNames.size > 1) {
        duplicateSlugs.push({ slug, propertyNames: Array.from(propertyNames) });
      }
    });

    if (duplicateSlugs.length > 0) {
      console.log(`   ❌ FAILED: Found ${duplicateSlugs.length} slugs used by multiple property names:`);
      duplicateSlugs.slice(0, 10).forEach(({ slug, propertyNames }) => {
        console.log(`      - Slug "${slug}" used by:`);
        propertyNames.forEach((name) => {
          console.log(`        • "${name}"`);
        });
      });
      if (duplicateSlugs.length > 10) {
        console.log(`      ... and ${duplicateSlugs.length - 10} more duplicate slugs`);
      }
    } else {
      console.log(`   ✅ PASSED: All ${slugToPropertyNames.size} slugs are unique`);
    }

    // Check 3: All records with same property_name have same slug
    console.log('\n✅ Check 3: Verifying all records with same property_name have same slug...');
    const propertyNameToSlugs = new Map<string, Set<string>>();

    recordsWithPropertyName.forEach((r: any) => {
      if (r.property_name && r.slug) {
        const propertyName = r.property_name.trim();
        const slug = r.slug.trim();
        if (!propertyNameToSlugs.has(propertyName)) {
          propertyNameToSlugs.set(propertyName, new Set());
        }
        propertyNameToSlugs.get(propertyName)!.add(slug);
      }
    });

    const inconsistentProperties: Array<{ propertyName: string; slugs: string[]; recordCount: number }> = [];
    propertyNameToSlugs.forEach((slugs, propertyName) => {
      if (slugs.size > 1) {
        const recordCount = recordsWithPropertyName.filter(
          (r: any) => r.property_name?.trim() === propertyName
        ).length;
        inconsistentProperties.push({
          propertyName,
          slugs: Array.from(slugs),
          recordCount,
        });
      }
    });

    if (inconsistentProperties.length > 0) {
      console.log(`   ❌ FAILED: Found ${inconsistentProperties.length} properties with multiple slugs:`);
      inconsistentProperties.slice(0, 10).forEach(({ propertyName, slugs, recordCount }) => {
        console.log(`      - "${propertyName}" (${recordCount} records) has slugs:`);
        slugs.forEach((slug) => {
          const count = recordsWithPropertyName.filter(
            (r: any) => r.property_name?.trim() === propertyName && r.slug?.trim() === slug
          ).length;
          console.log(`        • "${slug}" (${count} records)`);
        });
      });
      if (inconsistentProperties.length > 10) {
        console.log(`      ... and ${inconsistentProperties.length - 10} more inconsistent properties`);
      }
    } else {
      console.log(`   ✅ PASSED: All ${propertyNameToSlugs.size} properties have consistent slugs`);
    }

    // Summary statistics
    console.log('\n📊 Summary Statistics:');
    console.log(`   Total records: ${allRecords.length}`);
    console.log(`   Records with property_name: ${recordsWithPropertyName.length}`);
    console.log(`   Records with slugs: ${recordsWithPropertyName.filter((r: any) => r.slug).length}`);
    console.log(`   Unique property names: ${propertyNameToSlugs.size}`);
    console.log(`   Unique slugs: ${slugToPropertyNames.size}`);

    // Overall status
    const allPassed =
      recordsWithoutSlugs.length === 0 &&
      duplicateSlugs.length === 0 &&
      inconsistentProperties.length === 0;

    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ ALL CHECKS PASSED - Migration verification successful!');
      console.log('   You can now run: scripts/make-slug-column-required.sql');
    } else {
      console.log('⚠️  SOME CHECKS FAILED - Please fix issues before proceeding');
      console.log('   Review the errors above and re-run populate-property-slugs.ts if needed');
    }
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error verifying slug migration:', error);
    process.exit(1);
  }
}

// Run the script
verifySlugMigration();
