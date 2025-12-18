import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { getCache } from '../lib/redis';

async function checkCache() {
  console.log('🔍 Checking Redis cache for map page data...\n');

  // Check property statistics cache
  const stats = await getCache('property-statistics');
  if (stats) {
    console.log('✅ property-statistics cache found!');
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log('ℹ️  property-statistics cache not found (normal on first request)');
  }

  // Check properties cache (example key)
  const propertiesKey = 'properties:' + JSON.stringify({
    filterCountry: ['United States', 'Canada'],
    filterState: [],
    filterUnitType: [],
    filterRateRange: [],
    bounds: null,
    fields: null
  });
  
  const properties = await getCache(propertiesKey);
  if (properties) {
    console.log(`\n✅ Properties cache found for default filters!`);
    console.log(`   Cached ${Array.isArray(properties) ? properties.length : 'N/A'} properties`);
  } else {
    console.log(`\nℹ️  Properties cache not found for default filters`);
  }
}

checkCache().catch(console.error);
