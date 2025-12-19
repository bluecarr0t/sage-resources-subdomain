/**
 * Script to clear all property-related Redis caches
 * 
 * Note: Next.js cache tags can only be revalidated from API routes or Server Actions.
 * To fully clear Next.js cache, call: POST /api/revalidate-properties
 * 
 * Usage:
 *   npx tsx scripts/clear-properties-cache.ts
 */

import { deleteCache, deleteCachePattern } from '@/lib/redis';

async function main() {
  console.log('🔄 Clearing all property-related Redis caches...\n');
  
  try {
    // Clear property statistics cache
    console.log('Clearing property-statistics cache...');
    await deleteCache('property-statistics');
    
    // Clear all property filter caches
    console.log('Clearing property filter caches (properties:*)...');
    const deletedCount = await deleteCachePattern('properties:*');
    
    console.log('\n✅ Redis cache cleared successfully!');
    console.log(`   Cache keys deleted: ${deletedCount}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Property pages will fetch fresh data on next request');
    console.log('   2. Map page will show updated property counts');
    console.log('   3. All property queries will use fresh database data');
    console.log('\n💡 To also clear Next.js cache tags, call:');
    console.log('   POST /api/revalidate-properties');
    console.log('   (or visit: http://localhost:3000/api/revalidate-properties)');
  } catch (error) {
    console.error('❌ Error clearing cache:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
