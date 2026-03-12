/**
 * Upload report templates from local templates/ directory to Supabase Storage.
 * Run with: npx tsx scripts/upload-report-templates.ts
 *
 * Requires: SUPABASE_SECRET_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 *
 * Template layout:
 *   templates/rv/template.docx
 *   templates/rv/template.xlsx
 *   templates/glamping/template.docx  (when added)
 *   templates/glamping/template.xlsx (when added)
 *
 * Run scripts/create-report-templates-bucket.ts first if the bucket does not exist.
 */

import * as fs from 'fs';
import * as path from 'path';
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

const TEMPLATE_KEYS = ['rv', 'glamping'] as const;
const TEMPLATE_EXTENSIONS = ['.docx', '.xlsx'] as const;

const MIME_TYPES: Record<string, string> = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

async function main() {
  const templatesDir = path.join(process.cwd(), 'templates');
  let uploaded = 0;
  let skipped = 0;

  for (const key of TEMPLATE_KEYS) {
    const keyDir = path.join(templatesDir, key);
    if (!fs.existsSync(keyDir)) {
      console.log(`Skipping ${key}/ (directory not found)`);
      skipped += TEMPLATE_EXTENSIONS.length;
      continue;
    }

    for (const ext of TEMPLATE_EXTENSIONS) {
      const filename = `template${ext}`;
      const localPath = path.join(keyDir, filename);
      const storagePath = `${key}/${filename}`;

      if (!fs.existsSync(localPath)) {
        console.log(`Skipping ${storagePath} (file not found)`);
        skipped++;
        continue;
      }

      const buffer = fs.readFileSync(localPath);
      const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream';

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        console.error(`Failed to upload ${storagePath}:`, error.message);
        process.exit(1);
      }

      console.log(`Uploaded ${storagePath}`);
      uploaded++;
    }
  }

  console.log(`\nDone. Uploaded ${uploaded} file(s), skipped ${skipped}.`);
}

main();
