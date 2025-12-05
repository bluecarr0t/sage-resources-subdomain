#!/usr/bin/env npx tsx
/**
 * Analyze sage-glamping-data table for data quality issues
 * Identifies:
 * - URLs in description field
 * - Partial sentences in getting_there field
 * - Missing website data
 * - Other data quality issues
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// URL regex pattern
const URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi;

interface DataQualityIssue {
  id: number;
  property_name: string | null;
  issue_type: string;
  field: string;
  current_value: string | null;
  suggestion?: string;
}

async function analyzeDataQuality() {
  console.log('🔍 Analyzing sage-glamping-data for data quality issues...\n');

  try {
    // Fetch all records
    console.log('📥 Fetching all records...');
    let allData: any[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('sage-glamping-data')
        .select('id, property_name, description, getting_there, url, google_website_uri')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('❌ Error fetching data:', error);
        process.exit(1);
      }

      if (!data || data.length === 0) {
        break;
      }

      allData = allData.concat(data);
      offset += batchSize;
      hasMore = data.length === batchSize;
      console.log(`  Fetched ${allData.length} records...`);
    }

    console.log(`✅ Fetched ${allData.length} total records\n`);

    const issues: DataQualityIssue[] = [];

    console.log('🔍 Analyzing data quality issues...\n');

    // 1. Check for URLs in description
    console.log('1. Checking for URLs in description field...');
    let urlsInDescription = 0;
    for (const record of allData) {
      if (record.description) {
        const urlMatches = record.description.match(URL_PATTERN);
        if (urlMatches && urlMatches.length > 0) {
          urlsInDescription++;
          issues.push({
            id: record.id,
            property_name: record.property_name,
            issue_type: 'URL_IN_DESCRIPTION',
            field: 'description',
            current_value: record.description.substring(0, 200),
            suggestion: `Extract URL: ${urlMatches[0]}`,
          });
        }
      }
    }
    console.log(`   Found ${urlsInDescription} records with URLs in description\n`);

    // 2. Check for partial sentences in getting_there
    console.log('2. Checking for partial sentences in getting_there field...');
    let partialSentences = 0;
    for (const record of allData) {
      if (record.getting_there) {
        const text = record.getting_there.trim();
        // Check if it doesn't end with proper punctuation and isn't too short
        if (text.length > 20 && !text.match(/[.!?]$/) && text.split(' ').length < 10) {
          partialSentences++;
          issues.push({
            id: record.id,
            property_name: record.property_name,
            issue_type: 'PARTIAL_SENTENCE_IN_GETTING_THERE',
            field: 'getting_there',
            current_value: text,
            suggestion: 'May be a partial sentence or fragment',
          });
        }
      }
    }
    console.log(`   Found ${partialSentences} records with potential partial sentences\n`);

    // 3. Check for missing website data
    console.log('3. Checking for missing website data...');
    let missingWebsites = 0;
    const missingWebsiteRecords: DataQualityIssue[] = [];
    for (const record of allData) {
      const hasUrl = record.url && record.url.trim().length > 0;
      const hasGoogleUrl = record.google_website_uri && record.google_website_uri.trim().length > 0;
      
      if (!hasUrl && !hasGoogleUrl) {
        missingWebsites++;
        missingWebsiteRecords.push({
          id: record.id,
          property_name: record.property_name,
          issue_type: 'MISSING_WEBSITE',
          field: 'url',
          current_value: null,
          suggestion: 'Fetch from Google Places API',
        });
      }
    }
    console.log(`   Found ${missingWebsites} records with missing website data\n`);
    issues.push(...missingWebsiteRecords);

    // 4. Check for URLs in getting_there
    console.log('4. Checking for URLs in getting_there field...');
    let urlsInGettingThere = 0;
    for (const record of allData) {
      if (record.getting_there) {
        const urlMatches = record.getting_there.match(URL_PATTERN);
        if (urlMatches && urlMatches.length > 0) {
          urlsInGettingThere++;
          issues.push({
            id: record.id,
            property_name: record.property_name,
            issue_type: 'URL_IN_GETTING_THERE',
            field: 'getting_there',
            current_value: record.getting_there.substring(0, 200),
            suggestion: `Extract URL: ${urlMatches[0]}`,
          });
        }
      }
    }
    console.log(`   Found ${urlsInGettingThere} records with URLs in getting_there\n`);

    // 5. Check for very long descriptions (potential data issues)
    console.log('5. Checking for unusually long descriptions...');
    let longDescriptions = 0;
    for (const record of allData) {
      if (record.description && record.description.length > 2000) {
        longDescriptions++;
        issues.push({
          id: record.id,
          property_name: record.property_name,
          issue_type: 'VERY_LONG_DESCRIPTION',
          field: 'description',
          current_value: `[${record.description.length} characters]`,
          suggestion: 'Review for potential concatenation or data issues',
        });
      }
    }
    console.log(`   Found ${longDescriptions} records with very long descriptions (>2000 chars)\n`);

    // 6. Check for empty or whitespace-only fields that should have data
    console.log('6. Checking for empty but expected fields...');
    let emptyDescriptions = 0;
    for (const record of allData) {
      if (!record.description || record.description.trim().length === 0) {
        emptyDescriptions++;
      }
    }
    console.log(`   Found ${emptyDescriptions} records with empty descriptions\n`);

    // Generate summary report
    console.log('='.repeat(70));
    console.log('DATA QUALITY ANALYSIS SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Records Analyzed: ${allData.length}`);
    console.log(`Total Issues Found: ${issues.length}\n`);
    
    console.log('Issue Breakdown:');
    const issueCounts = issues.reduce((acc, issue) => {
      acc[issue.issue_type] = (acc[issue.issue_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    for (const [type, count] of Object.entries(issueCounts)) {
      console.log(`  ${type}: ${count}`);
    }

    // Show sample issues
    console.log('\n' + '='.repeat(70));
    console.log('SAMPLE ISSUES (first 10)');
    console.log('='.repeat(70));
    
    for (let i = 0; i < Math.min(10, issues.length); i++) {
      const issue = issues[i];
      console.log(`\n${i + 1}. ${issue.property_name} (ID: ${issue.id})`);
      console.log(`   Issue: ${issue.issue_type}`);
      console.log(`   Field: ${issue.field}`);
      if (issue.current_value) {
        console.log(`   Current: ${issue.current_value.substring(0, 150)}${issue.current_value.length > 150 ? '...' : ''}`);
      }
      if (issue.suggestion) {
        console.log(`   Suggestion: ${issue.suggestion}`);
      }
    }

    // Export issues to JSON for further processing
    const fs = require('fs');
    const issuesJson = JSON.stringify(issues, null, 2);
    fs.writeFileSync('data-quality-issues.json', issuesJson);
    console.log('\n' + '='.repeat(70));
    console.log(`✅ Detailed issues exported to: data-quality-issues.json`);
    console.log(`   Total issues: ${issues.length}`);

    // Statistics for missing websites
    console.log('\n' + '='.repeat(70));
    console.log('MISSING WEBSITE STATISTICS');
    console.log('='.repeat(70));
    console.log(`Records missing website (url AND google_website_uri): ${missingWebsites}`);
    console.log(`Percentage: ${((missingWebsites / allData.length) * 100).toFixed(2)}%`);

    // Check how many have google_website_uri but not url
    let googleOnly = 0;
    for (const record of allData) {
      const hasUrl = record.url && record.url.trim().length > 0;
      const hasGoogleUrl = record.google_website_uri && record.google_website_uri.trim().length > 0;
      if (!hasUrl && hasGoogleUrl) {
        googleOnly++;
      }
    }
    console.log(`Records with google_website_uri but not url: ${googleOnly}`);
    console.log(`Records that need website from Google Places: ${missingWebsites}`);

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

analyzeDataQuality();
