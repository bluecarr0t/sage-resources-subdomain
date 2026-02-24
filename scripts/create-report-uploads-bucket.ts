/**
 * Create the report-uploads storage bucket in Supabase.
 * Run with: npx tsx scripts/create-report-uploads-bucket.ts
 *
 * Requires: SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function main() {
  const { data, error } = await supabase.storage.createBucket('report-uploads', {
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  });

  if (error) {
    if (error.message?.includes('already exists')) {
      console.log('Bucket "report-uploads" already exists.');
      return;
    }
    console.error('Failed to create bucket:', error.message);
    process.exit(1);
  }

  console.log('Bucket "report-uploads" created successfully.');
}

main();
