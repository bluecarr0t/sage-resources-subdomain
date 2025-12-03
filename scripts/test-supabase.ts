/**
 * Test script to verify Supabase connection
 * Run with: npx tsx scripts/test-supabase.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

console.log('🔍 Testing Supabase Connection...\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log(`  ✓ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`  ✓ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${publishableKey ? '✅ Set' : '❌ Missing'}`);
console.log(`  ✓ SUPABASE_SECRET_KEY: ${secretKey ? '✅ Set' : '❌ Missing'}`);
console.log('');

if (!supabaseUrl || !publishableKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please check your .env.local file.');
  process.exit(1);
}

// Test client-side connection
async function testClientConnection() {
  console.log('🌐 Testing Client-Side Connection (Publishable Key)...');
  
  try {
    if (!supabaseUrl || !publishableKey) {
      throw new Error('Missing Supabase credentials');
    }
    const supabase = createClient(supabaseUrl, publishableKey);
    
    // Try to query a non-existent table to test connection
    // A connection error will fail, but a "table doesn't exist" error means we connected successfully
    const { error } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1);
    
    if (error) {
      // PGRST116 = relation does not exist (which means we connected!)
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('  ✅ Client-side connection successful! (Table doesn\'t exist, but connection works)');
        return true;
      } else {
        console.error(`  ❌ Client-side connection failed: ${error.message}`);
        return false;
      }
    } else {
      console.log('  ✅ Client-side connection successful!');
      return true;
    }
  } catch (err) {
    console.error(`  ❌ Client-side connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false;
  }
}

// Test server-side connection
async function testServerConnection() {
  if (!secretKey || !supabaseUrl) {
    console.log('⚠️  Skipping server-side test (SUPABASE_SECRET_KEY not set)');
    return true;
  }
  
  console.log('🖥️  Testing Server-Side Connection (Secret Key)...');
  
  try {
    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Try to query a non-existent table to test connection
    const { error } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('  ✅ Server-side connection successful! (Table doesn\'t exist, but connection works)');
        return true;
      } else {
        console.error(`  ❌ Server-side connection failed: ${error.message}`);
        return false;
      }
    } else {
      console.log('  ✅ Server-side connection successful!');
      return true;
    }
  } catch (err) {
    console.error(`  ❌ Server-side connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    return false;
  }
}

// Test querying the sage table
async function testSageTable() {
  console.log('📊 Testing Sage Table Query...');
  
  let clientCount = 0;
  
  // Test with client-side key (respects RLS)
  console.log('  🔑 Using Client-Side Key (respects RLS)...');
  try {
    if (!supabaseUrl || !publishableKey) {
      throw new Error('Missing Supabase credentials');
    }
    const clientSupabase = createClient(supabaseUrl, publishableKey);
    
    const { data: clientData, error: clientError, count } = await clientSupabase
      .from('sage')
      .select('*', { count: 'exact' })
      .limit(5);
    
    clientCount = count ?? 0;
    
    if (clientError) {
      console.error(`    ❌ Query failed: ${clientError.message}`);
      console.error(`    Error code: ${clientError.code}`);
    } else {
      console.log(`    ✅ Query successful!`);
      console.log(`    📈 Total records (with RLS): ${clientCount}`);
      console.log(`    📋 Records returned: ${clientData?.length ?? 0}`);
    }
  } catch (err) {
    console.error(`    ❌ Query error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
  
  console.log('');
  
  // Test with server-side key (bypasses RLS)
  if (secretKey && supabaseUrl) {
    console.log('  🔐 Using Server-Side Key (bypasses RLS)...');
    try {
      if (!supabaseUrl || !secretKey) {
        throw new Error('Missing Supabase credentials');
      }
      const serverSupabase = createClient(supabaseUrl, secretKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      
      const { data: serverData, error: serverError, count: serverCount } = await serverSupabase
        .from('sage')
        .select('*', { count: 'exact' })
        .limit(5);
      
      if (serverError) {
        console.error(`    ❌ Query failed: ${serverError.message}`);
        console.error(`    Error code: ${serverError.code}`);
        return false;
      }
      
      console.log(`    ✅ Query successful!`);
      console.log(`    📈 Total records (bypassing RLS): ${serverCount ?? 'unknown'}`);
      console.log(`    📋 Sample records returned: ${serverData?.length ?? 0}`);
      console.log('');
      
      if (serverData && serverData.length > 0) {
        console.log('  📝 Sample Record:');
        const sample = serverData[0];
        console.log(`    - ID: ${sample.id}`);
        console.log(`    - Property Name: ${sample.property_name || sample.site_name || 'N/A'}`);
        console.log(`    - City: ${sample.city || 'N/A'}`);
        console.log(`    - State: ${sample.state || 'N/A'}`);
        console.log(`    - Latitude: ${sample.lat || 'N/A'}`);
        console.log(`    - Longitude: ${sample.lon || 'N/A'}`);
        console.log('');
        
        // Check for properties with valid coordinates
        const withCoords = serverData.filter((p: any) => p.lat && p.lon);
        console.log(`  🗺️  Records with coordinates: ${withCoords.length} out of ${serverData.length}`);
        
        if (withCoords.length > 0) {
          const sampleCoords = withCoords[0];
          console.log(`    Sample coordinates: lat=${sampleCoords.lat}, lon=${sampleCoords.lon}`);
        }
        
        // Check if RLS is blocking
        if (clientCount === 0 && serverCount && serverCount > 0) {
          console.log('');
          console.log('  ⚠️  WARNING: RLS policies are blocking client-side queries!');
          console.log('     The table has data, but client-side queries return 0 records.');
          console.log('');
          console.log('  🔧 Solution: Update RLS policies in Supabase to allow public read access.');
          console.log('     Run this SQL in your Supabase SQL editor:');
          console.log('');
          console.log('     CREATE POLICY "Allow public read access" ON sage');
          console.log('       FOR SELECT');
          console.log('       USING (true);');
          console.log('');
        }
      } else {
        console.log('  ⚠️  No records found in sage table');
      }
      
      return true;
    } catch (err) {
      console.error(`    ❌ Query error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  }
  
  return true;
}

// Run tests
async function runTests() {
  const clientTest = await testClientConnection();
  console.log('');
  const serverTest = await testServerConnection();
  console.log('');
  const sageTest = await testSageTable();
  console.log('');
  
  if (clientTest && serverTest && sageTest) {
    console.log('🎉 All tests passed! Your Supabase connection is working correctly.');
    console.log('\n📝 Next steps:');
    console.log('  1. Visit http://localhost:3001/map to see the property map');
    console.log('  2. The map should display markers for properties with valid coordinates');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed. Please check your configuration.');
    process.exit(1);
  }
}

runTests();

