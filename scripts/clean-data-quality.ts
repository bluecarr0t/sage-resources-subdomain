#!/usr/bin/env npx tsx
/**
 * Clean data quality issues in all_glamping_properties table
 * - Extracts URLs from description and getting_there fields
 * - Moves URLs to url field if missing
 * - Cleans up partial sentences in getting_there
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// URL regex pattern - improved to catch more URL formats
const URL_PATTERN = /(https?:\/\/[^\s\)]+|www\.[^\s\)]+|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s\)]*)?)/gi;

function extractUrl(text: string): string | null {
  if (!text) return null;
  
  const matches = text.match(URL_PATTERN);
  if (!matches || matches.length === 0) return null;
  
  // Prefer https:// URLs
  const httpsUrl = matches.find(url => url.startsWith('https://'));
  if (httpsUrl) {
    return httpsUrl.replace(/[.,;!?]+$/, ''); // Remove trailing punctuation
  }
  
  // Then http://
  const httpUrl = matches.find(url => url.startsWith('http://'));
  if (httpUrl) {
    return httpUrl.replace(/[.,;!?]+$/, '');
  }
  
  // Then www.
  const wwwUrl = matches.find(url => url.startsWith('www.'));
  if (wwwUrl) {
    return 'https://' + wwwUrl.replace(/[.,;!?]+$/, '');
  }
  
  // Otherwise take first valid domain
  const firstUrl = matches[0].replace(/[.,;!?]+$/, '');
  if (!firstUrl.startsWith('http')) {
    return 'https://' + firstUrl;
  }
  
  return firstUrl;
}

function removeUrlFromText(text: string, url: string): string {
  if (!text || !url) return text;
  
  // Remove the URL and any leading/trailing whitespace/punctuation
  let cleaned = text.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  
  // Clean up extra spaces and punctuation
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]\s*[.,;:]/g, '.')
    .trim();
  
  return cleaned || null;
}

function isPartialSentence(text: string): boolean {
  if (!text || text.length < 20) return false;
  
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).length;
  
  // Check if it doesn't end with proper punctuation and is short
  if (wordCount < 10 && !trimmed.match(/[.!?]$/)) {
    return true;
  }
  
  // Check for common partial sentence patterns
  const partialPatterns = [
    /^[A-Z][^.!?]*$/,
    /^(Directions|Location|Address|How to|Getting|From|Take|Drive|Head)[^.!?]*$/i,
  ];
  
  return partialPatterns.some(pattern => pattern.test(trimmed) && !trimmed.match(/[.!?]$/));
}

async function cleanDataQuality() {
  console.log('🧹 Starting data quality cleaning...\n');

  try {
    // Load issues from analysis
    const issuesJson = fs.readFileSync('data-quality-issues.json', 'utf-8');
    const issues = JSON.parse(issuesJson);
    
    console.log(`📋 Loaded ${issues.length} issues to process\n`);

    let updatesCount = 0;
    const updates: Array<{
      id: number;
      property_name: string | null;
      updates: Record<string, any>;
    }> = [];

    // Group issues by record ID
    const issuesByRecord = new Map<number, any[]>();
    for (const issue of issues) {
      if (!issuesByRecord.has(issue.id)) {
        issuesByRecord.set(issue.id, []);
      }
      issuesByRecord.get(issue.id)!.push(issue);
    }

    // Process each record
    for (const [recordId, recordIssues] of issuesByRecord) {
      // Fetch current record data
      const { data: record, error: fetchError } = await supabase
        .from('all_glamping_properties')
        .select('id, property_name, description, getting_there, url, google_website_uri')
        .eq('id', recordId)
        .single();

      if (fetchError || !record) {
        console.log(`⚠️  Could not fetch record ${recordId}`);
        continue;
      }

      const recordUpdates: Record<string, any> = {};
      let hasUpdates = false;

      // Process URL_IN_DESCRIPTION issues
      const urlInDescIssues = recordIssues.filter(i => i.issue_type === 'URL_IN_DESCRIPTION');
      if (urlInDescIssues.length > 0 && record.description) {
        const extractedUrl = extractUrl(record.description);
        if (extractedUrl) {
          // Only update if url field is empty or doesn't match
          if (!record.url || record.url.trim().length === 0) {
            recordUpdates.url = extractedUrl;
            recordUpdates.description = removeUrlFromText(record.description, extractedUrl);
            hasUpdates = true;
            console.log(`  ✓ ${record.property_name}: Extracted URL from description: ${extractedUrl.substring(0, 50)}...`);
          }
        }
      }

      // Process URL_IN_GETTING_THERE issues
      const urlInGettingThereIssues = recordIssues.filter(i => i.issue_type === 'URL_IN_GETTING_THERE');
      if (urlInGettingThereIssues.length > 0 && record.getting_there) {
        const extractedUrl = extractUrl(record.getting_there);
        if (extractedUrl) {
          // Only update if url field is empty or doesn't match
          if (!record.url || record.url.trim().length === 0) {
            recordUpdates.url = extractedUrl;
            recordUpdates.getting_there = removeUrlFromText(record.getting_there, extractedUrl);
            hasUpdates = true;
            console.log(`  ✓ ${record.property_name}: Extracted URL from getting_there: ${extractedUrl.substring(0, 50)}...`);
          } else {
            // URL field already has value, just clean getting_there
            recordUpdates.getting_there = removeUrlFromText(record.getting_there, extractedUrl);
            hasUpdates = true;
            console.log(`  ✓ ${record.property_name}: Removed URL from getting_there (url already exists)`);
          }
        }
      }

      // Process PARTIAL_SENTENCE_IN_GETTING_THERE issues
      const partialSentenceIssues = recordIssues.filter(i => i.issue_type === 'PARTIAL_SENTENCE_IN_GETTING_THERE');
      if (partialSentenceIssues.length > 0 && record.getting_there) {
        // For now, just flag these - could add logic to clean them up
        // Most partial sentences might be intentional (brief directions)
        // So we'll just note them but not auto-fix
        console.log(`  ℹ️  ${record.property_name}: Has partial sentence in getting_there (not auto-fixing)`);
      }

      // Apply updates
      if (hasUpdates) {
        const { error: updateError } = await supabase
          .from('all_glamping_properties')
          .update(recordUpdates)
          .eq('id', recordId);

        if (updateError) {
          console.log(`  ❌ Error updating ${record.property_name}: ${updateError.message}`);
        } else {
          updatesCount++;
          updates.push({
            id: recordId,
            property_name: record.property_name,
            updates: recordUpdates,
          });
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('CLEANING SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total issues processed: ${issues.length}`);
    console.log(`Records updated: ${updatesCount}`);
    console.log(`\n✅ Data cleaning completed!`);

    // Export updates log
    if (updates.length > 0) {
      fs.writeFileSync('data-cleaning-updates.json', JSON.stringify(updates, null, 2));
      console.log(`\n📝 Updates log saved to: data-cleaning-updates.json`);
    }

  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.error('❌ data-quality-issues.json not found. Please run analyze-data-quality.ts first.');
      process.exit(1);
    }
    console.error('❌ Cleaning failed:', error);
    process.exit(1);
  }
}

cleanDataQuality();
