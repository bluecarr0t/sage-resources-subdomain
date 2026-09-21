#!/usr/bin/env npx tsx
/**
 * Sparta, TN (38583) RV comps workbook. Three labeled primary sets, destination
 * appendix, RV-only market heatmaps, Hipcamp bell-tent comps.
 *
 * Run: npx tsx scripts/export-campspot-sparta-tn-38583-100mi.ts
 */

import { copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { closeLegacyCampingPool, withReadOnlyCampingClient } from '../lib/legacy-camping-db';
import { fetchCampspotRadiusProperties } from '../lib/ota-campspot-month-by-month-export';
import {
  COMPS_BELL_TENT_SHEET,
  COMPS_DESTINATION_SHEET,
  COMPS_FOCUSED_PROPERTIES_SHEET,
  compsMonthByMonthFileName,
  compsWorkbookPaths,
  MARKET_AVERAGE_MIN_OPEN_MONTHS,
  rebuildCompsHeatmapsInWorkbook,
  writeCompsMonthByMonthXlsx,
} from '../lib/ota-comps-month-by-month-xlsx';
import {
  COMPS_SET_FHU,
  COMPS_SET_LOCAL,
  COMPS_SET_WATERFRONT,
} from '../lib/ota-comps-set-rules';
import {
  buildSpartaLabeledSets,
  fetchHipcampBellTentMonths,
} from '../lib/ota-sparta-comp-sets';

config({ path: resolve(process.cwd(), '.env.local') });

const ZIP = '38583';
const CITY = 'Sparta';
const STATE = 'TN';
const ZIP_LAT = 35.9259;
const ZIP_LON = -85.4641;
const RADIUS_MILES = 100;
const YEARS = [2025, 2026];
const SKIP_SITES = process.argv.includes('--skip-sites');
const HEATMAPS_ONLY = process.argv.includes('--heatmaps-only');
const DB_STATEMENT_TIMEOUT_MS = 1_200_000;

async function patchHeatmapsOnly(): Promise<void> {
  const fileName = compsMonthByMonthFileName({
    city: CITY,
    state: STATE,
    zip: ZIP,
    includeRv: true,
  });
  const paths = compsWorkbookPaths(fileName);
  const existingPath = existsSync(paths.downloads)
    ? paths.downloads
    : paths.reports;
  if (!existsSync(existingPath)) {
    throw new Error(`Existing workbook not found at ${paths.downloads}`);
  }

  const radiusRows = await fetchCampspotRadiusProperties(ZIP_LON, ZIP_LAT, RADIUS_MILES);
  const milesByName = new Map(radiusRows.map((r) => [r.name, r.miles]));
  await rebuildCompsHeatmapsInWorkbook({
    workbookPath: existingPath,
    radiusMiles: RADIUS_MILES,
    years: YEARS,
    milesByName,
    outputPath: paths.reports,
  });
  copyFileSync(paths.reports, paths.downloads);
  console.log(`Updated sheet layout and heatmaps in ${paths.downloads}`);
  console.log(`Copied ${paths.reports}`);
}

async function main() {
  if (HEATMAPS_ONLY) {
    try {
      await patchHeatmapsOnly();
    } catch (err) {
      console.error('Heatmap patch failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    } finally {
      await closeLegacyCampingPool();
    }
    return;
  }
  console.log(
    `Exporting Sparta RV comps: local / waterfront SKUs / 25-80 FHU, plus destination appendix and Hipcamp bell tents.\n`,
  );

  try {
    const radiusProperties = await fetchCampspotRadiusProperties(
      ZIP_LON,
      ZIP_LAT,
      RADIUS_MILES,
    );
    const milesByName = new Map(radiusProperties.map((r) => [r.name, r.miles]));

    const { labeled, bellTentRows } = await withReadOnlyCampingClient(async (client) => {
      await client.query(`SET LOCAL statement_timeout = '${DB_STATEMENT_TIMEOUT_MS}'`);
      console.log(`Classifying ${radiusProperties.length} Campspot parks in ${RADIUS_MILES} miles…`);
      const labeledSets = await buildSpartaLabeledSets({
        client,
        years: YEARS,
        radiusProperties,
        skipSites: SKIP_SITES,
      });
      console.log('Pulling Hipcamp bell / safari / canvas tent months…');
      const tents = await fetchHipcampBellTentMonths({
        client,
        lon: ZIP_LON,
        lat: ZIP_LAT,
        radiusMiles: RADIUS_MILES,
        years: YEARS,
      });
      return { labeled: labeledSets, bellTentRows: tents };
    });

    const fileName = compsMonthByMonthFileName({
      city: CITY,
      state: STATE,
      zip: ZIP,
      includeRv: true,
    });

    const paths = await writeCompsMonthByMonthXlsx({
      fileName,
      radiusMiles: RADIUS_MILES,
      years: YEARS,
      focusedProperties: labeled.focusedProperties,
      rangeProperties: labeled.rangeProperties,
      destinationProperties: labeled.destinationProperties,
      bellTentRows,
      milesByName,
      notes: [
        { field: 'Subject', value: 'Sparta, TN RV resort + 4 bell-tent glamping sites' },
        { field: 'Zip', value: ZIP },
        { field: 'Radius', value: `${RADIUS_MILES} miles` },
        { field: 'Center lat/lon', value: `${ZIP_LAT}, ${ZIP_LON}` },
        {
          field: 'Occupancy definition',
          value:
            'Campspot occupancy is OTA reservation occupancy (reserved Campspot nights ÷ available Campspot nights for the filtered sites). It is not occupied sites ÷ total park sites, and it is not STR/census occupancy. Parks with annuals, drive-up, or other OTAs will look emptier than they are.',
        },
        { field: 'Source', value: 'Campspot site_monthly_analytics (warehouse) + Hipcamp site_monthly_analytics for bell/safari/canvas tents' },
        { field: 'Year (monthly sheets)', value: YEARS.join(', ') },
        { field: 'Operating season', value: 'March–November (closed December–February)' },
        {
          field: COMPS_FOCUSED_PROPERTIES_SHEET,
          value: `Three labeled sets, not one name list. Sorted A–Z by property_name. Every Comp park must have waterfront views or property access: Campspot Waterfront or Beach amenity, or an RV SKU named for waterfront / lakefront / lake-river-creek view or access. Waterpark is not waterfront. ${COMPS_SET_LOCAL}: RV, 0–25 mi, 15–80 sites, mobile-home parks dropped, waterfront-access parks only. ${COMPS_SET_WATERFRONT}: site-name waterfront / view / access RV SKUs only (Water-Front included; inland, non-waterfront, van/tent excluded). ${COMPS_SET_FHU}: 25–80 FHU RV sites at waterfront-access parks; inland FHU analogs dropped. Local parks: ${labeled.localNames.join('; ') || '(none)'}. Waterfront parks: ${labeled.waterfrontNames.join('; ') || '(none)'}. FHU analog parks: ${labeled.fhuNames.join('; ') || '(none)'}.`,
        },
        {
          field: COMPS_DESTINATION_SHEET,
          value: `Elm Hill (126 RV) and Watts Bar Jellystone (173 RV) full-park RV months. Shown for destination context only — excluded from every MARKET AVERAGE. Parks: ${labeled.destinationNames.join('; ') || '(none)'}.`,
        },
        {
          field: 'Market sheets 100mi',
          value: `Campspot RV only within ${RADIUS_MILES} miles (${labeled.rangeProperties.length} property-months). Cabins/lodging/tent are off the market monthly and heatmap tabs.`,
        },
        {
          field: 'Heatmap sheets',
          value:
            'Comp Rate/Occupancy 2025–2026 are the primary three sets (one row per park; Local then FHU then Waterfront if a park is in more than one). Market Rate/Occupancy 2025–2026 are 100-mile RV only. Column B is distance in miles from the Sparta origin.',
        },
        {
          field: COMPS_BELL_TENT_SHEET,
          value: `Hipcamp properties within ${RADIUS_MILES} miles whose SKUs are bell-tent, safari tent, or canvas tent (${bellTentRows.length} property-months). Do not analog these from RV ADR.`,
        },
        {
          field: 'RevPAR',
          value: 'Rebuilt as occupancy × median rate / 100 after rate blanking. Warehouse revpar is not used.',
        },
        {
          field: 'MARKET AVERAGE',
          value: `Unweighted mean of months with occupancy > 5%. Parks need ≥${MARKET_AVERAGE_MIN_OPEN_MONTHS} such months to enter a set average. Full Throttle is kept as a row but excluded from every average until it has a full March–November. 2026 is a partial year if later months are not yet in the warehouse.`,
        },
        {
          field: 'Rate blanking',
          value:
            'Rates blank when occupancy ≤ 5% (closed/shoulder) or known placeholder artifacts ($1011.50, $1026.67, $705.06). Median rate uses sites with occupancy > 5%. max_price is the 95th percentile.',
        },
        { field: 'Pulled', value: new Date().toISOString().slice(0, 10) },
      ],
    });

    console.log(`Local 0–25mi RV: ${labeled.localNames.length} — ${labeled.localNames.join('; ')}`);
    console.log(
      `Waterfront SKUs: ${labeled.waterfrontNames.length} — ${labeled.waterfrontNames.join('; ')}`,
    );
    console.log(`25–80 FHU: ${labeled.fhuNames.length} — ${labeled.fhuNames.join('; ')}`);
    console.log(
      `Destination appendix: ${labeled.destinationNames.length} — ${labeled.destinationNames.join('; ')}`,
    );
    console.log(
      `Focused property-months: ${labeled.focusedProperties.length}`,
    );
    console.log(
      `100mi RV property-months: ${labeled.rangeProperties.length}`,
    );
    console.log(`Hipcamp bell/safari/canvas months: ${bellTentRows.length}`);
    console.log(`\nWrote ${paths.reports}`);
    console.log(`Copied ${paths.downloads}`);
  } catch (err) {
    console.error('Export failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await closeLegacyCampingPool();
  }
}

main();
