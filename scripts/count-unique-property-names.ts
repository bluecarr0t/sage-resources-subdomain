/**
 * Count unique property names in sage-glamping-data table
 * 
 * Run with: npx tsx scripts/count-unique-property-names.ts
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
  console.error('Please check your .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function countUniquePropertyNames() {
  console.log('🔍 Counting unique property names in sage-glamping-data...\n');

  try {
    // Fetch all records with property_name
    console.log('📥 Fetching all records from sage-glamping-data...');
    
    let allData: Array<{
      property_name: string | null;
    }> = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore) {
      const { data, error, count } = await supabase
        .from('sage-glamping-data')
        .select('property_name', { count: 'exact' })
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('❌ Error fetching data:', error);
        process.exit(1);
      }

      if (!data) {
        break;
      }

      if (count !== null && totalCount === 0) {
        totalCount = count;
      }

      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
      
      console.log(`  Fetched ${allData.length} / ${totalCount || '?'} records...`);
    }

    console.log(`✅ Fetched ${allData.length} total records\n`);

    // Count unique property names
    const uniquePropertyNames = new Set<string>();
    let nullCount = 0;

    for (const record of allData) {
      const propertyName = record.property_name;
      if (!propertyName || propertyName.trim() === '') {
        nullCount++;
        continue;
      }
      uniquePropertyNames.add(propertyName.trim());
    }

    console.log('📊 Results:\n');
    console.log(`✅ Total unique property names: ${uniquePropertyNames.size}`);
    console.log(`📝 Total records: ${allData.length}`);
    console.log(`   - Records with property_name: ${allData.length - nullCount}`);
    console.log(`   - Records without property_name: ${nullCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the analysis
countUniquePropertyNames()
  .then(() => {
    console.log('\n✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
