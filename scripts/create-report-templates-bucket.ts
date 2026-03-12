/**
 * Create or update the report-templates storage bucket in Supabase.
 * Run with: npx tsx scripts/create-report-templates-bucket.ts
 *
 * Requires: SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * Templates are stored at: {templateKey}/template.docx, {templateKey}/template.xlsx
 * e.g. rv/template.docx, rv/template.xlsx, glamping/template.docx
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

const BUCKET_NAME = 'report-templates';
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
];

async function main() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET_NAME);

  if (exists) {
    const { error: updateError } = await supabase.storage.updateBucket(BUCKET_NAME, {
      fileSizeLimit: 104857600, // 100MB per file (templates with images can be 50MB+)
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });
    if (updateError) {
      console.error('Failed to update bucket:', updateError.message);
      process.exit(1);
    }
    console.log('Bucket "report-templates" updated successfully.');
    return;
  }

  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: false,
    fileSizeLimit: 104857600, // 100MB per file (templates with images can be 50MB+)
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (error) {
    console.error('Failed to create bucket:', error.message);
    process.exit(1);
  }

  console.log('Bucket "report-templates" created successfully.');
  console.log(
    'Run scripts/migrations/report-templates-storage-policies.sql in Supabase SQL Editor to add RLS policies.'
  );
}

main();
