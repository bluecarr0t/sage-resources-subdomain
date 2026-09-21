/**
 * Create or update the private client-portal-files storage bucket.
 * Run with: npx tsx scripts/create-client-portal-files-bucket.ts
 *
 * Requires: SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  CLIENT_PORTAL_ALLOWED_MIME_TYPES,
  CLIENT_PORTAL_MAX_FILE_BYTES,
  CLIENT_PORTAL_STORAGE_BUCKET,
} from '../lib/client-portal/constants';

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
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === CLIENT_PORTAL_STORAGE_BUCKET);

  const options = {
    public: false,
    fileSizeLimit: CLIENT_PORTAL_MAX_FILE_BYTES,
    allowedMimeTypes: [...CLIENT_PORTAL_ALLOWED_MIME_TYPES],
  };

  if (exists) {
    const { error } = await supabase.storage.updateBucket(
      CLIENT_PORTAL_STORAGE_BUCKET,
      options
    );
    if (error) {
      console.error('Failed to update bucket:', error.message);
      process.exit(1);
    }
    console.log(`Bucket "${CLIENT_PORTAL_STORAGE_BUCKET}" updated.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(
    CLIENT_PORTAL_STORAGE_BUCKET,
    options
  );
  if (error) {
    console.error('Failed to create bucket:', error.message);
    process.exit(1);
  }
  console.log(`Bucket "${CLIENT_PORTAL_STORAGE_BUCKET}" created.`);
}

void main();
