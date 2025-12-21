/**
 * Script to count the total number of static property pages
 * This counts both glamping property pages and national park pages
 */

import { createServerClient } from '@/lib/supabase';
import { getAllPropertySlugs } from '@/lib/properties';
import { getAllNationalParkSlugs } from '@/lib/national-parks';

async function countStaticPropertyPages() {
  console.log('🔍 Counting static property pages...\n');

  try {
    // Get property slugs (glamping properties)
    const propertySlugs = await getAllPropertySlugs();
    const propertyCount = propertySlugs.length;

    // Get national park slugs
    const nationalParkSlugs = await getAllNationalParkSlugs();
    const nationalParkCount = nationalParkSlugs.length;

    // Total static pages (only generated for 'en' locale based on generateStaticParams)
    const totalStaticPages = propertyCount + nationalParkCount;

    console.log('📊 Static Property Pages Summary:');
    console.log('=====================================');
    console.log(`Glamping Property Pages: ${propertyCount}`);
    console.log(`National Park Pages:     ${nationalParkCount}`);
    console.log('-------------------------------------');
    console.log(`Total Static Pages:      ${totalStaticPages}`);
    console.log('\n');

    // Additional details
    console.log('📝 Notes:');
    console.log('- Pages are statically generated for locale: "en" only');
    console.log('- Other locales (es, fr, de) are rendered dynamically on-demand');
    console.log('- Each unique property name generates one page (not one per database record)');
    console.log('- Pages are revalidated every 24 hours (ISR)');

    return {
      glampingProperties: propertyCount,
      nationalParks: nationalParkCount,
      total: totalStaticPages,
    };
  } catch (error) {
    console.error('❌ Error counting static property pages:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  countStaticPropertyPages()
    .then((result) => {
      console.log('\n✅ Count complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to count pages:', error);
      process.exit(1);
    });
}

export { countStaticPropertyPages };



