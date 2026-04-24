/**
 * Script to verify if a property meets all requirements to appear on the map
 * 
 * Usage:
 * npx tsx scripts/verify-property-requirements.ts <property_id_or_name>
 * 
 * Or modify the script to check a specific property
 */

import { createServerClient } from '@/lib/supabase';
import { parseCoordinates, isInUSAOrCanada } from '@/lib/types/sage';

async function verifyProperty(propertyIdOrName: string | number) {
  const supabase = createServerClient();
  
  // Try to find the property by ID or name
  let query = supabase.from('all_glamping_properties').select('*');
  
  if (typeof propertyIdOrName === 'number') {
    query = query.eq('id', propertyIdOrName);
  } else {
    query = query.ilike('property_name', `%${propertyIdOrName}%`).limit(10);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching property:', error);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No property found with that ID or name');
    return;
  }
  
  console.log(`\n🔍 Found ${data.length} property/properties. Checking requirements...\n`);
  
  for (const property of data) {
    console.log(`\n📋 Property: ${property.property_name || property.site_name || `ID: ${property.id}`}`);
    console.log('─'.repeat(60));
    
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check is_glamping_property
    if (property.is_glamping_property !== 'Yes') {
      issues.push(`❌ is_glamping_property = '${property.is_glamping_property}' (must be 'Yes')`);
    } else {
      console.log('✅ is_glamping_property = "Yes"');
    }
    
    // Check is_open
    if (property.is_open === 'No') {
      issues.push(`❌ is_open = 'No' (property is marked as closed)`);
    } else {
      console.log('✅ is_open is not "No" (operating)');
    }
    
    // Check coordinates
    const coords = parseCoordinates(property.lat, property.lon);
    if (!coords) {
      issues.push(`❌ Invalid or missing coordinates (lat: ${property.lat}, lon: ${property.lon})`);
    } else {
      console.log(`✅ Valid coordinates: ${coords[0]}, ${coords[1]}`);
      
      // Check if in USA/Canada bounds
      if (!isInUSAOrCanada(coords[0], coords[1])) {
        issues.push(`❌ Coordinates outside USA/Canada bounds (lat: ${coords[0]}, lon: ${coords[1]})`);
      } else {
        console.log('✅ Coordinates within USA/Canada bounds');
      }
    }
    
    // Check country field (for filtering)
    if (!property.country || (property.country !== 'USA' && property.country !== 'United States' && property.country !== 'US' && property.country !== 'Canada' && property.country !== 'CA')) {
      warnings.push(`⚠️  country = '${property.country}' (should be 'USA', 'United States', 'US', 'Canada', or 'CA' for proper filtering)`);
    } else {
      console.log(`✅ country = "${property.country}"`);
    }
    
    // Summary
    console.log('\n📊 Summary:');
    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ Property meets all requirements! It should appear on the map after cache is cleared.');
    } else {
      if (issues.length > 0) {
        console.log('\n❌ Issues (must be fixed):');
        issues.forEach(issue => console.log(`   ${issue}`));
      }
      if (warnings.length > 0) {
        console.log('\n⚠️  Warnings (may affect filtering):');
        warnings.forEach(warning => console.log(`   ${warning}`));
      }
      console.log('\n💡 After fixing issues, clear the cache by visiting: /api/revalidate-properties');
    }
  }
}

// Get property ID or name from command line args
const propertyIdOrName = process.argv[2];

if (!propertyIdOrName) {
  console.log('Usage: npx tsx scripts/verify-property-requirements.ts <property_id_or_name>');
  console.log('\nExample:');
  console.log('  npx tsx scripts/verify-property-requirements.ts 12345');
  console.log('  npx tsx scripts/verify-property-requirements.ts "Hideout Lodge"');
  process.exit(1);
}

verifyProperty(propertyIdOrName).catch(console.error);

