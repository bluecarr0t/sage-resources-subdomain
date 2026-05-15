import { stringify } from 'csv-stringify/sync';
import JSZip from 'jszip';
import { marketReportSourceLabel } from '@/lib/market-report/source-labels';
import type { MarketReportMapPin, MarketReportMeta, MarketReportSections } from '@/lib/market-report/types';

function csvLines(headers: string[], rows: Record<string, unknown>[]): string {
  return stringify(rows, {
    header: true,
    columns: headers,
    quoted_string: true,
  }) as string;
}

export interface MarketReportExportPayload {
  meta: MarketReportMeta;
  sections: MarketReportSections;
  mapPins: MarketReportMapPin[];
}

/** Build a ZIP of five section CSVs + README (browser-safe, no Node-only deps). */
export async function buildMarketReportCsvZip(payload: MarketReportExportPayload): Promise<Blob> {
  const { meta, sections, mapPins } = payload;
  const zip = new JSZip();

  zip.file(
    'README.txt',
    'Each numbered CSV matches one section of the Market Report in the Sage admin UI.\n' +
      '01b-data-by-source.csv is a per-listing-partner summary (same metrics as the on-screen table).\n' +
      'Generated from the same JSON as the on-screen report.\n'
  );

  const ms = sections.marketSummary;
  zip.file(
    '01-market-summary.csv',
    csvLines(
      ['key', 'value'],
      [
        { key: 'addressLine', value: meta.addressLine },
        { key: 'radiusMiles', value: meta.radiusMiles },
        { key: 'segment', value: meta.segment },
        { key: 'distinctListingCount', value: ms.distinctListingCount },
        { key: 'inventoryRowCount', value: ms.inventoryRowCount },
        { key: 'generatedAt', value: meta.generatedAt },
        ...ms.sourceCounts.map((s) => ({ key: `source:${s.source}`, value: `${s.sourceLabel}: ${s.count}` })),
        ...ms.topStates.map((s) => ({ key: `state:${s.state}`, value: s.count })),
      ]
    )
  );

  zip.file(
    '01b-data-by-source.csv',
    csvLines(
      [
        'source_key',
        'source_label',
        'distinct_listings',
        'inventory_rows',
        'total_sites',
        'total_units',
        'avg_retail_daily_rate',
        'avg_occupancy_pct',
      ],
      ms.sourceBreakdown.map((r) => ({
        source_key: r.source,
        source_label: r.sourceLabel,
        distinct_listings: r.distinctListingCount,
        inventory_rows: r.inventoryRowCount,
        total_sites: r.totalSites ?? '',
        total_units: r.totalUnits ?? '',
        avg_retail_daily_rate: r.avgRetailDailyRate ?? '',
        avg_occupancy_pct: r.avgOccupancy ?? '',
      }))
    )
  );

  const pa = sections.propertyAnalysis;
  zip.file(
    '02-property-analysis.csv',
    csvLines(
      ['metric', 'value'],
      [
        { metric: 'meanTotalSites', value: pa.meanTotalSites ?? '' },
        { metric: 'medianTotalSites', value: pa.medianTotalSites ?? '' },
        ...pa.topPropertyTypes.map((r) => ({ metric: `type:${r.property_type}`, value: r.count })),
      ]
    )
  );
  zip.file(
    '02b-property-sample.csv',
    csvLines(
      [
        'key',
        'property_name',
        'city',
        'state',
        'distance_miles',
        'property_total_sites',
        'property_type',
        'unit_type',
        'avg_retail_daily_rate',
        'source_key',
        'source_label',
      ],
      pa.sample.map((r) => ({
        key: r.key,
        property_name: r.property_name,
        city: r.city,
        state: r.state,
        distance_miles: r.distance_miles,
        property_total_sites: r.property_total_sites,
        property_type: r.property_type,
        unit_type: r.unit_type,
        avg_retail_daily_rate: r.rate_avg ?? '',
        source_key: r.source,
        source_label: r.sourceLabel,
      }))
    )
  );

  const ra = sections.rateAnalysis;
  zip.file(
    '03-rate-analysis.csv',
    csvLines(
      ['metric', 'value'],
      [
        { metric: 'propertiesWithPrimaryRate', value: ra.propertiesWithPrimaryRate },
        { metric: 'meanAdr', value: ra.meanAdr ?? '' },
        { metric: 'medianAdr', value: ra.medianAdr ?? '' },
        { metric: 'p25', value: ra.p25 ?? '' },
        { metric: 'p75', value: ra.p75 ?? '' },
        { metric: 'minAdr', value: ra.minAdr ?? '' },
        { metric: 'maxAdr', value: ra.maxAdr ?? '' },
        ...(ra.occupancySummary
          ? [
              { metric: 'occupancy_count', value: ra.occupancySummary.countWithOccupancy },
              { metric: 'occupancy_mean', value: ra.occupancySummary.meanOccupancy ?? '' },
              { metric: 'occupancy_median', value: ra.occupancySummary.medianOccupancy ?? '' },
            ]
          : []),
        ...ra.seasonalAverages.map((s) => ({ metric: `season:${s.key}`, value: s.average ?? '' })),
      ]
    )
  );

  const aa = sections.amenityAnalysis;
  if (aa.mode === 'glamping' && aa.amenityRates?.length) {
    zip.file(
      '04-amenity-analysis.csv',
      csvLines(
        ['column', 'label', 'pctOfCohort', 'pctOfKnown', 'withKnownValue', 'yesCount'],
        aa.amenityRates.map((a) => ({ ...a }))
      )
    );
  } else {
    zip.file('04-amenity-analysis.csv', csvLines(['note'], [{ note: 'rv_limited — no glamping amenity grid for this segment.' }]));
  }

  const su = sections.siteUnitAnalysis;
  zip.file(
    '05-site-unit-analysis.csv',
    csvLines(
      ['kind', 'name', 'value'],
      [
        ...su.topUnitTypes.map((u) => ({ kind: 'unit_type', name: u.unit_type, value: u.count })),
        ...su.siteBuckets.map((b) => ({ kind: 'site_bucket', name: b.label, value: b.count })),
        ...(su.rvFieldPresence ?? []).map((r) => ({
          kind: 'rv_field',
          name: r.field,
          value: `${r.pct}% (${r.withData})`,
        })),
      ]
    )
  );

  zip.file(
    'map-pins.csv',
    csvLines(
      ['key', 'lat', 'lng', 'property_name', 'city', 'state', 'source_key', 'source_label', 'distance_miles'],
      mapPins.map((p) => ({
        key: p.key,
        lat: p.lat,
        lng: p.lng,
        property_name: p.property_name,
        city: p.city,
        state: p.state,
        source_key: p.source,
        source_label: marketReportSourceLabel(p.source),
        distance_miles: p.distance_miles,
      }))
    )
  );

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
