/**
 * Create or update the report-uploads storage bucket in Supabase.
 * Run with: npx tsx scripts/create-report-uploads-bucket.ts
 *
 * Requires: SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * If the bucket exists, updates it to allow .xlsx, .docx, and .pdf files.
 * The bucket was previously created with only Word MIME type, which blocked Excel uploads.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function main() {
  const BUCKET_NAME = 'report-uploads';
  const ALLOWED_MIME_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    'application/octet-stream', // .xlsxm (browsers may send this for non-standard extensions)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc (Word 97-2003)
    'application/pdf',
  ];

  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (exists) {
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
      fileSizeLimit: 104857600, // 100MB (Pro plan)
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    if (updateError) {
      console.error('Failed to update bucket:', updateError.message);
      process.exit(1);
    }
    console.log('Bucket "report-uploads" updated with correct MIME types (Excel, Word, PDF).');
    return;
  }

  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 104857600, // 100MB (Pro plan)
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (error) {
    console.error('Failed to create bucket:', error.message);
    process.exit(1);
  }

  console.log('Bucket "report-uploads" created successfully.');
}

main();
