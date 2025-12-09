#!/usr/bin/env npx tsx
/**
 * Analyze properties in sage-glamping-data to identify properties that are NOT glamping resorts
 * 
 * Criteria for a glamping resort:
 * 1. 4 or more units on property
 * 2. Has a business website, NOT only on OTAs (airbnb, hipcamp, etc.)
 * 3. 50% or greater are glamping unit types
 * 
 * Run with: npx tsx scripts/analyze-non-glamping-resorts.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { SageProperty } from '@/lib/types/sage';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Glamping unit types (case-insensitive matching)
const GLAMPING_UNIT_TYPES = [
  'a frame',
  'airstream',
  'bell tent',
  'cabin',
  'canvas tent',
  'covered wagon',
  'dome',
  'safari tent',
  'tiny home',
  'tipi',
  'treehouse',
  'vintage trailer',
  'yurt',
  'mirror cabin',
];

// Non-glamping unit types (explicitly excluded)
const EXCLUDED_UNIT_TYPES = [
  'RV Site',
  'Tent Site',
  'Vehicles',
  'Vacation Rental',
  'Rv Or Trailer',
  'Van Bus',
  'Quirky',
  'Lodge Or Hotel Room',
  'Silos',
  'Shepherd S Hut',
  'Train Boxcar',
  'Barn',
  'Bungalow',
  'Glamping Pod',
];

// OTA domains (Online Travel Agencies)
const OTA_DOMAINS = [
  'airbnb.com',
  'airbnb.ca',
  'vrbo.com',
  'booking.com',
  'expedia.com',
  'hipcamp.com',
  'glamping.com',
  'tentrr.com',
  'getaway.house',
  'under-canvas.com',
  'collectiveretreats.com',
  'autocamp.com',
];

interface PropertyAnalysis {
  propertyName: string;
  totalUnits: number;
  glampingUnits: number;
  nonGlampingUnits: number;
  excludedUnits: number;
  glampingPercentage: number;
  hasBusinessWebsite: boolean;
  websiteUrl: string | null;
  isOtaOnly: boolean;
  meetsCriteria: {
    has4PlusUnits: boolean;
    hasBusinessWebsite: boolean;
    has50PercentGlamping: boolean;
  };
  unitTypes: Array<{
    type: string;
    count: number;
  }>;
  records: SageProperty[];
}

function normalizeUnitType(unitType: string | null): string {
  if (!unitType) return '';
  return unitType.trim().toLowerCase();
}

function isGlampingUnitType(unitType: string | null): boolean {
  const normalized = normalizeUnitType(unitType);
  return GLAMPING_UNIT_TYPES.some(type => normalized === type.toLowerCase());
}

function isExcludedUnitType(unitType: string | null): boolean {
  if (!unitType) return false;
  const normalized = normalizeUnitType(unitType);
  return EXCLUDED_UNIT_TYPES.some(type => normalized === type.toLowerCase());
}

function isOtaUrl(url: string | null): boolean {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return OTA_DOMAINS.some(domain => lowerUrl.includes(domain));
}

function hasBusinessWebsite(property: SageProperty): { has: boolean; url: string | null; isOtaOnly: boolean } {
  const url = property.url || property.google_website_uri;
  
  if (!url || url.trim().length === 0) {
    return { has: false, url: null, isOtaOnly: false };
  }
  
  const trimmedUrl = url.trim();
  const isOta = isOtaUrl(trimmedUrl);
  
  // If it's an OTA URL, check if there's also a non-OTA URL
  if (isOta) {
    // Check if there's a non-OTA URL in the other field
    const otherUrl = property.url ? property.google_website_uri : property.url;
    if (otherUrl && !isOtaUrl(otherUrl)) {
      return { has: true, url: otherUrl, isOtaOnly: false };
    }
    return { has: false, url: trimmedUrl, isOtaOnly: true };
  }
  
  return { has: true, url: trimmedUrl, isOtaOnly: false };
}

function parseUnitCount(value: string | null): number {
  if (!value) return 0;
  const cleaned = value.toString().trim().replace(/[^0-9]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

async function analyzeProperties() {
  console.log('🔍 Analyzing properties in sage-glamping-data...\n');

  try {
    
    // Fetch all records
    console.log('📥 Fetching all records from sage-glamping-data...');
    let allRecords: SageProperty[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('sage-glamping-data')
        .select('*')
        .range(offset, offset + batchSize - 1);

      if (error) {
        console.error('❌ Error fetching data:', error);
        process.exit(1);
      }

      if (!data || data.length === 0) {
        break;
      }

      allRecords = allRecords.concat(data as SageProperty[]);
      offset += batchSize;
      hasMore = data.length === batchSize;
      console.log(`  Fetched ${allRecords.length} records...`);
    }

    console.log(`✅ Fetched ${allRecords.length} total records\n`);

    // Group records by property name
    const propertiesMap = new Map<string, SageProperty[]>();
    
    for (const record of allRecords) {
      if (!record.property_name) continue;
      
      const normalizedName = record.property_name.trim();
      if (!propertiesMap.has(normalizedName)) {
        propertiesMap.set(normalizedName, []);
      }
      propertiesMap.get(normalizedName)!.push(record);
    }

    console.log(`📊 Found ${propertiesMap.size} unique properties\n`);

    // Analyze each property
    const analyses: PropertyAnalysis[] = [];
    
    for (const [propertyName, records] of propertiesMap.entries()) {
      // Count units by type
      const unitTypeCounts = new Map<string, number>();
      let totalUnits = 0;
      let glampingUnits = 0;
      let excludedUnits = 0;
      
      // Check website
      let hasBusinessWebsiteFlag = false;
      let websiteUrl: string | null = null;
      let isOtaOnly = false;
      
      // Use the first record for website check (they should be the same per property)
      if (records.length > 0) {
        const websiteInfo = hasBusinessWebsite(records[0]);
        hasBusinessWebsiteFlag = websiteInfo.has;
        websiteUrl = websiteInfo.url;
        isOtaOnly = websiteInfo.isOtaOnly;
      }
      
      // Count units
      for (const record of records) {
        const unitType = record.unit_type;
        const quantity = parseUnitCount(record.quantity_of_units || record.property_total_sites);
        
        if (unitType) {
          const currentCount = unitTypeCounts.get(unitType) || 0;
          unitTypeCounts.set(unitType, currentCount + quantity);
        }
        
        totalUnits += quantity;
        
        if (isGlampingUnitType(unitType)) {
          glampingUnits += quantity;
        }
        
        if (isExcludedUnitType(unitType)) {
          excludedUnits += quantity;
        }
      }
      
      // If no quantity_of_units or property_total_sites, count records as units
      if (totalUnits === 0) {
        totalUnits = records.length;
        // Recalculate glamping/excluded units and unit type counts based on record count
        glampingUnits = 0;
        excludedUnits = 0;
        unitTypeCounts.clear(); // Reset unit type counts
        for (const record of records) {
          const unitType = record.unit_type;
          if (unitType) {
            const currentCount = unitTypeCounts.get(unitType) || 0;
            unitTypeCounts.set(unitType, currentCount + 1);
          }
          if (isGlampingUnitType(record.unit_type)) {
            glampingUnits++;
          }
          if (isExcludedUnitType(record.unit_type)) {
            excludedUnits++;
          }
        }
      }
      
      const nonGlampingUnits = totalUnits - glampingUnits - excludedUnits;
      const glampingPercentage = totalUnits > 0 ? (glampingUnits / totalUnits) * 100 : 0;
      
      const unitTypes = Array.from(unitTypeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
      
      const analysis: PropertyAnalysis = {
        propertyName,
        totalUnits,
        glampingUnits,
        nonGlampingUnits,
        excludedUnits,
        glampingPercentage,
        hasBusinessWebsite: hasBusinessWebsiteFlag,
        websiteUrl,
        isOtaOnly,
        meetsCriteria: {
          has4PlusUnits: totalUnits >= 4,
          hasBusinessWebsite: hasBusinessWebsiteFlag && !isOtaOnly,
          has50PercentGlamping: glampingPercentage >= 50,
        },
        unitTypes,
        records,
      };
      
      analyses.push(analysis);
    }

    // Identify properties that are NOT glamping resorts
    const nonGlampingResorts = analyses.filter(analysis => {
      const { has4PlusUnits, hasBusinessWebsite, has50PercentGlamping } = analysis.meetsCriteria;
      // NOT a glamping resort if it fails ANY of the criteria
      return !has4PlusUnits || !hasBusinessWebsite || !has50PercentGlamping;
    });

    console.log('='.repeat(80));
    console.log('ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Properties Analyzed: ${analyses.length}`);
    console.log(`Properties Meeting All Criteria (Glamping Resorts): ${analyses.length - nonGlampingResorts.length}`);
    console.log(`Properties NOT Meeting Criteria (Non-Glamping Resorts): ${nonGlampingResorts.length}\n`);

    // Breakdown by failure reason
    const failuresByReason = {
      lessThan4Units: 0,
      noBusinessWebsite: 0,
      lessThan50PercentGlamping: 0,
      otaOnly: 0,
    };

    for (const analysis of nonGlampingResorts) {
      if (!analysis.meetsCriteria.has4PlusUnits) failuresByReason.lessThan4Units++;
      if (!analysis.meetsCriteria.hasBusinessWebsite) {
        failuresByReason.noBusinessWebsite++;
        if (analysis.isOtaOnly) failuresByReason.otaOnly++;
      }
      if (!analysis.meetsCriteria.has50PercentGlamping) failuresByReason.lessThan50PercentGlamping++;
    }

    console.log('Failure Breakdown:');
    console.log(`  ❌ Less than 4 units: ${failuresByReason.lessThan4Units}`);
    console.log(`  ❌ No business website (or OTA only): ${failuresByReason.noBusinessWebsite}`);
    console.log(`    └─ OTA only (no business website): ${failuresByReason.otaOnly}`);
    console.log(`  ❌ Less than 50% glamping units: ${failuresByReason.lessThan50PercentGlamping}\n`);

    // Generate detailed report
    const reportLines: string[] = [];
    reportLines.push('# Non-Glamping Resort Analysis');
    reportLines.push('');
    reportLines.push(`**Analysis Date:** ${new Date().toISOString().split('T')[0]}`);
    reportLines.push(`**Total Properties Analyzed:** ${analyses.length}`);
    reportLines.push(`**Glamping Resorts (meet all criteria):** ${analyses.length - nonGlampingResorts.length}`);
    reportLines.push(`**Non-Glamping Resorts (fail one or more criteria):** ${nonGlampingResorts.length}`);
    reportLines.push('');
    reportLines.push('## Criteria for Glamping Resort');
    reportLines.push('');
    reportLines.push('1. **4 or more units on property**');
    reportLines.push('2. **Has a business website, NOT only on OTAs** (airbnb, hipcamp, etc.)');
    reportLines.push('3. **50% or greater are glamping unit types**');
    reportLines.push('');
    reportLines.push('## Failure Breakdown');
    reportLines.push('');
    reportLines.push(`- **Less than 4 units:** ${failuresByReason.lessThan4Units} properties`);
    reportLines.push(`- **No business website (or OTA only):** ${failuresByReason.noBusinessWebsite} properties`);
    reportLines.push(`  - OTA only (no business website): ${failuresByReason.otaOnly} properties`);
    reportLines.push(`- **Less than 50% glamping units:** ${failuresByReason.lessThan50PercentGlamping} properties`);
    reportLines.push('');
    reportLines.push('## Non-Glamping Resorts');
    reportLines.push('');
    reportLines.push('Properties that fail one or more criteria:');
    reportLines.push('');

    // Sort by property name
    nonGlampingResorts.sort((a, b) => a.propertyName.localeCompare(b.propertyName));

    for (const analysis of nonGlampingResorts) {
      const failures: string[] = [];
      if (!analysis.meetsCriteria.has4PlusUnits) {
        failures.push(`❌ Less than 4 units (${analysis.totalUnits} units)`);
      }
      if (!analysis.meetsCriteria.hasBusinessWebsite) {
        if (analysis.isOtaOnly) {
          failures.push(`❌ OTA only website (${analysis.websiteUrl || 'no website'})`);
        } else {
          failures.push(`❌ No business website`);
        }
      }
      if (!analysis.meetsCriteria.has50PercentGlamping) {
        failures.push(`❌ Less than 50% glamping units (${analysis.glampingPercentage.toFixed(1)}% glamping)`);
      }

      reportLines.push(`### ${analysis.propertyName}`);
      reportLines.push('');
      reportLines.push(`**Location:** ${analysis.records[0]?.city || 'N/A'}, ${analysis.records[0]?.state || 'N/A'}, ${analysis.records[0]?.country || 'N/A'}`);
      reportLines.push(`**Total Units:** ${analysis.totalUnits}`);
      reportLines.push(`**Glamping Units:** ${analysis.glampingUnits} (${analysis.glampingPercentage.toFixed(1)}%)`);
      reportLines.push(`**Non-Glamping Units:** ${analysis.nonGlampingUnits}`);
      reportLines.push(`**Excluded Units:** ${analysis.excludedUnits}`);
      reportLines.push(`**Website:** ${analysis.websiteUrl || 'None'} ${analysis.isOtaOnly ? '(OTA only)' : ''}`);
      reportLines.push('');
      reportLines.push('**Failure Reasons:**');
      for (const failure of failures) {
        reportLines.push(`- ${failure}`);
      }
      reportLines.push('');
      reportLines.push('**Unit Types:**');
      if (analysis.unitTypes.length > 0) {
        for (const { type, count } of analysis.unitTypes) {
          const isGlamping = isGlampingUnitType(type);
          const isExcluded = isExcludedUnitType(type);
          let marker = '  -';
          if (isGlamping) marker = '✅';
          else if (isExcluded) marker = '❌';
          reportLines.push(`${marker} ${type}: ${count}`);
        }
      } else {
        reportLines.push('  - No unit types recorded');
      }
      reportLines.push('');
      reportLines.push('---');
      reportLines.push('');
    }

    // Write report to file
    const fs = require('fs');
    const reportPath = 'docs/NON_GLAMPING_RESORTS_ANALYSIS.md';
    fs.writeFileSync(reportPath, reportLines.join('\n'));
    
    console.log('='.repeat(80));
    console.log(`✅ Detailed report written to: ${reportPath}`);
    console.log(`   Total non-glamping resorts documented: ${nonGlampingResorts.length}`);

    // Show sample of non-glamping resorts
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE NON-GLAMPING RESORTS (first 10)');
    console.log('='.repeat(80));
    
    for (let i = 0; i < Math.min(10, nonGlampingResorts.length); i++) {
      const analysis = nonGlampingResorts[i];
      console.log(`\n${i + 1}. ${analysis.propertyName}`);
      console.log(`   Units: ${analysis.totalUnits} (${analysis.glampingPercentage.toFixed(1)}% glamping)`);
      console.log(`   Website: ${analysis.websiteUrl || 'None'} ${analysis.isOtaOnly ? '(OTA only)' : ''}`);
      console.log(`   Failures:`);
      if (!analysis.meetsCriteria.has4PlusUnits) console.log(`     - Less than 4 units`);
      if (!analysis.meetsCriteria.hasBusinessWebsite) console.log(`     - No business website${analysis.isOtaOnly ? ' (OTA only)' : ''}`);
      if (!analysis.meetsCriteria.has50PercentGlamping) console.log(`     - Less than 50% glamping units`);
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

analyzeProperties();
