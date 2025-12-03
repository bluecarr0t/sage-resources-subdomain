/**
 * Script to clean state names in the sage-updated table
 * Converts state abbreviations (e.g., "CA") to full names (e.g., "California")
 * 
 * Usage:
 *   npx tsx scripts/clean-state-names.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local');
  process.exit(1);
}

const TABLE_NAME = 'sage-updated';

// US State abbreviations to full names
const US_STATE_MAP: Record<string, string> = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia',
};

// Canadian province abbreviations to full names
const CANADIAN_PROVINCE_MAP: Record<string, string> = {
  'AB': 'Alberta',
  'BC': 'British Columbia',
  'MB': 'Manitoba',
  'NB': 'New Brunswick',
  'NL': 'Newfoundland and Labrador',
  'NS': 'Nova Scotia',
  'NT': 'Northwest Territories',
  'NU': 'Nunavut',
  'ON': 'Ontario',
  'PE': 'Prince Edward Island',
  'QC': 'Quebec',
  'SK': 'Saskatchewan',
  'YT': 'Yukon',
};

// Combined map (US states take precedence if there's a conflict)
const STATE_MAP: Record<string, string> = {
  ...US_STATE_MAP,
  ...CANADIAN_PROVINCE_MAP,
};

/**
 * Normalize state name - convert abbreviation to full name if needed
 */
function normalizeStateName(state: string | null): string | null {
  if (!state || typeof state !== 'string') {
    return state;
  }

  const trimmed = state.trim();
  
  // If already a full name (more than 2 characters), check if it's already correct
  if (trimmed.length > 2) {
    // Check if it's already a full state name (case-insensitive)
    const fullNames = Object.values(STATE_MAP);
    const isFullName = fullNames.some(name => name.toLowerCase() === trimmed.toLowerCase());
    if (isFullName) {
      // Return properly capitalized version
      const found = fullNames.find(name => name.toLowerCase() === trimmed.toLowerCase());
      return found || trimmed;
    }
    // Might be a full name not in our map, return as-is
    return trimmed;
  }

  // Check if it's an abbreviation (2 characters)
  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    const fullName = STATE_MAP[upper];
    if (fullName) {
      return fullName;
    }
  }

  // Not recognized, return as-is
  return trimmed;
}

/**
 * Main function to clean state names
 */
async function cleanStateNames() {
  console.log('🔍 Starting state name cleaning process...\n');

  // Create Supabase client
  const supabase = createClient(supabaseUrl!, secretKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    // Fetch all rows (Supabase default limit is 1000, so we need to paginate)
    console.log('📥 Fetching all rows from sage-updated table...');
    let allRows: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: rows, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('id, state')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (fetchError) {
        throw new Error(`Failed to fetch rows: ${fetchError.message}`);
      }

      if (rows && rows.length > 0) {
        allRows = allRows.concat(rows);
        page++;
        hasMore = rows.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    const rows = allRows;

    if (!rows || rows.length === 0) {
      console.log('⚠️  No rows found in table');
      return;
    }

    console.log(`✅ Fetched ${rows.length} rows\n`);

    // Analyze and prepare updates
    const updates: Array<{ id: number; oldState: string | null; newState: string | null }> = [];
    const stateStats: Record<string, number> = {};

    for (const row of rows) {
      const oldState = row.state;
      const newState = normalizeStateName(oldState);
      
      // Track state distribution
      const stateKey = newState || '(null)';
      stateStats[stateKey] = (stateStats[stateKey] || 0) + 1;

      if (oldState !== newState) {
        updates.push({
          id: row.id,
          oldState,
          newState,
        });
      }
    }

    // Display statistics
    console.log('📊 State Distribution:');
    const sortedStates = Object.entries(stateStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20
    sortedStates.forEach(([state, count]) => {
      console.log(`   ${state}: ${count}`);
    });
    console.log('');

    if (updates.length === 0) {
      console.log('✅ All state names are already in full format!');
      return;
    }

    console.log(`📝 Found ${updates.length} rows that need updating\n`);

    // Show sample updates
    console.log('📋 Sample updates (first 10):');
    updates.slice(0, 10).forEach(update => {
      console.log(`   ID ${update.id}: "${update.oldState}" → "${update.newState}"`);
    });
    if (updates.length > 10) {
      console.log(`   ... and ${updates.length - 10} more`);
    }
    console.log('');

    // Update in batches
    const BATCH_SIZE = 100;
    let updated = 0;
    let errors = 0;

    console.log(`📤 Updating ${updates.length} rows in batches of ${BATCH_SIZE}...\n`);

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(updates.length / BATCH_SIZE);

      // Update each row individually (Supabase doesn't support bulk updates with different values easily)
      for (const update of batch) {
        const { error } = await supabase
          .from(TABLE_NAME)
          .update({ state: update.newState })
          .eq('id', update.id);

        if (error) {
          console.error(`  ❌ Error updating ID ${update.id}: ${error.message}`);
          errors++;
        } else {
          updated++;
        }
      }

      console.log(`  ✅ Batch ${batchNumber}/${totalBatches} processed (${updated} updated, ${errors} errors)`);
    }

    console.log('\n📊 Final Summary:');
    console.log(`   ✅ Successfully updated: ${updated} rows`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors} rows`);
    }
    console.log('');

    if (errors === 0) {
      console.log('🎉 State name cleaning completed successfully!');
    } else {
      console.log('⚠️  Cleaning completed with some errors. Please review the output above.');
    }

  } catch (error) {
    console.error('\n❌ Error during cleaning:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the cleaning
cleanStateNames();

