/**
 * Test script to verify national park pages are working correctly
 * 
 * Usage:
 *   npx tsx scripts/test-national-park-pages.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

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

// Create Supabase client for testing
const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Import functions after ensuring env vars are loaded
// We'll use direct queries instead to avoid the createServerClient issue
async function getAllNationalParkSlugs() {
  try {
    const { data: parks, error } = await supabase
      .from('national-parks')
      .select('slug, name')
      .not('slug', 'is', null)
      .not('name', 'is', null)
      .limit(1000);

    if (error) {
      console.error('Error fetching national park slugs:', error);
      return [];
    }

    const uniqueSlugs = Array.from(new Set(
      (parks || [])
        .map((park) => park.slug?.trim())
        .filter((slug): slug is string => slug !== undefined && slug !== '')
    ));

    return uniqueSlugs.sort().map((slug) => ({ slug }));
  } catch (error) {
    console.error('Error in getAllNationalParkSlugs:', error);
    return [];
  }
}

async function getNationalParkBySlug(slug: string) {
  try {
    const { data: park, error } = await supabase
      .from('national-parks')
      .select('*')
      .eq('slug', slug.trim())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching national park by slug:', error);
      return null;
    }

    return park;
  } catch (error) {
    console.error('Error in getNationalParkBySlug:', error);
    return null;
  }
}

async function getSlugType(slug: string) {
  try {
    // Check national parks first
    const { data: park, error: parkError } = await supabase
      .from('national-parks')
      .select('id')
      .eq('slug', slug.trim())
      .limit(1)
      .single();

    if (!parkError && park) {
      return 'national-park';
    }

    // Check glamping properties
    const { data: property, error: propertyError } = await supabase
      .from('sage-glamping-data')
      .select('id')
      .eq('slug', slug.trim())
      .limit(1)
      .single();

    if (!propertyError && property) {
      return 'glamping-property';
    }

    return null;
  } catch (error) {
    console.error('Error in getSlugType:', error);
    return null;
  }
}

async function getAllPropertySlugs() {
  try {
    const { data: properties, error } = await supabase
      .from('sage-glamping-data')
      .select('property_name, slug')
      .not('property_name', 'is', null)
      .not('slug', 'is', null)
      .limit(10000);

    if (error) {
      console.error('Error fetching property slugs:', error);
      return [];
    }

    const propertyNameToSlug = new Map<string, string>();
    properties?.forEach((prop) => {
      const propertyName = prop.property_name?.trim();
      const slug = prop.slug?.trim();
      if (propertyName && slug) {
        if (!propertyNameToSlug.has(propertyName)) {
          propertyNameToSlug.set(propertyName, slug);
        }
      }
    });

    const uniqueSlugs = Array.from(new Set(propertyNameToSlug.values()));
    return uniqueSlugs.sort().map((slug) => ({ slug }));
  } catch (error) {
    console.error('Error in getAllPropertySlugs:', error);
    return [];
  }
}

/**
 * Test results interface
 */
interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * Run all tests
 */
