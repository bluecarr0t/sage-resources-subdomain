#!/usr/bin/env npx tsx
/**
 * Verify campsites in database
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function verify() {
  const { data, error } = await supabase
    .from('ridb_campsites')
    .select('ridb_campsite_id, name, campsite_type, loop, site, campsite_accessible, facility_name, facility_state, attributes, permitted_equipment, media, entity_media, data_completeness_score, created_date, last_updated_date')
    .limit(10)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('='.repeat(70));
  console.log('Database Verification');
  console.log('='.repeat(70));
  console.log(`✅ Found ${data?.length || 0} campsites in database\n`);

  if (data && data.length > 0) {
    console.log('Sample records:');
    data.forEach((c, i) => {
      console.log(`\n${i + 1}. ${c.name}`);
      console.log(`   ID: ${c.ridb_campsite_id}`);
      console.log(`   Type: ${c.campsite_type || 'N/A'}`);
      console.log(`   Loop: ${c.loop || 'N/A'}`);
      console.log(`   Site: ${c.site || 'N/A'}`);
      console.log(`   Accessible: ${c.campsite_accessible ?? 'N/A'}`);
      console.log(`   Facility: ${c.facility_name || 'N/A'}`);
      console.log(`   State: ${c.facility_state || 'N/A'}`);
      console.log(`   Created Date: ${c.created_date || 'N/A'}`);
      console.log(`   Last Updated: ${c.last_updated_date || 'N/A'}`);
      console.log(`   Attributes: ${Array.isArray(c.attributes) ? c.attributes.length : 0} items`);
      console.log(`   Permitted Equipment: ${Array.isArray(c.permitted_equipment) ? c.permitted_equipment.length : 0} items`);
      console.log(`   Media: ${Array.isArray(c.media) ? c.media.length : 0} items`);
      console.log(`   Entity Media: ${Array.isArray(c.entity_media) ? c.entity_media.length : 0} items`);
      console.log(`   Completeness: ${c.data_completeness_score || 0}%`);
    });
  }

  // Check total count
  const { count } = await supabase
    .from('ridb_campsites')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total campsites in database: ${count || 0}`);
  console.log('='.repeat(70));
}

verify().catch(console.error);

