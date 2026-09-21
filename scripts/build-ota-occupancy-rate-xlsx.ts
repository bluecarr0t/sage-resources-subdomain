#!/usr/bin/env npx tsx
/**
 * Build the Sparta / NY Jellystone month-by-month Campspot comps workbook
 * (Season Summary Mar-Nov, Comp Set Monthly / Sites, Market Monthly / Sites,
 * Market Rate/Occupancy heatmaps, Notes).
 *
 * Run: npx tsx scripts/build-ota-occupancy-rate-xlsx.ts --zip 38583 --city Sparta --state TN --radius 100 --unit-type rv --amenity wifi
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { closeLegacyCampingPool } from '../lib/legacy-camping-db';
import { normalizeAmenityToken } from '../lib/ota-occupancy-amenity-aliases';
import {
  exportCampspotMonthByMonth,
  focusedCompSetLabel,
  type CampspotNameCityMatch,
} from '../lib/ota-campspot-month-by-month-export';
import {
  buildTrailingSummary,
  COMPS_FOCUSED_PROPERTIES_SHEET,
  COMPS_FOCUSED_SITES_SHEET,
  COMPS_SEASON_SUMMARY_SHEET,
  compsMonthByMonthFileName,
  compsRangeSheetNames,
  MARKET_AVERAGE_MIN_OPEN_MONTHS,
  seasonPropertyRows,
  stampCompSet,
  stampSiteCompSet,
  writeCompsMonthByMonthXlsx,
} from '../lib/ota-comps-month-by-month-xlsx';

config({ path: resolve(process.cwd(), '.env.local') });

type CliArgs = {
  zip?: string;
  city?: string;
  state?: string;
  radius: number;
  years: number[];
  amenities: string[];
  unitTypes: string[];
  propertyNames: string[];
  nameCity: CampspotNameCityMatch[];
  subject?: string;
  compSetLabel?: string;
  skipSites: boolean;
};

function usage(): string {
  return `Usage:
  npx tsx scripts/build-ota-occupancy-rate-xlsx.ts --zip 38583 --city Sparta --state TN --radius 100 --unit-type rv --amenity wifi
  npx tsx scripts/build-ota-occupancy-rate-xlsx.ts --zip 34205 --radius 50 --unit-type rv --amenity hot-tub

Required: --zip OR (--city AND --state)
Optional: --radius (default 50), --years 2025,2026, --amenity, --unit-type, --property-name, --name-city "Name|City", --subject, --comp-set-label, --skip-sites`;
}

function takeValues(argv: string[], flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== flag) continue;
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) continue;
    values.push(next);
  }
  return values;
}

function takeOne(argv: string[], flag: string): string | undefined {
  return takeValues(argv, flag)[0];
}

function parseNameCity(raw: string): CampspotNameCityMatch {
  const idx = raw.indexOf('|');
  if (idx < 1) {
    throw new Error(`--name-city must be "Name|City" (got ${raw})`);
  }
  return {
    nameIlike: `%${raw.slice(0, idx).trim()}%`,
    cityIlike: `%${raw.slice(idx + 1).trim()}%`,
  };
}

function parseArgs(argv: string[]): CliArgs {
  const zip = takeOne(argv, '--zip');
  const city = takeOne(argv, '--city');
  const state = takeOne(argv, '--state');
  const radiusRaw = takeOne(argv, '--radius');
  const yearsRaw = takeOne(argv, '--years');
  const radius = radiusRaw ? Number(radiusRaw) : 50;
  if (!Number.isFinite(radius) || radius < 1 || radius > 200) {
    throw new Error('radius must be between 1 and 200 miles');
  }
  const years = yearsRaw
    ? yearsRaw.split(',').map((y) => Number(y.trim())).filter((n) => Number.isFinite(n))
    : [2025, 2026];
  return {
    zip,
    city,
    state,
    radius,
    years,
    amenities: takeValues(argv, '--amenity'),
    unitTypes: takeValues(argv, '--unit-type'),
    propertyNames: takeValues(argv, '--property-name').map((name) => `%${name.replace(/^%|%$/g, '')}%`),
    nameCity: takeValues(argv, '--name-city').map(parseNameCity),
    subject: takeOne(argv, '--subject'),
    compSetLabel: takeOne(argv, '--comp-set-label'),
    skipSites: argv.includes('--skip-sites'),
  };
}

function uniqueCount(rows: Array<{ property_name: string }>): number {
  return new Set(rows.map((r) => r.property_name)).size;
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(usage());
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  if (!args.zip?.trim() && !(args.city?.trim() && args.state?.trim())) {
    console.error(usage());
    process.exit(1);
  }

  try {
    const result = await exportCampspotMonthByMonth({
      zip: args.zip,
      city: args.city,
      state: args.state,
      radiusMiles: args.radius,
      years: args.years,
      amenities: args.amenities,
      unitTypes: args.unitTypes,
      propertyNameIlikes: args.propertyNames,
      nameAndCityMatches: args.nameCity,
      skipSites: args.skipSites,
    });

    const namedSet = args.propertyNames.length > 0 || args.nameCity.length > 0;
    const focusedLabel =
      args.compSetLabel?.trim() ||
      focusedCompSetLabel(args.amenities, args.unitTypes, result.radius_miles, namedSet);
    const rangeLabel = `All Campspot (${result.radius_miles} mi)`;
    const rangeSheets = compsRangeSheetNames(result.radius_miles);
    const milesByName = new Map(result.radiusProperties.map((r) => [r.name, r.miles]));
    const marketCity = result.city || 'Market';
    const marketState = result.state || '';
    const trailingSummary = buildTrailingSummary({
      years: result.years,
      sets: [
        { label: focusedLabel, seasonRows: seasonPropertyRows(result.focusedProperties) },
        { label: rangeLabel, seasonRows: seasonPropertyRows(result.rangeProperties) },
      ],
      milesByName,
      marketCity,
      marketState,
    });

    const includeRv = args.unitTypes.some((t) => t.toLowerCase().includes('rv'));
    const fileName = compsMonthByMonthFileName({
      city: result.city,
      state: result.state,
      zip: result.zip,
      includeRv,
    });

    const filterBits = [
      ...args.unitTypes.map((t) => t.trim()),
      ...args.amenities.map(normalizeAmenityToken),
    ].filter(Boolean);
    const focusedDesc =
      namedSet
        ? `Named parks in radius then site filters (${filterBits.join(' + ') || 'none'}): ${result.focusedNames.join('; ') || '(none matched)'}.`
        : filterBits.length
          ? `Campspot parks in radius whose matching sites pass ${filterBits.join(' + ')}.`
          : 'Same Campspot inventory as the range sheets (no extra site filter).';

    const notes = [
      {
        field: 'Subject',
        value: args.subject?.trim() || `${result.location_label} Campspot comps`,
      },
      { field: 'Zip', value: result.zip || '' },
      { field: 'Radius', value: `${result.radius_miles} miles` },
      { field: 'Center lat/lon', value: `${result.center.lat}, ${result.center.lon}` },
      {
        field: 'Occupancy definition',
        value:
          'Campspot occupancy is OTA reservation occupancy (reserved Campspot nights ÷ available Campspot nights for the filtered sites), not park occupancy.',
      },
      {
        field: 'Source',
        value: 'Campspot site_monthly_analytics / site_yearly_analytics (warehouse)',
      },
      { field: 'Year (monthly sheets)', value: result.years.join(', ') },
      { field: 'Operating season', value: 'March–November (closed December–February)' },
      {
        field: COMPS_FOCUSED_PROPERTIES_SHEET,
        value: `2025 and 2026 property-months (occupancy, ADR, RevPAR, min/max, site count). ${focusedDesc}`,
      },
      {
        field: COMPS_FOCUSED_SITES_SHEET,
        value:
          `Site-level wide month columns are 2025 only (one row per site). Use ${COMPS_FOCUSED_PROPERTIES_SHEET} for 2025 and 2026 monthly occupancy and ADR.`,
      },
      {
        field: `Market sheets ${result.radius_miles}mi`,
        value: `All Campspot properties/sites within ${result.radius_miles} miles (${result.radiusProperties.length} properties). Sheets: ${rangeSheets.properties} / ${rangeSheets.sites}.`,
      },
      {
        field: 'Heatmap sheets',
        value: `Comp Rate/Occupancy tabs are the primary/filter set. Market Rate/Occupancy 2025/2026 are from ${rangeSheets.properties}. Column B is distance in miles from the origin.`,
      },
      {
        field: 'Rate blanking',
        value:
          'Rates blank when occupancy ≤ 5% (closed/shoulder) or known placeholder artifacts ($1011.50, $1026.67, $705.06). Median rate uses sites with occupancy > 5%. Max price is 95th percentile.',
      },
      {
        field: COMPS_SEASON_SUMMARY_SHEET,
        value:
          `Unweighted mean of months with occupancy > 5%. Parks need ≥${MARKET_AVERAGE_MIN_OPEN_MONTHS} such months to enter MARKET AVERAGE. Full Throttle and destination parks (Elm Hill, Watts Bar) stay as rows but are excluded from averages. 2026 is a partial year if later months are not yet in the warehouse.`,
      },
      {
        field: 'Unknown amenity tokens',
        value: result.unknownAmenities.length
          ? `${result.unknownAmenities.join(', ')} (used as literal warehouse keys)`
          : '(none)',
      },
      { field: 'Pulled', value: new Date().toISOString().slice(0, 10) },
    ];

    const paths = await writeCompsMonthByMonthXlsx({
      fileName,
      radiusMiles: result.radius_miles,
      years: result.years,
      focusedProperties: stampCompSet(result.focusedProperties, focusedLabel, milesByName),
      focusedSites: stampSiteCompSet(result.focusedSites, focusedLabel),
      rangeProperties: stampCompSet(result.rangeProperties, rangeLabel, milesByName),
      rangeSites: stampSiteCompSet(result.rangeSites, rangeLabel),
      trailingSummary,
      milesByName,
      notes,
    });

    console.log(`Center: ${result.center.lat}, ${result.center.lon}`);
    console.log(
      `Focused: ${result.focusedProperties.length} property-months (${uniqueCount(result.focusedProperties)} parks), ${result.focusedSites.length} sites`,
    );
    console.log(
      `Range: ${result.rangeProperties.length} property-months (${uniqueCount(result.rangeProperties)} parks), ${result.rangeSites.length} sites`,
    );
    console.log(`Wrote ${paths.downloads}`);
    console.log(`Copied ${paths.reports}`);
  } finally {
    await closeLegacyCampingPool();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
