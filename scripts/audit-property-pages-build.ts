/**
 * Audit script to ensure all property pages are being created during build
 * 
 * This script checks:
 * 1. Total properties in database
 * 2. Properties with property_name
 * 3. Properties with slugs
 * 4. Slugs returned by getAllPropertySlugs()
 * 5. Properties that should have pages but don't
 * 6. National parks similarly
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

interface AuditResult {
  glampingProperties: {
    totalRecords: number;
    withPropertyName: number;
    withSlug: number;
    uniquePropertyNames: number;
    uniqueSlugs: number;
    slugsFromFunction: number;
    missingSlugs: Array<{ property_name: string; record_count: number }>;
    propertiesWithoutPages: Array<{ property_name: string; slug: string | null }>;
  };
  nationalParks: {
    totalRecords: number;
    withName: number;
    withSlug: number;
    uniqueSlugs: number;
    slugsFromFunction: number;
    missingSlugs: Array<{ name: string }>;
    parksWithoutPages: Array<{ name: string; slug: string | null }>;
  };
  buildPages: {
    totalStaticPages: number;
    glampingPages: number;
    nationalParkPages: number;
  };
}

async function auditPropertyPages(): Promise<AuditResult> {
  console.log('🔍 Starting property pages build audit...\n');
  
  // ============================================
  // GLAMPING PROPERTIES AUDIT
  // ============================================
  console.log('📊 Auditing Glamping Properties...');
  
  // Get total count first
  const { count: totalCount } = await supabase
    .from('all_glamping_properties')
    .select('*', { count: 'exact', head: true });
  
  console.log(`  Total records in database: ${totalCount || 0}`);
  
  // Fetch all records with pagination (Supabase has a default limit)
  let allProperties: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;
  
  while (hasMore) {
    const { data: page, error: pageError } = await supabase
      .from('all_glamping_properties')
      .select('id, property_name, slug')
      .range(from, from + pageSize - 1);
    
    if (pageError) {
      console.error('❌ Error fetching properties:', pageError);
      throw pageError;
    }
    
    if (page && page.length > 0) {
      allProperties = allProperties.concat(page);
      from += pageSize;
      hasMore = page.length === pageSize;
    } else {
      hasMore = false;
    }
  }
  
  const totalRecords = allProperties.length;
  
  // Count records with property_name
  const withPropertyName = allProperties?.filter(
    p => p.property_name && p.property_name.trim() !== ''
  ).length || 0;
  
  // Count records with slug
  const withSlug = allProperties?.filter(
    p => p.slug && p.slug.trim() !== ''
  ).length || 0;
  
  // Get unique property names
  const uniquePropertyNamesSet = new Set<string>();
  allProperties?.forEach(p => {
    if (p.property_name && p.property_name.trim()) {
      uniquePropertyNamesSet.add(p.property_name.trim());
    }
  });
  const uniquePropertyNames = uniquePropertyNamesSet.size;
  
  // Get unique slugs from database
  const uniqueSlugsSet = new Set<string>();
  allProperties?.forEach(p => {
    if (p.slug && p.slug.trim()) {
      uniqueSlugsSet.add(p.slug.trim());
    }
  });
  const uniqueSlugs = uniqueSlugsSet.size;
  
  // Get slugs using the same logic as getAllPropertySlugs() (what build uses)
  // Fetch all records with pagination
  let propertiesForSlugs: any[] = [];
  let fromSlugs = 0;
  let hasMoreSlugs = true;
  
  while (hasMoreSlugs) {
    const { data: page, error: pageError } = await supabase
      .from('all_glamping_properties')
      .select('property_name, slug')
      .not('property_name', 'is', null)
      .not('slug', 'is', null)
      .range(fromSlugs, fromSlugs + pageSize - 1);
    
    if (pageError) {
      console.error('Error fetching property slugs:', pageError);
      break;
    }
    
    if (page && page.length > 0) {
      propertiesForSlugs = propertiesForSlugs.concat(page);
      fromSlugs += pageSize;
      hasMoreSlugs = page.length === pageSize;
    } else {
      hasMoreSlugs = false;
    }
  }
  
  // Map: property_name -> slug (ensures one slug per unique property name)
  const propertyNameToSlug = new Map<string, string>();
  propertiesForSlugs.forEach((prop) => {
    const propertyName = prop.property_name?.trim();
    const slug = prop.slug?.trim();
    if (propertyName && slug) {
      // Only add if we haven't seen this property name before
      // This ensures we get one slug per unique property, not per record
      if (!propertyNameToSlug.has(propertyName)) {
        propertyNameToSlug.set(propertyName, slug);
      }
    }
  });
  
  // Return unique slugs (one per unique property name) - same as getAllPropertySlugs()
  const slugsFromFunction = Array.from(new Set(propertyNameToSlug.values()))
    .sort()
    .map((slug) => ({ slug }));
  const slugsFromFunctionCount = slugsFromFunction.length;
  const slugsFromFunctionSet = new Set(slugsFromFunction.map(s => s.slug));
  
  // Find properties with property_name but no slug
  const missingSlugs: Array<{ property_name: string; record_count: number }> = [];
  const propertyNameGroups = new Map<string, number>();
  
  allProperties?.forEach(p => {
    if (p.property_name && p.property_name.trim() && (!p.slug || !p.slug.trim())) {
      const name = p.property_name.trim();
      propertyNameGroups.set(name, (propertyNameGroups.get(name) || 0) + 1);
    }
  });
  
  propertyNameGroups.forEach((count, name) => {
    missingSlugs.push({ property_name: name, record_count: count });
  });
  
  // Find properties that should have pages but don't
  // (have property_name and slug, but slug not in getAllPropertySlugs result)
  const propertiesWithoutPages: Array<{ property_name: string; slug: string | null }> = [];
  const allPropertyNameToSlug = new Map<string, string>();
  
  allProperties?.forEach(p => {
    if (p.property_name && p.property_name.trim() && p.slug && p.slug.trim()) {
      const name = p.property_name.trim();
      const slug = p.slug.trim();
      if (!allPropertyNameToSlug.has(name)) {
        allPropertyNameToSlug.set(name, slug);
      }
    }
  });
  
  allPropertyNameToSlug.forEach((slug, name) => {
    if (!slugsFromFunctionSet.has(slug)) {
      propertiesWithoutPages.push({ property_name: name, slug });
    }
  });
  
  console.log(`  Total records: ${totalRecords}`);
  console.log(`  Records with property_name: ${withPropertyName}`);
  console.log(`  Records with slug: ${withSlug}`);
  console.log(`  Unique property names: ${uniquePropertyNames}`);
  console.log(`  Unique slugs in database: ${uniqueSlugs}`);
  console.log(`  Slugs from getAllPropertySlugs(): ${slugsFromFunctionCount}`);
  console.log(`  Properties missing slugs: ${missingSlugs.length}`);
  console.log(`  Properties without pages: ${propertiesWithoutPages.length}`);
  
  // ============================================
  // NATIONAL PARKS AUDIT
  // ============================================
  console.log('\n📊 Auditing National Parks...');
  
  const { data: allParks, error: parksError } = await supabase
    .from('national-parks')
    .select('id, name, slug')
    .limit(1000);
  
  if (parksError) {
    console.error('❌ Error fetching national parks:', parksError);
    throw parksError;
  }
  
  const totalParkRecords = allParks?.length || 0;
  
  const withName = allParks?.filter(
    p => p.name && p.name.trim() !== ''
  ).length || 0;
  
  const withParkSlug = allParks?.filter(
    p => p.slug && p.slug.trim() !== ''
  ).length || 0;
  
  const uniqueParkSlugsSet = new Set<string>();
  allParks?.forEach(p => {
    if (p.slug && p.slug.trim()) {
      uniqueParkSlugsSet.add(p.slug.trim());
    }
  });
  const uniqueParkSlugs = uniqueParkSlugsSet.size;
  
  // Get slugs using the same logic as getAllNationalParkSlugs() (what build uses)
  const { data: parksForSlugs, error: parkSlugsError } = await supabase
    .from('national-parks')
    .select('slug, name')
    .not('slug', 'is', null)
    .not('name', 'is', null)
    .limit(1000);
  
  if (parkSlugsError) {
    console.error('Error fetching national park slugs:', parkSlugsError);
  }
  
  // Return unique slugs (in case of duplicates) - same as getAllNationalParkSlugs()
  const parkSlugsFromFunction = Array.from(new Set(
    (parksForSlugs || [])
      .map((park) => park.slug?.trim())
      .filter((slug): slug is string => slug !== undefined && slug !== '')
  ))
    .sort()
    .map((slug) => ({ slug }));
  const parkSlugsFromFunctionCount = parkSlugsFromFunction.length;
  const parkSlugsFromFunctionSet = new Set(parkSlugsFromFunction.map(s => s.slug));
  
  // Find parks with name but no slug
  const missingParkSlugs: Array<{ name: string }> = [];
  allParks?.forEach(p => {
    if (p.name && p.name.trim() && (!p.slug || !p.slug.trim())) {
      missingParkSlugs.push({ name: p.name.trim() });
    }
  });
  
  // Find parks that should have pages but don't
  const parksWithoutPages: Array<{ name: string; slug: string | null }> = [];
  allParks?.forEach(p => {
    if (p.name && p.name.trim() && p.slug && p.slug.trim()) {
      const slug = p.slug.trim();
      if (!parkSlugsFromFunctionSet.has(slug)) {
        parksWithoutPages.push({ name: p.name.trim(), slug });
      }
    }
  });
  
  console.log(`  Total records: ${totalParkRecords}`);
  console.log(`  Records with name: ${withName}`);
  console.log(`  Records with slug: ${withParkSlug}`);
  console.log(`  Unique slugs in database: ${uniqueParkSlugs}`);
  console.log(`  Slugs from getAllNationalParkSlugs(): ${parkSlugsFromFunctionCount}`);
  console.log(`  Parks missing slugs: ${missingParkSlugs.length}`);
  console.log(`  Parks without pages: ${parksWithoutPages.length}`);
  
  // ============================================
  // BUILD PAGES SUMMARY
  // ============================================
  console.log('\n📊 Build Pages Summary...');
  
  const totalStaticPages = slugsFromFunctionCount + parkSlugsFromFunctionCount;
  
  console.log(`  Total static pages: ${totalStaticPages}`);
  console.log(`  Glamping property pages: ${slugsFromFunctionCount}`);
  console.log(`  National park pages: ${parkSlugsFromFunctionCount}`);
  
  // ============================================
  // DETAILED ISSUES
  // ============================================
  if (missingSlugs.length > 0) {
    console.log('\n⚠️  GLAMPING PROPERTIES MISSING SLUGS:');
    console.log('   These properties have property_name but no slug:');
    missingSlugs.slice(0, 20).forEach(({ property_name, record_count }) => {
      console.log(`   - "${property_name}" (${record_count} record${record_count > 1 ? 's' : ''})`);
    });
    if (missingSlugs.length > 20) {
      console.log(`   ... and ${missingSlugs.length - 20} more`);
    }
  }
  
  if (propertiesWithoutPages.length > 0) {
    console.log('\n⚠️  GLAMPING PROPERTIES WITHOUT PAGES:');
    console.log('   These properties have slugs but are not returned by getAllPropertySlugs():');
    propertiesWithoutPages.slice(0, 20).forEach(({ property_name, slug }) => {
      console.log(`   - "${property_name}" (slug: ${slug})`);
    });
    if (propertiesWithoutPages.length > 20) {
      console.log(`   ... and ${propertiesWithoutPages.length - 20} more`);
    }
  }
  
  if (missingParkSlugs.length > 0) {
    console.log('\n⚠️  NATIONAL PARKS MISSING SLUGS:');
    console.log('   These parks have name but no slug:');
    missingParkSlugs.slice(0, 20).forEach(({ name }) => {
      console.log(`   - "${name}"`);
    });
    if (missingParkSlugs.length > 20) {
      console.log(`   ... and ${missingParkSlugs.length - 20} more`);
    }
  }
  
  if (parksWithoutPages.length > 0) {
    console.log('\n⚠️  NATIONAL PARKS WITHOUT PAGES:');
    console.log('   These parks have slugs but are not returned by getAllNationalParkSlugs():');
    parksWithoutPages.slice(0, 20).forEach(({ name, slug }) => {
      console.log(`   - "${name}" (slug: ${slug})`);
    });
    if (parksWithoutPages.length > 20) {
      console.log(`   ... and ${parksWithoutPages.length - 20} more`);
    }
  }
  
  // ============================================
  // VALIDATION
  // ============================================
  console.log('\n✅ Validation Summary:');
  
  const glampingIssues = missingSlugs.length + propertiesWithoutPages.length;
  const parkIssues = missingParkSlugs.length + parksWithoutPages.length;
  
  if (glampingIssues === 0 && parkIssues === 0) {
    console.log('   ✅ All properties have slugs and will generate pages!');
    console.log(`   ✅ Expected ${totalStaticPages} static pages during build`);
  } else {
    console.log(`   ⚠️  Found ${glampingIssues} glamping property issue(s)`);
    console.log(`   ⚠️  Found ${parkIssues} national park issue(s)`);
    console.log('   ⚠️  Some properties may not generate pages during build');
  }
  
  // Check if unique property names match unique slugs
  if (uniquePropertyNames !== uniqueSlugs) {
    console.log(`\n   ⚠️  WARNING: Unique property names (${uniquePropertyNames}) != Unique slugs (${uniqueSlugs})`);
    console.log('   This suggests some properties may share slugs or have inconsistent slugging');
  }
  
  // Check if slugs from function match unique slugs
  if (slugsFromFunctionCount !== uniqueSlugs) {
    console.log(`\n   ⚠️  WARNING: getAllPropertySlugs() returns ${slugsFromFunctionCount} slugs, but database has ${uniqueSlugs} unique slugs`);
    console.log('   This suggests getAllPropertySlugs() may be filtering out some properties');
  }
  
  return {
    glampingProperties: {
      totalRecords,
      withPropertyName,
      withSlug,
      uniquePropertyNames,
      uniqueSlugs,
      slugsFromFunction: slugsFromFunctionCount,
      missingSlugs,
      propertiesWithoutPages,
    },
    nationalParks: {
      totalRecords: totalParkRecords,
      withName,
      withSlug: withParkSlug,
      uniqueSlugs: uniqueParkSlugs,
      slugsFromFunction: parkSlugsFromFunctionCount,
      missingSlugs: missingParkSlugs,
      parksWithoutPages,
    },
    buildPages: {
      totalStaticPages,
      glampingPages: slugsFromFunctionCount,
      nationalParkPages: parkSlugsFromFunctionCount,
    },
  };
}

// Run if executed directly
if (require.main === module) {
  auditPropertyPages()
    .then((result) => {
      console.log('\n📋 Full Audit Result:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Audit failed:', error);
      process.exit(1);
    });
}

export default auditPropertyPages;
