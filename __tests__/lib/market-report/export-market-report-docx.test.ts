import { assembleMarketReportDocx } from '@/lib/market-report/export-market-report-docx';
import type { MarketReportMapPin, MarketReportMeta, MarketReportSections } from '@/lib/market-report/types';

describe('assembleMarketReportDocx', () => {
  it('produces a non-empty docx buffer', () => {
    const meta: MarketReportMeta = {
      addressLine: 'Testville, OR',
      anchorLat: 44.0,
      anchorLng: -121.0,
      radiusMiles: 25,
      segment: 'glamping',
      propertyCount: 1,
      distinctListingCount: 1,
      sources: ['Sage'],
      generatedAt: '2026-05-12T12:00:00.000Z',
      fetchPossiblyIncomplete: false,
      mapPinsTotal: 0,
      mapPinsTruncated: false,
    };
    const sections: MarketReportSections = {
      marketSummary: {
        distinctListingCount: 1,
        inventoryRowCount: 1,
        radiusMiles: 25,
        segment: 'glamping',
        sourceCounts: [{ source: 'all_glamping_properties', sourceLabel: 'Sage', count: 1 }],
        sourceBreakdown: [
          {
            source: 'all_glamping_properties',
            sourceLabel: 'Sage',
            inventoryRowCount: 1,
            distinctListingCount: 1,
            totalSites: 10,
            totalUnits: null,
            avgRetailDailyRate: 100,
            avgOccupancy: 55,
          },
        ],
        topStates: [{ state: 'OR', count: 1 }],
        totalSites: 10,
        topUnitTypesWithAdr: [
          {
            unit_type: 'Safari Tent',
            count: 1,
            unitCount: 5,
            meanAdr: 100,
            medianAdr: 100,
            details: [],
          },
        ],
      },
      propertyAnalysis: {
        meanTotalSites: 10,
        medianTotalSites: 10,
        topPropertyTypes: [{ property_type: 'Resort', count: 1 }],
        sample: [
          {
            key: 'k1',
            property_name: 'A',
            city: 'B',
            state: 'OR',
            distance_miles: 5,
            property_total_sites: 10,
            property_type: 'Resort',
            unit_type: 'Yurt',
            source: 'all_glamping_properties',
            sourceLabel: 'Sage',
            rate_avg: 100,
            url: null,
          },
        ],
      },
      rateAnalysis: {
        propertiesWithPrimaryRate: 1,
        meanAdr: 100,
        medianAdr: 100,
        p25: 90,
        p75: 110,
        minAdr: 80,
        maxAdr: 120,
        seasonalAverages: [{ key: 'summer_weekend', average: 150 }],
      },
      amenityAnalysis: { mode: 'rv_limited' },
      siteUnitAnalysis: {
        topUnitTypes: [{ unit_type: 'Yurt', count: 1 }],
        siteBuckets: [{ label: '1–25', count: 1 }],
      },
    };
    const mapPins: MarketReportMapPin[] = [];
    const buf = assembleMarketReportDocx(meta, sections, mapPins);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 2).toString('utf8')).toBe('PK');
  });
});
