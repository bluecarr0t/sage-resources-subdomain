#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey!);

async function main() {
  // 462524e3 has no report.docx (only workbooks). 7b5be5f2 has report.docx
  const path = '7b5be5f2-9234-403a-9339-e52b06ab1161/report.docx';
  const { data, error } = await supabase.storage.from('report-uploads').download(path);
  console.log('Error:', error);
  console.log('Error type:', typeof error);
  if (error) {
    console.log('Error keys:', Object.keys(error));
    console.log('Error.message:', error.message);
    console.log('Error.error:', (error as { error?: string }).error);
  }
  console.log('Data:', data ? `Blob ${data.size} bytes` : 'null');

  // List bucket contents
  const { data: list, error: listErr } = await supabase.storage.from('report-uploads').list('', { limit: 20 });
  console.log('\nBucket root list:', listErr ?? list?.map((f) => f.name));

  // List inside one folder (with nested)
  const { data: folderList } = await supabase.storage.from('report-uploads').list('462524e3-8fd1-4d50-839a-248c5dd8bf16', { limit: 50 });
  console.log('\nFiles in 462524e3...:', folderList?.map((f) => `${f.name} (${f.id ?? 'dir'})`));

  const { data: workbooksList } = await supabase.storage.from('report-uploads').list('462524e3-8fd1-4d50-839a-248c5dd8bf16/workbooks', { limit: 20 });
  console.log('\nFiles in workbooks:', workbooksList?.map((f) => f.name));

  // Try another report folder
  const { data: folder2 } = await supabase.storage.from('report-uploads').list('7b5be5f2-9234-403a-9339-e52b06ab1161');
  console.log('\nFiles in 7b5be5f2... (25-109A-25):', folder2?.map((f) => f.name));
}

main();
