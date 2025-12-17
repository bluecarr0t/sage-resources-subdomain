/**
 * Diagnostic script to check if a property exists and what slug it generates
 * Usage: npx tsx scripts/check-property-slug.ts [slug-or-property-name]
 * Example: npx tsx scripts/check-property-slug.ts collective-vail
 * Example: npx tsx scripts/check-property-slug.ts "Collective Vail"
 */

import { createServerClient } from '@/lib/supabase';
import { slugifyPropertyName, getAllPropertySlugs, getPropertiesBySlug } from '@/lib/properties';

async function checkProperty(searchTerm: string) {
  try {
    const supabase = createServerClient();
    
    console.log(`\n🔍 Checking for property: "${searchTerm}"\n`);
    
    // Check 1: Search by property name (case-insensitive, partial match)
    console.log('1️⃣ Searching database for property names containing:', searchTerm);
    const { data: propertiesByName, error: nameError } = await supabase
      .from('all_glamping_properties')
      .select('property_name')
      .ilike('property_name', `%${searchTerm}%`)
      .limit(20);
    
    if (nameError) {
      console.error('❌ Error searching by name:', nameError);
    } else if (propertiesByName && propertiesByName.length > 0) {
      console.log(`✅ Found ${propertiesByName.length} property(ies) matching name:`);
      const uniqueNames = new Set(propertiesByName.map(p => p.property_name).filter(Boolean));
      uniqueNames.forEach(name => {
        const slug = slugifyPropertyName(name);
        console.log(`   - "${name}" → slug: "${slug}"`);
      });
    } else {
      console.log('   ⚠️  No properties found matching that name');
    }
    
    // Check 2: Get all slugs and see if searchTerm matches any slug
    console.log('\n2️⃣ Checking all generated slugs...');
    const allSlugs = await getAllPropertySlugs();
    const matchingSlugs = allSlugs.filter(s => 
      s.slug === searchTerm.toLowerCase() || 
      s.slug.includes(searchTerm.toLowerCase()) ||
      s.propertyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (matchingSlugs.length > 0) {
      console.log(`✅ Found ${matchingSlugs.length} matching slug(s):`);
      matchingSlugs.slice(0, 10).forEach(s => {
        console.log(`   - slug: "${s.slug}" → property: "${s.propertyName}"`);
      });
      if (matchingSlugs.length > 10) {
        console.log(`   ... and ${matchingSlugs.length - 10} more`);
      }
    } else {
      console.log('   ⚠️  No slugs found matching:', searchTerm);
    }
    
    // Check 3: Try to fetch properties by slug
    const searchSlug = searchTerm.toLowerCase().replace(/\s+/g, '-');
    console.log(`\n3️⃣ Attempting to fetch properties by slug: "${searchSlug}"`);
    const properties = await getPropertiesBySlug(searchSlug);
    
    if (properties && properties.length > 0) {
      console.log(`✅ Success! Found ${properties.length} property record(s):`);
      properties.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.property_name || 'Unnamed'}`);
        if (p.city || p.state) {
          console.log(`      Location: ${[p.city, p.state].filter(Boolean).join(', ')}`);
        }
      });
      console.log(`\n✅ URL should work: /property/${searchSlug}`);
    } else {
      console.log(`❌ No properties found for slug: "${searchSlug}"`);
      console.log(`\n💡 Possible reasons:`);
      console.log(`   1. Property doesn't exist in database`);
      console.log(`   2. Property name is different (e.g., "The Collective Vail" vs "Collective Vail")`);
      console.log(`   3. Property name has special characters that affect slug generation`);
      console.log(`   4. Page needs to be rebuilt (if using static generation)`);
    }
    
    // Check 4: Show similar slugs
    if (matchingSlugs.length === 0 && allSlugs.length > 0) {
      console.log(`\n4️⃣ Showing similar slugs (first 20):`);
      const similar = allSlugs
        .filter(s => s.slug.includes('collective') || s.slug.includes('vail'))
        .slice(0, 20);
      if (similar.length > 0) {
        similar.forEach(s => {
          console.log(`   - "${s.slug}" → "${s.propertyName}"`);
        });
      } else {
        console.log('   (No similar slugs found)');
      }
    }
    
    console.log('\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }
}

// Get search term from command line args
const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('Usage: npx tsx scripts/check-property-slug.ts [slug-or-property-name]');
  console.log('Example: npx tsx scripts/check-property-slug.ts collective-vail');
  console.log('Example: npx tsx scripts/check-property-slug.ts "Collective Vail"');
  process.exit(1);
}

checkProperty(searchTerm);
