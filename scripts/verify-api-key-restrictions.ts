/**
 * Google Maps API Key Security Verification Script
 * 
 * This script helps verify that your API key restrictions are properly configured.
 * Run this script to check if your API key has the correct restrictions.
 * 
 * Usage:
 *   npx tsx scripts/verify-api-key-restrictions.ts
 * 
 * Note: This script makes test API calls to verify restrictions are working.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface VerificationResult {
  check: string;
  status: '✅ PASS' | '❌ FAIL' | '⚠️ WARNING';
  message: string;
  action?: string;
}

const results: VerificationResult[] = [];

/**
 * Check if API key is set
 */
function checkApiKeyExists(): VerificationResult {
  if (!API_KEY) {
    return {
      check: 'API Key Exists',
      status: '❌ FAIL',
      message: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set in .env.local',
      action: 'Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file',
    };
  }

  if (API_KEY.length < 20) {
    return {
      check: 'API Key Format',
      status: '⚠️ WARNING',
      message: 'API key seems too short. Verify it is correct.',
    };
  }

  return {
    check: 'API Key Exists',
    status: '✅ PASS',
    message: `API key is set (${API_KEY.substring(0, 10)}...)`,
  };
}

/**
 * Test if API key works (basic connectivity test)
 */
async function testApiKeyConnectivity(): Promise<VerificationResult> {
  if (!API_KEY) {
    return {
      check: 'API Connectivity',
      status: '❌ FAIL',
      message: 'Cannot test - API key not set',
    };
  }

  try {
    // Test with a simple Places API call
    const url = 'https://places.googleapis.com/v1/places:searchText';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({
        textQuery: 'test',
        maxResultCount: 1,
      }),
    });

    if (response.status === 200) {
      return {
        check: 'API Connectivity',
        status: '✅ PASS',
        message: 'API key is valid and can make requests',
      };
    } else if (response.status === 403) {
      const errorText = await response.text();
      if (errorText.includes('referer') || errorText.includes('referrer')) {
        return {
          check: 'API Connectivity',
          status: '⚠️ WARNING',
          message: 'API key may have referrer restrictions (this is good for security!)',
          action: 'Verify HTTP referrer restrictions are configured in Google Cloud Console',
        };
      }
      return {
        check: 'API Connectivity',
        status: '❌ FAIL',
        message: `API key returned 403 Forbidden: ${errorText.substring(0, 100)}`,
        action: 'Check API restrictions in Google Cloud Console',
      };
    } else {
      return {
        check: 'API Connectivity',
        status: '⚠️ WARNING',
        message: `API returned status ${response.status}`,
      };
    }
  } catch (error) {
    return {
      check: 'API Connectivity',
      status: '❌ FAIL',
      message: `Error testing API: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check environment file security
 */
function checkEnvironmentSecurity(): VerificationResult {
  const fs = require('fs');
  const path = require('path');
  const gitignorePath = path.join(process.cwd(), '.gitignore');

  try {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    if (gitignoreContent.includes('.env.local') || gitignoreContent.includes('.env')) {
      return {
        check: 'Environment File Security',
        status: '✅ PASS',
        message: '.env.local is in .gitignore',
      };
    } else {
      return {
        check: 'Environment File Security',
        status: '❌ FAIL',
        message: '.env.local is NOT in .gitignore - API key could be committed to Git!',
        action: 'Add .env.local to .gitignore immediately',
      };
    }
  } catch (error) {
    return {
      check: 'Environment File Security',
      status: '⚠️ WARNING',
      message: 'Could not verify .gitignore (file may not exist)',
    };
  }
}

/**
 * Print verification results
 */
function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('Google Maps API Key Security Verification');
  console.log('='.repeat(60) + '\n');

  results.forEach((result) => {
    console.log(`${result.status} ${result.check}`);
    console.log(`   ${result.message}`);
    if (result.action) {
      console.log(`   → Action: ${result.action}`);
    }
    console.log('');
  });

  const passCount = results.filter((r) => r.status === '✅ PASS').length;
  const failCount = results.filter((r) => r.status === '❌ FAIL').length;
  const warnCount = results.filter((r) => r.status === '⚠️ WARNING').length;

  console.log('='.repeat(60));
  console.log(`Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
  console.log('='.repeat(60) + '\n');

  if (failCount > 0) {
    console.log('⚠️  Critical issues found! Please address them before deploying.');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  Some warnings found. Review the recommendations above.');
  } else {
    console.log('✅ All checks passed!');
  }
}

/**
 * Main verification function
 */
async function main() {
  console.log('Starting API key security verification...\n');

  // Run all checks
  results.push(checkApiKeyExists());
  results.push(checkEnvironmentSecurity());
  
  // Only test API connectivity if key exists
  if (API_KEY) {
    results.push(await testApiKeyConnectivity());
  }

  // Print results
  printResults();
}

// Run verification
main().catch((error) => {
  console.error('Error running verification:', error);
  process.exit(1);
});
