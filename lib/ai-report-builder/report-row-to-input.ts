import type { ReportDraftInput } from './types';

export type ReportRowForDraftInput = {
  property_name?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  address_1?: string | null;
  lot_size_acres?: number | string | null;
  parcel_number?: string | null;
  client_entity?: string | null;
  client_contact_name?: string | null;
  client_salutation?: string | null;
  client_address?: string | null;
  client_city_state_zip?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  unit_mix?: unknown;
  unit_descriptions?: unknown;
  total_sites?: number | null;
  key_amenities?: unknown;
  study_id?: string | null;
  market_type?: string | null;
  service?: string | null;
  county?: string | null;
};

function parseUnitMix(report: ReportRowForDraftInput): Array<{ type: string; count: number }> {
  const rawUnitMix = report.unit_mix;
  const unitMix = Array.isArray(rawUnitMix) ? rawUnitMix : [];
  const rawUnitDesc = report.unit_descriptions;
  const unitDescriptions = Array.isArray(rawUnitDesc) ? rawUnitDesc : [];

  if (unitMix.length > 0) {
    return unitMix
      .filter((u: { type?: string; count?: number }) => u?.type && (u.count ?? 0) > 0)
      .map((u: { type?: string; count?: number }) => ({
        type: String(u.type),
        count: Number(u.count) || 1,
      }));
  }
  if (unitDescriptions.length > 0) {
    return unitDescriptions
      .filter((u: { type?: string; quantity?: number | null }) => u?.type)
      .map((u: { type?: string; quantity?: number | null }) => ({
        type: String(u.type),
        count: Number(u.quantity) || 1,
      }));
  }
  const totalSites = report.total_sites;
  if (typeof totalSites === 'number' && totalSites > 0) {
    const marketType = (report.market_type ?? 'rv') as string;
    const defaultType = marketType.toLowerCase().includes('glamping') ? 'Cabin' : 'RV Site';
    return [{ type: defaultType, count: totalSites }];
  }
  return [];
}

export function mapReportRowToDraftInput(
  report: ReportRowForDraftInput,
  studyId: string
): ReportDraftInput {
  const keyAmenities = (report.key_amenities as string[] | null) ?? [];
  return {
    property_name: report.property_name ?? '',
    city: report.city ?? '',
    state: report.state ?? '',
    zip_code: report.zip_code ?? undefined,
    address_1: report.address_1 ?? undefined,
    acres: report.lot_size_acres != null ? Number(report.lot_size_acres) : undefined,
    parcel_number: report.parcel_number ?? undefined,
    client_entity: report.client_entity ?? undefined,
    client_contact_name: report.client_contact_name ?? undefined,
    client_salutation: report.client_salutation ?? undefined,
    client_address: report.client_address ?? undefined,
    client_city_state_zip: report.client_city_state_zip ?? undefined,
    client_phone: report.client_phone ?? undefined,
    client_email: report.client_email ?? undefined,
    unit_mix: parseUnitMix(report),
    amenities_description: keyAmenities.length > 0 ? keyAmenities.join(', ') : undefined,
    study_id: studyId,
    market_type: report.market_type ?? 'glamping',
    include_web_research: true,
    service: report.service ?? undefined,
    county: report.county ?? undefined,
  };
}