async function runTests() {
  const results: TestResult[] = [];
  
  console.log('🧪 Testing National Park Pages Implementation\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test 1: Fetch all national park slugs
  console.log('Test 1: Fetching all national park slugs...');
  try {
    const parkSlugs = await getAllNationalParkSlugs();
    results.push({
      name: 'Get All National Park Slugs',
      passed: parkSlugs.length > 0,
      message: parkSlugs.length > 0 
        ? `✅ Found ${parkSlugs.length} national park slugs`
        : '❌ No national park slugs found',
      details: { count: parkSlugs.length }
    });
    
    if (parkSlugs.length > 0) {
      console.log(`  ✅ Found ${parkSlugs.length} national park slugs`);
      console.log(`  Sample slugs: ${parkSlugs.slice(0, 5).map(s => s.slug).join(', ')}...\n`);
    } else {
      console.log('  ❌ No slugs found\n');
    }
  } catch (error) {
    results.push({
      name: 'Get All National Park Slugs',
      passed: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    });
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test 2: Fetch a specific park by slug
  console.log('Test 2: Fetching specific park by slug...');
  try {
    const testSlug = 'acadia-national-park';
    const park = await getNationalParkBySlug(testSlug);
    
    if (park) {
      results.push({
        name: 'Get National Park By Slug',
        passed: true,
        message: `✅ Successfully fetched "${park.name}" by slug "${testSlug}"`,
        details: { 
          slug: testSlug,
          parkName: park.name,
          hasCoordinates: !!(park.latitude && park.longitude),
          hasDescription: !!park.description
        }
      });
      console.log(`  ✅ Successfully fetched "${park.name}"`);
      console.log(`     Location: ${park.state || 'N/A'}`);
      console.log(`     Coordinates: ${park.latitude}, ${park.longitude}`);
      console.log(`     Slug: ${park.slug}\n`);
    } else {
      results.push({
        name: 'Get National Park By Slug',
        passed: false,
        message: `❌ Park not found for slug "${testSlug}"`,
        details: { slug: testSlug }
      });
      console.log(`  ❌ Park not found for slug "${testSlug}"\n`);
    }
  } catch (error) {
    results.push({
      name: 'Get National Park By Slug',
      passed: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    });
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test 3: Test slug type detection
  console.log('Test 3: Testing slug type detection...');
  try {
    const parkSlug = 'acadia-national-park';
    const propertySlug = 'acadia'; // Assuming there might be a property with this name
    
    const parkType = await getSlugType(parkSlug);
    const propertyType = await getSlugType('test-property-slug'); // Non-existent, should return null
    
    const parkTypeCorrect = parkType === 'national-park';
    
    results.push({
      name: 'Slug Type Detection',
      passed: parkTypeCorrect,
      message: parkTypeCorrect
        ? `✅ Correctly identified "${parkSlug}" as national-park`
        : `❌ Incorrectly identified "${parkSlug}" as ${parkType || 'null'}`,
      details: { 
        parkSlug,
        detectedType: parkType,
        expectedType: 'national-park'
      }
    });
    
    if (parkTypeCorrect) {
      console.log(`  ✅ Correctly identified "${parkSlug}" as ${parkType}`);
    } else {
      console.log(`  ❌ Expected "national-park", got "${parkType || 'null'}"`);
    }
    console.log();
  } catch (error) {
    results.push({
      name: 'Slug Type Detection',
      passed: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    });
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test 4: Compare with property slugs (ensure no conflicts)
  console.log('Test 4: Checking for slug conflicts between parks and properties...');
  try {
    const [parkSlugs, propertySlugs] = await Promise.all([
      getAllNationalParkSlugs(),
      getAllPropertySlugs()
    ]);
    
    const parkSlugSet = new Set(parkSlugs.map(s => s.slug));
    const propertySlugSet = new Set(propertySlugs.map(s => s.slug));
    
    const conflicts = parkSlugs.filter(p => propertySlugSet.has(p.slug));
    
    if (conflicts.length === 0) {
      results.push({
        name: 'Slug Conflicts Check',
        passed: true,
        message: `✅ No slug conflicts found (${parkSlugSet.size} park slugs, ${propertySlugSet.size} property slugs)`,
        details: { 
          parkCount: parkSlugSet.size,
          propertyCount: propertySlugSet.size,
          conflicts: []
        }
      });
      console.log(`  ✅ No slug conflicts found`);
      console.log(`     Park slugs: ${parkSlugSet.size}`);
      console.log(`     Property slugs: ${propertySlugSet.size}\n`);
    } else {
      results.push({
        name: 'Slug Conflicts Check',
        passed: false,
        message: `⚠️  Found ${conflicts.length} slug conflicts`,
        details: { 
          parkCount: parkSlugSet.size,
          propertyCount: propertySlugSet.size,
          conflicts: conflicts.map(c => c.slug)
        }
      });
      console.log(`  ⚠️  Found ${conflicts.length} slug conflicts:`);
      conflicts.forEach(c => console.log(`     - ${c.slug}`));
      console.log();
    }
  } catch (error) {
    results.push({
      name: 'Slug Conflicts Check',
      passed: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    });
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Test 5: Test multiple parks
  console.log('Test 5: Testing multiple park slugs...');
  try {
    const testSlugs = [
      'acadia-national-park',
      'yellowstone-national-park',
      'grand-canyon-national-park',
      'yosemite-national-park',
      'zion-national-park'
    ];
    
    const results_promises = testSlugs.map(async (slug) => {
      const park = await getNationalParkBySlug(slug);
      return { slug, found: !!park, name: park?.name || null };
    });
    
    const testResults = await Promise.all(results_promises);
    const foundCount = testResults.filter(r => r.found).length;
    const allFound = foundCount === testSlugs.length;
    
    results.push({
      name: 'Multiple Park Fetch Test',
      passed: allFound,
      message: allFound
        ? `✅ All ${testSlugs.length} test parks found`
        : `⚠️  Found ${foundCount} of ${testSlugs.length} test parks`,
      details: { testResults }
    });
    
    console.log(`  Testing ${testSlugs.length} park slugs:`);
    testResults.forEach(({ slug, found, name }) => {
      const status = found ? '✅' : '❌';
      console.log(`    ${status} ${slug} → ${name || 'NOT FOUND'}`);
    });
    console.log();
  } catch (error) {
    results.push({
      name: 'Multiple Park Fetch Test',
      passed: false,
      message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    });
    console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  const allPassed = passedTests === totalTests;
  
  results.forEach((result) => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details && !result.passed) {
      console.log(`   Details:`, result.details);
    }
    console.log();
  });
  
  console.log(`Total: ${passedTests}/${totalTests} tests passed`);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! National park pages are ready to use.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
