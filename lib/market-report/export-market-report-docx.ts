import fs from 'fs';
import path from 'path';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import type {
  MarketReportMapPin,
  MarketReportMeta,
  MarketReportSections,
  MarketReportSourceBreakdownRow,
} from '@/lib/market-report/types';
import { formatOccupancyPct } from '@/lib/market-report/format-labels';

const DOCX_MAP_PIN_LINE_CAP = 200;

function nstr(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return String(Math.round(n * 100) / 100);
}

export function buildMarketReportDocxViewModel(
  meta: MarketReportMeta,
  sections: MarketReportSections,
  mapPins: MarketReportMapPin[]
): Record<string, unknown> {
  const segment_label = meta.segment === 'glamping' ? 'Glamping' : 'RV Resort';
  const ms = sections.marketSummary;
  const pa = sections.propertyAnalysis;
  const ra = sections.rateAnalysis;
  const aa = sections.amenityAnalysis;
  const su = sections.siteUnitAnalysis;

  const summaryLines = [
    `Listings: ${ms.distinctListingCount} · Inventory rows: ${ms.inventoryRowCount}`,
    `Radius: ${ms.radiusMiles} miles`,
    `Segment: ${segment_label}`,
  ];

  const sourceLines = ms.sourceCounts.map((s) => `${s.sourceLabel}: ${s.count}`);
  function formatSourceBreakdownSitesUnits(r: MarketReportSourceBreakdownRow): string {
    if (meta.segment === 'glamping') {
      if (r.totalUnits != null) return `${nstr(r.totalUnits)} units`;
      return '—';
    }
    if (r.totalSites != null) return `${nstr(r.totalSites)} sites`;
    return '—';
  }
  const sourceBreakdownLines = ms.sourceBreakdown.map((r) => {
    const sitesUnits = formatSourceBreakdownSitesUnits(r);
    const occStr = r.avgOccupancy != null ? formatOccupancyPct(r.avgOccupancy) : '—';
    return `${r.sourceLabel}: ${r.distinctListingCount} listings (${r.inventoryRowCount} rows) · ${sitesUnits} · avg retail daily rate ${nstr(r.avgRetailDailyRate)} · avg occupancy ${occStr}`;
  });
  const stateLines = ms.topStates.map((s) => `${s.state}: ${s.count}`);

  const propertyIntro = [`Mean total sites: ${nstr(pa.meanTotalSites)}`, `Median total sites: ${nstr(pa.medianTotalSites)}`];

  const propertySampleLines = pa.sample.map(
    (r) =>
      `${r.property_name} | ${r.city}, ${r.state} | ${nstr(r.distance_miles)} mi | ${r.source} | sites ${r.property_total_sites ?? '—'} | ARDR ${nstr(r.rate_avg)}`
  );

  const rateLines: string[] = [
    `Properties with primary ADR: ${ra.propertiesWithPrimaryRate}`,
    `Mean ADR: ${nstr(ra.meanAdr)}`,
    `Median ADR: ${nstr(ra.medianAdr)}`,
    `P25 / P75: ${nstr(ra.p25)} / ${nstr(ra.p75)}`,
    `Min / Max: ${nstr(ra.minAdr)} / ${nstr(ra.maxAdr)}`,
  ];
  if (ra.occupancySummary) {
    rateLines.push(
      `Occupancy — count: ${ra.occupancySummary.countWithOccupancy}, mean: ${formatOccupancyPct(ra.occupancySummary.meanOccupancy)}, median: ${formatOccupancyPct(ra.occupancySummary.medianOccupancy)}`
    );
  }
  for (const s of ra.seasonalAverages) {
    rateLines.push(`${s.key}: ${nstr(s.average)}`);
  }

  let amenityLines: string[];
  if (aa.mode === 'glamping' && aa.amenityRates?.length) {
    amenityLines = aa.amenityRates.map(
      (a) =>
        `${a.label}: % cohort ${nstr(a.pctOfCohort)}%, % known ${nstr(a.pctOfKnown)}%, known n=${a.withKnownValue}, yes=${a.yesCount}`
    );
  } else {
    amenityLines = ['RV resort segment: detailed glamping-style amenity grid not available for this cohort.'];
  }

  const siteLines: string[] = [
    ...su.topUnitTypes.map((u) => {
      const rate = u.medianAdr != null ? ` · median ARDR ${nstr(u.medianAdr)}` : '';
      const range =
        u.minAdr != null && u.maxAdr != null && u.meanAdr != null
          ? ` · min/avg/max ARDR ${nstr(u.minAdr)} / ${nstr(u.meanAdr)} / ${nstr(u.maxAdr)}`
          : '';
      return `Unit type: ${u.unit_type} — ${u.count}${rate}${range}`;
    }),
    ...su.siteBuckets.map((b) => `Sites bucket ${b.label}: ${b.count}`),
    ...(su.rvFieldPresence ?? []).map((r) => `RV field ${r.label}: ${nstr(r.pct)}% (${r.withData} properties)`),
  ];

  const mapPinLines = mapPins.slice(0, DOCX_MAP_PIN_LINE_CAP).map(
    (p) =>
      `${p.property_name} | ${p.city}, ${p.state} | ${nstr(p.distance_miles)} mi | ${p.source} | ${nstr(p.lat)}, ${nstr(p.lng)}`
  );

  return {
    addressLine: meta.addressLine,
    radiusMiles: String(meta.radiusMiles),
    segment_label,
    generatedAt: meta.generatedAt,
    propertyCount: String(ms.inventoryRowCount),
    distinctListingCount: String(ms.distinctListingCount),
    mapPinsShown: String(mapPins.length),
    mapPinsTotal: String(meta.mapPinsTotal),
    mapPinsTruncated_label: meta.mapPinsTruncated ? 'yes' : 'no',
    fetchPossiblyIncomplete_label: meta.fetchPossiblyIncomplete ? 'yes' : 'no',
    summaryLines,
    sourceLines,
    sourceBreakdownLines,
    stateLines,
    propertyIntro,
    propertySampleLines,
    rateLines,
    amenityLines,
    siteLines,
    mapPinLines,
  };
}

export function assembleMarketReportDocx(
  meta: MarketReportMeta,
  sections: MarketReportSections,
  mapPins: MarketReportMapPin[]
): Buffer {
  const templatePath = path.join(process.cwd(), 'templates/market-report/template.docx');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Missing template at ${templatePath}. Run: npx tsx scripts/create-market-report-template.ts`);
  }
  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(buildMarketReportDocxViewModel(meta, sections, mapPins));
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer;
}

export function marketReportDocxFilename(meta: MarketReportMeta): string {
  const day = meta.generatedAt.slice(0, 10);
  const slug =
    meta.addressLine
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'market-report';
  return `market-report-${slug}-${day}.docx`;
}
