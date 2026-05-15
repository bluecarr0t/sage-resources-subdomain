import { z } from 'zod';
import { MARKET_REPORT_MAP_PINS_CAP } from '@/lib/market-report/map-pins';
import type { MarketReportMapPin, MarketReportMeta, MarketReportSections } from '@/lib/market-report/types';

const mapPinSchema = z.object({
  key: z.string().max(400),
  lat: z.number().finite(),
  lng: z.number().finite(),
  property_name: z.string().max(600),
  city: z.string().max(200),
  state: z.string().max(80),
  source: z.string().max(160),
  distance_miles: z.number().finite(),
  rate_avg: z.number().finite().nullish(),
  url: z.string().max(2_000).nullish(),
  unit_type: z.string().max(200).nullish(),
});

export const marketReportExportMetaSchema = z.object({
  addressLine: z.string().max(600),
  anchorLat: z.number().finite(),
  anchorLng: z.number().finite(),
  radiusMiles: z.number().min(0).max(250),
  segment: z.enum(['glamping', 'rv_resort']),
  propertyCount: z.number().int().min(0).max(500_000),
  distinctListingCount: z.number().int().min(0).max(500_000).optional(),
  sources: z.array(z.string().max(200)).max(30),
  generatedAt: z.string().max(100),
  fetchPossiblyIncomplete: z.boolean(),
  fetch: z.record(z.unknown()).optional(),
  mapPinsTotal: z.number().int().min(0).max(500_000),
  mapPinsTruncated: z.boolean(),
  minSiteUnitCount: z.number().int().min(0).max(100_000).optional(),
});

export const marketReportExportBodySchema = z.object({
  meta: marketReportExportMetaSchema,
  sections: z.record(z.unknown()),
  mapPins: z.array(mapPinSchema).max(MARKET_REPORT_MAP_PINS_CAP + 500).optional().default([]),
});

export type MarketReportExportBody = z.infer<typeof marketReportExportBodySchema>;

export function asMarketReportSections(sections: unknown): MarketReportSections {
  return sections as MarketReportSections;
}

export function asMarketReportMeta(meta: z.infer<typeof marketReportExportMetaSchema>): MarketReportMeta {
  return meta as MarketReportMeta;
}

export function asMarketReportMapPins(pins: MarketReportExportBody['mapPins']): MarketReportMapPin[] {
  return pins as MarketReportMapPin[];
}
